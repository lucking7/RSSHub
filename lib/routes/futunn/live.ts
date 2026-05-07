import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

import { applySourceImportance } from '../_finance/source-importance';

export const route: Route = {
    path: '/live/:lang?',
    categories: ['finance'],
    example: '/futunn/live',
    parameters: {
        category: {
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

async function handler(ctx) {
    const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 30;
    const lang = ctx.req.param('lang') ?? 'Mandarin';

    const rootUrl = 'https://news.futunn.com';
    const link = `${rootUrl}/main${lang === 'Mandarin' ? '' : lang === 'Cantonese' ? '/hk' : '/en'}/live`;
    const apiUrl = `${rootUrl}/news-site-api/main/get-flash-list?pageSize=${limit}`;

    const response = await got({
        method: 'get',
        url: apiUrl,
        headers: {
            'x-news-site-lang': lang === 'Mandarin' ? 0 : lang === 'Cantonese' ? 1 : 2,
        },
    });

    const items = response.data.data.data.news.map((item) => {
        const title = item.title || item.content;
        const category = (item.quote || []).map((quote) => quote.name);
        // Audio enclosure — disabled for now, upstream API provides TTS audio per language
        // const audioInfo = (item.audioInfos || []).find((a) => a.language === lang);
        // const audioUrl = audioInfo?.audioUrl;
        return applySourceImportance(
            {
                title,
                description: item.content,
                link: item.detailUrl,
                pubDate: parseDate(item.time * 1000),
                category,
                // ...(audioUrl ? { enclosure_url: audioUrl, enclosure_type: 'audio/mpeg', itunes_duration: audioInfo.audioDuration } : {}),
            },
            item.level === undefined
                ? []
                : [
                      {
                          source: 'futunn',
                          field: 'level',
                          value: item.level,
                          label: '新闻等级',
                          normalized: item.level === 1 ? 'important' : 'normal',
                      },
                  ]
        );
    });

    return {
        title: lang === 'Mandarin' ? '富途牛牛 - 快讯' : lang === 'Cantonese' ? '富途牛牛 - 快訊' : 'Futubull - Latest',
        link,
        item: items,
        language: lang === 'Mandarin' ? 'zh-CN' : lang === 'Cantonese' ? 'zh-HK' : 'en',
        itunes_author: lang === 'Mandarin' || lang === 'Cantonese' ? '富途牛牛' : 'Futubull',
        itunes_category: 'News',
    };
}
