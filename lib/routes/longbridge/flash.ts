import type { Route } from '@/types';
import { ViewType } from '@/types';
import { parseDate } from '@/utils/parse-date';

import { applySourceImportance } from '../_finance/source-importance';
import { fetchFlashFeed, LONGBRIDGE_CACHE_TTL, WEB_BASE } from './utils';

export const route: Route = {
    path: '/flash',
    name: '金融快讯',
    url: 'longbridge.com/zh-CN/news/live',
    maintainers: ['luck'],
    handler,
    example: '/longbridge/flash',
    description: '长桥金融快讯，数据源为官网 `/news/live/feed` RSS。',
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
            source: ['longbridge.com/zh-CN/news/live'],
            target: '/flash',
        },
    ],
    view: ViewType.Notifications,
    cacheTtl: LONGBRIDGE_CACHE_TTL,
};

async function handler() {
    const feed = await fetchFlashFeed();

    const items = feed.items.map((item) => {
        const categories = item.categories?.length ? item.categories : undefined;
        const description = item.contentSnippet || item.content || '';
        const title = item.title?.trim() || description.slice(0, 80);
        const pubDateRaw = item.isoDate || item.pubDate;
        return applySourceImportance(
            {
                title,
                description,
                link: item.link ?? `${WEB_BASE}/news/live`,
                pubDate: pubDateRaw ? parseDate(pubDateRaw) : undefined,
                guid: item.guid || item.link || `longbridge-flash-${item.link}`,
                author: item.creator || item.author || '长桥快讯',
                ...(categories ? { category: categories } : {}),
            },
            categories?.includes('重要')
                ? [
                      {
                          source: 'longbridge',
                          field: 'important',
                          value: true,
                          label: '重要',
                          normalized: 'important',
                      },
                  ]
                : []
        );
    });

    return {
        title: '长桥 - 金融快讯',
        link: `${WEB_BASE}/zh-CN/news/live`,
        description: '长桥金融快讯',
        language: 'zh-CN',
        item: items,
    };
}
