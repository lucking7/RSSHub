import { Route, ViewType } from '@/types';

import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { load } from 'cheerio';
import iconv from 'iconv-lite';
import cache from '@/utils/cache';

const ROOT_URL = 'https://zhibo.sina.com.cn';

export const route: Route = {
    path: ['/finance/zhibo/:zhibo_id?', '/zhibo/:zhibo_id?'],
    categories: ['finance'],
    view: ViewType.Articles,
    example: '/sina/zhibo',
    parameters: {
        zhibo_id: '直播频道 id，默认为 152（财经）。常见：151 政经、153 综合、155 市场、164 国际、242 行业',
        limit: '返回条数，默认 20；接口单页最多 10 条，超过将自动分页抓取',
        pagesize: '单页条数（1-10），默认 10；超过仍按 10 处理',
        tag: '标签过滤，支持标签名或ID。如：市场、公司、A股、美股等，留空表示不过滤',
        dire: "方向，'f'（默认）或 'b'",
        dpc: '客户端标记，默认 1（与官网一致）',
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
        '- `zhibo_id`: 频道 ID，默认 152（财经）。常见：151 政经、153 综合、155 市场、164 国际、242 行业\n' +
        '- `limit`: 返回条数，默认 20。接口单页最多 10 条，超过会自动分页抓取\n' +
        '- `pagesize`: 单页条数（1-10），默认 10\n' +
        '- `tag`: 标签过滤，支持标签名或ID。如：市场、公司、A股、美股等，留空表示不过滤\n' +
        "- `dire`: 方向，'f'（默认）或 'b'\n" +
        '- `dpc`: 客户端标记，默认 1\n\n' +
        '别名路径：`/sina/finance/zhibo/:zhibo_id?` 与 `/sina/zhibo/:zhibo_id?` 均可使用。',
};

interface ZhiboFeedItem {
    id: number;
    zhibo_id: number;
    rich_text: string;
    create_time: string; // 'YYYY-MM-DD HH:mm:ss'
    creator?: string;
    docurl?: string;
    multimedia?: string;
    tag?: Array<{
        id: string;
        name: string;
    }>;
    ext?: string; // JSON string containing docurl, docid, etc.
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
                        } else if ((apiSymbol.startsWith('sh') || apiSymbol.startsWith('sz')) && // A股：需要从昨收和现价计算涨跌幅
                            data.length >= 4) {
                                const prevClose = Number.parseFloat(data[2]);
                                const currentPrice = Number.parseFloat(data[3]);
                                if (prevClose > 0 && !Number.isNaN(currentPrice)) {
                                    changePercent = ((currentPrice - prevClose) / prevClose) * 100;
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
    const zhiboId = ctx.req.param('zhibo_id') ?? '152';
    const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 20;
    const pagesizeQuery = ctx.req.query('pagesize');
    const tagFilter = ctx.req.query('tag'); // 用户输入的标签名或ID
    const dire = ctx.req.query('dire') ?? 'f';
    const dpc = ctx.req.query('dpc') ?? '1';

    const apiUrl = `${ROOT_URL}/api/zhibo/feed`;

    const pageSize = Math.min(10, Math.max(1, pagesizeQuery ? Number.parseInt(pagesizeQuery) : 10)); // 接口单页上限
    const maxPages = Math.max(1, Math.ceil(limit / pageSize));

    const collected: ZhiboFeedItem[] = [];
    const pageNumbers = Array.from({ length: maxPages }, (_, i) => i + 1);
    const pages = await Promise.all(
        pageNumbers.map((page) =>
            got(apiUrl, {
                searchParams: {
                    zhibo_id: zhiboId,
                    pagesize: pageSize,
                    tag: '0', // 不在API层面过滤，获取全部数据
                    dire,
                    dpc,
                    page,
                },
            }).then((res) => ({ page, list: (res.data?.result?.data?.feed?.list as ZhiboFeedItem[]) ?? [] }))
        )
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
                // 同花顺风格：标题为纯文本，不保留书名号
                titleText = bracketMatch[1];
            } else if (plain.length > 0) {
                titleText = plain.length > 80 ? `${plain.slice(0, 80)}…` : plain;
            } else {
                titleText = `直播快讯 #${it.id}`;
            }
            // 标题保持纯文本，提高RSS阅读器兼容性（参考同花顺格式）
            const title = titleText;
            // 去除正文中的【…】前缀，避免标题重复出现在正文
            const plainBody = plain.replace(/^【[^】]+】\s*/, '');
            const richBodyHtml = typeof it.rich_text === 'string' ? it.rich_text.replace(/^【[^】]+】\s*/, '') : '';

            // 解析ext字段获取完整信息
            let detailLink = 'https://finance.sina.com.cn/7x24/';
            let stockInfo: Array<{ market: string; symbol: string; key: string }> = [];

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
            if (it.multimedia && typeof it.multimedia === 'string') {
                // 解析multimedia字段中的图片
                const imgMatches = it.multimedia.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
                if (imgMatches) {
                    for (const imgTag of imgMatches) {
                        const srcMatch = imgTag.match(/src=["']([^"']+)["']/);
                        if (srcMatch) {
                            images.push(srcMatch[1]);
                        }
                    }
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

            // 生成完整描述（不限制字符长度），不包含【…】前缀
            const description = `${plainBody}<br>`;

            // 生成完整HTML内容，不包含【…】前缀
            const contentHtml = `${richBodyHtml}<br>${images.map((img) => `<img src="${img}" referrerpolicy="no-referrer" />`).join('<br>')}<br>`;

            // 构建分类信息：标签 + 股票（含涨跌幅）
            const tagCategories = it.tag?.map((t) => t.name) || [];
            const stockCategories = stockInfo.map((s) => {
                const quote = stockQuotes[s.symbol];
                if (quote && quote.change !== undefined) {
                    // 格式：股票名称 (代码) ±涨跌幅%
                    const changeStr = quote.change >= 0 ? `+${quote.change.toFixed(2)}` : quote.change.toFixed(2);
                    return `${s.key} (${s.symbol.toUpperCase()}) ${changeStr}%`;
                }
                // 降级方案：仅显示名称和代码
                return `${s.key} (${s.symbol.toUpperCase()})`;
            });
            const categories = [...tagCategories, ...stockCategories];
            const uniqueCategories = [...new Set(categories)].filter(Boolean);

            return {
                title,
                link: detailLink,
                description,
                author: it.creator?.replace('@staff.sina.com', '') ?? '新浪财经',
                pubDate: parseDate(it.create_time),
                guid: `sina-finance-zhibo-${it.id}`,
                category: uniqueCategories,
                image: images[0], // 主图片
                banner: images[0], // 横幅图片（与主图相同）
                content: {
                    html: contentHtml,
                    text: plainBody,
                },
            };
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

    return {
        title: `新浪财经 - 7×24直播 - ${channelTitle}${tagSuffix}`,
        link: 'https://finance.sina.com.cn/7x24/',
        description: `新浪财经7×24小时财经直播 - ${channelTitle}频道${tagSuffix}`,
        item: items,
        author: '新浪财经',
        image: 'https://finance.sina.com.cn/favicon.ico',
    };
}
