import { Route, ViewType } from '@/types';

import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';
import { art } from '@/utils/render';
import path from 'node:path';
import { config } from '@/config';

export const route: Route = {
    path: '/:important?',
    categories: ['finance', 'popular'],
    view: ViewType.Notifications,
    example: '/jin10',
    parameters: { important: '只看重要，任意值开启，留空关闭' },
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
};

// 广告过滤函数
const isAd = (item: any): boolean => {
    // 过滤 type=1 的推广内容
    if (item.type === 1) {
        return true;
    }

    // 过滤 VIP 付费内容
    if (item.data?.vip_level && item.data.vip_level > 0) {
        return true;
    }

    const content = item.data?.content || '';

    // 过滤包含"点击查看"的广告（包括各种变体）
    if (content.includes('点击查看')) {
        return true;
    }

    // 过滤包含">>"或"》"结尾的广告链接
    if (content.includes('>>') || content.endsWith('》')) {
        return true;
    }

    // 过滤包含"……"且长度较短的广告预览（通常是VIP内容推广）
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
    const { important = false } = ctx.req.param();

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
            return response.data.filter((item: any) => !isAd(item));
        },
        config.cache.routeExpire,
        false
    );

    const item = data.map((item) => {
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
        title: '金十数据',
        link: 'https://www.jin10.com/',
        item: important ? item.filter((item) => item.important) : item,
    };
}
