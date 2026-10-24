import { beforeEach, describe, expect, it, vi } from 'vitest';

import ofetch from '@/utils/ofetch';

import { route } from './calendar';

vi.mock('@/utils/ofetch', () => ({ default: vi.fn() }));

const base = { id: 123, country: '欧元区', title: '欧洲多国开始实施冬令时，金融市场交易延后一小时', importance: 3, public_date: 1_792_857_600, actual: '', forecast: '', previous: '', revised: '', unit: '' };
const render = async (extra = {}, section = 'macrodatas') => {
    vi.mocked(ofetch).mockResolvedValue({ data: { items: [{ ...base, ...extra }] } });
    return (await (route.handler as any)({ req: { param: () => ({ section }) } })).item[0];
};

beforeEach(() => vi.clearAllMocks());

describe('wallstreetcn calendar layout', () => {
    it('separates the region and event and hides empty indicator fields', async () => {
        const item = await render();
        expect(item.title).toBe('欧元区 · 欧洲多国开始实施冬令时，金融市场交易延后一小时');
        expect(item.description).toBe('<p>欧元区 · 欧洲多国开始实施冬令时，金融市场交易延后一小时</p><p>重要性：★★★</p>');
        expect(item.guid).toBe(123);
    });

    it('does not repeat a country already present in the event title', async () => {
        expect((await render({ country: '巴西', title: '巴西将举行总统选举第二轮决选投票开始' })).title).toBe('巴西将举行总统选举第二轮决选投票开始');
    });

    it('preserves zero values, units, and a zero revision on separate lines', async () => {
        const item = await render({ actual: 0, forecast: 1, previous: 2, revised: 0, unit: '%' });
        expect(item.description).toContain('<p>今值：0%<br/>预期：1%<br/>前值：0%</p>');
    });

    it('keeps missing fields as placeholders when other values exist and escapes source text', async () => {
        const item = await render({ title: '<会议 & 声明>', actual: '-', forecast: ' ', previous: '2', unit: '%' });
        expect(item.description).toContain('&lt;会议 &amp; 声明&gt;');
        expect(item.description).toContain('<p>今值：-<br/>预期：-<br/>前值：2%</p>');
    });

    it('hides all placeholder values', async () => {
        expect((await render({ actual: '-', forecast: ' ', previous: null })).description).not.toContain('今值');
    });
});
