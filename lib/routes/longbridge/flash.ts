import type { DataItem, Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

import { applySourceImportance } from '../_finance/source-importance';
import { API_BASE, API_HEADERS, cleanText, fetchOfficialRssItems, FLASH_GUID_PREFIX, getFlashMergeKey, getNewsId, officialNewsLink } from './utils';

// `news/channels/stock_flash` is the reverse-chronological feed behind the official
// 7x24 live page. The older `content/stock_flash/posts` endpoint is an editorially
// ranked slice whose newest item can lag the real feed by over an hour.
const FLASH_CHANNEL_SLUG = 'stock_flash';
const UPSTREAM_SIZE = 50;

// `channels` only segments markets natively by `US` / `CN`. HK and composite markets
// have no upstream filter, so they are derived client-side from the unfiltered feed
// via each item's exchange `markets` codes.
const MARKET_MAP: Record<string, { name: string; param?: string; filterCodes?: string[] }> = {
    all: { name: '全部' },
    us: { name: '美股', param: 'US' },
    cn: { name: 'A股', param: 'CN' },
    hkus: { name: '港美股', filterCodes: ['HK', 'US'] },
    ushkcn: { name: '美股+港A股', filterCodes: ['US', 'HK', 'SZ', 'SH', 'BJ'] },
};

const BASE_URL = 'https://longbridge.com/zh-CN/news/live';
const OFFICIAL_LIVE_FEED_URL = 'https://longbridge.com/zh-CN/news/live/feed';
const LONG_BRIDGE_NEWS_CACHE_TTL = 1;
const LONG_BRIDGE_FLASH_CACHE_KEY_VERSION = 'v11';

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
    description: '长桥金融快讯（7x24 实时快讯）。主源为实时频道 API；默认 `all` 会补充官方 live RSS 中未出现在实时频道 API 的条目；市场筛选仅使用实时频道 API。按发布时间倒序。',
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
    return Object.hasOwn(MARKET_MAP, key) ? key : 'all';
}

function getItemTime(item: DataItem): number {
    if (!item.pubDate) {
        return 0;
    }
    const date = item.pubDate instanceof Date ? item.pubDate : parseDate(item.pubDate as string | number | Date);
    const time = date.getTime();
    return Number.isNaN(time) ? 0 : time;
}

function buildItem(item): DataItem | undefined {
    const id = getNewsId(item.url, item.id);
    const title = cleanText(item.title) || cleanText(item.description);
    const publishedAt = Number(item.publish_at);
    if (!id || !title || !Number.isFinite(publishedAt)) {
        return undefined;
    }
    const link = officialNewsLink(id) || cleanText(item.url) || `https://m.lbctrl.com/news/post/${id}`;
    return applySourceImportance(
        {
            title,
            description: item.description || title,
            link,
            pubDate: parseDate(publishedAt * 1000),
            guid: `${FLASH_GUID_PREFIX}${id}`,
            author: item.post_source?.name || '长桥快讯',
            ...(item.image && { image: item.image }),
            ...(item.markets?.length && { category: item.markets }),
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
            const key = getFlashMergeKey(item);
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

    let newsList = data.data?.news_list ?? [];
    if (marketConfig.filterCodes) {
        const codes = new Set(marketConfig.filterCodes);
        newsList = newsList.filter((item) => (item.markets ?? []).some((code) => codes.has(code)));
    }

    return newsList.map((item) => buildItem(item)).filter((item): item is DataItem => !!item);
}

async function fetchOfficialLiveItems(): Promise<DataItem[]> {
    try {
        return await fetchOfficialRssItems(OFFICIAL_LIVE_FEED_URL, {
            guidPrefix: FLASH_GUID_PREFIX,
            author: '长桥快讯',
            requireNewsId: true,
            requirePubDate: true,
        });
    } catch {
        return [];
    }
}

async function handler(ctx) {
    const marketKey = normalizeMarket(ctx.req.param('market'));
    const marketConfig = MARKET_MAP[marketKey];

    const list = await cache.tryGet(
        `longbridge:flash:${LONG_BRIDGE_FLASH_CACHE_KEY_VERSION}:${marketKey}`,
        async () => {
            const [flashItems, officialLiveItems] = await Promise.all([fetchFlashItems(marketConfig), marketKey === 'all' ? fetchOfficialLiveItems() : Promise.resolve([])]);
            return mergeItems([...flashItems, ...officialLiveItems]);
        },
        LONG_BRIDGE_NEWS_CACHE_TTL,
        false
    );

    return {
        title: `长桥 - 金融快讯${marketKey === 'all' ? '' : ` (${marketConfig.name})`}`,
        link: BASE_URL,
        description: `长桥金融快讯${marketKey === 'all' ? '' : ` - ${marketConfig.name}`}`,
        item: list,
    };
}
