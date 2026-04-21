import { config } from '@/config';
import type { Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

import { renderSectorAndStockCards, type StockItem } from '../_finance/stock-card';

const toStockTuple = ([code, name, change]: any[]): StockItem => ({ name, code, change });

export const route: Route = {
    path: '/news/:type?',
    name: '新闻快讯',
    url: 'longhuvip.com',
    maintainers: [],
    handler,
    example: '/kaipanla/news',
    view: ViewType.Articles,
    parameters: {
        type: '新闻类型，可选：stock（股票，默认）、commodity（商品期货）',
    },
    description: '开盘啦新闻快讯，来自财联社等权威财经媒体的实时资讯',
    categories: ['finance'],
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportRadar: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
};

async function handler(ctx) {
    const typeParam = ctx.req.param('type') || 'stock';

    // Type参数映射
    const typeMap = {
        stock: '0', // 股票类
        commodity: '1', // 商品期货类
    };

    const type = typeMap[typeParam] || '0';
    const apiUrl = 'https://apparticle.longhuvip.com/w1/api/index.php';

    const response = await cache.tryGet(
        `kaipanla:news:${type}`,
        async () => {
            const { data } = await got(apiUrl, {
                searchParams: {
                    a: 'GetList',
                    apiv: 'w42',
                    c: 'PCNewsFlash',
                    PhoneOSNew: '2',
                    VerSion: '5.21.0.3',
                    Type: type,
                    Index: '0',
                    NewsID: '0',
                    st: '30', // 获取30条
                },
                headers: {
                    'User-Agent': 'lhb/5.21.3 (com.kaipanla.www; build:0; iOS 26.0.1) Alamofire/4.9.1',
                    Accept: '*/*',
                },
            });
            return data;
        },
        config.cache.routeExpire,
        false
    );

    const newsList = response.List || [];

    const items = newsList.map((item) => {
        // 标题：有就用，没有就留空
        const title = item.Title || '';

        // 构建HTML描述
        let contentText = item.Content || item.Title || '';

        // 移除description开头重复的【标题】
        if (title && contentText) {
            const titleMatch = contentText.match(/^【(.+?)】/);
            if (titleMatch) {
                const bracketTitle = titleMatch[1];
                if (bracketTitle === title || title.includes(bracketTitle) || bracketTitle.includes(title)) {
                    contentText = contentText.replace(/^【.+?】\s*/, '');
                }
            }
        }

        // 开始构建HTML description
        let description = '';

        // 1. 新闻正文（HTML卡片样式）
        description += '<div style="padding: 15px; background: #f8f9fa; border-left: 4px solid #1890ff; border-radius: 5px; margin-bottom: 10px;">';
        description += `<p style="margin: 0; line-height: 1.6; color: #333;">${contentText}</p>`;
        description += '</div>';

        if (item.Stocks && item.Stocks.length > 0) {
            const plates = item.Stocks.filter(([code]: any[]) => code.startsWith('8')).map((s: any[]) => toStockTuple(s));
            const stocks = item.Stocks.filter(([code]: any[]) => !code.startsWith('8')).map((s: any[]) => toStockTuple(s));
            description += renderSectorAndStockCards(plates, stocks);
        }

        // 构建分类信息：股票名(代码)，不包含涨跌幅（避免动态数据）
        const categories =
            item.Stocks && item.Stocks.length > 0
                ? item.Stocks.map((s) => {
                      const [code, name] = s;
                      // 格式：股票名(代码)，不包含涨跌幅
                      return `${name}(${code})`;
                  })
                : [];

        return {
            title,
            description,
            pubDate: parseDate(Number.parseInt(item.Time) * 1000),
            link: item.PushUrl && item.PushUrl.trim() !== '' ? item.PushUrl : 'https://www.longhuvip.com/',
            guid: `kaipanla:news:${item.CID}`,
            author: item.Source || '开盘啦',
            category: categories,
        };
    });

    // 构建标题
    const typeName = typeParam === 'commodity' ? '商品期货' : '股票';
    const feedTitle = `开盘啦 - ${typeName}新闻快讯`;
    const feedDescription = `来自财联社等权威财经媒体的${typeName}实时资讯`;

    return {
        title: feedTitle,
        link: 'https://www.longhuvip.com/',
        description: feedDescription,
        language: 'zh-cn',
        item: items,
    };
}
