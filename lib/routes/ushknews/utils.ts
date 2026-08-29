import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { DataItem } from '@/types';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

import { applySourceImportance } from '../_finance/source-importance';

export const USHKNEWS_SITE = 'https://www.ushknews.com';
export const FLASH_API = 'https://flash-api.ushknews.com';
export const CALENDAR_API = 'https://calendar-api.ushknews.com';

export const FLASH_HEADERS = {
    'x-app-id': 'brCYec5s1ova317e',
    'x-version': '1.0.0',
    referer: `${USHKNEWS_SITE}/`,
};

export const CALENDAR_HEADERS = {
    'x-app-id': 'BNsiR9uq7yfW0LVz',
    'x-version': '1.0.0',
    referer: `${USHKNEWS_SITE}/`,
};

export const USHKNEWS_CHANNELS: Record<string, { apiChannel: string; name: string }> = {
    us: { apiChannel: '1', name: '美股' },
    hk: { apiChannel: '2', name: '港股' },
    '1': { apiChannel: '1', name: '美股' },
    '2': { apiChannel: '2', name: '港股' },
};

export const resolveUshknewsChannel = (raw?: string): { apiChannel: string; name: string } => {
    const key = (raw ?? '').trim().toLowerCase();
    if (!key || key === 'all' || key === '0') {
        return { apiChannel: '', name: '全部快讯' };
    }
    const channel = USHKNEWS_CHANNELS[key];
    if (!channel) {
        throw new InvalidParameterError(`Invalid channel "${raw}". Use empty/all, us/1 (US), or hk/2 (HK).`);
    }
    return channel;
};

const IMAGE_MIME_TYPES: Record<string, string> = {
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
};

export type UshknewsRemark = {
    type?: string;
    title?: string;
    symbol?: string;
    pic?: string;
    pics?: string[];
    url?: string;
    link?: string;
};

export type UshknewsFlashItem = {
    id?: string | number;
    time?: string;
    type?: number | string;
    important?: number;
    channel?: number[];
    remark?: UshknewsRemark[];
    data?: {
        content?: string;
        pic?: string;
        title?: string;
        source?: string;
        source_link?: string;
        name?: string;
        country?: string;
        actual?: string | number | null;
        consensus?: string | number | null;
        previous?: string | number | null;
        unit?: string | null;
        time_period?: string | null;
        measure?: string | null;
        star?: string | number;
        pub_time?: string;
        video_url?: string | null;
    };
};

export type UshknewsRiliItem = {
    id?: string | number;
    title?: string;
    name?: string;
    country?: string;
    actual?: string | number | null;
    consensus?: string | number | null;
    previous?: string | number | null;
    unit?: string | null;
    star?: number;
    status_name?: string | null;
    timestr?: string;
    datetime?: string;
    datename?: string;
};

export type UshknewsEventItem = {
    id?: string | number;
    eventcontent?: string;
    country?: string | null;
    city?: string | null;
    people?: string | null;
    star?: number;
    datetime?: string;
    url?: string | null;
};

const stripHtml = (value?: string) =>
    value
        ?.replaceAll(/<[^>]*>/g, ' ')
        .replaceAll(/\s+/g, ' ')
        .trim() ?? '';

const USHKNEWS_BLANK_VALUES = new Set<unknown>([undefined, null, '', 'None', 'null']);

export const isUshknewsBlank = (value: unknown): boolean => USHKNEWS_BLANK_VALUES.has(value);

export const formatUshknewsValue = (value: unknown): string => (isUshknewsBlank(value) ? '暂无' : String(value));

export const getImageMimeType = (url: string): string => {
    const ext = url.replace(/\?.*$/, '').split('.').pop()?.toLowerCase();
    return IMAGE_MIME_TYPES[ext ?? ''] || 'image/jpeg';
};

export const ushknewsItemLink = (id: string | number | undefined): string => `${USHKNEWS_SITE}/?id=${id ?? ''}`;

export const collectUshknewsImages = (item: UshknewsFlashItem): string[] => {
    const images: string[] = [];
    if (item.data?.pic) {
        images.push(item.data.pic);
    }
    const remarks = item.remark ?? [];
    for (const remark of remarks) {
        if (remark.pic) {
            images.push(remark.pic);
        }
        images.push(...(remark.pics ?? []));
    }
    return [...new Set(images.filter(Boolean))];
};

export const splitUshknewsFlashText = (item: UshknewsFlashItem): { title: string; body: string } => {
    const content = item.data?.content ?? '';
    const titleMatch = content.match(/^【([^】]+)】/);
    if (titleMatch) {
        return {
            title: `【${titleMatch[1]}】`,
            body: content.replace(titleMatch[0], '').trim(),
        };
    }

    const fallback = stripHtml(item.data?.title || content);
    if (stripHtml(content) === fallback) {
        return { title: fallback, body: '' };
    }
    return {
        title: fallback,
        body: content,
    };
};

const channelName = (channelId: number): string | undefined => USHKNEWS_CHANNELS[String(channelId)]?.name;

export const extractUshknewsCategories = (item: UshknewsFlashItem, extra: string[] = []): string[] => {
    const tags: string[] = [...extra];
    const channels = item.channel ?? [];
    for (const channel of channels) {
        const name = channelName(channel);
        if (name) {
            tags.push(name);
        }
    }
    const remarks = item.remark ?? [];
    for (const remark of remarks) {
        if (remark.title && remark.title !== '相关链接' && remark.type !== 'miniProgram') {
            tags.push(remark.title);
        }
        if (remark.symbol) {
            tags.push(remark.symbol);
        }
    }
    return [...new Set(tags.filter(Boolean))];
};

