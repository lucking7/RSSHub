import { describe, expect, test } from 'vitest';

import InvalidParameterError from '@/errors/types/invalid-parameter';

import { classifyZhiboStocks, collectZhiboMultimedia, isZhiboFocusItem, itemMatchesZhiboTag, resolveZhiboId } from './zhibo';

describe('resolveZhiboId', () => {
    test('defaults to live zhibo 152 with no tag filter', () => {
        expect(resolveZhiboId()).toEqual({ zhiboId: '152', isFocusMode: false, tagId: '0', tagName: '全部' });
    });

    test('remaps archived zhibo ids onto live 152 tags', () => {
        expect(resolveZhiboId('242')).toEqual({ zhiboId: '152', isFocusMode: false, tagId: '110', tagName: '产业' });
        expect(resolveZhiboId('155')).toEqual({ zhiboId: '152', isFocusMode: false, tagId: '5', tagName: '市场' });
    });

    test('maps focus to tag 9', () => {
        expect(resolveZhiboId('focus')).toEqual({ zhiboId: '152', isFocusMode: true, tagId: '9', tagName: '焦点' });
        expect(resolveZhiboId('焦点')).toEqual({ zhiboId: '152', isFocusMode: true, tagId: '9', tagName: '焦点' });
    });

    test('maps legacy /sina/724 names onto 7x24 tags', () => {
        expect(resolveZhiboId('all')).toEqual({ zhiboId: '152', isFocusMode: false, tagId: '0', tagName: '全部' });
        expect(resolveZhiboId('macro')).toEqual({ zhiboId: '152', isFocusMode: false, tagId: '1', tagName: '宏观' });
        expect(resolveZhiboId('stock')).toEqual({ zhiboId: '152', isFocusMode: false, tagId: '5', tagName: '市场' });
        expect(resolveZhiboId('international')).toEqual({ zhiboId: '152', isFocusMode: false, tagId: '102', tagName: '国际' });
        expect(resolveZhiboId('opinion')).toEqual({ zhiboId: '152', isFocusMode: false, tagId: '6', tagName: '观点' });
        expect(resolveZhiboId('市场')).toEqual({ zhiboId: '152', isFocusMode: false, tagId: '5', tagName: '市场' });
    });

    test('rejects unknown ids', () => {
        expect(() => resolveZhiboId('999')).toThrow(InvalidParameterError);
    });
});

describe('isZhiboFocusItem', () => {
    test('treats is_focus and 焦点 tags as focus', () => {
        expect(isZhiboFocusItem({ is_focus: 1 })).toBe(true);
        expect(isZhiboFocusItem({ is_focus: 0, tag: [{ id: '9', name: '焦点' }] })).toBe(true);
        expect(isZhiboFocusItem({ is_focus: 0, tag: [{ id: '5', name: '市场' }] })).toBe(false);
    });
});

describe('itemMatchesZhiboTag', () => {
    test('matches tag id or name, and uses 焦点 for tag 9', () => {
        const market = { is_focus: 0, tag: [{ id: '5', name: '市场' }] };
        const focus = {
            is_focus: 0,
            tag: [
                { id: '9', name: '焦点' },
                { id: '5', name: '市场' },
            ],
        };

        expect(itemMatchesZhiboTag(market, '0')).toBe(true);
        expect(itemMatchesZhiboTag(market, '5', '市场')).toBe(true);
        expect(itemMatchesZhiboTag(market, '102', '国际')).toBe(false);
        expect(itemMatchesZhiboTag(focus, '9', '焦点')).toBe(true);
        expect(itemMatchesZhiboTag(market, '9', '焦点')).toBe(false);
    });
});

describe('collectZhiboMultimedia', () => {
    test('reads img_url strings/arrays and weibo pic_id_plus.large', () => {
        expect(collectZhiboMultimedia({ img_url: 'https://n.sinaimg.cn/a.jpg' }).images).toEqual(['https://n.sinaimg.cn/a.jpg']);
        expect(collectZhiboMultimedia({ img_url: ['https://n.sinaimg.cn/a.jpg', 'https://n.sinaimg.cn/b.jpg'] }).images).toHaveLength(2);
        expect(
            collectZhiboMultimedia({
                pic_id_plus: [{ large: 'https://wx4.sinaimg.cn/large/foo.jpg', thumbnail: 'https://wx4.sinaimg.cn/thumbnail/foo.jpg' }],
            }).images
        ).toEqual(['https://wx4.sinaimg.cn/large/foo.jpg']);
    });

    test('ignores empty multimedia and listing-style strings', () => {
        expect(collectZhiboMultimedia('').images).toEqual([]);
        expect(collectZhiboMultimedia({ img_url: '' }).images).toEqual([]);
        expect(collectZhiboMultimedia(undefined, '<p>text</p>').images).toEqual([]);
        expect(collectZhiboMultimedia(undefined, '<img src="https://n.sinaimg.cn/x.jpg" />').images).toEqual(['https://n.sinaimg.cn/x.jpg']);
    });
});

describe('classifyZhiboStocks', () => {
    test('cn/hk/us markets are individual stocks', () => {
        const { individualStocks, sectors } = classifyZhiboStocks([
            { market: 'cn', symbol: 'sh600010', key: '包钢股份' },
            { market: 'hk', symbol: 'hk00700', key: '腾讯' },
            { market: 'us', symbol: 'gb_aapl', key: '苹果' },
            { market: 'USA', symbol: 'gb_msft', key: '微软' },
        ]);
        expect(individualStocks).toHaveLength(4);
        expect(sectors).toHaveLength(0);
    });

    test('fund/commodity/missing market go to sectors', () => {
        const { individualStocks, sectors } = classifyZhiboStocks([
            { market: 'fund', symbol: '161720', key: '招商证券A' },
            { market: 'commodity', symbol: 'nf_LC0', key: '碳酸锂' },
            { key: '未知', symbol: 'xx' },
        ]);
        expect(sectors).toHaveLength(3);
        expect(individualStocks).toHaveLength(0);
    });

    test('Beijing-exchange codes starting with 8 stay individual when market is cn', () => {
        const { individualStocks } = classifyZhiboStocks([{ market: 'cn', symbol: 'bj830799', key: '某北交所股' }]);
        expect(individualStocks).toHaveLength(1);
    });

    test('empty array returns empty groups', () => {
        expect(classifyZhiboStocks([])).toEqual({ individualStocks: [], sectors: [] });
    });
});
