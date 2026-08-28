import { load } from 'cheerio';
import iconv from 'iconv-lite';

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

export const route: Route = {
    path: ['/finance/zhibo/:zhibo_id?', '/zhibo/:zhibo_id?'],
    categories: ['finance'],
    view: ViewType.Articles,
    example: '/sina/zhibo',
    parameters: {
        zhibo_id: '直播频道 id，默认为 152（财经）。常见：151 政经、153 综合、155 市场、164 国际、242 行业。特殊值：focus（仅显示重要新闻）',
    },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '7×24直播',
    maintainers: ['nczitzk'],
    handler,
    url: 'zhibo.sina.com.cn',
    description:
        '对接新浪财经直播接口（zhibo）。\n\n' +
        '查询参数：\n' +
        '- `limit`: 返回条数，默认 20\n' +
        '- `pagesize`: 单页条数（1-10），默认 10\n' +
        '- `tag`: 标签过滤，支持标签名或 ID（如：市场、公司、A股、美股），留空表示不过滤\n\n' +
        '`limit` 超过单页条数时会自动分页抓取（上游单页上限 10 条）。\n\n' +
        '`/sina/zhibo/focus` 仅返回焦点新闻；重要新闻标题前会显示「重要」标记，feed 标题会带「重要新闻」。',
};

interface ZhiboFeedItem {
    id: number;
    zhibo_id: number;
    rich_text: string;
    create_time: string; // 'YYYY-MM-DD HH:mm:ss'
    update_time?: string;
    creator?: string;
    docurl?: string;
    multimedia?: {
        img_url?: string[];
        video_url?: string[];
        audio_url?: string[];
    };
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
    const zhiboIdParam = ctx.req.param('zhibo_id') ?? '152';
    const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 20;
    const pagesizeQuery = ctx.req.query('pagesize');
    const tagFilter = ctx.req.query('tag');
    const dire = ctx.req.query('dire') ?? 'f';
    const dpc = ctx.req.query('dpc') ?? '1';

    // `zhibo_id=focus` is not an upstream channel; map it to 152 (finance) and filter is_focus=1 later.
    const isFocusMode = zhiboIdParam === 'focus';
    const zhiboId = isFocusMode ? '152' : zhiboIdParam;

    const apiUrl = `${ROOT_URL}/api/zhibo/feed`;

    const pageSize = Math.min(10, Math.max(1, pagesizeQuery ? Number.parseInt(pagesizeQuery) : 10)); // Upstream page size max is 10
    const maxPages = Math.max(1, Math.ceil(limit / pageSize));

    const collected: ZhiboFeedItem[] = [];
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
    for (const p of pages) {
        if (collected.length >= limit * 2) {
            // Over-fetch ~2x so tag/focus client filters can still fill `limit`.
            break;
        }
        if (p.list.length) {
            collected.push(...p.list);
        }
    }

    let filteredData = collected;
    if (tagFilter) {
        filteredData = collected.filter((item) => {
            if (!item.tag || item.tag.length === 0) {
                return false;
            }
            return item.tag.some((tag) => tag.name === tagFilter || tag.id === tagFilter || tag.name.includes(tagFilter));
        });
    }

    if (isFocusMode) {
        filteredData = filteredData.filter((item) => item.is_focus === 1);
    }

    filteredData = filteredData.slice(0, limit);

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

