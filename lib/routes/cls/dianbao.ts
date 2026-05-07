import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

import { applySourceImportance } from '../_finance/source-importance';
import { renderSectorAndStockCards, type StockItem } from '../_finance/stock-card';
import { getClsImportanceSignals, getSearchParams, isClsPromotionalContent } from './utils';

const toStockItem = (s: any): StockItem => ({ name: s.name, code: s.StockID || '', change: s.RiseRange });

const categories = {
    watch: '看盘',
    announcement: '公司',
    explain: '解读',
    red: '加红',
    jpush: '推送',
    remind: '提醒',
    fund: '基金',
    hk_us: '港美股',
};

const VIP_TYPE_CODE = 20015;

function renderDescription({ item, images, sectors, stocks, level, assocArticleUrl }: { item: any; images: string[]; sectors: StockItem[]; stocks: StockItem[]; level: string; assocArticleUrl: string }) {
    let html = '';

    if (level === 'A') {
        html += '<div style="background: #fff1f0; border-left: 3px solid #ff4d4f; padding: 8px 12px; margin-bottom: 10px; border-radius: 3px;">';
        html += '<strong style="color: #ff4d4f;">「重要」</strong>';
        html += '</div>';
    } else if (level === 'B') {
        html += '<div style="background: #fff7e6; border-left: 3px solid #fa8c16; padding: 8px 12px; margin-bottom: 10px; border-radius: 3px;">';
        html += '<strong style="color: #fa8c16;">「关注」</strong>';
        html += '</div>';
    }

    if (item.content) {
        html += item.content;
    }

    if (images.length > 0) {
        html += '<br>';
        for (const img of images) {
            html += `<img src="${img}" style="max-width: 100%; height: auto;">`;
        }
    }

    html += renderSectorAndStockCards(sectors, stocks);

    if (assocArticleUrl) {
        html += '<br>';
        html += '<div style="background: #f6ffed; border-left: 3px solid #52c41a; padding: 10px 15px; margin: 15px 0; border-radius: 4px;">';
        html += `<a href="${assocArticleUrl}" target="_blank" style="color: #1890ff; text-decoration: none;">点击查看原始公告文档 →</a>`;
        html += '</div>';
    }

    return html;
}

export const route: Route = {
    path: '/dianbao/:category?',
    categories: ['finance'],
    example: '/cls/dianbao',
    parameters: { category: '分类，见下表，默认为全部' },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['cls.cn/telegraph', 'cls.cn/'],
            target: '/dianbao',
        },
    ],
    name: '电报（API3接口）',
    maintainers: ['nczitzk'],
    handler,
    url: 'cls.cn/telegraph',
    description: `获取财联社电报快讯，使用api3.cls.cn接口

| 看盘  | 公司         | 解读    | 加红 | 推送  | 提醒   | 基金 | 港美股  |
| ----- | ------------ | ------- | ---- | ----- | ------ | ---- | ------- |
| watch | announcement | explain | red  | jpush | remind | fund | hk_us   |`,
};

async function handler(ctx) {
    const category = ctx.req.param('category') ?? '';
    const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 20;

    const apiUrl = 'https://api3.cls.cn/v1/roll/get_roll_list';

    const lastTime = Math.floor(Date.now() / 1000);

    const params = {
        last_time: lastTime,
        rn: limit * 2,
        hasFirstVipArticle: 1,
    };

    if (category) {
        params.category = category;
    }

    const response = await got({
        method: 'get',
        url: apiUrl,
        searchParams: getSearchParams(params),
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Referer: 'https://www.cls.cn/telegraph',
            Accept: 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            Origin: 'https://www.cls.cn',
        },
    });

    const items = response.data.data.roll_data
        .filter((item) => Number(item.type) !== VIP_TYPE_CODE)
        .filter((item) => !isClsPromotionalContent(item))
        .slice(0, limit)
        .map((item) => {
            const processedStockList = (item.stock_list || []).map((stock) => ({
                ...stock,
                StockID: stock.StockID ? stock.StockID.toUpperCase() : stock.StockID,
            }));

            const sectors = processedStockList.filter((s) => s.StockID?.includes('801')).map((s) => toStockItem(s));
            const stocks = processedStockList.filter((s) => !s.StockID?.includes('801')).map((s) => toStockItem(s));

            const subjectCategories = item.subjects?.map((s) => s.subject_name) || [];
            const stockNameCategories = processedStockList.map((stock) => stock.name);
            const title = item.title || item.brief || item.content;

            const processedItem = {
                ...item,
                content: (item.content || '').replace(/^【[^】]+】/, '').trim(),
                stock_list: processedStockList,
            };

            const rssItem: any = applySourceImportance(
                {
                    title,
                    link: item.shareurl,
                    description: renderDescription({
                        item: processedItem,
                        images: item.images || [],
                        sectors,
                        stocks,
                        level: item.level || '',
                        assocArticleUrl: item.assocArticleUrl || '',
                    }),
                    pubDate: parseDate(item.ctime * 1000),
                    category: [...subjectCategories, ...stockNameCategories],
                    author: item.author || '',
                },
                getClsImportanceSignals(item)
            );

            return rssItem;
        });

    return {
        title: `财联社 - 电报（API3）${category === '' ? '' : ` - ${categories[category]}`}`,
        link: 'https://www.cls.cn/telegraph',
        description: `财联社电报快讯 - 使用API3接口实时获取财经新闻${category === '' ? '' : `，关注${categories[category]}领域`}`,
        language: 'zh-cn',
        item: items,
    };
}
