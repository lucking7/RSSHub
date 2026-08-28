import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import cache from '@/utils/cache';

import { fetchOfficialRssItems } from './utils';

type ChannelConfig = {
    name: string;
    feedUrl: string;
    link: string;
    description: string;
};

const CHANNELS: Record<string, ChannelConfig> = {
    news: {
        name: '最新资讯',
        feedUrl: 'https://longbridge.com/zh-CN/news/feed',
        link: 'https://longbridge.com/zh-CN/news',
        description: '长桥官方最新资讯 RSS。官方 feed 当前不提供 item 发布时间。',
    },
    live: {
        name: '官方金融快讯 RSS',
        feedUrl: 'https://longbridge.com/zh-CN/news/live/feed',
        link: 'https://longbridge.com/zh-CN/news/live',
        description: '长桥官方 live RSS。更实时、覆盖实时频道 API 的金融快讯请使用 /longbridge/flash。',
    },
};

const DEFAULT_CHANNEL = 'news';
const RETIRED_CHANNEL_SLUGS = new Set(['mp-lb-daily', 'dolphin']);
const LONG_BRIDGE_NEWS_CACHE_TTL = 1;

export const route: Route = {
    path: '/channel/:slug?',
    name: '官方 RSS 频道',
    url: 'longbridge.com/zh-CN/news',
    maintainers: ['luck'],
    handler,
    example: '/longbridge/channel/news',
    parameters: {
        slug: `频道 slug，默认 \`${DEFAULT_CHANNEL}\`。可选：${Object.entries(CHANNELS)
            .map(([k, v]) => `\`${k}\`（${v.name}）`)
            .join('、')}`,
    },
    description: '官方 RSS 频道。旧的 `mp-lb-daily` 数据源已停更，`dolphin` 页面已不可用。金融快讯实时订阅请优先使用 `/longbridge/flash`。',
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
            source: ['longbridge.com/zh-CN/news'],
            target: '/channel/news',
        },
        {
            source: ['longbridge.com/zh-CN/news/live'],
            target: '/channel/live',
        },
    ],
    cacheTtl: LONG_BRIDGE_NEWS_CACHE_TTL,
};

async function handler(ctx) {
    const slug = ctx.req.param('slug') || DEFAULT_CHANNEL;
    const channel = CHANNELS[slug];
    if (!channel) {
        if (RETIRED_CHANNEL_SLUGS.has(slug)) {
            throw new InvalidParameterError(`Longbridge channel "${slug}" is retired. Use /longbridge/channel/news or /longbridge/flash.`);
        }
        throw new InvalidParameterError(`Unsupported Longbridge channel: ${slug}. Valid: news, live.`);
    }

    const items = await cache.tryGet(
        `longbridge:channel:v2:${slug}`,
        () =>
            fetchOfficialRssItems(channel.feedUrl, {
                guidPrefix: 'longbridge-channel-',
                author: '长桥',
            }),
        LONG_BRIDGE_NEWS_CACHE_TTL,
        false
    );

    return {
        title: `长桥 - ${channel.name}`,
        link: channel.link,
        description: channel.description,
        item: items,
    };
}
