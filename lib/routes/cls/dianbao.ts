import { config } from '@/config';
import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

import { applySourceImportance } from '../_finance/source-importance';
import { renderSectorAndStockCards, type StockItem } from '../_finance/stock-card';
import { getClsImportanceSignals, getSearchParams } from './utils';

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
const maxRollListSize = 50;
const CLS_DIANBAO_CACHE_TTL = 1;

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
    cacheTtl: CLS_DIANBAO_CACHE_TTL,
    description: `获取财联社电报快讯，使用 api3.cls.cn 接口

| 看盘  | 公司         | 解读    | 加红 | 推送  | 提醒   | 基金 | 港美股 |
| ----- | ------------ | ------- | ---- | ----- | ------ | ---- | ------ |
| watch | announcement | explain | red  | jpush | remind | fund | hk\\_us |`,
};

async function handler(ctx) {
    const category = ctx.req.param('category') ?? '';
    const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 20;

    const apiUrl = 'https://api3.cls.cn/v1/roll/get_roll_list';

    const params = {
        last_time: 0,
        rn: Math.min(limit * 2, maxRollListSize),
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
            accept: 'application/json, text/plain, */*',
            'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
            origin: 'https://www.cls.cn',
            referer: 'https://www.cls.cn/telegraph',
            'user-agent': config.trueUA,
            'X-Forwarded-For': '116.228.111.18',
            'X-Real-IP': '116.228.111.18',
            'Client-IP': '116.228.111.18',
        },
    });

    const items = response.data.data.roll_data
        .filter((item) => Number(item.type) !== VIP_TYPE_CODE)
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
                content: item.content.replace(/^【[^】]+】/, '').trim(),
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

            // Audio enclosure is disabled for now; keep this block for later reuse.
            // if (item.audio_url && item.audio_url.length > 0) {
            //     rssItem.enclosure_url = item.audio_url[0];
            //     rssItem.enclosure_type = 'audio/mpeg';
            //     rssItem.enclosure_title = title;
            // }

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
