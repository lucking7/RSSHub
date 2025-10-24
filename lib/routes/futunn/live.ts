import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

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
        const audio = item.audioInfos.find((audio) => audio.language === lang);

        const isImportant = item.level === 1;
        const title = (isImportant ? '【重要】' : '') + (item.title || item.content);

        const quoteNames = item.quote.map((q) => q.name);
        const relatedNames = (item.relatedStocks || []).map((s) => s.name).filter(Boolean);
        const category = [...new Set([...quoteNames, ...relatedNames])];

        let description = item.content;
        const relatedStocks = item.relatedStocks || [];
        if (relatedStocks.length > 0) {
            const stockItems = relatedStocks.filter((s) => s.name);
            if (stockItems.length > 0) {
                description += '<br><div style="background: #f5f5f5; border-left: 3px solid #52c41a; padding: 10px 15px; margin: 15px 0 10px 0; border-radius: 4px;">';
                description += '<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333;">相关股票</h3>';
                for (const s of stockItems) {
                    description += `• <strong>${s.name}</strong>`;
                    if (s.code) {
                        description += ` <span style="color: #999;">(${s.code})</span>`;
                    }
                    description += '<br>';
                }
                description += '</div>';
            }
        }

        return {
            guid: `futunn:flash:${item.id}`,
            title,
            description,
            link: item.detailUrl,
            pubDate: parseDate(item.time * 1000),
            category,
            itunes_item_image: item.pic,
            itunes_duration: audio.duration,
            enclosure_url: audio.audioUrl,
            enclosure_type: 'audio/mpeg',
            media: {
                content: {
                    url: audio.audioUrl,
                    type: 'audio/mpeg',
                    duration: audio.duration,
                    language: lang === 'Mandarin' ? 'zh-CN' : lang === 'Cantonese' ? 'zh-HK' : 'en',
                },
                thumbnail: {
                    url: item.pic,
                },
            },
        };
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
