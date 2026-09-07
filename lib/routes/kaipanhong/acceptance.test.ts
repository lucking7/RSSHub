import { beforeEach, describe, expect, it, vi } from 'vitest';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import cache from '@/utils/cache';
import got from '@/utils/got';

import { route as legacyNewsRoute } from '../kaipanla/news';
import { route as legacyReviewRoute } from '../kaipanla/review';
import { route as legacyZhiboRoute } from '../kaipanla/zhibo';
import { route as legacyZtRoute } from '../kaipanla/zt';
import { route as newsRoute } from './news';
import { route as radarRoute } from './radar';
import { route as zhiboRoute } from './zhibo';

vi.mock('@/utils/got', () => ({ default: vi.fn() }));

const mockedGot = vi.mocked(got);
const ctx = (params: Record<string, unknown> = {}) => ({
    req: {
        param: (name: string) => params[name] ?? '',
        query: () => ({}),
    },
});
const data = (route: any, params: Record<string, unknown> = {}) => route.handler(ctx(params) as any);
const response = (payload: unknown) => ({ data: payload }) as any;
const validTime = 1_778_123_456;
const appUserAgent = '%E5%BC%80%E7%9B%98%E7%BA%A2/0 CFNetwork/3860.700.1 Darwin/25.6.0';
const newsItem = (extra: Record<string, unknown> = {}) => ({ CID: 11, Time: validTime, Title: '标题', Content: '正文', PushUrl: 'https://source.test/news/11', ...extra });
const zhiboItem = (extra: Record<string, unknown> = {}) => ({ ID: 12, Time: validTime, Comment: '直播内容', ShareUrl: 'https://source.test/live/12', ...extra });

beforeEach(() => {
    vi.clearAllMocks();
    cache.clients.memoryCache?.clear();
});

