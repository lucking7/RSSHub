import type { Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

import { applySourceImportance } from '../_finance/source-importance';
import { API_BASE, API_HEADERS_JSON } from './utils';

// Upstream enforces limit ∈ [0, 50]; values outside the range get rejected with
// code 1901400 and an empty data payload, which would silently produce an empty
// feed.
const UPSTREAM_LIMIT = 50;

const MARKET_MAP: Record<string, { name: string; composite?: string[] }> = {
    all: { name: '全部' },
    us: { name: '美股' },
    hkus: { name: '港美股' },
    cn: { name: 'A股' },
    ushkcn: { name: '美股+港A股', composite: ['HKUS', 'CN'] },
};

const BASE_URL = 'https://longbridge.com/zh-CN/news/node/daily';
const LONG_BRIDGE_NEWS_CACHE_TTL = 1;
const LONG_BRIDGE_FLASH_CACHE_KEY_VERSION = 'v6';

export const route: Route = {
    path: '/flash/:market?',
    name: '金融快讯',
    url: 'longbridge.com/zh-CN/news/node/daily',
    maintainers: ['luck'],
    handler,
    example: '/longbridge/flash',
    parameters: {
        market: `市场筛选，默认 \`all\`（全部）。可选：${Object.entries(MARKET_MAP)
            .map(([k, v]) => `\`${k}\`（${v.name}）`)
            .join('、')}`,
    },
    description: '长桥金融快讯（7x24 stock flash），实时市场动态',
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
            source: ['longbridge.com/zh-CN/news/node/daily'],
            target: '/flash',
        },
        {
            source: ['longbridge.com/zh-CN/news/live'],
            target: '/flash',
        },
    ],
    view: ViewType.Notifications,
    cacheTtl: LONG_BRIDGE_NEWS_CACHE_TTL,
};

function normalizeMarket(raw?: string): string {
    const key = (raw || 'all').toLowerCase();
    return MARKET_MAP[key] ? key : 'all';
}

async function handler(ctx) {
    const rawMarket = ctx.req.param('market');
    const marketKey = normalizeMarket(rawMarket);
    const marketConfig = MARKET_MAP[marketKey];

    const list = await cache.tryGet(
        `longbridge:flash:${LONG_BRIDGE_FLASH_CACHE_KEY_VERSION}:${marketKey}`,
        async () => {
            const markets = marketConfig.composite ?? [marketKey];
            const responses = await Promise.all(
                markets.map(async (m) => {
                    const body: Record<string, unknown> = {
                        limit: UPSTREAM_LIMIT,
                        next_params: {},
                        important_only: false,
                        counter_ids: [],
                        slug: 'stock_flash',
                        has_derivatives: true,
                        filter_pins: false,
                        marquee: false,
                    };
                    if (m !== 'all') {
                        body.market = m.toUpperCase();
                    }
                    const { data } = await got.post(`${API_BASE}/content/stock_flash/posts`, {
                        json: body,
                        headers: API_HEADERS_JSON,
                    });
                    if (data?.code !== 0) {
                        throw new Error(`Longbridge flash API error ${data?.code}: ${data?.message}`);
                    }
                    return data.data?.articles ?? [];
                })
            );
            const seen = new Set<string>();
            const merged: any[] = [];
            for (const articles of responses) {
                for (const article of articles) {
                    if (!seen.has(article.id)) {
                        seen.add(article.id);
                        merged.push(article);
                    }
                }
            }
            return merged;
        },
        LONG_BRIDGE_NEWS_CACHE_TTL,
        false
    );

    const items = list.map((item) => {
        const description = item.description_html || item.title;
        return applySourceImportance(
            {
                title: item.title,
                description,
                link: item.detail_url || `https://m.lbctrl.com/news/post/${item.id}`,
                pubDate: parseDate(Number.parseInt(item.published_at) * 1000),
                guid: `longbridge-flash-${item.id}`,
                author: item.post_source?.name || '长桥快讯',
            },
            [
                {
                    source: 'longbridge',
                    field: 'important',
                    value: item.important,
                    label: '重要',
                    normalized: item.important ? 'important' : 'normal',
                },
            ]
        );
    });

    return {
        title: `长桥 - 金融快讯${marketKey === 'all' ? '' : ` (${marketConfig.name})`}`,
        link: BASE_URL,
        description: `长桥金融快讯${marketKey === 'all' ? '' : ` - ${marketConfig.name}`}`,
        item: items,
    };
}
