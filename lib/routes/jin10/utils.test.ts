import { describe, expect, test } from 'vitest';

import { extractFlashCategories, mapClassicJin10FlashItem, splitJin10FlashText } from './utils';

describe('splitJin10FlashText', () => {
    test('splits 【】 titles and optionally keeps the brackets', () => {
        const item = { data: { content: '【现货黄金】短线走高。' } };

        expect(splitJin10FlashText(item)).toEqual({ title: '现货黄金', body: '短线走高。' });
        expect(splitJin10FlashText(item, true)).toEqual({ title: '【现货黄金】', body: '短线走高。' });
    });

    test('does not truncate titles without brackets', () => {
        const content = `${'美联储官员表示政策仍有不确定性。'.repeat(6)}收尾`;
        const item = { data: { content, title: content } };

        expect(splitJin10FlashText(item).title).toBe(content);
        expect(splitJin10FlashText(item).title.includes('…')).toBe(false);
    });
});

describe('extractFlashCategories', () => {
    test('maps official newest.js channels and quote remarks', () => {
        expect(
            extractFlashCategories({
                channel: [4, 5],
                remark: [
                    { type: 'quotes', title: '现货黄金', symbol: 'XAUUSD.GOODS' },
                    { type: 'link', title: '相关链接' },
                ],
            })
        ).toEqual(['A股', '英文', '现货黄金', 'XAUUSD.GOODS']);
    });

    test('skips CHANNEL_MAP for ushknews items', () => {
        expect(
            extractFlashCategories(
                {
                    channel: [1],
                    remark: [{ category_name: '美股', symbol: 'AAPL' }],
                },
                { includeChannels: false }
            )
        ).toEqual(['美股', 'AAPL']);
    });
});

describe('mapClassicJin10FlashItem', () => {
    test('keeps brackets, hot labels, and image enclosure', () => {
        const item = mapClassicJin10FlashItem(
            {
                id: '1',
                time: '2026-08-29 00:00:00',
                important: 1,
                hot: '火',
                channel: [4],
                data: {
                    content: '【A股】上证指数短线拉升。',
                    pic: 'https://cdn.example.com/chart.png',
                    source: '金十',
                },
            },
            {
                guidPrefix: 'jin10:new:',
                keepBrackets: true,
            }
        );

        expect(item.title).toBe('「重要」【A股】');
        expect(item.guid).toBe('jin10:new:1');
        expect(item.category).toEqual(['火', 'A股', '重要']);
        expect(item.enclosure_url).toBe('https://cdn.example.com/chart.png');
        expect(item.enclosure_type).toBe('image/png');
        expect(item.description).toContain('上证指数短线拉升。');
    });
});
