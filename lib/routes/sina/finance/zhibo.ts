import { load } from 'cheerio';
import iconv from 'iconv-lite';

import type { Route } from '@/types';
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
        '参数：\n' +
        '- `zhibo_id`: 频道 ID，默认 152（财经）。常见：151 政经、153 综合、155 市场、164 国际、242 行业。**特殊值：`focus`（仅显示重要新闻）**\n' +
        '- `limit`: 返回条数，默认 20。接口单页最多 10 条，超过会自动分页抓取\n' +
        '- `pagesize`: 单页条数（1-10），默认 10\n' +
        '- `tag`: 标签过滤，支持标签名或ID。如：市场、公司、A股、美股等，留空表示不过滤\n' +
        "- `dire`: 方向，'f'（默认）或 'b'\n" +
        '- `dpc`: 客户端标记，默认 1\n\n' +
        '**焦点新闻功能：**\n' +
        '- 使用 `/sina/zhibo/focus` 可仅获取焦点新闻（is_focus=1 的新闻）\n' +
        '- 重要新闻标题前会显示「重要」标记\n' +
        '- RSS feed标题将显示 "重要新闻"\n\n' +
        '**作者信息：**\n' +
        '- 优先使用主播/主持人名称（anchor、compere_info）\n' +
        '- 否则使用编辑账号（creator）\n\n' +
        '别名路径：`/sina/finance/zhibo/:zhibo_id?` 与 `/sina/zhibo/:zhibo_id?` 均可使用。',
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
    is_focus?: number; // 焦点新闻标记：1=焦点，0=普通
    top_value?: number;
    anchor?: string; // 主播/作者名称
    compere_info?: string; // 主持人信息
    like_nums?: number; // 点赞数
    comment_list?: {
        total: number; // 评论总数
        list?: unknown[];
    };
}

