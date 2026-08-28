import type { Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';

import { applySourceImportance } from '../_finance/source-importance';
import { isJin10AdFeedItem, isJin10PromotionalItem } from './filters';
import { attachJin10HotLabels } from './hot';
import { mapClassicJin10FlashItem } from './utils';

export const route: Route = {
    path: '/:important?',
    categories: ['finance'],
    view: ViewType.Notifications,
    example: '/jin10',
    cacheTtl: 1,
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
            return attachJin10HotLabels(response.data.filter((item) => !isJin10PromotionalItem(item)));
        },
        1,
        false
    );

    const filteredData = important ? data.filter((item) => item.important === 1) : data;

    const item = filteredData
        .map((item) =>
            applySourceImportance(
                mapClassicJin10FlashItem(item, {
                    guidPrefix: 'jin10:index:',
                    link: item.data?.link,
                }),
                [
                    {
                        source: 'jin10',
                        field: 'important',
                        value: item.important,
                        label: '重要',
                        normalized: item.important === 1 ? 'important' : 'normal',
                    },
                ]
            )
        )
        .filter((item) => !isJin10AdFeedItem(item));

    return {
        title: '金十数据',
        link: 'https://www.jin10.com/',
        item,
    };
}
