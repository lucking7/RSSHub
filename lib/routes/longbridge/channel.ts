import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

import { applySourceImportance } from '../_finance/source-importance';
import { API_BASE, API_HEADERS } from './utils';

const CHANNELS: Record<string, string> = {
    'mp-lb-daily': '长桥每日精选',
    dolphin: '海豚投研',
};

export const route: Route = {
    path: '/channel/:slug?',
    name: '资讯频道',
    url: 'longbridge.com/zh-CN/news',
    maintainers: ['luck'],
    handler,
    example: '/longbridge/channel/mp-lb-daily',
    parameters: {
        slug: `频道 slug，默认 \`mp-lb-daily\`。已知频道：${Object.entries(CHANNELS)
            .map(([k, v]) => `\`${k}\`（${v}）`)
            .join('、')}`,
    },
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
            target: '/channel/mp-lb-daily',
        },
        {
            source: ['longbridge.com/zh-CN/news/node/dolphin'],
            target: '/channel/dolphin',
        },
    ],
};

const UPSTREAM_SIZE = 50;

async function handler(ctx) {
    const slug = ctx.req.param('slug') || 'mp-lb-daily';

    const list = await cache.tryGet(`longbridge:channel:${slug}`, async () => {
        const { data } = await got(`${API_BASE}/news/channels/${slug}`, {
            searchParams: { size: UPSTREAM_SIZE, has_derivatives: true },
            headers: API_HEADERS,
        });
        return data?.data?.news_list ?? [];
    });

    const items = list.map((item) =>
        applySourceImportance(
            {
                title: item.title,
                description: item.description || '',
                link: item.url || `https://m.lbctrl.com/news/post/${item.id}`,
                pubDate: parseDate(Number.parseInt(item.publish_at) * 1000),
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
        )
    );

    const channelName = CHANNELS[slug] || slug;

    return {
        title: `长桥 - ${channelName}`,
        link: `https://longbridge.com/zh-CN/news/node/${slug === 'mp-lb-daily' ? 'daily' : slug}`,
        description: `长桥${channelName}`,
        item: items,
    };
}
