import { config } from '@/config';
import type { Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

import { applySourceImportance } from '../_finance/source-importance';
import { isJin10AdFeedItem, isJin10PromotionalItem, type Jin10RawItem } from './filters';
import { buildFlashDescription, buildFlashLink, CHANNEL_MAP, collectFlashImages } from './utils';

export const route: Route = {
    path: '/flash/:channel?',
    categories: ['finance'],
    view: ViewType.Notifications,
    example: '/jin10/flash',
    parameters: {
        channel: '频道，可选；留空=全部快讯，`1`=美股盘前/盘后异动，`2`=港股盘前/盘后异动',
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
            source: ['ushknews.com/', 'jin10.com/'],
        },
    ],
    name: '快讯 - 美港电讯',
    maintainers: ['laampui'],
    handler,
    description: `获取金十数据（美港电讯）的实时财经快讯。

频道（路径参数）：
- 留空 = 全部快讯（综合，更新最快）
- \`1\` = 美股盘前/盘后异动
- \`2\` = 港股盘前/盘后异动

查询参数：
- \`important_only=1\` 仅返回重要快讯
- \`limit=50\` 限制返回数量（默认50条）

示例：
- \`/jin10/flash\` - 所有快讯
- \`/jin10/flash/1\` - 美股盘前/盘后异动
- \`/jin10/flash/2\` - 港股盘前/盘后异动
- \`/jin10/flash?important_only=1\` - 全部快讯中仅重要
- \`/jin10/flash/1?limit=20\` - 美港频道前20条`,
};

const extractRemarkTags = (remark: Jin10RawItem['remark']): string[] => {
    const tags: string[] = [];
    for (const r of remark ?? []) {
        if (r.category_name) {
            tags.push(r.category_name);
        }
        if (r.symbol) {
            tags.push(r.symbol);
        }
    }
    return tags;
};

async function handler(ctx) {
    const channel = ctx.req.param('channel') ?? '';
    const limitQuery = ctx.req.query('limit');
    const limit = limitQuery ? Number.parseInt(limitQuery) : 50;
    const importantOnly = ctx.req.query('important_only') === '1';

    const rawItems: Jin10RawItem[] = await cache.tryGet(
        `jin10:ushknews:${channel || 'all'}`,
        async () => {
            const { data: response } = await got('https://flash-api.ushknews.com/get_flash_list_with_channel', {
                searchParams: { channel },
                headers: {
                    'x-app-id': 'brCYec5s1ova317e',
                    'x-version': '1.0.0',
                    referer: 'https://www.ushknews.com/',
                },
            });
            return response.data ?? [];
        },
        config.cache.routeExpire,
        false
    );

    const filtered = rawItems.filter((item) => !isJin10PromotionalItem(item) && (!importantOnly || item.important === 1)).slice(0, limit);

    const items = filtered
        .map((item) => {
            const content = item.data?.content ?? '';
            const bracketMatch = content.match(/^【([^】]+)】(.*)$/s);

            let baseTitle: string;
            let body: string;
            if (bracketMatch) {
                baseTitle = `【${bracketMatch[1].trim()}】`;
                body = bracketMatch[2].trim();
            } else {
                const plainText = item.data?.title?.trim() || content.replaceAll(/<[^>]+>/g, '');
                baseTitle = plainText.length > 80 ? plainText.slice(0, 80) + '…' : plainText;
                body = content;
            }

            const isImportant = item.important === 1;
            const channels = (item.channel ?? []).map((ch) => CHANNEL_MAP[ch]).filter(Boolean);
            const category = [...new Set([...channels, ...extractRemarkTags(item.remark)])];
            const images = collectFlashImages(item);

            const description = buildFlashDescription({
                baseTitle,
                body,
                isImportant,
                source: item.data?.source,
                sourceLink: item.data?.source_link,
                images,
            });
            const [firstImage] = images;

            return applySourceImportance(
                {
                    title: baseTitle,
                    description,
                    link: buildFlashLink(item),
                    pubDate: timezone(parseDate(item.time!), +8),
                    category,
                    guid: item.id,
                    author: item.data?.source || '金十数据',
                    ...(firstImage && {
                        image: firstImage,
                        enclosure_url: firstImage,
                        enclosure_type: 'image/jpeg',
                    }),
                },
                [
                    {
                        source: 'jin10',
                        field: 'important',
                        value: item.important,
                        label: '重要',
                        normalized: isImportant ? 'important' : 'normal',
                    },
                ]
            );
        })
        .filter((item) => !isJin10AdFeedItem(item));

    return {
        title: `金十数据 - 美港电讯${importantOnly ? ' - 重要快讯' : ''}${channel ? ` - ${channel}` : ''}`,
        link: 'https://www.ushknews.com',
        item: items,
        description: `金十数据实时财经快讯${importantOnly ? '（仅重要）' : ''}`,
    };
}
