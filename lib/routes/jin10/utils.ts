import type { Jin10RawItem } from './filters';

export const FLASH_DETAIL_PREFIX = 'https://flash.jin10.com/detail';

export const CHANNEL_MAP: Record<number, string> = {
    1: '外汇/贵金属',
    2: '期货',
    3: '全球市场',
    4: 'A股',
};

export const buildFlashLink = (item: Jin10RawItem) => item.data?.source_link || `${FLASH_DETAIL_PREFIX}/${item.id}`;

export const collectFlashImages = (item: Jin10RawItem): string[] => {
    const images: string[] = [];
    if (item.data?.pic) {
        images.push(item.data.pic);
    }
    for (const r of item.remark ?? []) {
        if (r.pic) {
            images.push(r.pic);
        }
    }
    return images;
};

export type FlashDescriptionInput = {
    baseTitle: string;
    body: string;
    isImportant: boolean;
    source?: string;
    sourceLink?: string;
    images?: string[];
};

export const buildFlashDescription = ({ baseTitle, body, isImportant, source, sourceLink, images = [] }: FlashDescriptionInput): string => {
    const displayTitle = isImportant ? `「重要」${baseTitle}` : baseTitle;
    const parts = [`<p style="margin: 0 0 10px 0;"><strong><u>${displayTitle}</u></strong></p>`];
    for (const pic of images) {
        parts.push(`<p style="margin: 0 0 10px 0;"><img src="${pic}" alt="配图" referrerpolicy="no-referrer" style="max-width: 100%; border-radius: 4px;"></p>`);
    }
    parts.push(`<p style="margin: 0 0 10px 0; line-height: 1.6; color: #333;">${body}</p>`);
    if (source || sourceLink) {
        const label = source || '查看原文';
        const inner = sourceLink ? `<a href="${sourceLink}" target="_blank">${label}</a>` : label;
        parts.push(`<p style="margin: 8px 0 0 0; color: #666; font-size: 0.9em;">来源: ${inner}</p>`);
    }
    return parts.join('');
};
