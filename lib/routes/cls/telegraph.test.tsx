import { beforeEach, describe, expect, it, vi } from 'vitest';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import cache from '@/utils/cache';
import got from '@/utils/got';

import { route } from './telegraph';

vi.mock('@/utils/got', () => ({
    default: vi.fn(),
}));

const mockedGot = vi.mocked(got);

describe('/cls/telegraph', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        cache.clients.memoryCache?.clear();
    });

    it('does not include interaction counters in item description', async () => {
        mockedGot.mockResolvedValue({
            data: {
                data: {
                    roll_data: [
                        {
                            id: 1,
                            type: -1,
                            content: '财联社5月7日电，日本央行数据显示，日本已支出约4.68万亿日元以支持外汇市场。',
                            ctime: 1_778_123_456,
                            shareurl: 'https://www.cls.cn/detail/1',
                            reading_num: 24529,
                            comment_num: 0,
                            share_num: 2,
                            subjects: [{ subject_id: 'monetary-policy', subject_name: '货币政策动向' }],
                            stock_list: [],
                        },
                    ],
                },
            },
        } as any);

        const result = await route.handler({
            req: {
                param: () => '',
                query: () => {},
            },
        } as any);

        expect(result.item[0].description).toContain('日本央行数据显示');
        expect(result.item[0].description).not.toContain('阅读 24529');
        expect(result.item[0].description).not.toContain('评论 0');
        expect(result.item[0].description).not.toContain('分享 2');
        expect(result.item[0].description).not.toContain('货币政策动向');
        expect(result.item[0].category).toContain('货币政策动向');
        expect(mockedGot).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'https://api3.cls.cn/v1/roll/get_roll_list',
                searchParams: expect.any(URLSearchParams),
            })
        );
        expect(Object.fromEntries((mockedGot.mock.calls[0][0] as any).searchParams)).toMatchObject({
            app: 'CailianpressWeb',
            hasFirstVipArticle: '1',
            last_time: '0',
            os: 'web',
            rn: '50',
            sv: '8.4.6',
        });
        expect(Object.fromEntries((mockedGot.mock.calls[0][0] as any).searchParams)).not.toHaveProperty('category');
    });

    it('filters out VIP types, promotional, ad, and preserves normal articles', async () => {
        mockedGot.mockResolvedValue({
            data: {
                data: {
                    roll_data: [
                        {
                            id: 101,
                            type: -1,
                            content: '正常文章：财联社5月7日电，正常财经新闻。',
                            ctime: 1_778_123_456,
                            shareurl: 'https://www.cls.cn/detail/101',
                            stock_list: [],
                        },
                        {
                            id: 102,
                            type: 20021,
                            content: 'VIP文章：财联社5月7日电，付费深度内容。',
                            ctime: 1_778_123_456,
                            shareurl: 'https://www.cls.cn/detail/102',
                            stock_list: [],
                        },
                        {
                            id: 103,
                            type: 20022,
                            content: 'VIP推荐文章。',
                            ctime: 1_778_123_456,
                            shareurl: 'https://www.cls.cn/detail/103',
                            stock_list: [],
                        },
                        {
                            id: 104,
                            type: -1,
                            content: 'VIP配图文章：正常财经内容。',
                            ctime: 1_778_123_456,
                            shareurl: 'https://www.cls.cn/detail/104',
                            share_img: 'https://img.cls.cn/share/vip.png',
                            stock_list: [],
                        },
                        {
                            id: 105,
                            type: -1,
                            content: '广告文章：正常财经内容。',
                            ctime: 1_778_123_456,
                            shareurl: 'https://www.cls.cn/detail/105',
                            is_ad: 1,
                            stock_list: [],
                        },
                        {
                            id: 106,
                            type: -1,
                            content: '推荐广告：正常财经内容。',
                            ctime: 1_778_123_456,
                            shareurl: 'https://www.cls.cn/detail/106',
                            is_fad: true,
                            stock_list: [],
                        },
                        {
                            id: 107,
                            type: -1,
                            content: '推广文章：点击查看更多优惠。',
                            ctime: 1_778_123_456,
                            shareurl: 'https://www.cls.cn/detail/107',
                            stock_list: [],
                        },
                    ],
                },
            },
        } as any);

        const result = await route.handler({
            req: {
                param: () => '',
                query: () => {},
            },
        } as any);

        expect(result.item).toHaveLength(1);
        expect(result.item[0].title).toContain('正常文章');
    });

    it('throws InvalidParameterError for invalid category', async () => {
        await expect(
            route.handler({
                req: {
                    param: (p) => (p === 'category' ? 'invalid' : ''),
                    query: () => {},
                },
            } as any)
        ).rejects.toThrow(InvalidParameterError);
    });

    it('does not filter out legitimate live broadcast news content', async () => {
        mockedGot.mockResolvedValue({
            data: {
                data: {
                    roll_data: [
                        {
                            id: 201,
                            type: -1,
                            content: '国新办举行新闻发布会，正在直播介绍我国经济运行情况。',
                            ctime: 1_778_123_456,
                            shareurl: 'https://www.cls.cn/detail/201',
                            stock_list: [],
                        },
                    ],
                },
            },
        } as any);

        const result = await route.handler({
            req: {
                param: () => '',
                query: () => {},
            },
        } as any);

        expect(result.item).toHaveLength(1);
        expect(result.item[0].title).toContain('正在直播介绍');
    });

    it('handles malformed JSON payload (null items, undefined type) and is_ad/is_fad variations', async () => {
        mockedGot.mockResolvedValue({
            data: {
                data: {
                    roll_data: [
                        null,
                        undefined,
                        {
                            id: 301,
                            type: undefined,
                            content: '正常文章：类型未定义',
                            ctime: 1_778_123_456,
                            shareurl: 'https://www.cls.cn/detail/301',
                            stock_list: [],
                        },
                        {
                            id: 302,
                            type: null,
                            content: '正常文章：类型为null',
                            ctime: 1_778_123_456,
                            shareurl: 'https://www.cls.cn/detail/302',
                            stock_list: [],
                        },
                        {
                            id: 303,
                            type: -1,
                            content: '广告文章：is_ad为1',
                            ctime: 1_778_123_456,
                            shareurl: 'https://www.cls.cn/detail/303',
                            is_ad: 1,
                            stock_list: [],
                        },
                        {
                            id: 304,
                            type: -1,
                            content: '广告文章：is_fad为1',
                            ctime: 1_778_123_456,
                            shareurl: 'https://www.cls.cn/detail/304',
                            is_fad: 1,
                            stock_list: [],
                        },
                        {
                            id: 305,
                            type: -1,
                            content: '广告文章：is_ad为true',
                            ctime: 1_778_123_456,
                            shareurl: 'https://www.cls.cn/detail/305',
                            is_ad: true,
                            stock_list: [],
                        },
                        {
                            id: 306,
                            type: -1,
                            content: '广告文章：is_fad为true',
                            ctime: 1_778_123_456,
                            shareurl: 'https://www.cls.cn/detail/306',
                            is_fad: true,
                            stock_list: [],
                        },
                    ],
                },
            },
        } as any);

        const result = await route.handler({
            req: {
                param: () => '',
                query: () => {},
            },
        } as any);

        expect(result.item).toHaveLength(2);
        expect(result.item.map((i) => i.title)).toContain('正常文章：类型未定义');
        expect(result.item.map((i) => i.title)).toContain('正常文章：类型为null');
    });
});
