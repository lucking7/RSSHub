import { describe, expect, test } from 'vitest';

import { classifyStocks } from './news724';

describe('classifyStocks', () => {
    test('A 股按 stocktype=cn 归入个股', () => {
        const { individualStocks, sectors } = classifyStocks([{ stocktype: 'cn', name: '包钢股份', code: 'sh600010', symbol: 'sh600010' }]);
        expect(individualStocks).toHaveLength(1);
        expect(sectors).toHaveLength(0);
    });

    test('港股/美股归入个股', () => {
        const { individualStocks } = classifyStocks([
            { stocktype: 'hk', name: '腾讯', symbol: 'hk00700' },
            { stocktype: 'us', name: '苹果', symbol: 'gb_aapl' },
        ]);
        expect(individualStocks).toHaveLength(2);
    });

    test('基金/商品/国际指数/股指期货/外汇归入非个股', () => {
        const { sectors, individualStocks } = classifyStocks([
            { stocktype: 'fund', name: '招商证券A', symbol: '161720' },
            { stocktype: 'commodity', name: '碳酸锂', symbol: 'nf_LC0' },
            { stocktype: 'global', name: 'WTI原油', symbol: 'hf_CL' },
            { stocktype: 'worldIndex', name: '以色列TA35', symbol: 'znb_TA-35' },
            { stocktype: 'CFF', name: '沪深300期货', symbol: 'nf_IF0' },
            { stocktype: 'forgein', name: '美元指数', symbol: 'DINIW' },
        ]);
        expect(sectors).toHaveLength(6);
        expect(individualStocks).toHaveLength(0);
    });

    test('stocktype 缺失时保守归入非个股（向前兼容）', () => {
        const { sectors } = classifyStocks([{ name: '未知', symbol: 'xx' }]);
        expect(sectors).toHaveLength(1);
    });

    test('空数组返回空结果', () => {
        expect(classifyStocks([])).toEqual({ individualStocks: [], sectors: [] });
    });

    test('旧逻辑的误报不再发生（code 以 8 开头的 A 股不应被误判为板块）', () => {
        const { individualStocks } = classifyStocks([{ stocktype: 'cn', name: '某北交所股', code: '830799', symbol: 'bj830799' }]);
        expect(individualStocks).toHaveLength(1);
    });
});
