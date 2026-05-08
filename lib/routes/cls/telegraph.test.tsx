import { beforeEach, describe, expect, it, vi } from 'vitest';

import got from '@/utils/got';

import { route } from './telegraph';

vi.mock('@/utils/got', () => ({
    default: vi.fn(),
}));

const mockedGot = vi.mocked(got);

describe('/cls/telegraph', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('does not include interaction counters in item description', async () => {
        mockedGot.mockResolvedValue({
            data: {
                data: {
                    roll_data: [
                        {
                            id: 1,
                            type: 20026,
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
    });
});
