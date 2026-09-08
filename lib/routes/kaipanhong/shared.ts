import { createHash } from 'node:crypto';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Data } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

import { renderSectorAndStockCards, type StockItem } from '../_finance/stock-card';

const CACHE_TTL = 1;
const NEWS_API = 'https://apparticle.kaipanhong.com/w1/api/index.php';
const HQ_API = 'https://apphwhq.kaipanhong.com/w1/api/index.php';
const COMMON_FORM = { apiv: 'w47', PhoneOSNew: '2', VerSion: '6.2.31.1' };

export const escapeHtml = (value: unknown): string =>
    String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

export const safeUrl = (value: unknown, fallback: string): string => {
    try {
        const url = new URL(String(value ?? '').trim());
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : fallback;
    } catch {
        return fallback;
    }
};

const apiPost = async (url: string, form: Record<string, string>): Promise<Record<string, any>> => {
    // The upstream returns an empty list with the normal desktop UA; this observed app UA is credential-free.
    const { data } = await got(url, { method: 'POST', form, headers: { Accept: '*/*', 'User-Agent': '%E5%BC%80%E7%9B%98%E7%BA%A2/0 CFNetwork/3860.700.1 Darwin/25.6.0' } });
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('开盘红 API 返回格式无效');
    }
    if (String(data.errcode) !== '0') {
        throw new Error(`开盘红 API 业务错误，errcode=${String(data.errcode)}`);
    }
    return data;
};

const sourceTime = (value: unknown): Date => {
    if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '' || typeof value === 'boolean') {
        throw new Error('开盘红数据缺少有效源时间');
    }
    const seconds = Number(value);
    if (!Number.isFinite(seconds) || seconds <= 0) {
        throw new Error('开盘红数据缺少有效源时间');
    }
    const milliseconds = seconds > 1e12 ? seconds : seconds * 1000;
    if (!Number.isFinite(new Date(milliseconds).getTime())) {
        throw new TypeError('开盘红数据源时间无效');
    }
    return parseDate(milliseconds);
};

const listOrError = (data: Record<string, any>, key: string): any[] => {
    if (!Array.isArray(data[key])) {
        throw new TypeError(`开盘红 API 缺少有效 ${key} 数组`);
    }
    return data[key];
};

const validId = (value: unknown): boolean => (typeof value === 'string' && value.trim() !== '') || (typeof value === 'number' && Number.isFinite(value));
const validText = (value: unknown): boolean => typeof value === 'string' && value.trim() !== '';
const numericChange = (value: unknown): number | undefined => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value !== 'string' || !/^[-+]?\d+(?:\.\d+)?%?$/.test(value.trim())) {
        return undefined;
    }
    const number = Number(value.replace(/%$/, ''));
    return Number.isFinite(number) ? number : undefined;
};
const fingerprint = (value: string): string => createHash('sha256').update(value).digest('hex');

const liveImage = (value: unknown): string => {
    const image = safeUrl(value, '');
    if (!image) {
        return '';
    }
    const url = new URL(image);
    // This exact reusable author portrait is not a news illustration. Keep other images, even repeated charts.
    return url.hostname === 'appresi.longhuvip.com' && url.pathname === '/uploadImg/adv/ArticleImage/1727336533_456.png' ? '' : image;
};

