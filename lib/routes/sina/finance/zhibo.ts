import iconv from 'iconv-lite';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Data, Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

import { applySourceImportance } from '../../_finance/source-importance';
import { renderSectorAndStockCards, type StockItem } from '../../_finance/stock-card';

const toStockItemsWithQuotes = (items: any[], quotes: Record<string, { name: string; change: number }>): StockItem[] =>
    items
        .filter((s) => quotes?.[s.symbol]?.change !== undefined)
        .map((s) => ({
            name: s.key,
            code: s.symbol.toUpperCase(),
            change: quotes[s.symbol].change,
        }));

const ROOT_URL = 'https://zhibo.sina.com.cn';
const SINA_ZHIBO_CACHE_TTL = 1;
const LIVE_ZHIBO_ID = '152';

// 7x24 currently serves live flashes only on zhibo_id=152; other historic ids are 2014 archives.
const ZHIBO_TAGS: Record<string, string> = {
    '0': '全部',
    '1': '宏观',
    '3': '公司',
    '4': '数据',
    '5': '市场',
    '6': '观点',
    '7': '央行',
    '8': '其他',
    '9': '焦点',
    '10': 'A股',
    '102': '国际',
    '110': '产业',
};

const ZHIBO_TAG_NAME_TO_ID: Record<string, string> = Object.fromEntries(Object.entries(ZHIBO_TAGS).map(([id, name]) => [name, id]));

const LEGACY_724_NAMES: Record<string, string> = {
    all: '0',
    macro: '1',
    stock: '5',
    international: '102',
    opinion: '6',
    focus: '9',
};

const LEGACY_ZHIBO_ID_TO_TAG: Record<string, string> = {
    '151': '1',
    '153': '6',
    '155': '5',
    '164': '102',
    '242': '110',
};

const INDIVIDUAL_MARKETS = new Set(['cn', 'hk', 'us', 'usa']);

export type ResolvedZhiboId = {
    zhiboId: string;
    isFocusMode: boolean;
    tagId: string;
    tagName: string;
};

export function resolveZhiboId(raw = '152'): ResolvedZhiboId {
    const key = decodeURIComponent(raw).trim();
    if (!key || key === LIVE_ZHIBO_ID || key === 'all' || key === '0') {
        return { zhiboId: LIVE_ZHIBO_ID, isFocusMode: false, tagId: '0', tagName: '全部' };
    }

    const tagId = LEGACY_724_NAMES[key.toLowerCase()] ?? LEGACY_ZHIBO_ID_TO_TAG[key] ?? (Object.hasOwn(ZHIBO_TAGS, key) ? key : ZHIBO_TAG_NAME_TO_ID[key]);
    if (!tagId) {
        throw new InvalidParameterError(`Invalid zhibo_id "${raw}". Use 152/all, focus, a 7x24 tag (宏观/市场/国际/A股/...), or a legacy 724 name (macro/stock/international/opinion).`);
    }

    return {
        zhiboId: LIVE_ZHIBO_ID,
        isFocusMode: tagId === '9',
        tagId,
        tagName: ZHIBO_TAGS[tagId],
    };
}

export function isZhiboFocusItem(item: { is_focus?: number; tag?: Array<{ id?: string; name?: string }> }): boolean {
    if (item.is_focus === 1) {
        return true;
    }
    return item.tag?.some((tag) => tag.name === '焦点' || String(tag.id) === '9') ?? false;
}

export function itemMatchesZhiboTag(item: { is_focus?: number; tag?: Array<{ id?: string; name?: string }> }, tagId: string, tagName?: string): boolean {
    if (!tagId || tagId === '0' || tagName === '全部') {
        return true;
    }
    if (tagId === '9' || tagName === '焦点') {
        return isZhiboFocusItem(item);
    }
    const wantedName = tagName || ZHIBO_TAGS[tagId];
    return (
        item.tag?.some((tag) => {
            if (String(tag.id) === tagId || (wantedName && tag.name === wantedName)) {
                return true;
            }
            return Boolean(tagName && (tag.id === tagName || tag.name?.includes(tagName)));
        }) ?? false
    );
}

