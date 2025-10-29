import { Route, ViewType } from '@/types';

import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';
import { art } from '@/utils/render';
import path from 'node:path';
import { config } from '@/config';

export const route: Route = {
    path: '/newflash/:channel?/:type?/:important?',
    categories: ['finance'],
    view: ViewType.Notifications,
    example: '/jin10/newflash',
    parameters: {
        channel: '频道分类，可选值见下表，留空则返回所有频道',
        type: '内容类型：0=快讯，2=深度文章，留空则返回所有类型',
        important: '只看重要快讯：1=只看重要，留空则返回所有',
    },
    description: `
| 频道名称       | channel值 |
|----------------|-----------|
| 外汇/贵金属    | 1         |
| 期货           | 2         |
| 全球市场       | 3         |
| A股            | 4         |
| 深度文章       | 5         |

**示例：**
- \`/jin10/newflash\` - 所有快讯
- \`/jin10/newflash/3\` - 全球市场快讯
- \`/jin10/newflash/4/0/1\` - A股重要快讯
- \`/jin10/newflash//2\` - 所有深度文章
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
            target: '/newflash',
        },
    ],
    name: '新版快讯',
    maintainers: ['laampui'],
    handler,
    url: 'jin10.com/',
};

// 频道名称映射
const channelMap: Record<number, string> = {
    1: '外汇/贵金属',
    2: '期货',
    3: '全球市场',
    4: 'A股',
    5: '深度文章',
};

// 广告过滤函数
const isAd = (item: any): boolean => {
    // 过滤 type=1 的推广内容
    if (item.type === 1) {
        return true;
    }

    // 过滤 VIP 锁定内容
    if (item.data?.lock || (item.data?.vip_level && item.data.vip_level > 0)) {
        return true;
    }

    const content = item.data?.content || '';

    // 过滤包含"点击查看"的广告
    if (content.includes('点击查看')) {
        return true;
    }

    // 过滤包含">>"或"》"结尾的广告链接
    if (content.includes('>>') || content.endsWith('》')) {
        return true;
    }

    // 过滤包含"……"且长度较短的广告预览
    if (content.includes('……') && content.length < 200 && !content.includes('【')) {
        return true;
    }

    // 过滤推广引导式标题
    if (content.includes('——今日') || content.includes('——本周') || content.includes('——本月')) {
        return true;
    }

    // 过滤列表式推广标题
    if ((content.includes('个重点') || content.includes('个要点')) && (content.includes('需要关注') || content.includes('需要留意'))) {
        return true;
    }

    return false;
};

// 解析 flash_newest.js 的 JavaScript 代码
const parseFlashData = (rawData: string) => {
    // 移除 "var newest = " 和末尾的 ";"
    const jsonStr = rawData.replace(/^var\s+newest\s*=\s*/, '').replace(/;?\s*$/, '');
    return JSON.parse(jsonStr);
};

async function handler(ctx) {
    const channel = ctx.req.param('channel');
    const type = ctx.req.param('type');
    const important = ctx.req.param('important');

    const channelFilter = channel ? Number.parseInt(channel) : null;
    const typeFilter = type ? Number.parseInt(type) : null;
    const importantFilter = important ? Number.parseInt(important) : null;

    const cacheKey = `jin10:newflash:${channel || 'all'}:${type || 'all'}:${important || 'all'}`;

    const data = await cache.tryGet(
        cacheKey,
        async () => {
            const { data: response } = await got('https://www.jin10.com/flash_newest.js', {
                headers: {
                    Referer: 'https://www.jin10.com/',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                },
                searchParams: {
                    t: Date.now(),
                },
            });

            // 解析 JavaScript 变量赋值为 JSON
            const items = parseFlashData(response);

            // 过滤广告和 VIP 内容
            let filtered = items.filter((item: any) => !isAd(item));

            // 按频道过滤
            if (channelFilter) {
                filtered = filtered.filter((item: any) => item.channel && item.channel.includes(channelFilter));
            }

            // 按类型过滤 (0=快讯, 2=深度文章)
            if (typeFilter !== null) {
                filtered = filtered.filter((item: any) => item.type === typeFilter);
            }

            // 按重要性过滤
            if (importantFilter === 1) {
                filtered = filtered.filter((item: any) => item.important === 1);
            }

            return filtered;
        },
        config.cache.routeExpire,
        false
    );

    const items = data.map((item) => {
        const titleMatch = item.data.content.match(/^【(.*?)】/);
        let title;
        let content = item.data.content;

        if (titleMatch) {
            title = titleMatch[1];
            content = content.replace(titleMatch[0], '');
        } else {
            title = item.data.title || item.data.content;
        }

        // 获取所属频道
        const channels = (item.channel || []).map((ch: number) => channelMap[ch] || '').filter(Boolean);

        // 添加类型标签
        const typeLabel = item.type === 2 ? '【深度】' : '';
        const importantLabel = item.important === 1 ? '【重要】' : '';

        // 使用原文链接（如果有），否则使用金十锚点链接
        const itemLink = item.data.source_link || `https://www.jin10.com/#${item.id}`;

        // 处理 remark 附加信息
        const remarks = (item.remark || []).map((r: any) => ({
            type: r.type,
            data: r.data || {},
        }));

        return {
            title: `${importantLabel}${typeLabel}${title}`,
            description: art(path.join(__dirname, 'templates/newflash.art'), {
                content,
                pic: item.data.pic,
                source_link: item.data.source_link,
                remarks,
            }),
            pubDate: timezone(parseDate(item.time), 8),
            link: itemLink,
            guid: `jin10:newflash:${item.id}`,
            category: channels,
            author: item.data.source || '金十数据',
        };
    });

    // 构建标题
    const titleParts = ['金十数据'];
    if (channelFilter && channelMap[channelFilter]) {
        titleParts.push(channelMap[channelFilter]);
    }
    if (typeFilter === 0) {
        titleParts.push('快讯');
    } else if (typeFilter === 2) {
        titleParts.push('深度文章');
    }
    if (importantFilter === 1) {
        titleParts.push('重要');
    }

    return {
        title: titleParts.join(' - '),
        link: 'https://www.jin10.com/',
        item: items,
        description: titleParts.slice(1).join(' ') || '实时快讯',
    };
}