const changeLabel = (value: unknown): string => {
    const change = numericChange(value);
    return change === undefined ? '' : ` ${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
};

const turnoverLabel = (value: unknown): string => {
    const amount = numericChange(value);
    if (amount === undefined || amount < 0 || String(value).includes('%')) {
        return '';
    }
    // Scale the upstream number without asserting an undocumented currency unit.
    const formatted = amount >= 1e8 ? `${(amount / 1e8).toFixed(2)}亿` : amount >= 1e4 ? `${(amount / 1e4).toFixed(2)}万` : String(amount);
    return ` · 成交额 ${formatted}`;
};

const typeNames: Record<string, string> = { '0': '类型0', '1': '类型1', '2': '类型2' };

export async function newsHandler(ctx): Promise<Data> {
    const typeParam = ctx.req.param('type') || 'stock';
    const type = typeParam === 'stock' ? '0' : typeParam === 'commodity' ? '1' : Object.hasOwn(typeNames, typeParam) ? typeParam : undefined;
    if (!type) {
        throw new InvalidParameterError(`无效新闻类型: ${typeParam}，支持 stock、commodity、0、1、2`);
    }
    const response = await cache.tryGet(`kaipanhong:news:${type}`, () => apiPost(NEWS_API, { ...COMMON_FORM, c: 'PCNewsFlash', a: 'GetList', Type: type, Index: '0', st: '30' }), CACHE_TTL, false);
    const list = listOrError(response, 'List');
    const items = list.map((item, index) => {
        if (!item || !validId(item.CID) || !validId(item.Time) || !(validText(item.Content) || validText(item.Title))) {
            throw new Error(`开盘红快讯条目 ${index} 缺少必要 ID、时间或正文`);
        }
        const title = validText(item.Title) ? item.Title : item.Content;
        const content = validText(item.Content) ? item.Content : item.Title;
        const duplicatePrefix = content.match(/^【(.+?)】\s*/);
        const cleanContent = duplicatePrefix && (duplicatePrefix[1] === title || title.includes(duplicatePrefix[1]) || duplicatePrefix[1].includes(title)) ? content.slice(duplicatePrefix[0].length) : content;
        const fallback = `https://www.kaipanhong.com/#news-${encodeURIComponent(String(item.CID))}`;
        const stocks = Array.isArray(item.Stocks) ? item.Stocks : [];
        const tuples = stocks.filter((stock): stock is any[] => Array.isArray(stock) && stock.length >= 2 && validId(stock[0]) && validId(stock[1]));
        const toStock = ([code, name, change]: any[]) => ({ name: escapeHtml(name), code: escapeHtml(code), change: numericChange(change) }) as StockItem;
        const plates = tuples.filter(([code]) => String(code).startsWith('8')).map((tuple) => toStock(tuple));
        const stockItems = tuples.filter(([code]) => !String(code).startsWith('8')).map((tuple) => toStock(tuple));
        let description = `<div><p>${escapeHtml(cleanContent)}</p></div>`;
        if (stocks.length) {
            description += renderSectorAndStockCards(plates, stockItems);
        }
        return {
            title,
            description,
            pubDate: sourceTime(item.Time),
            link: safeUrl(item.PushUrl, fallback),
            guid: `kaipanla:news:${item.CID}`,
            author: item.Source || '开盘红',
            category: tuples.map(([code, name]) => `${name}(${code})`),
        };
    });
    const typeName = typeNames[type];
    return { title: `开盘红 · 新闻快讯 · ${typeName}`, link: 'https://www.kaipanhong.com/', description: `开盘红实时资讯，原始类型 ${type}`, language: 'zh-CN', item: items };
}

