import { load } from 'cheerio';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

import { renderDescription } from './templates/description';

export const route: Route = {
    path: '/topic/:id',
    categories: ['finance'],
    example: '/futunn/topic/1267',
    parameters: { id: 'Topic ID, can be found in URL' },
    features: {
        supportRadar: true,
    },
    radar: [
        {
            source: ['news.futunn.com/news-topics/:id/*', 'news.futunn.com/:lang/news-topics/:id/*'],
            target: '/topic/:id',
        },
    ],
    name: '专题',
    maintainers: ['kennyfong19931'],
    handler,
};

async function getTopic(rootUrl, id, seqMarkInput = '') {
    const topicListResponse = await got({
        method: 'get',
        url: `${rootUrl}/news-site-api/main/get-topics-list?pageSize=48&seqMark=${seqMarkInput}`,
    });
    const { hasMore, seqMark, list } = topicListResponse.data.data.data;
    const topic = list.find((item) => item.idx === id);
    if (topic) {
        return {
            topicTitle: topic.title,
            topicDescription: topic.detail,
        };
    } else if (hasMore === 1) {
        return getTopic(rootUrl, id, seqMark);
    } else {
        return {
            topicTitle: '',
            topicDescription: '',
        };
    }
}

async function handler(ctx) {
    const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 48;
    const id = ctx.req.param('id');

    const rootUrl = 'https://news.futunn.com';
    const link = `${rootUrl}/news-topics/${id}/`;
    const apiUrl = `${rootUrl}/news-site-api/topic/get-topics-news-list?topicsId=${id}&pageSize=${limit}`;

    const { topicTitle, topicDescription } = await cache.tryGet(link, async () => await getTopic(rootUrl, id));

    const response = await got({
        method: 'get',
        url: apiUrl,
    });

    let items = response.data.data.data.map((item) => ({
        title: item.title,
        link: item.url,
        guid: `futunn:topic:${item.newsId || item.id}`,
        author: item.source,
        pubDate: parseDate(item.time * 1000),
        category: (item.quote || []).map((q) => q.name).filter(Boolean),
        description: (() => {
            let desc = renderDescription({
                abs: item.abstract,
                pic: item.pic,
            });
            const quotes = item.quote || [];
            if (quotes.length > 0) {
                desc += '<br><div style="background: #f5f5f5; border-left: 3px solid #52c41a; padding: 10px 15px; margin: 15px 0 10px 0; border-radius: 4px;">';
                desc += '<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333;">相关股票</h3>';
                for (const q of quotes) {
                    const changeColor = q.changeRatio && q.changeRatio.startsWith('+') ? '#ff4d4f' : q.changeRatio && q.changeRatio.startsWith('-') ? '#52c41a' : '#666';
                    const arrow = q.changeRatio && q.changeRatio.startsWith('+') ? '↑' : q.changeRatio && q.changeRatio.startsWith('-') ? '↓' : '-';
                    desc += `• <strong>${q.name}</strong> <span style="color: #999;">(${q.code})</span><br>`;
                    if (q.changeRatio) {
                        desc += `<span style="color: ${changeColor}; font-weight: bold;">${arrow} ${q.changeRatio}</span>`;
                        if (q.price) {
                            desc += ` <span style="color: #999;">价格: ${q.price}</span>`;
                        }
                        desc += '<br>';
                    }
                }
                desc += '</div>';
            }
            return desc;
        })(),
    }));

    items = await Promise.all(
        items.map((item) =>
            cache.tryGet(item.link, async () => {
                if (/news\.futunn\.com/.test(item.link)) {
                    const detailResponse = await got({
                        method: 'get',
                        url: item.link,
                    });

                    const content = load(detailResponse.data);

                    content('.futu-news-time-stamp').remove();
                    content('.nnstock').each(function () {
                        content(this).replaceWith(`<a href="${content(this).attr('href')}">${content(this).text().replaceAll('$', '')}</a>`);
                    });

                    item.description = content('.origin_content').html();
                    item.category = [
                        ...(item.category || []),
                        ...content('.news__from-topic__title')
                            .toArray()
                            .map((a) => content(a).text().trim()),
                        ...content('#relatedStockWeb .stock-name')
                            .toArray()
                            .map((s) => content(s).text().trim()),
                    ];
                }

                return item;
            })
        )
    );

    return {
        title: `富途牛牛 - 专题 - ${topicTitle}`,
        link,
        description: topicDescription,
        item: items,
    };
}
