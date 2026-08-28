import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Data, Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';

import { isJin10AdFeedItem, isJin10PromotionalItem, type Jin10RawItem } from './filters';
import { attachJin10HotLabels } from './hot';
import { CHANNEL_MAP, mapClassicJin10FlashItem } from './utils';

export const route: Route = {
    path: ['/new/:channel?/:important?', '/:important?'],
    categories: ['finance'],
    view: ViewType.Notifications,
    example: '/jin10',
    cacheTtl: 1,
    parameters: {
        channel: '频道分类，可选值见下表，留空则返回所有频道（支持查询参数）',
        important: '只看重要快讯：1=只看重要，留空则返回所有（支持查询参数）',
    },
    description: `金十数据实时快讯（官网 \`flash_newest.js\`）。\`/jin10\` 与 \`/jin10/1\` 是本路由的别名（\`1\` = 只看重要）。\`/jin10/4\` 不会当成 A 股频道，请用 \`/jin10/new/4\`。\`/jin10/flash\` 是 \`/ushknews\` 的别名；\`/jin10/category\`、\`/jin10/topic\` 走不同接口，不在本路由合并。路径参数与查询参数均可；同时提供时查询参数优先。

| 频道名称      | channel 值 |
| ------------- | ---------- |
| 外汇 / 贵金属 | 1          |
| 期货          | 2          |
| 全球市场      | 3          |
| A 股          | 4          |
| 英文          | 5          |

**查询参数示例（推荐）：**

- \`/jin10?important=1\` - 只看重要快讯
- \`/jin10/new?channel=4\` - A 股快讯
- \`/jin10/new?channel=4&important=1\` - A 股重要快讯
- \`/jin10/new?channel=5\` - 英文快讯

**路径参数示例：**

- \`/jin10\` / \`/jin10/new\` - 所有快讯
- \`/jin10/1\` - 只看重要
- \`/jin10/new/3\` - 全球市场快讯
- \`/jin10/new/4/1\` - A 股重要快讯
- \`/jin10/new/5\` - 英文快讯

热门快讯会在 \`category\` 中带上 \`火\` / \`热\` / \`沸\` / \`爆\`。可用 RSSHub 通用参数 \`filter_category\` 筛选。`,
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
            source: ['jin10.com/'],
            target: '',
        },
    ],
    name: '实时快讯',
    maintainers: ['laampui'],
    handler,
    url: 'jin10.com/',
};

// flash_newest.js 返回 `var newest = [...];` 赋值语句，需剥壳成 JSON
const parseFlashData = (rawData: string): Jin10RawItem[] => {
    const jsonStr = rawData.replace(/^var\s+newest\s*=\s*/, '').replace(/;?\s*$/, '');
    return JSON.parse(jsonStr);
};

const parseJin10NewChannel = (raw?: string): number | null => {
    if (!raw) {
        return null;
    }
    const channel = Math.trunc(Number(raw));
    if (!Object.hasOwn(CHANNEL_MAP, channel)) {
        throw new InvalidParameterError(`Invalid channel "${raw}". Supported values: ${Object.keys(CHANNEL_MAP).join(', ')}. For A-share flashes use /jin10/new/4, not /jin10/4.`);
    }
    return channel;
};

const parseJin10Important = (raw?: string): number | null => {
    if (!raw) {
        return null;
    }
    if (raw !== '1') {
        const channelHint = Object.hasOwn(CHANNEL_MAP, Math.trunc(Number(raw))) ? ` For channel ${raw}, use /jin10/new/${raw}.` : '';
        throw new InvalidParameterError(`important only accepts 1 (important flashes only).${channelHint}`);
    }
    return 1;
};

async function handler(ctx): Promise<Data> {
    const channelFilter = parseJin10NewChannel(ctx.req.query('channel') || ctx.req.param('channel'));
    const importantFilter = parseJin10Important(ctx.req.query('important') || ctx.req.param('important'));

    const rawItems: Jin10RawItem[] = await cache.tryGet(
        'jin10:newflash:raw',
        async () => {
            const { data: response } = await got('https://www.jin10.com/flash_newest.js', {
                headers: {
                    Referer: 'https://www.jin10.com/',
                },
                searchParams: {
                    t: Date.now(),
                },
            });
            return attachJin10HotLabels(parseFlashData(response));
        },
        1,
        false
    );

    const filtered = rawItems.filter((item) => {
        if (isJin10PromotionalItem(item)) {
            return false;
        }
        if (channelFilter && !item.channel?.includes(channelFilter)) {
            return false;
        }
        if (importantFilter === 1 && item.important !== 1) {
            return false;
        }
        return true;
    });

    const items = filtered
        .map((item) =>
            mapClassicJin10FlashItem(item, {
                guidPrefix: 'jin10:new:',
                keepBrackets: true,
            })
        )
        .filter((item) => !isJin10AdFeedItem(item));

    const titleParts = ['金十数据'];
    if (channelFilter && Object.hasOwn(CHANNEL_MAP, channelFilter)) {
        titleParts.push(CHANNEL_MAP[channelFilter]);
    }
    if (importantFilter === 1) {
        titleParts.push('重要');
    }

    const channelTitle = titleParts.join(' - ');
    const channelDescription = titleParts.slice(1).join(' ') || '实时财经快讯';

    return {
        title: channelTitle,
        link: 'https://www.jin10.com/',
        description: `金十数据 - ${channelDescription}`,
        item: items,
        language: channelFilter === 5 ? 'en' : 'zh-CN',
        image: 'https://www.jin10.com/favicon.ico',
        author: '金十数据',
    };
}
