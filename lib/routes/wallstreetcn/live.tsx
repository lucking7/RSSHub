import { raw } from 'hono/html';
import { renderToString } from 'hono/jsx/dom/server';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Data, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

import { applySourceImportance } from '../_finance/source-importance';

const WSCN_LIVE_CACHE_TTL = 1;

const titles: Record<string, string> = {
    global: '要闻',
    'a-stock': 'A股',
    'us-stock': '美股',
    'hk-stock': '港股',
    forex: '外汇',
    commodity: '商品',
    financing: '理财',
    gold: '黄金',
    oil: '原油',
    bond: '债券',
    xgb: '选股宝',
    blockchain: '区块链',
    'gold-forex': '黄金外汇',
};

const CHANNEL_CATEGORY_NAMES: Record<string, string> = {
    ...Object.fromEntries(Object.entries(titles).map(([slug, name]) => [`${slug}-channel`, name])),
    'goldc-channel': '黄金',
};

export const mapWallstreetcnLiveCategories = (item: { channels?: string[]; related_themes?: Array<{ title?: string }> }): string[] => {
    const channels = (item.channels ?? []).map((channel) => CHANNEL_CATEGORY_NAMES[channel]).filter(Boolean);
    const themes = (item.related_themes ?? []).map((theme) => theme.title).filter((title): title is string => Boolean(title));
    return [...new Set([...channels, ...themes])];
};

export const route: Route = {
    path: '/live/:category?/:score?',
    categories: ['finance'],
    example: '/wallstreetcn/live',
    cacheTtl: WSCN_LIVE_CACHE_TTL,
    parameters: { category: '快讯分类，默认`global`，见下表', score: '快讯重要度，默认`1`全部快讯，`2`只看重要（score≥2）' },
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
    name: '实时快讯',
    maintainers: ['nczitzk'],
    handler,
    description: `| 要闻   | A 股    | 美股     | 港股     | 外汇  | 商品      | 理财      |
| ------ | ------- | -------- | -------- | ----- | --------- | --------- |
| global | a-stock | us-stock | hk-stock | forex | commodity | financing |

额外频道：\`gold\` 黄金、\`oil\` 原油、\`bond\` 债券、\`xgb\` 选股宝、\`blockchain\` 区块链、\`gold-forex\` 黄金外汇。条目 \`category\` 还会带上来源频道和相关主题，可用 \`filter_category\` 筛选。`,
};

async function handler(ctx): Promise<Data> {
    const category = ctx.req.param('category') ?? 'global';
    if (!Object.hasOwn(titles, category)) {
        throw new InvalidParameterError(`Invalid live category "${category}". Supported values: ${Object.keys(titles).join(', ')}.`);
    }

    const scoreRaw = ctx.req.param('score');
    const score = scoreRaw ? Math.trunc(Number(scoreRaw)) : 1;
    if (!Number.isFinite(score) || score < 1) {
        throw new InvalidParameterError(`Invalid score "${scoreRaw}". Use 1 (all) or 2 (important).`);
    }

    const rootUrl = 'https://wallstreetcn.com';
    const apiRootUrl = 'https://api-one.wallstcn.com';
    const currentUrl = `${rootUrl}/live/${category}`;
    const limit = ctx.req.query('limit') ?? 100;
    const apiUrl = `${apiRootUrl}/apiv1/content/lives?channel=${category}-channel&limit=${limit}`;

    const rawItems = await cache.tryGet(
        `wallstreetcn:live:${category}:${limit}`,
        async () => {
            const response = await got({
                method: 'get',
                url: apiUrl,
            });
            return response.data.data.items ?? [];
        },
        WSCN_LIVE_CACHE_TTL,
        false
    );

    const items = rawItems
        .filter((item) => Number(item.score) >= score)
        .map((item) => {
            const [firstImage] = item.images ?? [];
            return applySourceImportance(
                {
                    link: item.uri,
                    guid: `wallstreetcn:live:${item.id}`,
                    title: item.title || item.content_text,
                    pubDate: parseDate(item.display_time * 1000),
                    author: item.author?.display_name ?? '',
                    category: mapWallstreetcnLiveCategories(item),
                    description: renderToString(
                        <>
                            {item.content ? raw(item.content) : null}
                            {item.content_more ? raw(item.content_more) : null}
                            {item.images?.length ? item.images.map((image) => <img src={image.uri} width={image.width} height={image.height} />) : null}
                        </>
                    ),
                    ...(firstImage?.uri && {
                        image: firstImage.uri,
                        enclosure_url: firstImage.uri,
                        enclosure_type: 'image/jpeg',
                    }),
                },
                [
                    {
                        source: 'wallstreetcn',
                        field: 'score',
                        value: item.score,
                        label: '重要度',
                        normalized: Number(item.score) >= 2 ? 'important' : 'normal',
                    },
                ]
            );
        });

    return {
        title: `华尔街见闻 - 实时快讯 - ${titles[category]}`,
        link: currentUrl,
        language: 'zh-CN',
        item: items,
    };
}