export async function zhiboHandler(ctx): Promise<Data> {
    const category = ctx.req.param('category') || '全部';
    const response = await cache.tryGet('kaipanhong:zhibo', () => apiPost(HQ_API, { ...COMMON_FORM, c: 'ConceptionPoint', a: 'ZhiBoContent' }), CACHE_TTL, false);
    const all = listOrError(response, 'List');
    let list = all;
    if (category === '个股') {
        list = all.filter((item) => Array.isArray(item.Stock) && item.Stock.length);
    } else if (category === '板块') {
        list = all.filter((item) => String(item.PlateName || '').trim());
    } else if (category !== '全部') {
        list = all.filter((item) => item.PlateName === category || item.UserName === category);
    }
    const items = list.map((item, index) => {
        if (!item || !validId(item.ID) || !validId(item.Time) || !validId(item.Comment)) {
            throw new Error(`开盘红直播条目 ${index} 缺少必要 ID、时间或正文`);
        }
        const fallback = `https://www.kaipanhong.com/#dapanzhibo-${encodeURIComponent(String(item.ID))}`;
        let description = '';
        const imageUrl = liveImage(item.Image);
        if (imageUrl) {
            description += `<p><img src="${escapeHtml(imageUrl)}" /></p>`;
        }
        description += `<p>${escapeHtml(item.Comment)}</p>`;
        if (item.Interpretation) {
            description += `<p><strong>解读</strong>：${escapeHtml(item.Interpretation)}</p>`;
        }
        if (item.BoomReason) {
            description += `<p><strong>爆发原因</strong>：${escapeHtml(item.BoomReason)}</p>`;
        }
        if (validText(item.PlateName)) {
            description += `<p><strong>板块</strong>：${escapeHtml(item.PlateName)}${changeLabel(item.PlateZDF)}${turnoverLabel(item.PlateJE)}</p>`;
        }
        if (Array.isArray(item.Stock) && item.Stock.length) {
            const stocks = item.Stock.filter((stock) => Array.isArray(stock) && stock.length >= 2 && validId(stock[0]) && validText(stock[1]))
                .slice(0, 15)
                .map(([code, name, change]: any[]) => `${escapeHtml(name)} (${escapeHtml(code)})${changeLabel(change)}`);
            if (stocks.length) {
                description += `<p><strong>相关个股</strong><br/>${stocks.join('<br/>')}</p>`;
            }
        }
        const categories = [
            item.PlateName,
            ...(Array.isArray(item.Stock)
                ? item.Stock.filter((stock) => Array.isArray(stock) && stock.length >= 2 && validId(stock[0]) && validText(stock[1]))
                      .slice(0, 10)
                      .map(([code, name]: any[]) => `${name}(${code})`)
                : []),
        ].filter(Boolean);
        return { title: String(item.Comment), description, pubDate: sourceTime(item.Time), link: safeUrl(item.ShareUrl, fallback), guid: `kaipanla:zhibo:${item.ID}`, author: item.UserName || '开盘红', category: categories };
    });
    return { title: `开盘红 · 大盘直播${category === '全部' ? '' : ` · ${category}`}`, link: 'https://www.kaipanhong.com/', description: '开盘红大盘直播', language: 'zh-CN', item: items };
}

export async function radarHandler(): Promise<Data> {
    const response = await cache.tryGet('kaipanhong:radar', () => apiPost(HQ_API, { ...COMMON_FORM, c: 'HomeDingPan', a: 'Radar', Index: '0', st: '20' }), CACHE_TTL, false);
    const list = listOrError(response, 'list');
    if (!validText(response.date)) {
        throw new Error('开盘红雷达缺少源日期');
    }
    const seen = new Set<string>();
    const items = list
        .map((item, index) => {
            if (!item || !validId(item.time) || !validId(item.stockid) || !validId(item.status)) {
                throw new Error(`开盘红雷达条目 ${index} 缺少必要时间、股票或事件类型`);
            }
            const eventType = String(item.status);
            const stock = String(item.stockid);
            const content = [item.content, item.content2].filter(Boolean).join(' ');
            if (!content) {
                throw new Error(`开盘红雷达条目 ${index} 缺少正文`);
            }
            const eventSeconds = Number(item.time) > 1e12 ? Math.trunc(Number(item.time) / 1000) : Math.trunc(Number(item.time));
            const eventKey = `${eventSeconds}:${stock}:${eventType}`;
            const bodyKey = fingerprint(content);
            const fallback = `https://www.kaipanhong.com/#radar-${encodeURIComponent(eventKey)}-${bodyKey}`;
            const identity = `${eventKey}:${bodyKey}`;
            if (seen.has(identity)) {
                return null;
            }
            seen.add(identity);
            return {
                title: `${item.stock_name || stock} · ${eventType}`,
                description: `<p>${escapeHtml(content)}</p>`,
                pubDate: sourceTime(item.time),
                link: safeUrl(item.url, fallback),
                guid: `kaipanhong:radar:${eventKey}:${bodyKey}`,
                author: '开盘红',
                category: [eventType, stock],
            };
        })
        .filter((item) => item !== null);
    return { title: '开盘红 · 盘口雷达', link: 'https://www.kaipanhong.com/', description: '开盘红盘口雷达事件', language: 'zh-CN', item: items };
}
