import { afterEach, describe, expect, test, vi } from 'vitest';

import got from '@/utils/got';
import logger from '@/utils/logger';

import { applyJin10HotMap, attachJin10HotLabels, isJin10HotLabel, parseJin10HotRows, withJin10HotCategory } from './hot';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('isJin10HotLabel', () => {
    test('accepts official heat labels', () => {
        expect(['火', '热', '沸', '爆'].every((label) => isJin10HotLabel(label))).toBe(true);
    });

    test('rejects empty or unknown values', () => {
        expect(isJin10HotLabel('')).toBe(false);
        expect(isJin10HotLabel('重要')).toBe(false);
        expect(isJin10HotLabel(undefined)).toBe(false);
    });
});

describe('parseJin10HotRows', () => {
    test('keeps only rows with 火/热/沸/爆', () => {
        const hotMap = parseJin10HotRows([
            { id: '1', hot: '爆', n: '506.0000', t: '617.0000' },
            { id: '2', hot: '', n: '33.0000', t: '33.0000' },
            { id: '3', hot: '火' },
            { id: 4, hot: '沸' },
            { hot: '热' },
            { id: '5', hot: '热点' },
        ]);

        expect(Object.fromEntries(hotMap)).toEqual({
            1: '爆',
            3: '火',
            4: '沸',
        });
    });

    test('returns an empty map for invalid payloads', () => {
        expect(parseJin10HotRows(undefined).size).toBe(0);
        expect(parseJin10HotRows({ data: [] }).size).toBe(0);
    });
});

describe('applyJin10HotMap', () => {
    test('overlays heat labels by flash id and keeps existing labels when overlay is missing', () => {
        const items = applyJin10HotMap(
            [
                { id: '1', data: { content: 'a' } },
                { id: '2', hot: '火', data: { content: 'b' } },
                { id: '3', data: { content: 'c' } },
            ],
            new Map([
                ['1', '爆'],
                ['3', '热'],
            ])
        );

        expect(items.map((item) => item.hot)).toEqual(['爆', '火', '热']);
    });

    test('keeps items unchanged when overlay map is empty', () => {
        const rawItems = [
            { id: '1', data: { content: 'a' } },
            { id: '2', hot: '火', data: { content: 'b' } },
        ];

        expect(applyJin10HotMap(rawItems, new Map())).toBe(rawItems);
    });
});

describe('attachJin10HotLabels', () => {
    test('overlays parsed heat labels from the hot API', async () => {
        vi.spyOn(got, 'post').mockResolvedValueOnce({
            data: {
                data: [
                    { id: '1', hot: '爆' },
                    { id: '2', hot: '' },
                    { id: '3', hot: '热' },
                ],
            },
        });

        const items = await attachJin10HotLabels([
            { id: '1', data: { content: 'a' } },
            { id: '2', hot: '火', data: { content: 'b' } },
            { id: '3', data: { content: 'c' } },
        ]);

        expect(items.map((item) => item.hot)).toEqual(['爆', '火', '热']);
    });

    test('logs hot API failures and leaves flash items unchanged', async () => {
        const rawItems = [
            { id: '1', data: { content: 'a' } },
            { id: '2', hot: '火', data: { content: 'b' } },
        ];
        vi.spyOn(got, 'post').mockRejectedValueOnce(new Error('hot api down'));
        const errorSpy = vi.spyOn(logger, 'error').mockReturnValue(logger);

        await expect(attachJin10HotLabels(rawItems)).resolves.toEqual(rawItems);
        expect(errorSpy).toHaveBeenCalledWith('Failed to fetch jin10 flash hot labels: hot api down');
    });
});

describe('withJin10HotCategory', () => {
    test('puts heat label first and dedupes', () => {
        expect(withJin10HotCategory(['A股', '爆'], '爆')).toEqual(['爆', 'A股']);
    });

    test('leaves category unchanged without a heat label', () => {
        expect(withJin10HotCategory(['A股'], '')).toEqual(['A股']);
        expect(withJin10HotCategory(undefined, undefined)).toBeUndefined();
    });
});
