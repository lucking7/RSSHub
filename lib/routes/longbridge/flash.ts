import type { DataItem, Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

import { applySourceImportance } from '../_finance/source-importance';
import { API_BASE, API_HEADERS } from './utils';

// The official 7x24 live page (longbridge.com/zh-CN/news/live) is backed by the
// reverse-chronological `news/channels/stock_flash` endpoint, NOT the editorially
// ranked `content/stock_flash/posts` one. The latter returns a heat/editor ranked
// slice whose newest item can lag the real feed by well over an hour, which is why
// the flash route updated late. `channels` returns `no-store` realtime data,
// strictly ordered by `publish_at`, and shares the m.lbkrs.com host that already
// works in production.
const FLASH_CHANNEL_SLUG = 'stock_flash';
const UPSTREAM_SIZE = 50;

// `channels` only segments markets by `US` / `CN` (and "all" when the param is
// omitted). The HK / composite markets the route historically exposed have no
// native filter, so they are derived client-side from the unfiltered realtime feed
// via each item's exchange `markets` codes.
const MARKET_MAP: Record<string, { name: string; param?: string; filterCodes?: string[] }> = {
    all: { name: '全部' },
    us: { name: '美股', param: 'US' },
    cn: { name: 'A股', param: 'CN' },
    hkus: { name: '港美股', filterCodes: ['HK', 'US'] },
    ushkcn: { name: '美股+港A股', filterCodes: ['US', 'HK', 'SZ', 'SH', 'BJ'] },
};

const BASE_URL = 'https://longbridge.com/zh-CN/news/live';
const LONG_BRIDGE_NEWS_CACHE_TTL = 1;
const LONG_BRIDGE_FLASH_CACHE_KEY_VERSION = 'v8';

type ChannelFlashItem = {
    id?: string | number;
    title?: string;
    description?: string;
    url?: string;
    publish_at?: string | number;
    image?: string;
    markets?: string[];
    post_source?: {
        name?: string;
    };
    important?: boolean;
};

export const route: Route = {
    path: '/flash/:market?',
    name: '金融快讯',
    url: 'longbridge.com/zh-CN/news/live',
    maintainers: ['luck'],
    handler,
    example: '/longbridge/flash',
    parameters: {
        market: `市场筛选，默认 \`all\`（全部）。可选：${Object.entries(MARKET_MAP)
            .map(([k, v]) => `\`${k}\`（${v.name}）`)
            .join('、')}`,
    },
    description: '长桥金融快讯（7x24 实时快讯），按发布时间倒序',
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

function getItemTime(item: DataItem): number {
    if (!item.pubDate) {
        return 0;
    }
    const date = item.pubDate instanceof Date ? item.pubDate : parseDate(item.pubDate as string | number | Date);
    const time = date.getTime();
    return Number.isNaN(time) ? 0 : time;
}

function buildItem(item: ChannelFlashItem): DataItem | undefined {
    const id = String(item.id || '');
    const title = (item.title || '').trim() || (item.description || '').trim();
    const publishedAt = Number.parseInt(String(item.publish_at ?? ''), 10);
    if (!id || !title || Number.isNaN(publishedAt)) {
        return undefined;
    }
    return applySourceImportance(
        {
            title,
            description: item.description || title,
            link: item.url || `https://m.lbctrl.com/news/post/${id}`,
            pubDate: parseDate(publishedAt * 1000),
            guid: `longbridge-flash-${id}`,
            author: item.post_source?.name || '长桥快讯',
            ...(item.image ? { image: item.image } : {}),
            ...(item.markets?.length ? { category: item.markets } : {}),
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
}

function mergeItems(items: DataItem[]): DataItem[] {
    const seen = new Set<string>();
    return items
        .toSorted((a, b) => getItemTime(b) - getItemTime(a))
        .filter((item) => {
            const key = item.guid || item.link;
            if (!key || seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        })
        .slice(0, UPSTREAM_SIZE);
}

async function fetchFlashItems(marketConfig: (typeof MARKET_MAP)[string]): Promise<DataItem[]> {
    const searchParams: Record<string, string | number | boolean> = {
        size: UPSTREAM_SIZE,
        has_derivatives: true,
    };
    if (marketConfig.param) {
        searchParams.market = marketConfig.param;
    }

    const { data } = await got(`${API_BASE}/news/channels/${FLASH_CHANNEL_SLUG}`, {
        searchParams,
        headers: API_HEADERS,
    });
    if (data?.code !== 0) {
        throw new Error(`Longbridge flash API error ${data?.code}: ${data?.message}`);
    }

    let newsList: ChannelFlashItem[] = data.data?.news_list ?? [];
    if (marketConfig.filterCodes) {
        const codes = new Set(marketConfig.filterCodes);
        newsList = newsList.filter((item) => (item.markets ?? []).some((code) => codes.has(code)));
    }

    return newsList.map((item) => buildItem(item)).filter((item): item is DataItem => !!item);
}

async function handler(ctx) {
    const marketKey = normalizeMarket(ctx.req.param('market'));
    const marketConfig = MARKET_MAP[marketKey];

    const list = await cache.tryGet(`longbridge:flash:${LONG_BRIDGE_FLASH_CACHE_KEY_VERSION}:${marketKey}`, async () => mergeItems(await fetchFlashItems(marketConfig)), LONG_BRIDGE_NEWS_CACHE_TTL, false);

    return {
        title: `长桥 - 金融快讯${marketKey === 'all' ? '' : ` (${marketConfig.name})`}`,
        link: BASE_URL,
        description: `长桥金融快讯${marketKey === 'all' ? '' : ` - ${marketConfig.name}`}`,
        item: list,
    };
}
