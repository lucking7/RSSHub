import type { DataItem } from '@/types';

export type SourceImportanceLevel = 'important' | 'watch' | 'normal';

export type SourceImportanceSignal = {
    source: string;
    field: string;
    value?: string | number | boolean;
    label: string;
    normalized?: SourceImportanceLevel;
};

const hasValue = (value: SourceImportanceSignal['value'] | undefined): value is SourceImportanceSignal['value'] => value !== undefined && value !== '';

const levelWeight: Record<SourceImportanceLevel, number> = {
    important: 2,
    watch: 1,
    normal: 0,
};

const levelDisplay: Record<Exclude<SourceImportanceLevel, 'normal'>, { prefix: string; category: string }> = {
    important: {
        prefix: '「重要」',
        category: '重要',
    },
    watch: {
        prefix: '「关注」',
        category: '关注',
    },
};

const getDisplayLevel = (signals: SourceImportanceSignal[]): Exclude<SourceImportanceLevel, 'normal'> | undefined =>
    signals
        .map((signal) => signal.normalized)
        .filter((level): level is SourceImportanceLevel => level !== undefined)
        .toSorted((a, b) => levelWeight[b] - levelWeight[a])
        .find((level): level is Exclude<SourceImportanceLevel, 'normal'> => level !== 'normal');

export const applySourceImportance = <T extends DataItem>(item: T, signals: SourceImportanceSignal[]): T => {
    const sourceImportance = signals.filter((signal) => hasValue(signal.value));
    if (sourceImportance.length === 0) {
        return item;
    }

    const displayLevel = getDisplayLevel(sourceImportance);
    const display = displayLevel ? levelDisplay[displayLevel] : undefined;
    const title = display && item.title && !item.title.startsWith(display.prefix) ? `${display.prefix}${item.title}` : item.title;
    const importanceCategories = sourceImportance.flatMap((signal) => (signal.normalized && signal.normalized !== 'normal' ? [levelDisplay[signal.normalized].category] : []));
    const category = item.category || importanceCategories.length > 0 ? [...new Set([...(item.category ?? []), ...importanceCategories])] : undefined;

    return {
        ...item,
        title,
        ...(category ? { category } : {}),
        _extra: {
            ...item._extra,
            sourceImportance,
        },
    };
};
