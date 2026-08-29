import type { Data, Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';

import type { UshknewsFlashItem } from './utils';
import { FLASH_API, FLASH_HEADERS, mapUshknewsFlashItem, resolveUshknewsChannel, USHKNEWS_SITE } from './utils';

const USHKNEWS_FLASH_CACHE_TTL = 1;

export const route: Route = {
    path: ['/flash/:channel?', '/:channel?'],
    categories: ['finance'],
    view: ViewType.Notifications,
    example: '/ushknews',
    cacheTtl: USHKNEWS_FLASH_CACHE_TTL,
    parameters: {
        channel: '频道，留空或 `all` 为全部快讯，`us` / `1` 为美股，`hk` / `2` 为港股',
    },
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
            source: ['ushknews.com/'],
            target: '/flash',
        },
    ],
    name: '快讯',
    maintainers: ['luck'],
    handler,
    url: 'ushknews.com/',
    description: `金十美港电讯（\`ushknews.com\`）实时快讯。站点页签为「全部快讯 / 美股 / 港股」，条目含文字快讯和数据卡（财报 EPS、经济数据）。重要条目会在 \`category\` 中带 \`重要\`，可用 \`filter_category\` 筛选。没有金十官网的 \`火\` / \`热\` / \`沸\` / \`爆\` 热度。

| 频道     | channel |
| -------- | ------- |
| 全部快讯 | 空 /all |
| 美股     | us / 1  |
| 港股     | hk / 2  |

示例：\`/ushknews\`、\`/ushknews/us\`、\`/ushknews/flash/hk\`、\`/ushknews/1\`。`,
};

export async function handler(ctx): Promise<Data> {
    const { apiChannel, name } = resolveUshknewsChannel(ctx.req.param('channel'));
    const limitQuery = ctx.req.query('limit');
    const parsedLimit = limitQuery ? Math.trunc(Number(limitQuery)) : 50;
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50;
    const extraCategories = apiChannel ? [name] : [];

    const rawItems: UshknewsFlashItem[] = await cache.tryGet(
        `ushknews:flash:${apiChannel || 'all'}`,
        async () => {
            const { data: response } = await got(`${FLASH_API}/get_flash_list_with_channel`, {
                searchParams: { channel: apiChannel },
                headers: FLASH_HEADERS,
            });
            return response.data ?? [];
        },
        USHKNEWS_FLASH_CACHE_TTL,
        false
    );

    const items = rawItems
        .map((item) => mapUshknewsFlashItem(item, extraCategories))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .slice(0, limit);

    return {
        title: `美港电讯·${name}`,
        link: USHKNEWS_SITE,
        description: `美港电讯实时快讯·${name}`,
        language: 'zh-CN',
        item: items,
        author: '美港电讯',
        image: `${USHKNEWS_SITE}/app/favicon.ico`,
    };
}
