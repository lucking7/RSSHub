import type { Route } from '@/types';

import { fetchChannelNewsList, fetchInitArticles, isChannelListStale, isDolphinArticle, LONGBRIDGE_CACHE_TTL, mapChannelArticle, mapInitArticle, WEB_BASE } from './utils';

const CHANNELS: Record<string, { name: string; linkPath: string }> = {
    'mp-lb-daily': {
        name: '长桥每日精选',
        linkPath: 'daily',
    },
    dolphin: {
        name: '海豚投研',
        linkPath: 'dolphin',
    },
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
            .map(([k, v]) => `\`${k}\`（${v.name}）`)
            .join('、')}`,
    },
    description: '长桥资讯频道。当频道 API 超过 3 天未更新时，会自动回退到官网资讯首页数据，避免 feed 长期停更。',
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
    cacheTtl: LONGBRIDGE_CACHE_TTL,
};

async function handler(ctx) {
    const slug = ctx.req.param('slug') || 'mp-lb-daily';
    const channelConfig = CHANNELS[slug] || { name: slug, linkPath: slug };

    let items;
    if (slug === 'dolphin') {
        const articles = await fetchInitArticles();
        items = articles.filter((item) => isDolphinArticle(item)).map((item) => mapInitArticle(item));
    } else {
        const list = await fetchChannelNewsList(slug);
        if (isChannelListStale(list)) {
            const articles = await fetchInitArticles();
            items = articles.map((item) => mapInitArticle(item));
        } else {
            items = list.map((item) => mapChannelArticle(item));
        }
    }

    return {
        title: `长桥 - ${channelConfig.name}`,
        link: `${WEB_BASE}/zh-CN/news/node/${channelConfig.linkPath}`,
        description: `长桥${channelConfig.name}`,
        item: items,
    };
}
