import { config } from '@/config';
import type { Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

import { isJin10PromotionalItem } from './filters';

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

// 频道名称映射
const channelMap: Record<number, string> = {
    1: '外汇/贵金属',
    2: '期货',
    3: '全球市场',
    4: 'A股',
};

// 解析 flash_newest.js 的 JavaScript 代码
const parseFlashData = (rawData: string) => {
    // 移除 "var newest = " 和末尾的 ";"
    const jsonStr = rawData.replace(/^var\s+newest\s*=\s*/, '').replace(/;?\s*$/, '');
    return JSON.parse(jsonStr);
};

async function handler(ctx) {
    // 支持路径参数和查询参数，查询参数优先
    const channel = ctx.req.query('channel') || ctx.req.param('channel');
    const important = ctx.req.query('important') || ctx.req.param('important');

    const channelFilter = channel ? Number.parseInt(channel) : null;
    const importantFilter = important ? Number.parseInt(important) : null;

    const cacheKey = `jin10:newflash:${channel || 'all'}:${important || 'all'}`;

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

            // 过滤广告、VIP 和深度文章
            let filtered = items.filter((item: any) => !isJin10PromotionalItem(item));

            // 按频道过滤
            if (channelFilter) {
                filtered = filtered.filter((item: any) => item.channel && item.channel.includes(channelFilter));
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
        // 提取标题 - 从【】中提取，保留书名号（与 sina 一致）
        const titleMatch = item.data.content.match(/^【([^】]+)】/);
        let baseTitle;
        let content = item.data.content;

        if (titleMatch) {
            // 保留【】书名号
            baseTitle = `【${titleMatch[1]}】`;
            content = content.replace(titleMatch[0], '').trim();
        } else {
            // 使用内容前80个字符作为标题（与 sina 一致）
            const plainText = (item.data.title || item.data.content || '').replaceAll(/<[^>]+>/g, '');
            baseTitle = plainText.length > 80 ? plainText.slice(0, 80) + '…' : plainText;
        }

        // 获取所属频道
        const channels = (item.channel || []).map((ch: number) => channelMap[ch] || '').filter(Boolean);

        // 添加重要标签
        const importantLabel = item.important === 1 ? '重要' : '';

        // 从 remark 中提取有价值的标签信息
        const remarkTags: string[] = [];
        if (item.remark && item.remark.length > 0) {
            for (const r of item.remark) {
                // 提取行情数据的名称和代码
                if (r.type === 'quotes') {
                    if (r.title) {
                        remarkTags.push(r.title);
                    }
                    if (r.symbol) {
                        remarkTags.push(r.symbol);
                    }
                }
                // 提取图表标题
                else if (r.type === 'miniProgram' && r.title) {
                    remarkTags.push(r.title);
                }
                // 提取链接标题
                else if (r.type === 'link' && r.title) {
                    remarkTags.push(r.title);
                }
            }
        }

        // 组合标签到 category（去重）
        const allCategories = [...new Set([...channels, ...remarkTags])];
        if (importantLabel) {
            allCategories.push(importantLabel);
        }

        // 使用原文链接（如果有），否则使用金十锚点链接
        const itemLink = item.data.source_link || `https://www.jin10.com/#${item.id}`;

        // 构建标题前缀（纯文本，用于 RSS 标题）
        const titlePrefix = item.important === 1 ? '[重要]' : '';

        // 最终标题（带前缀）
        const title = titlePrefix ? `${titlePrefix} ${baseTitle}` : baseTitle;

        // 构建简洁的 HTML 描述（符合 RSS2.0 标准）
        let description = '';

        // 标题（下划线+加粗）
        description += `<p style="margin: 0 0 10px 0;"><strong><u>${baseTitle}</u></strong></p>`;

        // 重要标签（加粗+斜体+划线）
        if (item.important === 1) {
            description += `<p style="margin: 0 0 8px 0;"><b><i><u>[重要]</u></i></b></p>`;
        }

        // 正文内容
        description += `<p style="margin: 0 0 10px 0; line-height: 1.6; color: #333;">${content}</p>`;

        // 添加原文链接
        if (item.data.source_link) {
            description += `<p style="margin: 5px 0 0 0;"><a href="${item.data.source_link}" target="_blank" style="color: #1890ff;">查看原文</a></p>`;
        }

        // 添加图片（如果有）
        if (item.data.pic) {
            description += `<br><img src="${item.data.pic}" alt="配图" referrerpolicy="no-referrer" style="max-width: 100%; border-radius: 4px; margin-top: 10px;">`;
        }

        // 构建返回对象
        return {
            title,
            description,
            pubDate: timezone(parseDate(item.time), 8),
            link: itemLink,
            guid: `jin10:new:${item.id}`,
            category: allCategories,
            author: item.data.source || '金十数据',
        };
    });

    // 构建 RSS 频道标题
    const titleParts = ['金十数据'];
    if (channelFilter && channelMap[channelFilter]) {
        titleParts.push(channelMap[channelFilter]);
    }
    if (importantFilter === 1) {
        titleParts.push('重要');
    }

    const channelTitle = titleParts.join(' - ');
    const channelDescription = titleParts.slice(1).join(' ') || '实时财经快讯';

    // 返回符合 RSS2.0 标准的数据
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
