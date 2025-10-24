import type { Route } from '@/types';
import { ViewType } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

export const route: Route = {
    path: '/flash/:channel?',
    categories: ['finance'],
    view: ViewType.Notifications,
    example: '/jin10/flash',
    parameters: {
        channel: '频道，可选，留空为全部快讯',
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
    maintainers: [''],
    handler,
    description: `获取金十数据（美港电讯）的实时财经快讯。

支持参数：
- \`important_only=1\` 仅返回重要快讯
- \`limit=50\` 限制返回数量（默认50条）

示例：
- \`/jin10/flash\` - 所有快讯
- \`/jin10/flash?important_only=1\` - 仅重要快讯
- \`/jin10/flash?limit=20\` - 限制20条`,
};

// 广告过滤函数
const isAd = (item: any): boolean => {
    // 过滤 type=1 的推广内容
    if (item.type === 1) {
        return true;
    }

    // 过滤 type=2 的深度文章（多为软广引流）
    if (item.type === 2) {
        return true;
    }

    // 过滤 VIP 付费内容
    if (item.data?.vip_level && item.data.vip_level > 0) {
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

async function handler(ctx) {
    const channel = ctx.req.param('channel') ?? '';
    const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 50;
    const importantOnly = ctx.req.query('important_only') === '1';

    const rootUrl = 'https://www.ushknews.com';
    const apiUrl = 'https://flash-api.ushknews.com/get_flash_list_with_channel';

    const response = await got({
        method: 'get',
        url: apiUrl,
        searchParams: {
            channel,
        },
        headers: {
            'x-app-id': 'brCYec5s1ova317e',
            'x-version': '1.0.0',
            referer: 'https://www.ushknews.com/',
        },
    });

    const data = response.data?.data ?? [];

    // 过滤广告和重要快讯
    let filteredData = data.filter((item) => !isAd(item));
    if (importantOnly) {
        filteredData = filteredData.filter((item) => item.important === 1);
    }
    const list = filteredData.slice(0, limit);

    const items = list.map((item) => {
        const id = item.id;

        const content = item.data?.content ?? '';

        // 提取标题和正文 - 保留【】书名号（与 sina 一致）
        let baseTitle = '';
        let bodyContent = '';

        const bracketMatch = content.match(/^【([^】]+)】(.*)$/s);
        if (bracketMatch) {
            baseTitle = `【${bracketMatch[1].trim()}】`;
            bodyContent = bracketMatch[2].trim();
        } else {
            // 使用内容前80个字符作为标题
            const plainText = (item.data?.title && item.data.title.trim()) || content.replaceAll(/<[^>]+>/g, '');
            baseTitle = plainText.length > 80 ? plainText.slice(0, 80) + '…' : plainText;
            bodyContent = content;
        }

        const link = `${rootUrl}/#${id}`;
        const pubDate = timezone(parseDate(item.time), +8);
        const isImportant = item.important === 1;
        const isVip = item.data?.vip_level && item.data.vip_level > 0;

        // 构建标题前缀（纯文本，用于 RSS 标题）
        const titlePrefix = isImportant ? '[重要]' : '';
        const title = titlePrefix ? `${titlePrefix} ${baseTitle}` : baseTitle;

        // 构建 description
        // 标题（下划线+加粗）
        const titleHtml = `<p style="margin: 0 0 10px 0;"><strong><u>${baseTitle}</u></strong></p>`;
        // 重要标签 HTML（加粗+斜体+划线）
        const importantHtml = isImportant ? '<p style="margin: 0 0 8px 0;"><b><i><u>[重要]</u></i></b></p>' : '';

        // 正文内容
        let description = bodyContent;

        // 收集所有图片
        const images: string[] = [];
        if (item.data?.pic) {
            images.push(item.data.pic);
        }

        if (item.remark && Array.isArray(item.remark)) {
            for (const remark of item.remark) {
                if (remark.pic) {
                    images.push(remark.pic);
                }
            }
        }

        // 添加来源信息（如果有）
        if (item.data?.source) {
            const sourceLink = item.data?.source_link;
            const sourceText = sourceLink ? `<a href="${sourceLink}" target="_blank">${item.data.source}</a>` : item.data.source;
            description += `<br><br><p style="color: #666; font-size: 0.9em;">来源: ${sourceText}</p>`;
        }

        // 构建分类
        const category: string[] = [];

        if (isImportant) {
            category.push('重要');
        }

        if (isVip) {
            category.push('VIP');
        }

        if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
            category.push(...item.tags.map((tag: any) => tag.toString()));
        }

        if (item.channel && Array.isArray(item.channel) && item.channel.length > 0) {
            category.push(...item.channel.map((ch: any) => ch.toString()));
        }

        if (item.remark && Array.isArray(item.remark)) {
            for (const remark of item.remark) {
                if (remark.category_name) {
                    category.push(remark.category_name);
                }
                if (remark.symbol) {
                    category.push(remark.symbol);
                }
            }
        }

        const result: any = {
            title,
            description: titleHtml + importantHtml + description,
            link,
            pubDate,
            category: [...new Set(category)],
            guid: id,
            author: item.data?.source || '金十数据',
        };

        if (images.length > 0) {
            result.image = images[0];
            result.enclosure_url = images[0];
            result.enclosure_type = 'image/jpeg';
        }

        return result;
    });

    return {
        title: `金十数据 - 美港电讯${importantOnly ? ' - 重要快讯' : ''}${channel ? ` - ${channel}` : ''}`,
        link: rootUrl,
        item: items,
        description: `金十数据实时财经快讯${importantOnly ? '（仅重要）' : ''}`,
    };
}