const buildHtmlDescription = ({ title, body, images = [] }: { title: string; body: string; images?: string[] }): string => {
    const parts = images.map((pic) => `<p><img src="${pic}" alt=""></p>`);
    if (body && stripHtml(body) !== stripHtml(title)) {
        parts.push(`<p>${body}</p>`);
    }
    return parts.join('');
};

const isDataCard = (item: UshknewsFlashItem): boolean => Number(item.type) === 1;

const mapDataCard = (item: UshknewsFlashItem): { title: string; body: string; category: string[] } | undefined => {
    const data = item.data;
    if (!data) {
        return undefined;
    }
    const name = stripHtml(data.name || data.title || '');
    if (!name) {
        return undefined;
    }
    const country = isUshknewsBlank(data.country) ? '' : String(data.country);
    const period = isUshknewsBlank(data.time_period) ? '' : String(data.time_period);
    const titleCore = [period, name].filter(Boolean).join(' ');
    const title = country ? `【${country}】${titleCore}` : titleCore;
    const unit = isUshknewsBlank(data.unit) ? '' : ` ${data.unit}`;
    const measure = isUshknewsBlank(data.measure) ? '' : `${data.measure} `;
    const body = `${measure}实际 ${formatUshknewsValue(data.actual)}${unit}，预期 ${formatUshknewsValue(data.consensus)}，前值 ${formatUshknewsValue(data.previous)}`;
    const category = ['数据', country, isUshknewsBlank(data.measure) ? '' : String(data.measure)].filter(Boolean);
    return { title, body, category };
};

export const mapUshknewsFlashItem = (item: UshknewsFlashItem, extraCategories: string[] = []): DataItem | undefined => {
    const images = collectUshknewsImages(item);
    const [firstImage] = images;
    const isImportant = Number(item.important) === 1;

    let title: string;
    let body: string;
    let extra: string[] = extraCategories;

    if (isDataCard(item)) {
        const card = mapDataCard(item);
        if (!card) {
            return undefined;
        }
        title = card.title;
        body = card.body;
        extra = [...extra, ...card.category];
    } else {
        const split = splitUshknewsFlashText(item);
        title = split.title;
        body = split.body;
        if (!stripHtml(title)) {
            return undefined;
        }
    }

    const source = item.data?.source?.trim();
    const sourceLink = item.data?.source_link?.trim();
    const videoUrl = isUshknewsBlank(item.data?.video_url) ? undefined : String(item.data?.video_url);
    const link = sourceLink || videoUrl || ushknewsItemLink(item.id);
    const pubDateRaw = item.data?.pub_time || item.time;

    return applySourceImportance(
        {
            title,
            description: buildHtmlDescription({ title, body, images }),
            link,
            guid: `ushknews:flash:${item.id}`,
            ...(pubDateRaw && { pubDate: timezone(parseDate(pubDateRaw), 8) }),
            author: source || '美港电讯',
            category: extractUshknewsCategories(item, extra),
            ...(firstImage && {
                image: firstImage,
                enclosure_url: firstImage,
                enclosure_type: getImageMimeType(firstImage),
            }),
        },
        [
            {
                source: 'ushknews',
                field: 'important',
                value: item.important,
                label: '重要',
                normalized: isImportant ? 'important' : 'normal',
            },
        ]
    );
};

export const mapUshknewsRiliItem = (item: UshknewsRiliItem): DataItem | undefined => {
    const title = stripHtml(item.title || item.name || '');
    if (!title) {
        return undefined;
    }
    const unit = isUshknewsBlank(item.unit) ? '' : ` ${item.unit}`;
    const body = `实际 ${formatUshknewsValue(item.actual)}${unit}，预期 ${formatUshknewsValue(item.consensus)}，前值 ${formatUshknewsValue(item.previous)}`;
    const pubDate = item.timestr ? parseDate(item.timestr) : item.datetime ? timezone(parseDate(item.datetime), 8) : undefined;
    const status = item.status_name && !isUshknewsBlank(item.status_name) ? item.status_name : '';

    return applySourceImportance(
        {
            title,
            description: buildHtmlDescription({ title, body }),
            link: ushknewsItemLink(item.id),
            guid: `ushknews:rili:${item.id}`,
            ...(pubDate && { pubDate }),
            author: '美港电讯',
            category: ['数据', item.country, status, item.datename].filter((value): value is string => Boolean(value)),
        },
        [
            {
                source: 'ushknews',
                field: 'star',
                value: item.star,
                label: '重要性',
                normalized: (item.star ?? 0) >= 3 ? 'important' : 'normal',
            },
        ]
    );
};

export const mapUshknewsEventItem = (item: UshknewsEventItem): DataItem | undefined => {
    const title = stripHtml(item.eventcontent || '');
    if (!title) {
        return undefined;
    }
    const place = [item.country, item.city, item.people].filter((value) => value && !isUshknewsBlank(value)).join(' · ');
    return applySourceImportance(
        {
            title,
            description: buildHtmlDescription({ title, body: place }),
            link: (item.url && !isUshknewsBlank(item.url) ? item.url : undefined) || ushknewsItemLink(item.id),
            guid: `ushknews:event:${item.id}`,
            ...(item.datetime && { pubDate: timezone(parseDate(item.datetime), 8) }),
            author: '美港电讯',
            category: ['事件', item.country].filter((value): value is string => Boolean(value)),
        },
        [
            {
                source: 'ushknews',
                field: 'star',
                value: item.star,
                label: '重要性',
                normalized: (item.star ?? 0) >= 3 ? 'important' : 'normal',
            },
        ]
    );
};
