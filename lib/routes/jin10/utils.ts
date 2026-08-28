import type { DataItem } from '@/types';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

import type { Jin10RawItem } from './filters';
import { withJin10HotCategory } from './hot';

export const FLASH_DETAIL_PREFIX = 'https://flash.jin10.com/detail';

export const CHANNEL_MAP: Record<number, string> = {
    1: '外汇/贵金属',
    2: '期货',
    3: '全球市场',
    4: 'A股',
};

export const buildFlashLink = (item: Jin10RawItem) => item.data?.source_link || item.data?.link || (item.id ? `${FLASH_DETAIL_PREFIX}/${item.id}` : undefined);

export const collectFlashImages = (item: Jin10RawItem): string[] => {
    const images: string[] = [];
    if (item.data?.pic) {
        images.push(item.data.pic);
    }
    const remarks = item.remark ?? [];
    for (const r of remarks) {
        if (r.pic) {
            images.push(r.pic);
        }
    }
    return images;
};

const IMAGE_MIME_TYPES: Record<string, string> = {
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
};

export const getImageMimeType = (url: string): string => {
    const ext = url.replace(/\?.*$/, '').split('.').pop()?.toLowerCase();
    return IMAGE_MIME_TYPES[ext ?? ''] || 'image/jpeg';
};

export type FlashDescriptionInput = {
    baseTitle: string;
    body: string;
    source?: string;
    sourceLink?: string;
    images?: string[];
};

export const splitJin10BracketTitle = (item: Jin10RawItem): { title: string; body: string } => {
    const content = item.data?.content ?? '';
    const titleMatch = content.match(/^【([^】]+)】/);
    if (titleMatch) {
        return {
            title: titleMatch[1],
            body: content.replace(titleMatch[0], ''),
        };
    }

    return {
        title: item.data?.vip_title || content,
        body: content,
    };
};

export const buildFlashDescription = ({ baseTitle, body, source, sourceLink, images = [] }: FlashDescriptionInput): string => {
    const parts = [`<p style="margin: 0 0 10px 0;"><strong><u>${baseTitle}</u></strong></p>`];
    for (const pic of images) {
        parts.push(`<p style="margin: 0 0 10px 0;"><img src="${pic}" alt="配图" style="max-width: 100%; border-radius: 4px;"></p>`);
    }
    parts.push(`<p style="margin: 0 0 10px 0; line-height: 1.6; color: #333;">${body}</p>`);
    if (source || sourceLink) {
        const label = source || '查看原文';
        const inner = sourceLink ? `<a href="${sourceLink}" target="_blank">${label}</a>` : label;
        parts.push(`<p style="margin: 8px 0 0 0; color: #666; font-size: 0.9em;">来源: ${inner}</p>`);
    }
    return parts.join('');
};

export const mapClassicJin10FlashItem = (item: Jin10RawItem, options: { guidPrefix: string; link?: string }): DataItem => {
    const { title, body } = splitJin10BracketTitle(item);
    return {
        title,
        description: buildFlashDescription({
            baseTitle: title,
            body,
            source: item.data?.source,
            sourceLink: item.data?.source_link,
            images: collectFlashImages(item),
        }),
        pubDate: timezone(parseDate(item.time!), 8),
        link: options.link,
        guid: `${options.guidPrefix}${item.id}`,
        category: withJin10HotCategory(undefined, item.hot),
    };
};
