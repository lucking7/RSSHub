import type { Data, DataItem, Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

import { CALENDAR_API, CALENDAR_HEADERS, mapUshknewsEventItem, mapUshknewsRiliItem, USHKNEWS_SITE } from './utils';

const USHKNEWS_CALENDAR_CACHE_TTL = 60;

export const route: Route = {
    path: '/calendar',
    categories: ['finance'],
    view: ViewType.Notifications,
    example: '/ushknews/calendar',
    cacheTtl: USHKNEWS_CALENDAR_CACHE_TTL,
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
            source: ['ushknews.com/'],
            target: '/calendar',
        },
    ],
    name: '财经日历',
    maintainers: ['luck'],
    handler,
    url: 'ushknews.com/',
    description: '美港电讯当日财经日历，合并经济数据（rili）和事件（events）。数据卡带实际 / 预期 / 前值；利多 / 利空 和 重要会写入 category。',
};

const getItemTime = (item: DataItem): number => {
    if (!item.pubDate) {
        return 0;
    }
    const date = item.pubDate instanceof Date ? item.pubDate : parseDate(item.pubDate);
    const time = date.getTime();
    return Number.isNaN(time) ? 0 : time;
};

async function handler(): Promise<Data> {
    const items: DataItem[] = await cache.tryGet(
        'ushknews:calendar',
        async () => {
            const [{ data: riliResponse }, { data: eventsResponse }] = await Promise.all([got(`${CALENDAR_API}/rili`, { headers: CALENDAR_HEADERS }), got(`${CALENDAR_API}/events`, { headers: CALENDAR_HEADERS })]);
            const riliItems = (riliResponse.data ?? []).map((item) => mapUshknewsRiliItem(item)).filter((item): item is DataItem => Boolean(item));
            const eventItems = (eventsResponse.data ?? []).map((item) => mapUshknewsEventItem(item)).filter((item): item is DataItem => Boolean(item));
            return [...riliItems, ...eventItems].toSorted((a, b) => getItemTime(b) - getItemTime(a));
        },
        USHKNEWS_CALENDAR_CACHE_TTL,
        false
    );

    return {
        title: '美港电讯·财经日历',
        link: USHKNEWS_SITE,
        description: '美港电讯当日经济数据与财经事件',
        language: 'zh-CN',
        item: items,
        author: '美港电讯',
        image: `${USHKNEWS_SITE}/app/favicon.ico`,
    };
}