const asMediaUrls = (value: unknown): string[] => {
    if (typeof value === 'string') {
        return /^https?:\/\//i.test(value) ? [value] : [];
    }
    if (Array.isArray(value)) {
        return value.flatMap((entry) => asMediaUrls(entry));
    }
    return [];
};

export function collectZhiboMultimedia(
    multimedia: unknown,
    richText?: string
): {
    images: string[];
    videos: string[];
    audios: string[];
} {
    const images: string[] = [];
    const videos: string[] = [];
    const audios: string[] = [];

    if (multimedia && typeof multimedia === 'object') {
        const media = multimedia as Record<string, unknown>;
        images.push(...asMediaUrls(media.img_url), ...asMediaUrls(media.original_pic));
        videos.push(...asMediaUrls(media.video_url));
        audios.push(...asMediaUrls(media.audio_url));
        if (Array.isArray(media.pic_id_plus)) {
            for (const pic of media.pic_id_plus) {
                if (!pic || typeof pic !== 'object') {
                    continue;
                }
                const urls = pic as { large?: string; bmiddle?: string; thumbnail?: string };
                images.push(...asMediaUrls(urls.large || urls.bmiddle || urls.thumbnail));
            }
        }
    }

    if (richText) {
        const richTextImgMatches = richText.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) ?? [];
        for (const imgTag of richTextImgMatches) {
            const srcMatch = imgTag.match(/src=["']([^"']+)["']/);
            if (srcMatch) {
                images.push(...asMediaUrls(srcMatch[1]));
            }
        }
    }

    return {
        images: [...new Set(images)],
        videos: [...new Set(videos)],
        audios: [...new Set(audios)],
    };
}

export function classifyZhiboStocks<T extends { market?: string }>(stocks: T[]): { individualStocks: T[]; sectors: T[] } {
    const individualStocks: T[] = [];
    const sectors: T[] = [];
    for (const stock of stocks) {
        if (INDIVIDUAL_MARKETS.has((stock.market ?? '').toLowerCase())) {
            individualStocks.push(stock);
        } else {
            sectors.push(stock);
        }
    }
    return { individualStocks, sectors };
}

export const route: Route = {
    path: ['/finance/zhibo/:zhibo_id?', '/zhibo/:zhibo_id?', '/finance/724/:zhibo_id?', '/724/:zhibo_id?'],
    categories: ['finance'],
    view: ViewType.Articles,
    example: '/sina/zhibo',
    parameters: {
        zhibo_id: '7×24 标签，默认 152/all（全部）。官网直播只在 152。可选：focus、宏观/市场/国际/A股 等标签名，或旧版 724 名：all、macro、stock、international、opinion',
    },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['finance.sina.com.cn/7x24/', 'finance.sina.com.cn', 'zhibo.sina.com.cn/'],
            target: '/zhibo',
        },
    ],
    name: '7×24直播',
    maintainers: ['nczitzk', 'luck'],
    handler,
    url: 'zhibo.sina.com.cn',
    cacheTtl: SINA_ZHIBO_CACHE_TTL,
    description: `对接新浪财经 7×24 直播接口。官网当前只有 \`zhibo_id=152\` 在更新；151/153/155/164/242 是 2014 年存档，已改映射到 152 上的对应标签。\`/sina/724/:zhibo_id?\` 是本路由的别名。

查询参数：

- \`limit\`: 返回条数，默认 20。接口单页最多 10 条，超过会自动分页抓取
- \`pagesize\`: 单页条数（1-10），默认 10
- \`tag\`: 标签过滤，支持标签名或 ID（如：市场、公司、A 股、国际），留空表示不过滤。上游 \`tag=\` 参数无效，过滤在本地完成

\`/sina/zhibo/focus\` 仅返回焦点新闻（\`is_focus=1\` 或标签 \`焦点\` / id \`9\`）。焦点条目会打上「重要」标记。

| 参数                      | 标签 |
| ------------------------- | ---- |
| all / 152 / 0             | 全部 |
| focus / 9                 | 焦点 |
| macro / 151 / 1           | 宏观 |
| stock / 155 / 5           | 市场 |
| international / 164 / 102 | 国际 |
| opinion / 153 / 6         | 观点 |
| 10                        | A 股 |
| 3                         | 公司 |
| 4                         | 数据 |
| 7                         | 央行 |
| 110 / 242                 | 产业 |

示例：

- \`/sina/zhibo\` - 全部财经快讯
- \`/sina/zhibo/focus\` - 仅焦点新闻
- \`/sina/zhibo/市场\` 或 \`/sina/724/stock\` - 市场
- \`/sina/724\` - 同上（别名）

别名路径：\`/sina/zhibo\`、\`/sina/finance/zhibo\`、\`/sina/724\`、\`/sina/finance/724\`。`,
};

