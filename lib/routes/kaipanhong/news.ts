import type { Route } from '@/types';
import { ViewType } from '@/types';

import { newsHandler } from './shared';

export const route: Route = {
    path: '/news/:type?',
    name: '新闻快讯',
    url: 'kaipanhong.com',
    maintainers: [],
    handler: newsHandler,
    example: '/kaipanhong/news',
    view: ViewType.Articles,
    parameters: { type: '新闻类型，可选 stock、commodity（保留兼容名称）或原始类型 0、1、2，默认 stock' },
    description: '开盘红新闻快讯，类型标签按上游原始分类保留。',
    categories: ['finance'],
    features: { requireConfig: false, requirePuppeteer: false, antiCrawler: false, supportRadar: false, supportBT: false, supportPodcast: false, supportScihub: false },
    cacheTtl: 1,
};
