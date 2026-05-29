import type { Route } from '@/types';
import { ViewType } from '@/types';

import { fetchInitArticles, LONGBRIDGE_CACHE_TTL, mapInitArticle, WEB_BASE } from './utils';

export const route: Route = {
    path: '/news/:lang?',
    name: '资讯首页',
    url: 'longbridge.com/zh-CN/news',
    maintainers: ['luck'],
    handler,
    example: '/longbridge/news',
    parameters: {
        lang: '语言，可选 `zh-CN`（默认）、`zh-HK`、`en`',
    },
    description: '长桥资讯首页，对应 [longbridge.com/zh-CN/news](https://longbridge.com/zh-CN/news)。',
    categories: ['finance'],
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
            source: ['longbridge.com/zh-CN/news'],
            target: '/news',
        },
        {
            source: ['longbridge.com/zh-HK/news'],
            target: '/news/zh-HK',
        },
        {
            source: ['longbridge.com/en/news'],
            target: '/news/en',
        },
    ],
    view: ViewType.Articles,
    cacheTtl: LONGBRIDGE_CACHE_TTL,
};

async function handler(ctx) {
    const lang = ctx.req.param('lang') || 'zh-CN';
    const articles = await fetchInitArticles(lang);

    return {
        title: lang === 'en' ? 'Longbridge - News' : lang === 'zh-HK' ? '長橋 - 資訊' : '长桥 - 资讯',
        link: `${WEB_BASE}/${lang}/news`,
        description: '长桥最新财经资讯',
        language: lang,
        item: articles.map((item) => mapInitArticle(item)),
    };
}
