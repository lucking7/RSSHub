import { config } from '@/config';
import type { Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

import { isJin10AdFeedItem, isJin10PromotionalItem, type Jin10RawItem } from './filters';
import { CHANNEL_MAP, buildFlashDescription, buildFlashLink, collectFlashImages } from './utils';

export const route: Route = {
    path: '/new/:channel?/:important?',
    categories: ['finance'],
    view: ViewType.Notifications,
    example: '/jin10/new',
    parameters: {
        channel: '频道分类，可选值见下表，留空则返回所有频道（支持查询参数）',
        important: '只看重要快讯：1=只看重要，留空则返回所有（支持查询参数）',
    },
    description: `
金十数据实时快讯 - 支持多维度分类筛选

| 频道名称       | channel值 |
|----------------|-----------|
| 外汇/贵金属    | 1         |
| 期货           | 2         |
| 全球市场       | 3         |
| A股            | 4         |

**查询参数示例（推荐）：**
- \`/jin10/new?important=1\` - 只看重要快讯
- \`/jin10/new?channel=4\` - A股快讯
- \`/jin10/new?channel=4&important=1\` - A股重要快讯

**路径参数示例：**
- \`/jin10/new\` - 所有快讯
- \`/jin10/new/3\` - 全球市场快讯
- \`/jin10/new/4/1\` - A股重要快讯
`,
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
            target: '/new',
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

const extractRemarkTags = (remark: Jin10RawItem['remark']) => {
    const tags: string[] = [];
    for (const r of remark ?? []) {
        if (r.type === 'quotes') {
            if (r.title) {
                tags.push(r.title);
            }
            if (r.symbol) {
                tags.push(r.symbol);
            }
        } else if ((r.type === 'miniProgram' || r.type === 'link') && r.title) {
            tags.push(r.title);
        }
    }
    return tags;
};

async function handler(ctx) {
    const channel = ctx.req.query('channel') || ctx.req.param('channel');
    const important = ctx.req.query('important') || ctx.req.param('important');

    const channelFilter = channel ? Number.parseInt(channel) : null;
    const importantFilter = important ? Number.parseInt(important) : null;

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
            return parseFlashData(response);
        },
        config.cache.routeExpire,
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
        .map((item) => {
            const content = item.data?.content ?? '';
            const titleMatch = content.match(/^【([^】]+)】/s);
            let baseTitle: string;
            let body = content;

            if (titleMatch) {
                baseTitle = `【${titleMatch[1]}】`;
                body = content.replace(titleMatch[0], '').trim();
            } else {
                const plainText = (item.data?.title || content).replaceAll(/<[^>]+>/g, '');
                baseTitle = plainText.length > 80 ? plainText.slice(0, 80) + '…' : plainText;
            }

            const isImportant = item.important === 1;
            const channels = (item.channel ?? []).map((ch) => CHANNEL_MAP[ch]).filter(Boolean);
            const category = [...new Set([...channels, ...extractRemarkTags(item.remark)])];
            if (isImportant) {
                category.push('重要');
            }

            const title = isImportant ? `「重要」${baseTitle}` : baseTitle;
            const description = buildFlashDescription({
                baseTitle,
                body,
                isImportant,
                source: item.data?.source,
                sourceLink: item.data?.source_link,
                images: collectFlashImages(item),
            });

            return {
                title,
                description,
                pubDate: timezone(parseDate(item.time!), 8),
                link: buildFlashLink(item),
                guid: `jin10:new:${item.id}`,
                category,
                author: item.data?.source || '金十数据',
            };
        })
        .filter((item) => !isJin10AdFeedItem(item));

    const titleParts = ['金十数据'];
    if (channelFilter && CHANNEL_MAP[channelFilter]) {
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
        language: 'zh-CN',
        image: 'https://www.jin10.com/favicon.ico',
        author: '金十数据',
    };
}
