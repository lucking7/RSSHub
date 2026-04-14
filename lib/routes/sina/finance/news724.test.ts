import { describe, expect, test } from 'vitest';

import { buildImageHtml, buildTitle, classifyStocks, pickLink } from './news724';

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

describe('buildImageHtml', () => {
    test('空数组返回空串', () => {
        expect(buildImageHtml(undefined)).toBe('');
        expect(buildImageHtml([])).toBe('');
    });

    test('单图包一个 img 标签，不加 referrerpolicy（RSSHub middleware 处理）', () => {
        const html = buildImageHtml(['http://k.sinaimg.cn/n/zhibo/169/w2048h1321/20260413/abc.jpg']);
        expect(html).toBe('<img src="https://k.sinaimg.cn/n/zhibo/169/w2048h1321/20260413/abc.jpg">');
        expect(html).not.toMatch(/referrerpolicy/);
    });

    test('多图用 <br> 分隔', () => {
        const html = buildImageHtml(['http://x.com/a.jpg', 'http://x.com/b.jpg']);
        expect(html).toBe('<img src="https://x.com/a.jpg"><br><img src="https://x.com/b.jpg">');
    });

    test('http 自动升级为 https', () => {
        const html = buildImageHtml(['http://k.sinaimg.cn/a.jpg']);
        expect(html).toContain('https://k.sinaimg.cn/a.jpg');
        expect(html).not.toContain('http://');
    });

    test('非数组输入视为空', () => {
        expect(buildImageHtml(null as unknown as string[])).toBe('');
        expect(buildImageHtml('not-array' as unknown as string[])).toBe('');
    });
});

describe('pickLink', () => {
    test('pageUrl 非空优先', () => {
        expect(
            pickLink({
                pageUrl: 'https://finance.sina.com.cn/7x24/2026-04-13/doc-inhuitra2435063.shtml',
                url: 'http://finance.sina.com.cn/focus/app/7x24_share.shtml?id=4812180',
                id: 4_812_180,
            })
        ).toBe('https://finance.sina.com.cn/7x24/2026-04-13/doc-inhuitra2435063.shtml');
    });

    test('pageUrl 为空串时退回 item.url（并升 https）', () => {
        expect(
            pickLink({
                pageUrl: '',
                url: 'http://finance.sina.com.cn/focus/app/7x24_share.shtml?id=4812176',
                id: 4_812_176,
            })
        ).toBe('https://finance.sina.com.cn/focus/app/7x24_share.shtml?id=4812176');
    });

    test('都没有时退回构造 URL', () => {
        expect(pickLink({ id: 9999 })).toBe('https://news.cj.sina.cn/7x24/9999');
    });
});

describe('buildTitle', () => {
    test('color=1 加「重要」前缀 + 提取【】内文字', () => {
        expect(
            buildTitle({
                color: 1,
                content: '【午评：创业板指半日涨超2%】三大指数早盘集体上涨',
                id: 4_814_132,
            })
        ).toBe('「重要」午评：创业板指半日涨超2%');
    });

    test('color=0 不加前缀，仅提取【】内文字', () => {
        expect(
            buildTitle({
                color: 0,
                content: '【兆易创新与吉利汽车共建联合创新实验室】近日...',
                id: 4_814_100,
            })
        ).toBe('兆易创新与吉利汽车共建联合创新实验室');
    });

    test('color=1 + 无【】：「重要」+ 前 100 字', () => {
        expect(
            buildTitle({
                color: 1,
                content: '纽约期银突破77美元/盎司，日内涨1.79%。',
                id: 4_814_147,
            })
        ).toBe('「重要」纽约期银突破77美元/盎司，日内涨1.79%。');
    });

    test('color 未设置时视为普通快讯', () => {
        expect(
            buildTitle({
                content: '普通快讯',
                id: 1,
            })
        ).toBe('普通快讯');
    });

    test('空 content 兜底为 "财经快讯 <id>"', () => {
        expect(buildTitle({ color: 0, content: '', id: 42 })).toBe('财经快讯 42');
        expect(buildTitle({ color: 1, id: 43 })).toBe('「重要」财经快讯 43');
    });
});
