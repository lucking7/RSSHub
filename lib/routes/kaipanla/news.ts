import type { Data, Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

import { renderSectorAndStockCards, type StockItem } from '../_finance/stock-card';

const toStockTuple = ([code, name, change]: any[]): StockItem => ({ name, code, change });
const KAIPANLA_CACHE_TTL = 1;

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
    cacheTtl: KAIPANLA_CACHE_TTL,
};

async function handler(ctx): Promise<Data> {
    const typeParam = ctx.req.param('type') || 'stock';

    const typeMap = {
        stock: '0',
        commodity: '1',
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
                    st: '30',
                },
                headers: {
                    'User-Agent': 'lhb/5.21.3 (com.kaipanla.www; build:0; iOS 26.0.1) Alamofire/4.9.1',
                    Accept: '*/*',
                    'X-Forwarded-For': '116.228.111.18',
                    'X-Real-IP': '116.228.111.18',
                    'Client-IP': '116.228.111.18',
                },
            });
            return data;
        },
        KAIPANLA_CACHE_TTL,
        false
    );

    const newsList = response.List || [];

    const items = newsList.map((item) => {
        const title = item.Title || '';

        let contentText = item.Content || item.Title || '';

        // Strip a duplicated 【title】 prefix from the description body.
        if (title && contentText) {
            const titleMatch = contentText.match(/^【(.+?)】/);
            if (titleMatch) {
                const bracketTitle = titleMatch[1];
                if (bracketTitle === title || title.includes(bracketTitle) || bracketTitle.includes(title)) {
                    contentText = contentText.replace(/^【.+?】\s*/, '');
                }
            }
        }

        let description = '';

        description += '<div style="padding: 15px; background: #f8f9fa; border-left: 4px solid #1890ff; border-radius: 5px; margin-bottom: 10px;">';
        description += `<p style="margin: 0; line-height: 1.6; color: #333;">${contentText}</p>`;
        description += '</div>';

        if (item.Stocks && item.Stocks.length > 0) {
            // Upstream API uses 8* codes for sectors.
            const plates = item.Stocks.filter(([code]: any[]) => code.startsWith('8')).map((s: any[]) => toStockTuple(s));
            const stocks = item.Stocks.filter(([code]: any[]) => !code.startsWith('8')).map((s: any[]) => toStockTuple(s));
            description += renderSectorAndStockCards(plates, stocks);
        }

        // Categories are stable `name(code)` labels; omit change % so they do not churn with live quotes.
        const categories =
            item.Stocks && item.Stocks.length > 0
                ? item.Stocks.map((s) => {
                      const [code, name] = s;
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

    const typeName = typeParam === 'commodity' ? '商品期货' : '股票';
    const feedTitle = `开盘啦 - ${typeName}新闻快讯`;
    const feedDescription = `来自财联社等权威财经媒体的${typeName}实时资讯`;

    return {
        title: feedTitle,
        link: 'https://www.longhuvip.com/',
        description: feedDescription,
        language: 'zh-CN',
        item: items,
    };
}
