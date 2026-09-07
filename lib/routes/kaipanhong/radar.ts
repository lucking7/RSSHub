import type { Route } from '@/types';
import { ViewType } from '@/types';

import { radarHandler } from './shared';

export const route: Route = {
    path: '/radar',
    name: '盘口雷达',
    url: 'kaipanhong.com',
    maintainers: [],
    handler: radarHandler,
    example: '/kaipanhong/radar',
    view: ViewType.Articles,
    description: '开盘红盘口雷达事件流。',
    categories: ['finance'],
    features: { requireConfig: false, requirePuppeteer: false, antiCrawler: false, supportRadar: false, supportBT: false, supportPodcast: false, supportScihub: false },
    cacheTtl: 1,
};
