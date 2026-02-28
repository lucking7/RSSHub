import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

import { renderDescription } from './templates/description';

export const route: Route = {
    path: '/live/:lang?',
    categories: ['finance'],
    example: '/futunn/live',
    parameters: {
        lang: {
            description: '通知语言',
            default: 'Mandarin',
            options: [
                {
                    label: '国语',
                    value: 'Mandarin',
                },
                {
                    label: '粵語',
                    value: 'Cantonese',
                },
                {
                    label: 'English',
                    value: 'English',
                },
            ],
        },
    },
    features: {
        supportRadar: true,
    },
    radar: [
        {
            source: ['news.futunn.com/main/live'],
            target: '/live',
        },
        {
            source: ['news.futunn.com/hk/main/live'],
            target: '/live/Cantonese',
        },
        {
            source: ['news.futunn.com/en/main/live'],
            target: '/live/English',
        },
    ],
    name: '快讯',
    maintainers: ['kennyfong19931'],
    handler,
};

const langConfig = {
    Mandarin:  { header: 0, path: '',    locale: 'zh-CN', title: '富途牛牛 - 快讯',   author: '富途牛牛' },
    Cantonese: { header: 1, path: '/hk', locale: 'zh-HK', title: '富途牛牛 - 快訊',   author: '富途牛牛' },
    English:   { header: 2, path: '/en', locale: 'en',    title: 'Futubull - Latest', author: 'Futubull' },
};

async function handler(ctx) {
    const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 30;
    const lang = ctx.req.param('lang') ?? 'Mandarin';
    const cfg = langConfig[lang] ?? langConfig.Mandarin;

    const rootUrl = 'https://news.futunn.com';
    const link = `${rootUrl}${cfg.path}/main/live`;
    const apiUrl = `${rootUrl}/news-site-api/main/get-flash-list?pageSize=${limit}`;

    const response = await got({
        method: 'get',
        url: apiUrl,
        headers: {
            'x-news-site-lang': cfg.header,
        },
    });

    const items = response.data.data.data.news.map((item) => {
        const audio = item.audioInfos?.find((a) => a.language === lang);

        const isImportant = item.level === 1;
        const title = (isImportant ? '【重要】' : '') + (item.title || item.content);

        const stocks = (item.quote || [])
            .filter((q) => q.name)
            .map((q) => ({
                name: q.name,
                code: q.code,
                href: q.quoteUrl ? `https://${q.quoteUrl}` : undefined,
                ratio: q.changeRatio,
                price: q.price,
                up: q.changeRatio?.startsWith('+'),
                down: q.changeRatio?.startsWith('-'),
            }));

        const quoteNames = stocks.map((s) => s.name);
        const relatedNames = (item.relatedStocks || []).map((s) => s.name).filter(Boolean);
        const category = [...new Set([...quoteNames, ...relatedNames])];

        const description = renderDescription({ abs: item.content, stocks });

        const result: Record<string, unknown> = {
            guid: `futunn:flash:${item.id}`,
            title,
            description,
            link: item.detailUrl,
            pubDate: parseDate(item.time * 1000),
            category,
            itunes_item_image: item.pic,
        };

        if (audio) {
            result.itunes_duration = audio.duration;
            result.enclosure_url = audio.audioUrl;
            result.enclosure_type = 'audio/mpeg';
            result.media = {
                content: {
                    url: audio.audioUrl,
                    type: 'audio/mpeg',
                    duration: audio.duration,
                    language: cfg.locale,
                },
                thumbnail: { url: item.pic },
            };
        }

        return result;
    });

    return {
        title: cfg.title,
        link,
        item: items,
        language: cfg.locale,
        itunes_author: cfg.author,
        itunes_category: 'News',
    };
}
