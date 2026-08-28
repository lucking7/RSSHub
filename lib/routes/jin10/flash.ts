import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Data, Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';

import { isJin10AdFeedItem, isJin10PromotionalItem, type Jin10RawItem } from './filters';
import { mapClassicJin10FlashItem } from './utils';

const JIN10_FLASH_CACHE_TTL = 1;

export const route: Route = {
    path: '/flash/:channel?',
    categories: ['finance'],
    view: ViewType.Notifications,
    example: '/jin10/flash',
    parameters: {
        channel: '频道，可选；留空=全部快讯，`1`=美股，`2`=港股',
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
    cacheTtl: JIN10_FLASH_CACHE_TTL,
    description: `获取金十美港电讯（\`ushknews.com\`）快讯。站点页签只有「全部快讯 / 美股 / 港股」和「只看重要」，没有金十官网的 \`火\` / \`热\` / \`沸\` / \`爆\` 热度，也没有外汇 / 期货 / A 股频道。

频道（路径参数）：

- 留空 = 全部快讯
- \`1\` = 美股
- \`2\` = 港股

查询参数：

- \`important_only=1\` 仅返回重要快讯（对应站点「只看重要」）
- \`limit=50\` 限制返回数量（默认 50 条）

示例：

- \`/jin10/flash\` - 全部快讯
- \`/jin10/flash/1\` - 美股
- \`/jin10/flash/2\` - 港股
- \`/jin10/flash?important_only=1\` - 全部快讯中仅重要
- \`/jin10/flash/1?limit=20\` - 美股前 20 条`,
};

const USHK_CHANNEL_NAMES: Record<string, string> = {
    '1': '美股',
    '2': '港股',
};

async function handler(ctx): Promise<Data> {
    const channel = ctx.req.param('channel') ?? '';
    if (channel && !Object.hasOwn(USHK_CHANNEL_NAMES, channel)) {
        throw new InvalidParameterError(`Invalid ushknews channel "${channel}". Use empty (all), 1 (US), or 2 (HK).`);
    }
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
                    'X-Forwarded-For': '116.228.111.18',
                    'X-Real-IP': '116.228.111.18',
                    'Client-IP': '116.228.111.18',
                },
            });
            return response.data ?? [];
        },
        JIN10_FLASH_CACHE_TTL,
        false
    );

    const filtered = rawItems.filter((item) => !isJin10PromotionalItem(item) && (!importantOnly || item.important === 1)).slice(0, limit);

    const items = filtered
        .map((item) =>
            mapClassicJin10FlashItem(item, {
                guidPrefix: 'jin10:flash:',
                keepBrackets: true,
                includeChannels: false,
                extraCategories: [...(channel ? [USHK_CHANNEL_NAMES[channel]] : []), ...(item.channel ?? []).map((ch) => USHK_CHANNEL_NAMES[String(ch)]).filter(Boolean)],
            })
        )
        .filter((item) => !isJin10AdFeedItem(item));

    return {
        title: `金十数据 - 美港电讯${importantOnly ? ' - 重要快讯' : ''}${channel ? ` - ${USHK_CHANNEL_NAMES[channel]}` : ''}`,
        link: 'https://www.ushknews.com',
        item: items,
        description: `金十数据实时财经快讯${importantOnly ? '（仅重要）' : ''}`,
        language: 'zh-CN',
    };
}
