import { describe, expect, test } from 'vitest';

import InvalidParameterError from '@/errors/types/invalid-parameter';

import { formatUshknewsValue, isUshknewsBlank, mapUshknewsEventItem, mapUshknewsFlashItem, mapUshknewsRiliItem, resolveUshknewsChannel, splitUshknewsFlashText } from './utils';

describe('resolveUshknewsChannel', () => {
    test('maps all / us / hk aliases onto API channel ids', () => {
        expect(resolveUshknewsChannel()).toEqual({ apiChannel: '', name: '全部快讯' });
        expect(resolveUshknewsChannel('all')).toEqual({ apiChannel: '', name: '全部快讯' });
        expect(resolveUshknewsChannel('0')).toEqual({ apiChannel: '', name: '全部快讯' });
        expect(resolveUshknewsChannel('us')).toEqual({ apiChannel: '1', name: '美股' });
        expect(resolveUshknewsChannel('1')).toEqual({ apiChannel: '1', name: '美股' });
        expect(resolveUshknewsChannel('hk')).toEqual({ apiChannel: '2', name: '港股' });
        expect(resolveUshknewsChannel('2')).toEqual({ apiChannel: '2', name: '港股' });
    });

    test('rejects unknown channels', () => {
        expect(() => resolveUshknewsChannel('fx')).toThrow(InvalidParameterError);
    });
});

describe('isUshknewsBlank', () => {
    test('treats empty, None and nullish as blank', () => {
        expect(isUshknewsBlank('')).toBe(true);
        expect(isUshknewsBlank('None')).toBe(true);
        expect(isUshknewsBlank('null')).toBe(true);
        expect(isUshknewsBlank(undefined)).toBe(true);
        expect(isUshknewsBlank(null)).toBe(true);
        expect(formatUshknewsValue('')).toBe('暂无');
        expect(formatUshknewsValue(447)).toBe('447');
    });
});

describe('splitUshknewsFlashText', () => {
    test('keeps 【】 titles and does not truncate', () => {
        expect(splitUshknewsFlashText({ data: { content: '【保利置业】上半年转亏。' } })).toEqual({
            title: '【保利置业】',
            body: '上半年转亏。',
        });
        const content = `${'苹果提高了美国地区订阅价格。'.repeat(5)}结尾`;
        expect(splitUshknewsFlashText({ data: { content } })).toEqual({ title: content, body: '' });
    });

    test('does not copy a single-sentence flash into body', () => {
        expect(splitUshknewsFlashText({ data: { content: '尼泊尔外长：尼泊尔已请求专业服务和技术援助。' } })).toEqual({
            title: '尼泊尔外长：尼泊尔已请求专业服务和技术援助。',
            body: '',
        });
    });

    test('keeps a distinct title field as headline and content as body', () => {
        expect(splitUshknewsFlashText({ data: { title: '短标题', content: '完整正文内容。' } })).toEqual({
            title: '短标题',
            body: '完整正文内容。',
        });
    });
});

describe('mapUshknewsFlashItem', () => {
    test('maps text flashes with us/hk categories and unique guid', () => {
        const item = mapUshknewsFlashItem(
            {
                id: '20260829013306596800',
                time: '2026-08-29 01:33:06',
                type: 0,
                important: 1,
                channel: [1],
                data: {
                    content: '据CNBC：苹果提高了订阅价格。',
                },
            },
            ['美股']
        );

        expect(item?.title).toBe('「重要」据CNBC：苹果提高了订阅价格。');
        expect(item?.description).toBe('');
        expect(item?.guid).toBe('ushknews:flash:20260829013306596800');
        expect(item?.link).toBe('https://www.ushknews.com/?id=20260829013306596800');
        expect(item?.category).toEqual(['美股', '重要']);
    });

    test('puts only the body in description so RSS-to-Telegram does not repeat the title', () => {
        const item = mapUshknewsFlashItem({
            id: 'n1',
            type: 0,
            time: '2026-08-29 10:14:00',
            data: { content: '尼泊尔外长：尼泊尔已请求专业服务和技术援助。' },
        });

        expect(item?.title).toBe('尼泊尔外长：尼泊尔已请求专业服务和技术援助。');
        expect(item?.description).toBe('');
    });

    test('keeps 【】 body in description without repeating the headline', () => {
        const item = mapUshknewsFlashItem({
            id: 'b1',
            type: 0,
            time: '2026-08-29 00:00:00',
            data: { content: '【保利置业】上半年转亏。' },
        });

        expect(item?.title).toBe('【保利置业】');
        expect(item?.description).toBe('<p>上半年转亏。</p>');
    });

    test('maps type 1 data cards instead of dropping them as ads', () => {
        const item = mapUshknewsFlashItem({
            id: '1185575',
            type: 1,
            important: 0,
            channel: [1],
            time: '2026-08-28 04:12:11',
            data: {
                name: '迈威尔科技(MRVL.O)',
                country: '纳斯达克',
                measure: 'EPS',
                time_period: '2027财年Q2',
                actual: '0.33',
                consensus: '0.36',
                previous: '0.22',
                unit: '$',
            },
        });

        expect(item?.title).toBe('【纳斯达克】2027财年Q2 迈威尔科技(MRVL.O)');
        expect(item?.description).toContain('实际 0.33 $');
        expect(item?.description).toContain('预期 0.36');
        expect(item?.description).not.toContain('迈威尔科技');
        expect(item?.category).toEqual(expect.arrayContaining(['数据', '美股', 'EPS', '纳斯达克']));
    });

    test('collects flash-pics remarks', () => {
        const item = mapUshknewsFlashItem({
            id: 'p1',
            type: 0,
            time: '2026-08-29 00:00:00',
            data: { content: '附图快讯' },
            remark: [{ type: 'flash-pics', pics: ['https://cdn.example.com/a.png'] }],
        });

        expect(item?.enclosure_url).toBe('https://cdn.example.com/a.png');
        expect(item?.enclosure_type).toBe('image/png');
        expect(item?.description).toBe('<p><img src="https://cdn.example.com/a.png" alt=""></p>');
        expect(item?.description).not.toContain('附图快讯');
    });
});

describe('calendar mappers', () => {
    test('maps rili rows with 利多 category', () => {
        const item = mapUshknewsRiliItem({
            id: '1184184',
            title: '美国至8月28日当周石油钻井总数(口)',
            country: '美国',
            actual: 447,
            consensus: undefined,
            previous: '452',
            unit: '口',
            star: 3,
            status_name: '利多',
            timestr: '2026-08-28T17:00:00.000Z',
            datename: '至8月28日',
        });

        expect(item?.title).toBe('「重要」美国至8月28日当周石油钻井总数(口)');
        expect(item?.description).toBe('<p>实际 447 口，预期 暂无，前值 452</p>');
        expect(item?.guid).toBe('ushknews:rili:1184184');
        expect(item?.category).toEqual(expect.arrayContaining(['数据', '美国', '利多', '重要']));
    });

    test('maps events', () => {
        const item = mapUshknewsEventItem({
            id: '1185917',
            eventcontent: '古尔斯比接受CNBC的采访。',
            country: '美国',
            star: 3,
            datetime: '2026-08-29 00:30:00',
            url: '',
        });

        expect(item?.title).toBe('「重要」古尔斯比接受CNBC的采访。');
        expect(item?.description).toBe('<p>美国</p>');
        expect(item?.guid).toBe('ushknews:event:1185917');
        expect(item?.link).toBe('https://www.ushknews.com/?id=1185917');
        expect(item?.category).toEqual(expect.arrayContaining(['事件', '美国', '重要']));
    });
});