describe('kaipanhong and kaipanla news/zhibo', () => {
    it.each(['stock', 'commodity', '0', '1', '2'])('posts supported news type %s with fixed anonymous form', async (type) => {
        mockedGot.mockResolvedValue(response({ errcode: 0, List: [newsItem()] }));
        await data(newsRoute, { type });
        const [url, options] = mockedGot.mock.calls[0] as any;
        expect(url).toBe('https://apparticle.kaipanhong.com/w1/api/index.php');
        expect(options.method).toBe('POST');
        expect(options.headers).toEqual(expect.objectContaining({ 'User-Agent': appUserAgent }));
        expect(options.form).toEqual(expect.objectContaining({ apiv: 'w47', VerSion: '6.2.31.1', PhoneOSNew: '2', c: 'PCNewsFlash', a: 'GetList', Type: type === 'stock' ? '0' : type === 'commodity' ? '1' : type }));
        expect(options.form).not.toHaveProperty('token');
        expect(options.form).not.toHaveProperty('X-Forwarded-For');
    });

    it('keeps new and legacy news feed identity identical and shares cache', async () => {
        mockedGot.mockResolvedValue(response({ errcode: 0, List: [newsItem()] }));
        const modern = await data(newsRoute);
        const legacy = await data(legacyNewsRoute);
        expect(legacy.item).toEqual(modern.item);
        expect(mockedGot).toHaveBeenCalledTimes(1);
    });

    it('keeps new and legacy zhibo feed identity identical and shares cache', async () => {
        mockedGot.mockResolvedValue(response({ errcode: 0, List: [zhiboItem()] }));
        const modern = await data(zhiboRoute);
        const legacy = await data(legacyZhiboRoute);
        expect(legacy).toEqual(modern);
        expect(mockedGot).toHaveBeenCalledTimes(1);
        expect((mockedGot.mock.calls[0][1] as any).headers).toEqual(expect.objectContaining({ 'User-Agent': appUserAgent }));
    });

    it('rejects unknown news types including prototype-property parameters', async () => {
        const outcomes = await Promise.all(
            ['unknown', 'toString', 'constructor'].map(async (type) => {
                try {
                    await data(newsRoute, { type });
                    return false;
                } catch (error) {
                    return error instanceof InvalidParameterError;
                }
            })
        );
        expect(outcomes).toEqual([true, true, true]);
        expect(mockedGot).not.toHaveBeenCalled();
    });

    it('uses content when title is empty, and title when content is empty', async () => {
        mockedGot.mockResolvedValueOnce(response({ errcode: 0, List: [newsItem({ Title: '', Content: '正文标题' })] }));
        expect((await data(newsRoute)).item[0].title).toBe('正文标题');
        cache.clients.memoryCache?.clear();
        mockedGot.mockResolvedValueOnce(response({ errcode: 0, List: [newsItem({ Title: '有效标题', Content: '' })] }));
        expect((await data(newsRoute)).item[0].description).toContain('有效标题');
    });

    it('falls back from a whitespace-only title and removes one duplicated title prefix', async () => {
        const whitespaceTitle = ' '.repeat(3);
        mockedGot.mockResolvedValueOnce(response({ errcode: 0, List: [newsItem({ Title: whitespaceTitle, Content: '【正文标题】正文内容' })] }));
        const item = (await data(newsRoute)).item[0];
        expect(item.title).toBe('【正文标题】正文内容');
        expect(item.description).toContain('正文内容');
        expect(item.description).not.toContain('【正文标题】正文内容');
    });

    it('removes one title prefix when content repeats the actual title', async () => {
        mockedGot.mockResolvedValue(response({ errcode: 0, List: [newsItem({ Title: '正文标题', Content: '【正文标题】正文内容' })] }));
        const description = (await data(newsRoute)).item[0].description;
        expect(description).toContain('正文内容');
        expect(description).not.toContain('【正文标题】正文内容');
    });

    it('parses safe string stock changes and drops strings with trailing content', async () => {
        mockedGot.mockResolvedValue(
            response({
                errcode: 0,
                List: [
                    newsItem({
                        Stocks: [
                            ['600000', '浦发', '3.50'],
                            ['000001', '平安', '3.50%'],
                            ['000002', '恶意', '3.50%<script>'],
                        ],
                    }),
                ],
            })
        );
        const description = (await data(newsRoute)).item[0].description;
        expect(description).toContain('↑ +3.50%');
        expect(description).toContain('↑ +3.50%');
        expect(description).not.toContain('3.50%<script>');
        expect(description).toContain('恶意');
    });

    it.each([null, ''])('does not treat PlateZDF=%p as a real zero change', async (PlateZDF) => {
        mockedGot.mockResolvedValue(response({ errcode: 0, List: [zhiboItem({ PlateName: '板块', PlateZDF })] }));
        expect((await data(zhiboRoute)).item[0].description).not.toContain('0.00%');
    });

    it('renders a real zero PlateZDF change', async () => {
        mockedGot.mockResolvedValue(response({ errcode: 0, List: [zhiboItem({ PlateName: '板块', PlateZDF: 0 })] }));
        expect((await data(zhiboRoute)).item[0].description).toContain('0.00%');
    });

    it.each([null, '', false, {}, []])('rejects malformed news ID %p', async (CID) => {
        mockedGot.mockResolvedValue(response({ errcode: 0, List: [newsItem({ CID })] }));
        await expect(data(newsRoute)).rejects.toThrow();
    });

    it.each([null, '', false, {}, []])('rejects malformed news time %p without current-time fallback', async (Time) => {
        mockedGot.mockResolvedValue(response({ errcode: 0, List: [newsItem({ Time })] }));
        await expect(data(newsRoute)).rejects.toThrow();
    });

    it('rejects a source time outside the JavaScript Date range', async () => {
        mockedGot.mockResolvedValue(response({ errcode: 0, List: [newsItem({ Time: 1e30 })] }));
        await expect(data(newsRoute)).rejects.toThrow();
    });

    it.each([{}, { errcode: 1, List: [] }, { errcode: 0 }, { errcode: 0, List: {} }, { errcode: 0, List: null }])('rejects malformed news envelope %p', async (payload) => {
        mockedGot.mockResolvedValue(response(payload));
        await expect(data(newsRoute)).rejects.toThrow();
    });

    it('accepts a normal empty news list for core handling', async () => {
        mockedGot.mockResolvedValue(response({ errcode: 0, List: [] }));
        expect((await data(newsRoute)).item).toEqual([]);
    });

    it('escapes news HTML and tolerates malformed stock tuples', async () => {
        mockedGot.mockResolvedValue(response({ errcode: 0, List: [newsItem({ Title: '<script>', Content: '<img onerror="x">', Stocks: [null, ['only-code'], ['600000', '<b>name</b>', 1.2], ['bad']] })] }));
        const item = (await data(newsRoute)).item[0];
        expect(item.description).not.toContain('<script>');
        expect(item.description).toContain('&lt;img onerror=&quot;x&quot;&gt;');
    });

    it('rejects invalid zhibo fields, escapes content, and does not render unsafe images', async () => {
        mockedGot.mockResolvedValue(
            response({ errcode: 0, List: [zhiboItem({ Comment: '<b>x</b>', Image: 'javascript:alert(1)', PlateName: '<plate>', PlateZDF: '<img>', Stock: [null, ['bad'], ['<code>', '<name>', '<percent>']] })] })
        );
        const item = (await data(zhiboRoute)).item[0];
        expect(item.description).not.toContain('<img');
        expect(item.description).toContain('&lt;b&gt;x&lt;/b&gt;');
        expect(item.description).not.toContain('<plate>');
        expect(item.description).not.toContain('<code>');
        expect(item.description).not.toContain('<name>');
        expect(item.description).not.toContain('<percent>');
        cache.clients.memoryCache?.clear();
        mockedGot.mockResolvedValue(response({ errcode: 0, List: [zhiboItem({ ID: null })] }));
        await expect(data(zhiboRoute)).rejects.toThrow();
    });

    it('does not render an img element for an invalid https image URL', async () => {
        mockedGot.mockResolvedValue(response({ errcode: 0, List: [zhiboItem({ Image: 'https://' })] }));
        expect((await data(zhiboRoute)).item[0].description).not.toContain('<img');
    });
});