// 批量查询股票实时行情并计算涨跌幅（支持A股、美股、港股）
async function fetchStockQuotes(stockInfoList: Array<{ market: string; symbol: string; key: string }>) {
    if (!stockInfoList || stockInfoList.length === 0) {
        return {};
    }

    try {
        // 转换股票代码为新浪API格式，并建立映射关系
        const symbolMap = new Map<string, string>(); // API代码 -> 原始代码
        const apiSymbols = stockInfoList.map((s) => {
            let apiSymbol = s.symbol.toLowerCase();

            // 根据市场类型转换代码格式
            if (s.market === 'us' || s.market === 'USA') {
                // 美股：添加 gb_ 前缀
                apiSymbol = `gb_${s.symbol.toLowerCase()}`;
            } else if (s.market === 'hk' || s.market === 'HK') {
                // 港股：添加 hk 前缀
                apiSymbol = `hk${s.symbol.toLowerCase().replace(/^hk/, '')}`;
            } else if (s.market === 'cn' || s.market === 'CN' || apiSymbol.startsWith('sh') || apiSymbol.startsWith('sz')) {
                // A股：保持原样（sh/sz前缀）
                apiSymbol = s.symbol.toLowerCase();
            } else if (s.market === 'fund') {
                // 基金/ETF：根据代码判断交易所，添加 sh/sz 前缀
                const code = s.symbol.replace(/^(sh|sz)/i, ''); // 移除可能存在的前缀
                if (code.startsWith('5') || code.startsWith('6')) {
                    // 5/6 开头：上海交易所
                    apiSymbol = `sh${code}`;
                } else if (code.startsWith('0') || code.startsWith('3') || code.startsWith('1')) {
                    // 0/1/3 开头：深圳交易所
                    apiSymbol = `sz${code}`;
                } else {
                    // 其他：默认尝试上海
                    apiSymbol = `sh${code}`;
                }
            } else if (s.symbol.toLowerCase().startsWith('fx_')) {
                // 外汇：保持小写的 fx_ 前缀格式
                apiSymbol = s.symbol.toLowerCase();
            } else if (s.symbol.toLowerCase().startsWith('nf_') || s.symbol.toLowerCase().startsWith('hf_')) {
                // 期货：前缀小写(nf_/hf_)，代码大写(SC0/CL等)
                const prefix = s.symbol.slice(0, 3).toLowerCase();
                const code = s.symbol.slice(3).toUpperCase();
                apiSymbol = prefix + code;
            } else if (s.symbol.toLowerCase().startsWith('si') || s.symbol.toLowerCase().startsWith('znb_')) {
                // 指数：si 开头（国内指数）或 znb_ 开头（国际指数）
                apiSymbol = s.symbol.toLowerCase();
            } else {
                // 其他市场：尝试原样查询
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

                // 新浪行情API返回GBK编码，需要转UTF-8
                const gbkData = iconv.decode(response.data, 'gbk');
                const lines = gbkData.trim().split('\n');
                const quotes: Record<string, { name: string; change: number }> = {};

                for (const line of lines) {
                    if (!line.includes('hq_str_')) {
                        continue;
                    }

                    // 解析格式：var hq_str_XXX="..."
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

                        // 根据代码前缀判断市场类型并解析对应字段
                        if (apiSymbol.startsWith('gb_')) {
                            // 美股：第2个字段（索引1）是涨跌幅百分比
                            const change = Number.parseFloat(data[2]);
                            if (!Number.isNaN(change)) {
                                changePercent = change;
                            }
                        } else if (apiSymbol.startsWith('hk')) {
                            // 港股：第8个字段（索引7）是涨跌幅百分比
                            if (data.length >= 9) {
                                const change = Number.parseFloat(data[8]);
                                if (!Number.isNaN(change)) {
                                    changePercent = change;
                                }
                            }
                        } else if (
                            (apiSymbol.startsWith('sh') || apiSymbol.startsWith('sz')) && // A股：需要从昨收和现价计算涨跌幅
                            data.length >= 4
                        ) {
                            const prevClose = Number.parseFloat(data[2]);
                            const currentPrice = Number.parseFloat(data[3]);
                            if (prevClose > 0 && !Number.isNaN(currentPrice)) {
                                changePercent = ((currentPrice - prevClose) / prevClose) * 100;
                            }
                        } else if (apiSymbol.startsWith('fx_')) {
                            // 外汇：第11个字段（索引10）是涨跌幅，但是小数形式（如-0.0017），需要乘以100
                            if (data.length >= 12) {
                                const change = Number.parseFloat(data[11]);
                                if (!Number.isNaN(change)) {
                                    changePercent = change * 100;
                                }
                            }
                        } else if (apiSymbol.startsWith('nf_')) {
                            // 国内期货：字段[2]昨收，字段[7]现价
                            if (data.length >= 8) {
                                const prevClose = Number.parseFloat(data[2]);
                                const currentPrice = Number.parseFloat(data[7]);
                                if (prevClose > 0 && !Number.isNaN(currentPrice)) {
                                    changePercent = ((currentPrice - prevClose) / prevClose) * 100;
                                }
                            }
                        } else if (apiSymbol.startsWith('hf_')) {
                            // 国际期货：字段[2]昨收，字段[0]现价（实时价）
                            // 注意：字段[7]是前结算价，不是现价！
                            if (data.length >= 3) {
                                const prevClose = Number.parseFloat(data[2]);
                                const currentPrice = Number.parseFloat(data[0]);
                                if (prevClose > 0 && !Number.isNaN(currentPrice)) {
                                    changePercent = ((currentPrice - prevClose) / prevClose) * 100;
                                }
                            }
                        } else if (
                            (apiSymbol.startsWith('si') || apiSymbol.startsWith('znb_')) && // 指数：字段[1]当前值，字段[2]昨收
                            data.length >= 3
                        ) {
                            const currentValue = Number.parseFloat(data[1]);
                            const prevClose = Number.parseFloat(data[2]);
                            if (prevClose > 0 && !Number.isNaN(currentValue)) {
                                changePercent = ((currentValue - prevClose) / prevClose) * 100;
                            }
                        }

                        // 只有成功解析涨跌幅才添加到结果
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
            5 * 60 // 缓存5分钟
        );
    } catch {
        // 查询失败时返回空对象，降级为无涨跌幅格式
        return {};
    }
}

async function handler(ctx) {
    const zhiboIdParam = ctx.req.param('zhibo_id') ?? '152';
    const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 20;
    const pagesizeQuery = ctx.req.query('pagesize');
    const tagFilter = ctx.req.query('tag'); // 用户输入的标签名或ID
    const dire = ctx.req.query('dire') ?? 'f';
    const dpc = ctx.req.query('dpc') ?? '1';

    // 支持 zhibo_id='focus' 来过滤焦点新闻
    const isFocusMode = zhiboIdParam === 'focus';
    const zhiboId = isFocusMode ? '152' : zhiboIdParam; // focus模式默认使用财经频道

    const apiUrl = `${ROOT_URL}/api/zhibo/feed`;

    const pageSize = Math.min(10, Math.max(1, pagesizeQuery ? Number.parseInt(pagesizeQuery) : 10)); // 接口单页上限
    const maxPages = Math.max(1, Math.ceil(limit / pageSize));

    const collected: ZhiboFeedItem[] = [];
    const pageNumbers = Array.from({ length: maxPages }, (_, i) => i + 1);
    const pages = await Promise.all(
        pageNumbers.map(async (page) => {
            const res = await got(apiUrl, {
                searchParams: {
                    zhibo_id: zhiboId,
                    pagesize: pageSize,
                    tag: '0', // 不在API层面过滤，获取全部数据
                    dire,
                    dpc,
                    page,
                },
                headers: {
                    Referer: 'https://finance.sina.com.cn/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
                timeout: 30000, // 30秒超时
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
            // 多获取一些数据以便过滤
            break;
        }
        if (p.list.length) {
            collected.push(...p.list);
        }
    }

    // 客户端过滤标签
    let filteredData = collected;
    if (tagFilter) {
        filteredData = collected.filter((item) => {
            if (!item.tag || item.tag.length === 0) {
                return false;
            }
            return item.tag.some((tag) => tag.name === tagFilter || tag.id === tagFilter || tag.name.includes(tagFilter));
        });
    }

    // 焦点新闻过滤：当 zhibo_id='focus' 时，只返回 is_focus=1 的新闻
    if (isFocusMode) {
        filteredData = filteredData.filter((item) => item.is_focus === 1);
    }

    filteredData = filteredData.slice(0, limit);

    // 收集所有股票信息用于批量查询行情（支持A股、美股、港股）
    const allStocks: Array<{ market: string; symbol: string; key: string }> = [];
    for (const item of filteredData) {
        if (item.ext) {
            try {
                const extData = JSON.parse(item.ext);
                if (extData.stocks && Array.isArray(extData.stocks)) {
                    // 添加所有市场的股票（A股、美股、港股等）
                    allStocks.push(...extData.stocks);
                }
            } catch {
                // 解析失败时忽略
            }
        }
    }

    // 批量查询所有股票的实时行情（A股、美股、港股）
    const stockQuotes = await fetchStockQuotes(allStocks);

    const items = await Promise.all(
        filteredData.map(async (it) => {
            const plain = it.rich_text?.replaceAll(/<[^>]+>/g, '').trim() ?? '';
            // 优先使用「【…】」内的文字作为标题，避免把正文混入标题
            const bracketMatch = plain.match(/^【([^】]+)】/);
            let titleText;
            if (bracketMatch) {
                // 与724对齐：保留【】书名号
                titleText = `【${bracketMatch[1]}】`;
            } else if (plain.length > 0) {
                titleText = plain.length > 80 ? `${plain.slice(0, 80)}…` : plain;
            } else {
                titleText = `直播快讯 #${it.id}`;
            }
            const isFocus = it.is_focus === 1;
            // 去除正文中的【…】前缀，避免标题重复出现在正文
            const plainBody = bracketMatch ? plain.replace(/^【[^】]+】\s*/, '') : plain;
            const richBodyHtml = typeof it.rich_text === 'string' && bracketMatch ? it.rich_text.replace(/^【[^】]+】\s*/, '') : it.rich_text || '';

            // 解析ext字段获取完整信息
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
                    // 解析失败时使用默认链接
                }
            }

            // 如果没有ext中的docurl，使用直接的docurl字段
            if (detailLink === 'https://finance.sina.com.cn/7x24/' && it.docurl) {
                detailLink = it.docurl.replace(/^http:\/\//, 'https://');
            }

            // 提取图片和多媒体内容
            const images: string[] = [];
            const videos: string[] = [];
            const audios: string[] = [];

            // 从 multimedia 对象中提取媒体链接
            if (it.multimedia && typeof it.multimedia === 'object') {
                // 图片链接
                if (it.multimedia.img_url && Array.isArray(it.multimedia.img_url)) {
                    images.push(...it.multimedia.img_url);
                }
                // 视频链接
                if (it.multimedia.video_url && Array.isArray(it.multimedia.video_url)) {
                    videos.push(...it.multimedia.video_url);
                }
                // 音频链接
                if (it.multimedia.audio_url && Array.isArray(it.multimedia.audio_url)) {
                    audios.push(...it.multimedia.audio_url);
                }
            }

            // 从rich_text中提取图片
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

            // 若目前仍无图片，兜底抓取详情页图片（参考同花顺做法）
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
                    // 详情页不可达时忽略
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

            // 构建多媒体HTML内容
            const mediaHtml: string[] = [];

            // 添加图片
            if (images.length > 0) {
                mediaHtml.push(...images.map((img) => `<img src="${img}" />`));
            }

            // 添加视频
            if (videos.length > 0) {
                mediaHtml.push(...videos.map((video) => `<video controls src="${video}" style="max-width: 100%;">您的浏览器不支持视频播放</video>`));
            }

            // 添加音频
            if (audios.length > 0) {
                mediaHtml.push(...audios.map((audio) => `<audio controls src="${audio}">您的浏览器不支持音频播放</audio>`));
            }

            // 生成完整HTML内容，不包含【…】前缀
            const contentHtml = `${richBodyHtml}<br>${mediaHtml.join('<br>')}<br>`;

            const tagCategories = it.tag?.map((t) => t.name) || [];
            const categories = [...tagCategories, ...stockCategories];
            const uniqueCategories = [...new Set(categories)].filter(Boolean);

            // 作者信息优先级：anchor > compere_info > creator（去除邮箱后缀）
            let authorName = '新浪财经';
            if (it.anchor && it.anchor.trim()) {
                authorName = it.anchor.trim();
            } else if (it.compere_info && it.compere_info.trim()) {
                authorName = it.compere_info.trim();
            } else if (it.creator) {
                authorName = it.creator.replace('@staff.sina.com.cn', '').replace('@staff.sina.com', '');
            }

            // 构建 enclosure（优先使用视频，其次音频，最后图片）
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
                    image: images[0], // 主图片
                    banner: images[0], // 横幅图片（与主图相同）
                    enclosure, // 媒体附件
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

    // 图片和多媒体内容已在上面通过模板处理，无需额外处理

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
        language: 'zh-cn',
        item: items,
        author: '新浪财经',
        image: 'https://finance.sina.com.cn/favicon.ico',
    };
}
