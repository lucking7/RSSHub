import { Route, ViewType } from '@/types';

import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { load } from 'cheerio';

const ROOT_URL = 'https://zhibo.sina.com.cn';

export const route: Route = {
    path: ['/finance/zhibo/:zhibo_id?', '/zhibo/:zhibo_id?', '/finance/zhibo/focus', '/zhibo/focus'],
    categories: ['finance'],
    view: ViewType.Articles,
    example: '/sina/zhibo',
    parameters: {
        zhibo_id: '直播频道 id，默认为 152（财经）。可选：151 政经、153 综合、155 市场、164 国际、242 行业、focus（焦点新闻）',
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
        '- `zhibo_id`: 频道 ID，默认 152（财经）。常见：151 政经、153 综合、155 市场、164 国际、242 行业、focus（焦点新闻）\n' +
        '- `limit`: 返回条数，默认 20。接口单页最多 10 条，超过会自动分页抓取\n' +
        '- `pagesize`: 单页条数（1-10），默认 10\n' +
        '- `tag`: 标签过滤，支持标签名或ID。如：市场、公司、A股、美股等，留空表示不过滤\n' +
        "- `dire`: 方向，'f'（默认）或 'b'\n" +
        '- `dpc`: 客户端标记，默认 1\n\n' +
        '**特殊路径**：\n' +
        '- `/sina/finance/zhibo/focus` 或 `/sina/zhibo/focus` - 仅返回焦点新闻（is_focus=1）\n\n' +
        '别名路径：`/sina/finance/zhibo/:zhibo_id?` 与 `/sina/zhibo/:zhibo_id?` 均可使用。',
};

interface ZhiboFeedItem {
    id: number;
    zhibo_id: number;
    type: number;
    rich_text: string;
    create_time: string; // 'YYYY-MM-DD HH:mm:ss'
    update_time?: string;
    creator?: string;
    mender?: string;
    docurl?: string;
    multimedia?: string;
    commentid?: string;
    compere_id?: number;
    compere_info?: string;
    anchor?: string;
    anchor_image_url?: string;
    tag?: Array<{
        id: string;
        name: string;
    }>;
    like_nums?: number;
    comment_list?: {
        list: any[];
        total: number;
        thread_show: number;
        qreply: number;
        qreply_show: number;
        show: number;
    };
    ext?: string; // JSON string containing docurl, docid, stocks, etc.
    top_value?: number;
    is_focus?: number;
    is_delete?: number;
    rich_text_nick_to_url?: any[];
    rich_text_nick_to_routeUri?: any[];
}

async function handler(ctx) {
    const zhiboIdParam = ctx.req.param('zhibo_id') ?? '152';

    // 检查是否为焦点新闻专属路径
    const isFocusOnly = zhiboIdParam === 'focus';
    const zhiboId = isFocusOnly ? '152' : zhiboIdParam; // focus默认使用财经频道

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
                    page_size: pageSize,
                    pagesize: pageSize,
                    tag_id: '0', // 不在API层面过滤，获取全部数据
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

    // 客户端过滤
    let filteredData = collected;

    // 1. 焦点新闻过滤（优先级最高）
    if (isFocusOnly) {
        filteredData = collected.filter((item) => item.is_focus === 1);
    }

    // 2. 标签过滤
    if (tagFilter) {
        filteredData = filteredData.filter((item) => {
            if (!item.tag || item.tag.length === 0) {
                return false;
            }
            return item.tag.some((tag) => tag.name === tagFilter || tag.id === tagFilter || tag.name.includes(tagFilter));
        });
    }

    filteredData = filteredData.slice(0, limit);

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
            let extData: any = {};

            if (it.ext) {
                try {
                    extData = JSON.parse(it.ext);
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
            // 注意：在 Vercel 等 Serverless 环境下跳过详情页抓取，避免超时
            const isVercel = process.env.VERCEL === '1' || process.env.NOW_REGION;
            if (images.length === 0 && detailLink && !isVercel) {
                try {
                    const detailResp = await got(detailLink, {
                        timeout: { request: 3000 }, // 单个请求最多 3 秒
                    });
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
                    // 详情页不可达或超时时忽略
                }
            }

            // 生成完整HTML内容
            let contentHtml = `<div>${richBodyHtml}</div>`;

            // 添加图片
            if (images.length > 0) {
                contentHtml += `<br>${images.map((img) => `<img src="${img}" referrerpolicy="no-referrer" style="max-width:100%;height:auto;" />`).join('<br>')}<br>`;
            }

            // 添加元数据信息
            const metaInfo: string[] = [];

            if (it.tag && it.tag.length > 0) {
                const tagNames = it.tag.map((t) => t.name).join('、');
                metaInfo.push(`标签：${tagNames}`);
            }

            if (stockInfo.length > 0) {
                const stockNames = stockInfo.map((s) => s.key).join('、');
                metaInfo.push(`相关股票：${stockNames}`);
            }

            if (it.like_nums && it.like_nums > 0) {
                metaInfo.push(`点赞：${it.like_nums}`);
            }

            if (it.comment_list && it.comment_list.total > 0) {
                metaInfo.push(`评论：${it.comment_list.total}`);
            }

            if (it.anchor) {
                metaInfo.push(`主播：${it.anchor}`);
            }

            if (it.update_time && it.update_time !== it.create_time) {
                metaInfo.push(`更新时间：${it.update_time}`);
            }

            if (metaInfo.length > 0) {
                contentHtml += `<br><small style="color:#999;">${metaInfo.join(' | ')}</small>`;
            }

            // 生成纯文本描述
            const description = plainBody;

            // 构建分类信息：标签 + 股票 + 类型 + 焦点标记
            const categories: string[] = [];

            // 添加原有标签
            if (it.tag && it.tag.length > 0) {
                categories.push(...it.tag.map((t) => t.name));
            }

            // 添加股票信息
            if (stockInfo.length > 0) {
                categories.push(...stockInfo.map((s) => s.key));
            }

            // 添加类型标签
            const typeMap: Record<number, string> = {
                0: '普通新闻',
                3: '多媒体',
                9: '其他类型',
            };
            if (it.type !== undefined && typeMap[it.type]) {
                categories.push(typeMap[it.type]);
            }

            // 添加焦点标记
            if (it.is_focus === 1) {
                categories.push('焦点');
            }

            const uniqueCategories = [...new Set(categories)].filter(Boolean);

            // 构建作者信息
            let authorName = '新浪财经';
            if (it.creator) {
                authorName = it.creator.replace('@staff.sina.com.cn', '').replace('@staff.sina.com', '');
            }
            if (it.anchor) {
                authorName = it.anchor;
            }

            return {
                title,
                link: detailLink,
                description,
                author: authorName,
                pubDate: parseDate(it.create_time),
                updated: it.update_time && it.update_time !== it.create_time ? parseDate(it.update_time) : undefined,
                guid: `sina-finance-zhibo-${it.id}`,
                category: uniqueCategories,
                image: it.anchor_image_url || images[0], // 优先使用主播头像，否则使用文章图片
                banner: images[0], // 横幅图片
                content: {
                    html: contentHtml,
                    text: plainBody,
                },
                // 添加扩展数据
                extra: {
                    id: it.id,
                    type: it.type,
                    like_nums: it.like_nums || 0,
                    comment_count: it.comment_list?.total || 0,
                    is_focus: it.is_focus === 1,
                    top_value: it.top_value || 0,
                    commentid: it.commentid,
                    stocks: stockInfo,
                    ext_data: extData,
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
    const focusSuffix = isFocusOnly ? ' - 焦点' : '';
    const tagSuffix = tagFilter ? ` - ${tagFilter}` : '';

    // 统计信息
    const stats = {
        totalTags: new Set<string>(),
        totalStocks: new Set<string>(),
        hasImage: 0,
        hasUpdate: 0,
        hasInteraction: 0,
    };

    for (const item of filteredData) {
        if (item.tag) {
            for (const tag of item.tag) {
                stats.totalTags.add(tag.name);
            }
        }

        if (item.ext) {
            try {
                const extData = JSON.parse(item.ext);
                if (extData.stocks && Array.isArray(extData.stocks)) {
                    for (const stock of extData.stocks) {
                        if (stock.key) {
                            stats.totalStocks.add(stock.key);
                        }
                    }
                }
                if (extData.docurl) {
                    stats.hasImage++;
                }
            } catch {
                // 忽略解析错误
            }
        }

        if (item.multimedia) {
            stats.hasImage++;
        }

        if (item.update_time && item.update_time !== item.create_time) {
            stats.hasUpdate++;
        }

        if ((item.like_nums && item.like_nums > 0) || (item.comment_list && item.comment_list.total > 0)) {
            stats.hasInteraction++;
        }
    }

    // 构建详细的Feed描述
    let feedDescription = `新浪财经7×24小时实时财经直播，${channelTitle}频道专业解读`;

    if (isFocusOnly) {
        feedDescription += `，仅展示【焦点新闻】`;
    }

    if (tagFilter) {
        feedDescription += `，聚焦【${tagFilter}】`;
    }

    feedDescription += `\n\n📊 <strong>本期统计</strong>：`;
    feedDescription += `\n• 新闻条数：${filteredData.length}条`;

    if (stats.totalTags.size > 0) {
        const topTags = [...stats.totalTags].slice(0, 8);
        feedDescription += `\n• 涉及标签：${stats.totalTags.size}个 (${topTags.join('、')}${stats.totalTags.size > 8 ? '...' : ''})`;
    }

    if (stats.totalStocks.size > 0) {
        const topStocks = [...stats.totalStocks].slice(0, 5);
        feedDescription += `\n• 相关个股：${stats.totalStocks.size}只 (${topStocks.join('、')}${stats.totalStocks.size > 5 ? '...' : ''})`;
    }

    if (stats.hasImage > 0) {
        feedDescription += `\n• 含图新闻：${stats.hasImage}条 (${((stats.hasImage / filteredData.length) * 100).toFixed(1)}%)`;
    }

    if (stats.hasUpdate > 0) {
        feedDescription += `\n• 已更新：${stats.hasUpdate}条 (${((stats.hasUpdate / filteredData.length) * 100).toFixed(1)}%)`;
    }

    if (stats.hasInteraction > 0) {
        feedDescription += `\n• 有互动：${stats.hasInteraction}条 (${((stats.hasInteraction / filteredData.length) * 100).toFixed(1)}%)`;
    }

    return {
        title: `新浪财经 - 7×24直播 - ${channelTitle}${focusSuffix}${tagSuffix}`,
        link: 'https://finance.sina.com.cn/7x24/',
        description: feedDescription,
        item: items,
        author: '新浪财经',
        image: 'https://finance.sina.com.cn/favicon.ico',
        allowEmpty: true,
    };
}