describe('kaipanhong radar', () => {
    const radar = (extra: Record<string, unknown> = {}) => ({ time: validTime, stockid: '600000', status: '1', stock_name: '浦发', content: '事件正文', url: 'https://source.test/radar', ...extra });

    it('keeps radar GUID stable across fetch date and separates same-second content', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(9_999_999_999_999);
        try {
            mockedGot.mockResolvedValueOnce(response({ errcode: 0, date: '2026-09-07', list: [radar()] }));
            const first = (await data(radarRoute)).item[0];
            expect((mockedGot.mock.calls[0][1] as any).headers).toEqual(expect.objectContaining({ 'User-Agent': appUserAgent }));
            cache.clients.memoryCache?.clear();
            mockedGot.mockResolvedValueOnce(response({ errcode: 0, date: '2026-09-08', list: [radar()] }));
            const second = (await data(radarRoute)).item[0];
            expect(second.guid).toBe(first.guid);
            expect(first.guid).not.toContain('9999999999999');
            cache.clients.memoryCache?.clear();
            mockedGot.mockResolvedValueOnce(response({ errcode: 0, date: '2026-09-08', list: [radar(), radar({ content: '另一正文' })] }));
            const items = (await data(radarRoute)).item;
            expect(items).toHaveLength(2);
            expect(items[0].guid).not.toBe(items[1].guid);
        } finally {
            vi.restoreAllMocks();
        }
    });

    it('deduplicates repeated radar entries and rejects missing/invalid source date', async () => {
        mockedGot.mockResolvedValue(response({ errcode: 0, date: '2026-09-07', list: [radar(), radar()] }));
        expect((await data(radarRoute)).item).toHaveLength(1);
        cache.clients.memoryCache?.clear();
        mockedGot.mockResolvedValue(response({ errcode: 0, date: '', list: [radar()] }));
        await expect(data(radarRoute)).rejects.toThrow();
    });
});

describe('legacy kaipanla zt/review validation', () => {
    const zt = { errcode: 0, date: validTime, info: [1, 2, 3, 4, 10, 20, 30, 40, 1, 2, 3, '<b>说明</b>'] };
    const review = { errcode: 0, date: validTime, info: { strong: 0, sign: '<b>点评</b>' } };

    it('accepts real zero values and valid source dates', async () => {
        mockedGot.mockResolvedValueOnce(response(zt));
        expect((await data(legacyZtRoute)).item).toHaveLength(1);
        mockedGot.mockResolvedValueOnce(response(review));
        expect((await data(legacyReviewRoute)).item[0].title).toContain('0分');
    });

    it.each([
        {},
        { errcode: 1, date: validTime, info: [1, 2, 3, 4, 10, 20, 30, 40, 1, 2, 3, 'x'] },
        { errcode: 0, date: validTime, info: null },
        { errcode: 0, date: validTime, info: [null, 2, 3, 4, 10, 20, 30, 40, 1, 2, 3, 'x'] },
        { errcode: 0, date: validTime, info: ['', 2, 3, 4, 10, 20, 30, 40, 1, 2, 3, 'x'] },
        { errcode: 0, date: validTime, info: [0] },
        { errcode: 0, date: 'bad', info: [1, 2, 3, 4, 10, 20, 30, 40, 1, 2, 3, 'x'] },
    ])('rejects malformed legacy zt payload %p', async (payload) => {
        mockedGot.mockResolvedValue(response(payload));
        await expect(data(legacyZtRoute)).rejects.toThrow();
    });

    it.each([
        {},
        { errcode: 1, date: validTime, info: { strong: 1, sign: 'x' } },
        { errcode: 0, date: validTime, info: { strong: '', sign: 'x' } },
        { errcode: 0, date: validTime, info: { strong: null, sign: 'x' } },
        { errcode: 0, date: 'bad', info: { strong: 1, sign: 'x' } },
    ])('rejects malformed legacy review payload %p', async (payload) => {
        mockedGot.mockResolvedValue(response(payload));
        await expect(data(legacyReviewRoute)).rejects.toThrow();
    });
});
