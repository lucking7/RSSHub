import { Route, ViewType } from '@/types';

import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';
import { art } from '@/utils/render';
import path from 'node:path';
import { config } from '@/config';

export const route: Route = {
    path: '/:important?/:filter?',
    categories: ['finance'],
    view: ViewType.Notifications,
    example: '/jin10',
    parameters: {
        important: '只看重要，任意值开启，留空关闭',
        filter: '广告过滤控制。默认过滤广告，填写 `all` 显示全部内容（包含广告），留空则过滤广告',
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
            source: ['jin10.com/'],
            target: '',
        },
    ],
    name: '市场快讯',
    maintainers: ['laampui'],
    handler,
    url: 'jin10.com/',
    description: `
:::tip
**默认过滤广告**，提供纯净的快讯订阅体验。

使用方法：
- \`/jin10\` - 过滤广告（默认，推荐）⭐
- \`/jin10/important\` - 只看重要快讯且过滤广告（推荐）⭐⭐
- \`/jin10//all\` - 显示全部内容（包含广告）
- \`/jin10/important/all\` - 只看重要快讯，包含广告

过滤规则（默认启用）：
1. 过滤VIP锁定内容（如"VIP专享快讯，解锁直达"）
2. 过滤推广文章（type=2，通常包含"点击查看..."）
3. 过滤包含诱导点击的内容

如需查看所有内容（包含广告），请使用 \`all\` 参数。
:::
    `,
};

async function handler(ctx) {
    const { important = false, filter = '' } = ctx.req.param();
    // 默认开启过滤，只有明确指定 'all' 才显示全部（包含广告）
    const enableFilter = filter !== 'all';

    const data = await cache.tryGet(
        'jin10:index',
        async () => {
            const { data: response } = await got('https://flash-api.jin10.com/get_flash_list', {
                headers: {
                    'x-app-id': 'bVBF4FyRTn5NJF5n',
                    'x-version': '1.0.0',
                },
                searchParams: {
                    channel: '-8200',
                    vip: '1',
                },
            });
            return response.data.filter((item) => item.type !== 1);
        },
        config.cache.routeExpire,
        false
    );

    // 过滤广告函数
    const filterAds = (item) => {
        // 1. 过滤VIP锁定内容（lock=true）
        if (item.data.lock === true) {
            return false;
        }

        // 2. 过滤推广文章（type=2）
        if (item.type === 2) {
            return false;
        }

        // 3. 过滤包含"点击查看..."的诱导内容
        const content = item.data.content || '';
        if (content.includes('点击查看...')) {
            return false;
        }

        // 4. 过滤VIP专享内容（通过remark判断）
        if (item.remark && item.remark.length > 0) {
            const hasVipRemark = item.remark.some((r) => r.lock === true || r.content?.includes('VIP用户'));
            if (hasVipRemark) {
                return false;
            }
        }

        return true;
    };

    // 应用过滤
    const filteredData = enableFilter ? data.filter(filterAds) : data;

    const item = filteredData.map((item) => {
        const titleMatch = item.data.content.match(/^【(.*?)】/);
        let title;
        let content = item.data.content;
        if (titleMatch) {
            title = titleMatch[1];
            content = content.replace(titleMatch[0], '');
        } else {
            title = item.data.vip_title || item.data.content;
        }

        return {
            title,
            description: art(path.join(__dirname, 'templates/description.art'), {
                content,
                pic: item.data.pic,
            }),
            pubDate: timezone(parseDate(item.time), 8),
            link: item.data.link,
            guid: `jin10:index:${item.id}`,
            important: item.important,
        };
    });

    return {
        title: enableFilter ? '金十数据' : '金十数据（含广告）',
        link: 'https://www.jin10.com/',
        item: important ? item.filter((item) => item.important) : item,
    };
}