interface ZhiboFeedItem {
    id: number;
    zhibo_id: number;
    rich_text: string;
    create_time: string; // 'YYYY-MM-DD HH:mm:ss'
    update_time?: string;
    creator?: string;
    docurl?: string;
    multimedia?: unknown;
    tag?: Array<{
        id: string;
        name: string;
    }>;
    ext?: string; // JSON string containing docurl, docid, etc.
    is_focus?: number; // 1 = focus, 0 = normal
    top_value?: number;
    anchor?: string;
    compere_info?: string;
    like_nums?: number;
    comment_list?: {
        total: number;
        list?: unknown[];
    };
}

async function fetchStockQuotes(stockInfoList: Array<{ market: string; symbol: string; key: string }>) {
    if (!stockInfoList || stockInfoList.length === 0) {
        return {};
    }

    try {
        const symbolMap = new Map<string, string>();
        const apiSymbols = stockInfoList.map((s) => {
            let apiSymbol = s.symbol.toLowerCase();

            if (s.market === 'us' || s.market === 'USA') {
                apiSymbol = `gb_${s.symbol.toLowerCase()}`;
            } else if (s.market === 'hk' || s.market === 'HK') {
                apiSymbol = `hk${s.symbol.toLowerCase().replace(/^hk/, '')}`;
            } else if (s.market === 'cn' || s.market === 'CN' || apiSymbol.startsWith('sh') || apiSymbol.startsWith('sz')) {
                apiSymbol = s.symbol.toLowerCase();
            } else if (s.market === 'fund') {
                // Funds/ETFs: listing prefix from the numeric code (strip any existing sh/sz).
                const code = s.symbol.replace(/^(sh|sz)/i, '');
                if (code.startsWith('5') || code.startsWith('6')) {
                    // 5/6 → Shanghai
                    apiSymbol = `sh${code}`;
                } else if (code.startsWith('0') || code.startsWith('3') || code.startsWith('1')) {
                    // 0/1/3 → Shenzhen
                    apiSymbol = `sz${code}`;
                } else {
                    // Anything else: try Shanghai
                    apiSymbol = `sh${code}`;
                }
            } else if (s.symbol.toLowerCase().startsWith('fx_')) {
                apiSymbol = s.symbol.toLowerCase();
            } else if (s.symbol.toLowerCase().startsWith('nf_') || s.symbol.toLowerCase().startsWith('hf_')) {
                const prefix = s.symbol.slice(0, 3).toLowerCase();
                const code = s.symbol.slice(3).toUpperCase();
                apiSymbol = prefix + code;
            } else {
                apiSymbol = s.symbol.toLowerCase();
            }

            symbolMap.set(apiSymbol, s.symbol);
            return apiSymbol;
        });

        const symbols = apiSymbols.join(',');
        const cacheKey = `sina:stock:quotes:v2:${symbols}`;

        return await cache.tryGet(
            cacheKey,
            async () => {
                const response = await got(`https://hq.sinajs.cn/list=${symbols}`, {
                    headers: {
                        Referer: 'https://finance.sina.com.cn/',
                    },
                    responseType: 'buffer',
                });

                // Sina hq API returns GBK; decode to UTF-8.
                const gbkData = iconv.decode(response.data, 'gbk');
                const lines = gbkData.trim().split('\n');
                const quotes: Record<string, { name: string; change: number }> = {};

                for (const line of lines) {
                    if (!line.includes('hq_str_')) {
                        continue;
                    }

                    // Lines look like: var hq_str_XXX="..."
                    const symbolMatch = line.match(/hq_str_(\w+)=/);
                    const dataMatch = line.match(/"([^"]+)"/);

                    if (symbolMatch && dataMatch) {
                        const apiSymbol = symbolMatch[1];
                        const data = dataMatch[1].split(',');
                        const originalSymbol = symbolMap.get(apiSymbol);

                        if (!originalSymbol || data.length < 2) {
                            continue;
                        }

                        const name = data[0];
                        let changePercent: number | undefined;

                        if (apiSymbol.startsWith('gb_')) {
                            // US: data[2] is the change percent
                            const change = Number(data[2]);
                            if (!Number.isNaN(change)) {
                                changePercent = change;
                            }
                        } else if (apiSymbol.startsWith('hk')) {
                            // HK: data[8] is the change percent
                            if (data.length >= 9) {
                                const change = Number(data[8]);
                                if (!Number.isNaN(change)) {
                                    changePercent = change;
                                }
                            }
                        } else if (
                            (apiSymbol.startsWith('sh') || apiSymbol.startsWith('sz')) && // A-shares: change from data[2] (prev close) and data[3] (last)
                            data.length >= 4
                        ) {
                            const prevClose = Number(data[2]);
                            const currentPrice = Number(data[3]);
                            if (prevClose > 0 && !Number.isNaN(currentPrice)) {
                                changePercent = ((currentPrice - prevClose) / prevClose) * 100;
                            }
                        } else if (apiSymbol.startsWith('fx_')) {
                            // FX: data[11] is change as a decimal (e.g. -0.0017); multiply by 100
                            if (data.length >= 12) {
                                const change = Number(data[11]);
                                if (!Number.isNaN(change)) {
                                    changePercent = change * 100;
                                }
                            }
                        } else if (apiSymbol.startsWith('nf_')) {
                            // CN futures: data[2] prev close, data[7] last
                            if (data.length >= 8) {
                                const prevClose = Number(data[2]);
                                const currentPrice = Number(data[7]);
                                if (prevClose > 0 && !Number.isNaN(currentPrice)) {
                                    changePercent = ((currentPrice - prevClose) / prevClose) * 100;
                                }
                            }
                        } else if (apiSymbol.startsWith('hf_')) {
                            // Intl futures: data[2] prev close, data[0] last. data[7] is settlement, not last.
                            if (data.length >= 3) {
                                const prevClose = Number(data[2]);
                                const currentPrice = Number(data[0]);
                                if (prevClose > 0 && !Number.isNaN(currentPrice)) {
                                    changePercent = ((currentPrice - prevClose) / prevClose) * 100;
                                }
                            }
                        } else if (
                            (apiSymbol.startsWith('si') || apiSymbol.startsWith('znb_')) && // Index: data[1] current, data[2] prev close
                            data.length >= 3
                        ) {
                            const currentValue = Number(data[1]);
                            const prevClose = Number(data[2]);
                            if (prevClose > 0 && !Number.isNaN(currentValue)) {
                                changePercent = ((currentValue - prevClose) / prevClose) * 100;
                            }
                        }

                        if (changePercent !== undefined) {
                            quotes[originalSymbol] = {
                                name,
                                change: changePercent,
                            };
                        }
                    }
                }

                return quotes;
            },
            5 * 60 // 5 minutes
        );
    } catch {
        // Quote fetch failed: omit change percents rather than failing the feed.
        return {};
    }
}

