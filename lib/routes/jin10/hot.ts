import got from '@/utils/got';
import logger from '@/utils/logger';

import type { Jin10RawItem } from './filters';

const JIN10_FLASH_HOT_API = 'https://3318fc142ea545eab931e22a61ec6e5c.z3c.jin10.com/flash/hot';

const JIN10_HOT_LABELS = ['火', '热', '沸', '爆'] as const;

export type Jin10HotLabel = (typeof JIN10_HOT_LABELS)[number];

const JIN10_HOT_LABEL_SET = new Set<string>(JIN10_HOT_LABELS);

const JIN10_FLASH_HOT_HEADERS = {
    'x-app-id': 'bVBF4FyRTn5NJF5n',
    'x-version': '1.0',
    Referer: 'https://www.jin10.com/',
};

export const isJin10HotLabel = (value: unknown): value is Jin10HotLabel => typeof value === 'string' && JIN10_HOT_LABEL_SET.has(value);

export const parseJin10HotRows = (rows: unknown): Map<string, Jin10HotLabel> => {
    const hotMap = new Map<string, Jin10HotLabel>();
    if (!Array.isArray(rows)) {
        return hotMap;
    }

    for (const row of rows) {
        if (!row || typeof row !== 'object') {
            continue;
        }

        const { id, hot } = row as { id?: string | number; hot?: unknown };
        if (id === undefined || id === '' || !isJin10HotLabel(hot)) {
            continue;
        }

        hotMap.set(String(id), hot);
    }

    return hotMap;
};

export const applyJin10HotMap = (items: Jin10RawItem[], hotMap: Map<string, Jin10HotLabel>): Jin10RawItem[] => {
    if (hotMap.size === 0) {
        return items;
    }

    return items.map((item) => {
        const overlay = item.id === undefined ? undefined : hotMap.get(String(item.id));
        const hot = overlay ?? (isJin10HotLabel(item.hot) ? item.hot : undefined);
        if (hot === item.hot) {
            return item;
        }

        return hot ? { ...item, hot } : item;
    });
};

export const withJin10HotCategory = (category: string[] | undefined, hot?: string): string[] | undefined => {
    if (!isJin10HotLabel(hot)) {
        return category;
    }

    return [...new Set([hot, ...(category ?? [])])];
};

const fetchJin10FlashHotMap = async (ids: Array<string | number | undefined>): Promise<Map<string, Jin10HotLabel>> => {
    const flashIds = [...new Set(ids.filter((id) => id !== undefined && id !== '').map(String))];
    if (flashIds.length === 0) {
        return new Map();
    }

    try {
        const { data: response } = await got.post(JIN10_FLASH_HOT_API, {
            headers: JIN10_FLASH_HOT_HEADERS,
            json: { ids: flashIds },
        });
        return parseJin10HotRows(response?.data);
    } catch (error) {
        logger.error(`Failed to fetch jin10 flash hot labels: ${error instanceof Error ? error.message : String(error)}`);
        return new Map();
    }
};

export const attachJin10HotLabels = async (items: Jin10RawItem[]): Promise<Jin10RawItem[]> => applyJin10HotMap(items, await fetchJin10FlashHotMap(items.map((item) => item.id)));