    const items = await Promise.all(
        filteredData.map(async (it) => {
            const plain = it.rich_text?.replaceAll(/<[^>]+>/g, '').trim() ?? '';
            // Prefer the 【…】 phrase as title so the body is not mixed into the title.
            const bracketMatch = plain.match(/^【([^】]+)】/);
            let titleText;
            if (bracketMatch) {
                // Unlike 724 (which strips the marks), keep the 【】 wrappers.
                titleText = `【${bracketMatch[1]}】`;
            } else if (plain.length > 0) {
                titleText = plain.length > 80 ? `${plain.slice(0, 80)}…` : plain;
            } else {
                titleText = `直播快讯 #${it.id}`;
            }
            const isFocus = it.is_focus === 1;
            // Strip the 【…】 prefix from the body so it is not repeated after the title.
            const plainBody = bracketMatch ? plain.replace(/^【[^】]+】\s*/, '') : plain;
            const richBodyHtml = typeof it.rich_text === 'string' && bracketMatch ? it.rich_text.replace(/^【[^】]+】\s*/, '') : it.rich_text || '';

            let detailLink = 'https://finance.sina.com.cn/7x24/';
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

            if (detailLink === 'https://finance.sina.com.cn/7x24/' && it.docurl) {
                detailLink = it.docurl.replace(/^http:\/\//, 'https://');
            }

            const images: string[] = [];
            const videos: string[] = [];
            const audios: string[] = [];

            if (it.multimedia && typeof it.multimedia === 'object') {
                if (it.multimedia.img_url && Array.isArray(it.multimedia.img_url)) {
                    images.push(...it.multimedia.img_url);
                }
                if (it.multimedia.video_url && Array.isArray(it.multimedia.video_url)) {
                    videos.push(...it.multimedia.video_url);
                }
                if (it.multimedia.audio_url && Array.isArray(it.multimedia.audio_url)) {
                    audios.push(...it.multimedia.audio_url);
                }
            }

            if (it.rich_text && typeof it.rich_text === 'string') {
                const richTextImgMatches = it.rich_text.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
                if (richTextImgMatches) {
                    for (const imgTag of richTextImgMatches) {
                        const srcMatch = imgTag.match(/src=["']([^"']+)["']/);
                        if (srcMatch && !images.includes(srcMatch[1])) {
                            images.push(srcMatch[1]);
                        }
                    }
                }
            }

            // If the feed item has no images, fall back to the detail page (og/twitter/#article/#artibody), same idea as 10jqka.
            if (images.length === 0 && detailLink) {
                try {
                    const detailResp = await got(detailLink);
                    const $ = load(detailResp.data);
                    const ogImage = $('meta[property="og:image"]').attr('content');
                    const twitterImage = $('meta[name="twitter:image"], meta[name="twitter:image:src"]').attr('content');
                    const pageImages = new Set<string>();
                    if (ogImage) {
                        pageImages.add(ogImage);
                    }
                    if (twitterImage) {
                        pageImages.add(twitterImage);
                    }
                    $('#article img[src], #artibody img[src]').each((_, el) => {
                        const src = $(el).attr('src');
                        if (src) {
                            pageImages.add(src);
                        }
                    });
                    images.push(...pageImages);
                } catch {
                    // Ignore unreachable detail pages.
                }
            }

            const sectors: any[] = [];
            const individualStocks: any[] = [];
            for (const s of stockInfo) {
                if (s.symbol.toUpperCase().startsWith('8')) {
                    sectors.push(s);
                } else {
                    individualStocks.push(s);
                }
            }

            const stockCategories = stockInfo.map((s) => `${s.key}(${s.symbol.toUpperCase()})`);

            let description = `${plainBody}<br>`;
            description += renderSectorAndStockCards(toStockItemsWithQuotes(sectors, stockQuotes), toStockItemsWithQuotes(individualStocks, stockQuotes));

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

            const contentHtml = `${richBodyHtml}<br>${mediaHtml.join('<br>')}<br>`;

            const tagCategories = it.tag?.map((t) => t.name) || [];
            const categories = [...tagCategories, ...stockCategories];
            const uniqueCategories = [...new Set(categories)].filter(Boolean);

            // Author: anchor > compere_info > creator (strip the staff email suffix).
            let authorName = '新浪财经';
            if (it.anchor && it.anchor.trim()) {
                authorName = it.anchor.trim();
            } else if (it.compere_info && it.compere_info.trim()) {
                authorName = it.compere_info.trim();
            } else if (it.creator) {
                authorName = it.creator.replace('@staff.sina.com.cn', '').replace('@staff.sina.com', '');
            }

            let enclosure: { url: string; type: string } | undefined;
            if (videos.length > 0) {
                enclosure = {
                    url: videos[0],
                    type: 'video/mp4',
                };
            } else if (audios.length > 0) {
                enclosure = {
                    url: audios[0],
                    type: 'audio/mpeg',
                };
            } else if (images.length > 0) {
                enclosure = {
                    url: images[0],
                    type: 'image/jpeg',
                };
            }

            return applySourceImportance(
                {
                    title: titleText,
                    link: detailLink,
                    description,
                    author: authorName,
                    pubDate: parseDate(it.create_time),
                    guid: `sina-finance-zhibo-${it.id}`,
                    category: uniqueCategories,
                    image: images[0],
                    banner: images[0],
                    enclosure,
                    content: {
                        html: contentHtml,
                        text: plainBody,
                    },
                },
                [
                    {
                        source: 'sina',
                        field: 'is_focus',
                        value: it.is_focus,
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
        })
    );

    const CHANNELS: Record<string, string> = {
        '151': '政经',
        '152': '财经',
        '153': '综合',
        '155': '市场',
        '164': '国际',
        '242': '行业',
    };

    const channelTitle = CHANNELS[zhiboId] || '财经';
    const tagSuffix = tagFilter ? ` - ${tagFilter}` : '';
    const focusSuffix = isFocusMode ? ' - 重要新闻' : '';

    return {
        title: `新浪财经 - 7×24直播 - ${channelTitle}${focusSuffix}${tagSuffix}`,
        link: 'https://finance.sina.com.cn/7x24/',
        description: `新浪财经7×24小时财经直播 - ${channelTitle}频道${focusSuffix}${tagSuffix}`,
        language: 'zh-CN',
        item: items,
        author: '新浪财经',
        image: 'https://finance.sina.com.cn/favicon.ico',
    };
}
