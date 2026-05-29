import type { DataItem } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import parser from '@/utils/rss-parser';

import { applySourceImportance } from '../_finance/source-importance';

export const API_BASE = 'https://m.lbkrs.com/api/forward';
export const WEB_BASE = 'https://longbridge.com';
export const LONGBRIDGE_CACHE_TTL = 30;
export const BUILD_ID_CACHE_TTL = 300;
export const FLASH_FEED_URL = `${WEB_BASE}/news/live/feed`;

export const API_HEADERS = {
    'x-app-id': 'longbridge',
    'x-platform': 'web',
    'accept-language': 'zh-CN',
    'x-prefer-language': 'zh-CN',
};

export const API_HEADERS_JSON = {
    ...API_HEADERS,
    'content-type': 'application/json',
};

const LOCALE_MAP: Record<string, string> = {
    'zh-CN': 'zh-CN',
    'zh-HK': 'zh-HK',
    en: 'en',
};

export function getBuildId() {
    return cache.tryGet(
        'longbridge:buildId',
        async () => {
            const { data } = await got(`${WEB_BASE}/zh-CN/news`, {
                headers: API_HEADERS,
            });
            const match = data.match(/"buildId":"([^"]+)"/);
            if (!match) {
                throw new Error('Failed to extract Longbridge buildId');
            }
            return match[1];
        },
        BUILD_ID_CACHE_TTL,
        false
    );
}

export function fetchInitArticles(locale = 'zh-CN') {
    const normalizedLocale = LOCALE_MAP[locale] ?? locale;
    return cache.tryGet(
        `longbridge:init-articles:${normalizedLocale}`,
        async () => {
            const buildId = await getBuildId();
            const { data } = await got(`${WEB_BASE}/_next/data/${buildId}/${normalizedLocale}/news.json`, {
                headers: API_HEADERS,
            });
            return data?.pageProps?.init_articles ?? [];
        },
        LONGBRIDGE_CACHE_TTL,
        false
    );
}

export function fetchFlashFeed() {
    return cache.tryGet(
        'longbridge:flash:rss',
        async () => {
            const { data } = await got(FLASH_FEED_URL, {
                headers: API_HEADERS,
            });
            return parser.parseString(data);
        },
        LONGBRIDGE_CACHE_TTL,
        false
    );
}

export function fetchChannelNewsList(slug: string) {
    return cache.tryGet(
        `longbridge:channel:${slug}`,
        async () => {
            const { data } = await got(`${API_BASE}/news/channels/${slug}`, {
                searchParams: { size: 50, has_derivatives: true },
                headers: API_HEADERS,
            });
            return data?.data?.news_list ?? [];
        },
        LONGBRIDGE_CACHE_TTL,
        false
    );
}

export function isDolphinArticle(item: { detail_url?: string }) {
    return item.detail_url?.includes('/social/') ?? false;
}

export function isChannelListStale(list: Array<{ publish_at?: string }>) {
    if (!list.length) {
        return true;
    }
    const latestTs = Math.max(...list.map((item) => Number.parseInt(item.publish_at ?? '0', 10)));
    // Fall back to the main news feed when the channel API has not updated for 3 days.
    return latestTs < Date.now() / 1000 - 86400 * 3;
}

export function mapInitArticle(item: any): DataItem {
    const link = item.detail_url || `${WEB_BASE}/news/${item.id}`;
    const author = item.post_source?.name || (isDolphinArticle(item) ? '海豚投研' : '长桥资讯');

    return applySourceImportance(
        {
            title: item.title,
            description: item.description_html || '',
            link,
            pubDate: parseDate(Number.parseInt(item.published_at, 10) * 1000),
            guid: `longbridge-news-${item.id}`,
            author,
            ...(item.images?.[0]?.url ? { image: item.images[0].url } : {}),
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

export function mapChannelArticle(item: any): DataItem {
    return applySourceImportance(
        {
            title: item.title,
            description: item.description || '',
            link: item.url || `https://m.lbctrl.com/news/post/${item.id}`,
            pubDate: parseDate(Number.parseInt(item.publish_at, 10) * 1000),
            guid: `longbridge-channel-${item.id}`,
            author: item.post_source?.name || '长桥资讯',
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
