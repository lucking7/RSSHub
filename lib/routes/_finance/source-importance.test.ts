import { describe, expect, test } from 'vitest';

import { applySourceImportance } from './source-importance';

describe('applySourceImportance', () => {
    test('adds watch title/category and preserves source fields in _extra', () => {
        const item = applySourceImportance(
            {
                title: 'news',
                category: ['宏观'],
            },
            [
                {
                    source: 'cls',
                    field: 'level',
                    value: 'B',
                    label: '新闻等级',
                    normalized: 'watch',
                },
                {
                    source: 'cls',
                    field: 'jpush',
                    value: 1,
                    label: '推送',
                },
            ]
        );

        expect(item.title).toBe('「关注」news');
        expect(item.category).toEqual(['宏观', '关注']);
        expect(item._extra?.sourceImportance).toEqual([
            {
                source: 'cls',
                field: 'level',
                value: 'B',
                label: '新闻等级',
                normalized: 'watch',
            },
            {
                source: 'cls',
                field: 'jpush',
                value: 1,
                label: '推送',
            },
        ]);
    });

    test('adds important title/category when normalized level is important', () => {
        const item = applySourceImportance(
            {
                title: 'news',
            },
            [
                {
                    source: 'futunn',
                    field: 'level',
                    value: 1,
                    label: '新闻等级',
                    normalized: 'important',
                },
            ]
        );

        expect(item.title).toBe('「重要」news');
        expect(item.category).toEqual(['重要']);
    });

    test('preserves raw non-normalized signals without changing title/category', () => {
        const item = applySourceImportance(
            {
                title: 'news',
            },
            [
                {
                    source: 'cls',
                    field: 'jpush',
                    value: 1,
                    label: '推送',
                },
            ]
        );

        expect(item.title).toBe('news');
        expect(item.category).toBeUndefined();
        expect(item._extra?.sourceImportance).toEqual([
            {
                source: 'cls',
                field: 'jpush',
                value: 1,
                label: '推送',
            },
        ]);
    });

    test('preserves normal level values without adding display tags', () => {
        const item = applySourceImportance(
            {
                title: 'news',
            },
            [
                {
                    source: 'futunn',
                    field: 'level',
                    value: 0,
                    label: '新闻等级',
                    normalized: 'normal',
                },
            ]
        );

        expect(item.title).toBe('news');
        expect(item.category).toBeUndefined();
        expect(item._extra?.sourceImportance).toEqual([
            {
                source: 'futunn',
                field: 'level',
                value: 0,
                label: '新闻等级',
                normalized: 'normal',
            },
        ]);
    });

    test('does not duplicate existing display prefix', () => {
        const item = applySourceImportance(
            {
                title: '「重要」news',
                category: ['重要'],
            },
            [
                {
                    source: 'jin10',
                    field: 'important',
                    value: 1,
                    label: '重要',
                    normalized: 'important',
                },
            ]
        );

        expect(item.title).toBe('「重要」news');
        expect(item.category).toEqual(['重要']);
    });
});
