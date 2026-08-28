import type { Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

import { applySourceImportance } from '../../_finance/source-importance';
import { renderSectorAndStockCards, type StockItem } from '../../_finance/stock-card';

const SINA_NEWS_CACHE_TTL = 1;

export const route: Route = {
    path: ['/finance/724/:tag?', '/724/:tag?'],
    name: '财经快讯 - 724接口',
    url: 'finance.sina.com.cn',
    maintainers: ['luck'],
    handler,
    example: '/sina/724',
    parameters: {
        tag: '分类标签，默认全部，可选：macro（宏观）、stock（股市）、international（国际）、opinion（观点）',
    },
    description: `使用新浪财经 724 移动端接口获取实时财经快讯。

支持查询参数：

- \`limit=20\` - 限制返回数量（默认 20 条，单次最多 100 条）

示例：

- \`/sina/724/stock\` - 股市快讯
- \`/sina/724?limit=50\` - 获取 50 条快讯`,
    categories: ['finance'],
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
            source: ['finance.sina.com.cn/7x24/', 'finance.sina.com.cn'],
            target: '/724',
        },
    ],
    view: ViewType.Notifications,
    cacheTtl: SINA_NEWS_CACHE_TTL,
};

// Split item.stock[] by stocktype into individual stocks vs non-individual.
// Non-individual: funds, commodities, international futures, international indexes, index futures, FX.
const INDIVIDUAL_STOCK_TYPES = new Set(['cn', 'hk', 'us']);

export interface Sina724Stock {
    stocktype?: string;
    name?: string;
    code?: string;
    symbol?: string;
    range?: string;
    [key: string]: unknown;
}

export function classifyStocks(stocks: Sina724Stock[]): {
    individualStocks: Sina724Stock[];
    sectors: Sina724Stock[];
} {
    const individualStocks: Sina724Stock[] = [];
    const sectors: Sina724Stock[] = [];
    for (const stock of stocks) {
        if (INDIVIDUAL_STOCK_TYPES.has(stock.stocktype ?? '')) {
            individualStocks.push(stock);
        } else {
            sectors.push(stock);
        }
    }
    return { individualStocks, sectors };
}

// Do not set referrerpolicy; RSSHub middleware owns it (AGENTS.md).
export function buildImageHtml(pics: string[] | undefined | null): string {
    if (!Array.isArray(pics) || pics.length === 0) {
        return '';
    }
    return pics.map((u) => `<img src="${u.replace(/^http:/, 'https:')}">`).join('<br>');
}

const SINA_724_BASE_URL = 'https://news.cj.sina.cn';

export function pickLink(item: { pageUrl?: string; url?: string; id: number | string }): string {
    const raw = item.pageUrl || item.url || `${SINA_724_BASE_URL}/7x24/${item.id}`;
    return raw.replace(/^http:/, 'https:');
}

// Prefer the first bracketed phrase, then the first 100 characters, then id. `color` is ignored here; the importance prefix comes from applySourceImportance.
export function buildTitle(item: { color?: number; content?: string; id: number | string }): string {
    const cleanContent = (item.content ?? '').replaceAll(/<[^>]+>/g, '');
    const titleMatch = cleanContent.match(/【([^】]+)】/);
    const base = titleMatch ? titleMatch[1] : cleanContent.slice(0, 100) || `财经快讯 ${item.id}`;
    return base;
}

function toStockItems(items: Sina724Stock[]): StockItem[] {
    return items
        .filter((s) => s.range)
        .map((s) => ({
            name: s.name || '',
            code: s.code || '',
            change: s.range,
        }));
}

const TAG_MAP = {
    all: 0,
    macro: 1,
    stock: 101,
    international: 102,
    opinion: 6,
};

async function handler(ctx) {
    const tagParam = ctx.req.param('tag') || 'all';
    const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 20;
    const tag = TAG_MAP[tagParam] ?? 0;
    const apiUrl = `${SINA_724_BASE_URL}/app/v1/news724/list`;

    // Stable device id; cached with the default content-expire TTL (CACHE_CONTENT_EXPIRE, 1h), not a custom 24h.
    const deviceId = await cache.tryGet('sina:724:deviceid', async () => {
        const crypto = await import('node:crypto');
        return crypto.randomBytes(16).toString('hex');
    });

    // Upstream `num` max is 100 (values above that silently drop to 10). RSS takes the first page only; no pagination.
    const num = Math.min(Math.max(limit, 1), 100);

    const cacheKey = `sina:724:feed:${tag}:${num}`;
    const collected: Array<Record<string, any> & { id: string | number }> = await cache.tryGet(
        cacheKey,
        async () => {
            const response = await got(apiUrl, {
                searchParams: {
                    deviceid: deviceId,
                    version: '9.0.1',
                    num,
                    tag,
                    dire: 'b',
                },
                headers: {
                    'User-Agent': `sinafinance__9.0.1__iOS__${deviceId}__26.0.1__iPhone18,2`,
                    Cookie: 'vt=4; wm=b122',
                    'X-Forwarded-For': '116.228.111.18',
                    'X-Real-IP': '116.228.111.18',
                    'Client-IP': '116.228.111.18',
                },
                timeout: 30000,
            });
            return response.data?.result?.data?.data ?? [];
        },
        SINA_NEWS_CACHE_TTL,
        false
    );

    const items = collected.slice(0, limit).map((item) => {
        const content = item.content || '';
        const newsId = item.id;
        const pubDate = timezone(parseDate(item.ctime), 8);

        const title = buildTitle(item);

        let description = content.replace(/【[^】]+】/, '').trim();

        const imageHtml = buildImageHtml(item.original_pic);
        if (imageHtml) {
            description = `${imageHtml}<br>${description}`;
        }

        const stocks: Sina724Stock[] = item.stock || [];
        if (stocks.length > 0) {
            const { individualStocks, sectors } = classifyStocks(stocks);
            description += renderSectorAndStockCards(toStockItems(sectors), toStockItems(individualStocks));
        }

        const categories: string[] = [];

        for (const stock of stocks) {
            if (stock.name) {
                categories.push(stock.name);
            }
        }

        return applySourceImportance(
            {
                title,
                description,
                link: pickLink(item),
                guid: `sina-724-${newsId}`,
                pubDate,
                category: categories,
                author: '新浪财经',
            },
            [
                {
                    source: 'sina',
                    field: 'color',
                    value: item.color,
                    label: '颜色',
                    normalized: item.color === 1 ? 'important' : 'normal',
                },
            ]
        );
    });

    return {
        title: `新浪财经724 - ${tagParam === 'all' ? '全部' : tagParam}快讯`,
        link: 'https://finance.sina.com.cn/7x24/',
        description: '新浪财经724移动端接口实时财经快讯',
        item: items,
    };
}
