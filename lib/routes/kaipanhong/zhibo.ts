import type { Route } from '@/types';
import { ViewType } from '@/types';

import { zhiboHandler } from './shared';

export const route: Route = {
    path: '/dapanzhibo/:category?',
    name: '大盘直播',
    url: 'kaipanhong.com',
    maintainers: [],
    handler: zhiboHandler,
    example: '/kaipanhong/dapanzhibo',
    view: ViewType.Articles,
    parameters: { category: '可选筛选：板块名、分析师名、个股或板块' },
    description: '开盘红大盘直播。',
    categories: ['finance'],
    features: { requireConfig: false, requirePuppeteer: false, antiCrawler: false, supportRadar: false, supportBT: false, supportPodcast: false, supportScihub: false },
    cacheTtl: 1,
};
