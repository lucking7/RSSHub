import { escapeText } from 'entities';

import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/calendar/:section?',
    categories: ['finance'],
    example: '/wallstreetcn/calendar',
    parameters: { section: '`macrodatas` 或 `report`，默认为 `macrodatas`' },
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
            source: ['wallstreetcn.com/calendar'],
        },
    ],
    name: '财经日历',
    maintainers: ['TonyRL'],
    handler,
    url: 'wallstreetcn.com/calendar',
};

const rootUrl = 'https://wallstreetcn.com';

const MacrodataSuffix = {
    CA: 'CA10YR.OTC',
    CN: 'USDCNH.OTC',
    DE: 'DE30.OTC',
    FR: 'FR40.OTC',
    // HK: '',
    IT: 'EURUSD.OTC',
    JP: 'USDJPY.OTC',
    UK: 'UK100.OTC',
    US: 'DXY.OTC',
};

const getMacrodataUrl = (countryId, wscnTicker) => `${rootUrl}/data-analyse/${wscnTicker}/${MacrodataSuffix[countryId]}`;

const hasValue = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== '' && String(value).trim() !== '-';

const formatMacrodata = (item) => {
    const country = String(item.country ?? '').trim();
    const event = String(item.title ?? '').trim();
    const title = !country || event.startsWith(country) ? event : `${country} · ${event}`;
    const previous = hasValue(item.revised) ? item.revised : item.previous;
    const values = [item.actual, item.forecast, previous];
    const formatValue = (value) => (hasValue(value) ? escapeText(`${value}${item.unit ?? ''}`) : '-');
    const description = [
        `<p>${escapeText(title)}</p>`,
        `<p>重要性：${'★'.repeat(item.importance)}</p>`,
        ...(values.some(hasValue) ? [`<p>今值：${formatValue(item.actual)}<br/>预期：${formatValue(item.forecast)}<br/>前值：${formatValue(previous)}</p>`] : []),
    ].join('');
    return { title, description };
};

async function handler(ctx) {
    const { section = 'macrodatas' } = ctx.req.param();

    const link = `${rootUrl}/calendar`;
    const apiRootUrl = section === 'macrodatas' ? 'https://api-one-wscn.awtmt.com' : 'https://api-ddc-wscn.awtmt.com';
    const apiUrl = section === 'macrodatas' ? `${apiRootUrl}/apiv1/finance/macrodatas` : `${apiRootUrl}/finance/report/list`;

    const response = await ofetch(apiUrl, {
        query:
            section === 'macrodatas'
                ? {
                      start: new Date().setHours(0, 0, 0, 0) / 1000,
                      end: Math.trunc(new Date().setHours(23, 59, 59, 999) / 1000),
                  }
                : undefined,
    });

    const items =
        section === 'macrodatas'
            ? response.data.items.map((item) => ({
                  ...formatMacrodata(item),
                  link: item.uri && MacrodataSuffix[item.country_id] && getMacrodataUrl(item.country_id, item.wscn_ticker),
                  guid: item.id,
                  pubDate: parseDate(item.public_date, 'X'),
                  category: item.country,
              }))
            : // report
              response.data.items
                  .map((item) => Object.fromEntries(response.data.fields.map((field, index) => [field, item[index]])))
                  .map((item) => ({
                      title: `${item.company_name} ${item.observation_date}`,
                      description: `${item.code} ${item.company_name} ${item.observation_date} 预期EPS: ${item.eps_estimate === 0 ? '-' : item.eps_estimate} 实际EPS: ${item.reported_eps === 0 ? '-' : item.reported_eps} 差异度: ${item.surprise === 0 || item.surprise === -1 ? '-' : (item.surprise * 100).toFixed(2) + '%'}`,
                      link,
                      guid: item.id,
                      pubDate: parseDate(item.public_date, 'X'),
                  }));

    return {
        title: '华尔街见闻·财经日历',
        link,
        item: items,
        itunes_author: '华尔街见闻',
        image: 'https://static.wscn.net/wscn/_static/favicon.png',
    };
}