async function handler(ctx): Promise<Data> {
    const resolved = resolveZhiboId(ctx.req.param('zhibo_id'));
    const { zhiboId, isFocusMode } = resolved;
    const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 20;
    const pagesizeQuery = ctx.req.query('pagesize');
    const tagQuery = ctx.req.query('tag');
    const dire = ctx.req.query('dire') ?? 'f';
    const dpc = ctx.req.query('dpc') ?? '1';
    let tagId = resolved.tagId;
    let tagName = resolved.tagName;
    if (tagQuery) {
        try {
            const queryResolved = resolveZhiboId(tagQuery);
            tagId = queryResolved.tagId;
            tagName = queryResolved.tagName;
        } catch {
            tagId = tagQuery;
            tagName = tagQuery;
        }
    }

    const apiUrl = `${ROOT_URL}/api/zhibo/feed`;

    const pageSize = Math.min(10, Math.max(1, pagesizeQuery ? Number.parseInt(pagesizeQuery) : 10)); // Upstream page size max is 10
    const maxPages = Math.max(1, Math.ceil(limit / pageSize));

    const collected: ZhiboFeedItem[] = await cache.tryGet(
        `sina:zhibo:feed:${zhiboId}:${pageSize}:${dire}:${dpc}:${maxPages}`,
        async () => {
            const pageNumbers = Array.from({ length: maxPages }, (_, i) => i + 1);
            const pages = await Promise.all(
                pageNumbers.map(async (page) => {
                    const res = await got(apiUrl, {
                        searchParams: {
                            zhibo_id: zhiboId,
                            pagesize: pageSize,
                            tag: '0', // Upstream tag=0 returns the unfiltered feed; apply tag/focus filters client-side.
                            dire,
                            dpc,
                            page,
                        },
                        headers: {
                            Referer: 'https://finance.sina.com.cn/',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        },
                        timeout: 30000,
                    });
                    return {
                        page,
                        list: (res.data?.result?.data?.feed?.list as ZhiboFeedItem[]) ?? [],
                    };
                })
            );
            pages.sort((a, b) => a.page - b.page);
            return pages.flatMap((p) => p.list);
        },
        SINA_ZHIBO_CACHE_TTL,
        false
    );

    const filteredData = collected.filter((item) => itemMatchesZhiboTag(item, tagId, tagName) && (!isFocusMode || isZhiboFocusItem(item))).slice(0, limit);

    const allStocks: Array<{ market: string; symbol: string; key: string }> = [];
    for (const item of filteredData) {
        if (item.ext) {
            try {
                const extData = JSON.parse(item.ext);
                if (extData.stocks && Array.isArray(extData.stocks)) {
                    allStocks.push(...extData.stocks);
                }
            } catch {
                // Ignore unparseable ext JSON.
            }
        }
    }

    const stockQuotes = await fetchStockQuotes(allStocks);

    const items = filteredData.map((it) => {
        const plain = it.rich_text?.replaceAll(/<[^>]+>/g, '').trim() ?? '';
        const bracketMatch = plain.match(/^【([^】]+)】/);
        const titleText = bracketMatch ? `【${bracketMatch[1]}】` : plain || `直播快讯 #${it.id}`;
        const isFocus = isZhiboFocusItem(it);
        const plainBody = bracketMatch ? plain.replace(/^【[^】]+】\s*/, '') : plain;
        const richBodyHtml = typeof it.rich_text === 'string' && bracketMatch ? it.rich_text.replace(/^【[^】]+】\s*/, '') : it.rich_text || '';

        let detailLink = '';
        let stockInfo: Array<{
            market: string;
            symbol: string;
            key: string;
        }> = [];

        if (it.ext) {
            try {
                const extData = JSON.parse(it.ext);
                if (extData.docurl) {
                    detailLink = extData.docurl.replace(/^http:\/\//, 'https://');
                }
                if (extData.stocks && Array.isArray(extData.stocks)) {
                    stockInfo = extData.stocks;
                }
            } catch {
                // Keep the default link when ext JSON is unparseable.
            }
        }

        if (!detailLink && it.docurl) {
            detailLink = it.docurl.replace(/^http:\/\//, 'https://');
        }
        if (!detailLink || /\/7x24\/?$/.test(detailLink)) {
            detailLink = `https://finance.sina.com.cn/7x24/?id=${it.id}`;
        }

        const { images, videos, audios } = collectZhiboMultimedia(it.multimedia, it.rich_text);
        const { sectors, individualStocks } = classifyZhiboStocks(stockInfo);
        const stockCategories = stockInfo.map((s) => `${s.key}(${s.symbol.toUpperCase()})`);

        const mediaHtml: string[] = [];
        if (images.length > 0) {
            mediaHtml.push(...images.map((img) => `<img src="${img}" />`));
        }
        if (videos.length > 0) {
            mediaHtml.push(...videos.map((video) => `<video controls src="${video}" style="max-width: 100%;">您的浏览器不支持视频播放</video>`));
        }
        if (audios.length > 0) {
            mediaHtml.push(...audios.map((audio) => `<audio controls src="${audio}">您的浏览器不支持音频播放</audio>`));
        }

        const description = `${plainBody}<br>${mediaHtml.join('<br>')}${renderSectorAndStockCards(toStockItemsWithQuotes(sectors, stockQuotes), toStockItemsWithQuotes(individualStocks, stockQuotes))}`;
        const contentHtml = `${richBodyHtml}<br>${mediaHtml.join('<br>')}<br>`;
        const uniqueCategories = [...new Set([...(it.tag?.map((t) => t.name) || []), ...stockCategories])].filter(Boolean);

        let authorName = '新浪财经';
        if (it.anchor && it.anchor.trim()) {
            authorName = it.anchor.trim();
        } else if (it.compere_info && it.compere_info.trim()) {
            authorName = it.compere_info.trim();
        } else if (it.creator) {
            authorName = it.creator.replace('@staff.sina.com.cn', '').replace('@staff.sina.com', '');
        }

        const [firstVideo] = videos;
        const [firstAudio] = audios;
        const [firstImage] = images;

        return applySourceImportance(
            {
                title: titleText,
                link: detailLink,
                description,
                author: authorName,
                pubDate: parseDate(it.create_time),
                guid: `sina-finance-zhibo-${it.id}`,
                category: uniqueCategories,
                image: firstImage,
                banner: firstImage,
                ...(firstVideo
                    ? { enclosure_url: firstVideo, enclosure_type: 'video/mp4' }
                    : firstAudio
                      ? { enclosure_url: firstAudio, enclosure_type: 'audio/mpeg' }
                      : firstImage
                        ? { enclosure_url: firstImage, enclosure_type: 'image/jpeg' }
                        : {}),
                content: {
                    html: contentHtml,
                    text: plainBody,
                },
            },
            [
                {
                    source: 'sina',
                    field: 'is_focus',
                    value: isFocus ? 1 : it.is_focus,
                    label: '焦点',
                    normalized: isFocus ? 'important' : 'normal',
                },
                {
                    source: 'sina',
                    field: 'top_value',
                    value: it.top_value,
                    label: '置顶值',
                },
            ]
        );
    });

    const channelTitle = tagName === '全部' ? '财经' : tagName;
    const focusSuffix = isFocusMode ? ' - 重要新闻' : '';

    return {
        title: `新浪财经 - 7×24直播 - ${channelTitle}${focusSuffix}`,
        link: 'https://finance.sina.com.cn/7x24/',
        description: `新浪财经7×24小时财经直播 - ${channelTitle}${focusSuffix}`,
        language: 'zh-CN',
        item: items,
        author: '新浪财经',
        image: 'https://finance.sina.com.cn/favicon.ico',
    };
}
