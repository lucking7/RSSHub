import { describe, expect, test } from 'vitest';

import { classifyZhiboStocks, resolveZhiboId } from './zhibo';

describe('resolveZhiboId', () => {
    test('defaults to finance channel 152', () => {
        expect(resolveZhiboId()).toEqual({ zhiboId: '152', isFocusMode: false });
    });

    test('passes through numeric channel ids', () => {
        expect(resolveZhiboId('242')).toEqual({ zhiboId: '242', isFocusMode: false });
    });

    test('maps focus to channel 152 with isFocusMode', () => {
        expect(resolveZhiboId('focus')).toEqual({ zhiboId: '152', isFocusMode: true });
    });

    test('maps legacy /sina/724 tag names onto zhibo channels', () => {
        expect(resolveZhiboId('all')).toEqual({ zhiboId: '152', isFocusMode: false });
        expect(resolveZhiboId('macro')).toEqual({ zhiboId: '151', isFocusMode: false });
        expect(resolveZhiboId('stock')).toEqual({ zhiboId: '155', isFocusMode: false });
        expect(resolveZhiboId('international')).toEqual({ zhiboId: '164', isFocusMode: false });
        expect(resolveZhiboId('opinion')).toEqual({ zhiboId: '153', isFocusMode: false });
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
