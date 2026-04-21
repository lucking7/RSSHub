import type { Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

import { API_BASE, API_HEADERS } from './utils';

export const route: Route = {
    path: '/flash',
    name: '金融快讯',
    url: 'longbridge.com/zh-CN/news/live',
    maintainers: ['luck'],
    handler,
    example: '/longbridge/flash',
    description: '长桥金融快讯（stock flash），实时市场动态',
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
};

async function handler(ctx) {
    const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 30;

    const list = await cache.tryGet(
        `longbridge:flash:${limit}`,
        async () => {
            const { data } = await got.post(`${API_BASE}/content/stock_flash/posts`, {
                json: { limit },
                headers: {
                    ...API_HEADERS,
                    'content-type': 'application/json',
                },
            });
            return data?.data?.articles ?? [];
        },
        60
    );

    const items = list.map((item) => {
        const description = item.description_html || item.title;
        return {
            title: item.title,
            description,
            link: item.detail_url || `https://m.lbctrl.com/news/post/${item.id}`,
            pubDate: parseDate(Number.parseInt(item.published_at) * 1000),
            guid: `longbridge-flash-${item.id}`,
            author: item.post_source?.name || '长桥快讯',
            ...(item.important ? { category: ['重要'] } : {}),
        };
    });

    return {
        title: '长桥 - 金融快讯',
        link: 'https://longbridge.com/zh-CN/news/live',
        description: '长桥金融快讯',
        item: items,
    };
}
