import { Route } from '@/types';

import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { art } from '@/utils/render';
import path from 'node:path';

const titles = {
    global: '要闻',
    'a-stock': 'A股',
    'us-stock': '美股',
    'hk-stock': '港股',
    forex: '外汇',
    commodity: '商品',
    financing: '理财',
};

export const route: Route = {
    path: '/live/:category?/:score?',
    categories: ['finance'],
    example: '/wallstreetcn/live',
    parameters: { category: '快讯分类，默认`global`，见下表', score: '快讯重要度，默认`1`全部快讯，可设置为`2`只看重要的' },
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
            source: ['wallstreetcn.com/live/:category', 'wallstreetcn.com/'],
            target: '/live/:category?',
        },
    ],
    name: '快讯',
    maintainers: ['nczitzk'],
    handler,
    description: `| 要闻   | A 股    | 美股     | 港股     | 外汇  | 商品      | 理财      |
| ------ | ------- | -------- | -------- | ----- | --------- | --------- |
| global | a-stock | us-stock | hk-stock | forex | commodity | financing |`,
};

async function handler(ctx) {
    const category = ctx.req.param('category') ?? 'global';
    const score = ctx.req.param('score') ?? 1;

    const rootUrl = 'https://wallstreetcn.com';
    const apiRootUrl = 'https://api-one.wallstcn.com';
    const currentUrl = `${rootUrl}/live/${category}`;
    const apiUrl = `${apiRootUrl}/apiv1/content/lives?channel=${category}-channel&limit=${ctx.req.query('limit') ?? 100}`;

    const response = await got({
        method: 'get',
        url: apiUrl,
    });

    const items = response.data.data.items
        .filter((item) => item.score >= score)
        .map((item) => ({
            link: item.uri,
            title: item.title || item.content_text,
            pubDate: parseDate(item.display_time * 1000),
            author: item.author?.display_name ?? '',
            guid: `wallstreetcn-live-${item.id}`,
            category: [
                // 添加频道分类（去掉 -channel 后缀）
                ...(item.channels || []).map((c) => c.replace('-channel', '')),
                // 添加标签
                ...(item.tags || []).map((t) => t.name || t),
                // 添加相关主题
                ...(item.related_themes || []).map((t) => t.name || t),
            ].filter(Boolean),
            description: art(path.join(__dirname, 'templates/description.art'), {
                description: item.content,
                more: item.content_more,
                images: item.cover_images?.length > 0 ? item.cover_images : item.images,
                symbols: item.symbols || [],
                channels: item.channels || [],
                tags: item.tags || [],
                comment_count: item.comment_count || 0,
                global_channel_name: item.global_channel_name || '',
            }),
        }));

    return {
        title: `华尔街见闻 - 快讯 - ${titles[category]}`,
        link: currentUrl,
        item: items,
    };
}
