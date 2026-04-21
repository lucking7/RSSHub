import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

import { API_BASE, API_HEADERS } from './utils';

const TYPE_MAP: Record<string, { types: string[]; name: string }> = {
    report: { types: ['report', 'financial'], name: '财报' },
    dividend: { types: ['dividend'], name: '分红' },
    split: { types: ['split', 'merge'], name: '拆合股' },
    ipo: { types: ['ipo'], name: '新股' },
    closed: { types: ['closed'], name: '休市' },
};

const MARKET_NAMES: Record<string, string> = { HK: '港股', US: '美股', SG: '新加坡', CN: '沪深' };

export const route: Route = {
    path: '/calendar/:type?',
    name: '财经日历',
    url: 'longbridge.com/zh-CN/calendar/report',
    maintainers: [''],
    handler,
    example: '/longbridge/calendar/report',
    parameters: {
        type: `日历类型，默认 \`report\`。可选：${Object.entries(TYPE_MAP)
            .map(([k, v]) => `\`${k}\`（${v.name}）`)
            .join('、')}`,
    },
    description: `长桥财经日历，支持查询参数：
- \`market=HK\` 市场筛选（HK/US/SG/CN，可逗号分隔多个）
- \`days=7\` 查询天数（默认7天）`,
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
        { source: ['longbridge.com/zh-CN/calendar/report'], target: '/calendar/report' },
        { source: ['longbridge.com/zh-CN/calendar/dividend'], target: '/calendar/dividend' },
        { source: ['longbridge.com/zh-CN/calendar/split'], target: '/calendar/split' },
        { source: ['longbridge.com/zh-CN/calendar/ipo'], target: '/calendar/ipo' },
        { source: ['longbridge.com/zh-CN/calendar/closed'], target: '/calendar/closed' },
    ],
};

function formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function renderInfo(info: any): string {
    let html = `<strong>${info.counter_name || info.content}</strong>`;
    if (info.counter_id) {
        html += ` <span style="color: #999;">(${info.counter_id})</span>`;
    }
    html += `<br>${info.content}`;
    if (info.date_type) {
        html += ` · ${info.date_type}`;
    }

    const kv = info.data_kv;
    if (kv?.length) {
        const eps = kv.find((k: any) => k.type === 'actual_eps');
        const rev = kv.find((k: any) => k.type === 'actual_revenue');
        const estEps = kv.find((k: any) => k.type === 'estimate_eps');
        const estRev = kv.find((k: any) => k.type === 'estimate_revenue');
        if (eps || rev) {
            html += '<br>';
            if (eps) {
                html += `EPS: ${eps.value}`;
                if (estEps?.value && estEps.value !== '--') {
                    html += ` (预估 ${estEps.value})`;
                }
                html += ' ';
            }
            if (rev) {
                html += `营收: ${rev.value}`;
                if (estRev?.value && estRev.value !== '--') {
                    html += ` (预估 ${estRev.value})`;
                }
            }
        }
    }
    return html;
}

async function handler(ctx) {
    const typeKey = ctx.req.param('type') || 'report';
    const typeConfig = TYPE_MAP[typeKey] || TYPE_MAP.report;
    const days = ctx.req.query('days') ? Number.parseInt(ctx.req.query('days')) : 7;
    const marketParam = ctx.req.query('market');
    const markets = marketParam ? marketParam.split(',').map((m) => m.trim().toUpperCase()) : [];

    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + days);

    const cacheKey = `longbridge:calendar:${typeKey}:${markets.join(',')}:${formatDate(now)}:${days}`;
    const dayList = await cache.tryGet(
        cacheKey,
        async () => {
            const body = {
                types: typeConfig.types,
                date: formatDate(now),
                date_end: formatDate(end),
                count: '50',
                ...(markets.length ? { markets } : {}),
            };
            const { data } = await got.post(`${API_BASE}/v2/stock_info/finance_calendar`, {
                json: body,
                headers: { ...API_HEADERS, 'content-type': 'application/json' },
            });
            return data?.data?.list ?? [];
        },
        300
    );

    const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 200;

    const items = dayList
        .flatMap((day) => day.infos ?? [])
        .slice(0, limit)
        .map((info) => ({
            title: `[${info.market || ''}] ${info.counter_name || ''} - ${info.content}`,
            description: renderInfo(info),
            link: info.counter_id ? `https://longbridge.com/zh-CN/stock/${info.counter_id.replace('ST/', '')}` : `https://longbridge.com/zh-CN/calendar/${typeKey}`,
            pubDate: parseDate(Number.parseInt(info.datetime) * 1000),
            guid: `longbridge-calendar-${info.id || info.counter_id}-${info.datetime}`,
            author: '长桥',
            ...(info.icon ? { image: info.icon } : {}),
            ...(info.market ? { category: [info.market, typeConfig.name] } : { category: [typeConfig.name] }),
        }));

    const marketSuffix = markets.length ? ` - ${markets.map((m) => MARKET_NAMES[m] || m).join('/')}` : '';

    return {
        title: `长桥财经日历 - ${typeConfig.name}${marketSuffix}`,
        link: `https://longbridge.com/zh-CN/calendar/${typeKey}`,
        description: `长桥${typeConfig.name}日历`,
        item: items,
    };
}
