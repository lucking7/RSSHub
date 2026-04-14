import type { Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

export const route: Route = {
    path: ['/finance/724/:tag?', '/724/:tag?'],
    name: '财经快讯 - 724接口',
    url: 'finance.sina.com.cn',
    maintainers: [''],
    handler,
    example: '/sina/724',
    parameters: {
        tag: '分类标签，默认全部，可选：macro（宏观）、stock（股市）、international（国际）、opinion（观点）',
    },
    description: `使用新浪财经724移动端接口获取实时财经快讯

支持查询参数：
- \`limit=20\` - 限制返回数量（默认20条）

特点：
- 📱 移动端专用接口
- 📊 包含股票涨跌幅数据
- ⏱️ 实时性强（平均30秒/条）
- 🔄 单次最多 100 条

示例：
- \`/sina/724\` - 所有财经快讯（简短别名）
- \`/sina/finance/724\` - 所有财经快讯（完整路径）
- \`/sina/724/stock\` - 股市快讯
- \`/sina/724?limit=50\` - 获取50条快讯

别名路径：\`/sina/finance/724/:tag?\` 与 \`/sina/724/:tag?\` 均可使用。`,
    categories: ['finance'],
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
            source: ['finance.sina.com.cn/7x24/', 'finance.sina.com.cn'],
            target: '/724',
        },
    ],
    view: ViewType.Notifications,
};

// 股票分类辅助：根据 stocktype 字段把 item.stock[] 分成个股和非个股
// 非个股包括：基金、商品、国际期货、国际指数、股指期货、外汇
const INDIVIDUAL_STOCK_TYPES = new Set(['cn', 'hk', 'us']);

export interface Sina724Stock {
    stocktype?: string;
    name?: string;
    code?: string;
    symbol?: string;
    range?: string;
    [key: string]: unknown;
}

export function classifyStocks(stocks: Sina724Stock[]): {
    individualStocks: Sina724Stock[];
    sectors: Sina724Stock[];
} {
    const individualStocks: Sina724Stock[] = [];
    const sectors: Sina724Stock[] = [];
    for (const stock of stocks) {
        if (INDIVIDUAL_STOCK_TYPES.has(stock.stocktype ?? '')) {
            individualStocks.push(stock);
        } else {
            sectors.push(stock);
        }
    }
    return { individualStocks, sectors };
}

// 把上游 original_pic 数组渲染成 html。
// 注意：根据 AGENTS.md #40 不要写 referrerpolicy，RSSHub middleware 自行处理。
export function buildImageHtml(pics: string[] | undefined | null): string {
    if (!Array.isArray(pics) || pics.length === 0) {
        return '';
    }
    return pics.map((u) => `<img src="${u.replace(/^http:/, 'https:')}">`).join('<br>');
}

const SINA_724_BASE_URL = 'https://news.cj.sina.cn';

// 选 item link：pageUrl（正文页）→ url（分享页）→ 构造兜底，统一升 https。
export function pickLink(item: { pageUrl?: string; url?: string; id: number | string }): string {
    const raw = item.pageUrl || item.url || `${SINA_724_BASE_URL}/7x24/${item.id}`;
    return raw.replace(/^http:/, 'https:');
}

// 构造 title：优先取 content 里首个【】内文字，否则取前 100 字符，兜底用 id。color === 1 的加「重要」前缀（与 jin10 路由保持一致）。
export function buildTitle(item: { color?: number; content?: string; id: number | string }): string {
    const cleanContent = (item.content ?? '').replaceAll(/<[^>]+>/g, '');
    const titleMatch = cleanContent.match(/【([^】]+)】/);
    const base = titleMatch ? titleMatch[1] : cleanContent.slice(0, 100) || `财经快讯 ${item.id}`;
    return item.color === 1 ? `「重要」${base}` : base;
}

function formatStockItems(items: Sina724Stock[]): string {
    let result = '';
    for (const stock of items) {
        const stockName = stock.name || '';
        const stockCode = stock.code || '';
        const stockRange = stock.range || '';

        if (stockRange) {
            const isPositive = stockRange.startsWith('+') || (!stockRange.startsWith('-') && Number.parseFloat(stockRange) > 0);
            const changeColor = isPositive ? '#f5222d' : '#52c41a';
            const arrow = isPositive ? '↑' : '↓';

            result += `• <strong>${stockName}</strong> ` + (stockCode ? `<span style="color: #999;">(${stockCode})</span>` : '') + `<br><span style="color: ${changeColor}; font-weight: bold;">${arrow} ${stockRange}</span><br>`;
        }
    }
    return result;
}

// 分类标签映射
const TAG_MAP = {
    all: 0,
    macro: 1,
    stock: 101,
    international: 102,
    opinion: 6,
};

async function handler(ctx) {
    const tagParam = ctx.req.param('tag') || 'all';
    const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 20;
    const tag = TAG_MAP[tagParam] ?? 0;
    const apiUrl = `${SINA_724_BASE_URL}/app/v1/news724/list`;

    // 生成设备ID（缓存24小时）
    const deviceId = await cache.tryGet('sina:724:deviceid', async () => {
        const crypto = await import('node:crypto');
        return crypto.randomBytes(16).toString('hex');
    });

    // 上游 num 参数最大 100（超过会降级为 10）。RSS 只取第一页，不翻页。
    const num = Math.min(Math.max(limit, 1), 100);

    const cacheKey = `sina:724:feed:${tag}:${num}`;
    const collected: Array<Record<string, any>> = await cache.tryGet(
        cacheKey,
        async () => {
            const response = await got(apiUrl, {
                searchParams: {
                    deviceid: deviceId,
                    version: '9.0.1',
                    num,
                    tag,
                    dire: 'b',
                },
                headers: {
                    'User-Agent': `sinafinance__9.0.1__iOS__${deviceId}__26.0.1__iPhone18,2`,
                    // genTime 实测非必须；去掉避免请求指纹每次变化、便于调试。
                    Cookie: 'vt=4; wm=b122',
                },
                timeout: 30000,
            });
            // 注意：空数组也会被缓存 60s。代价是上游若短暂返回空，用户会在 60s 内看到空 feed；
            // 收益是避免上游短时挂掉时高频重试雪崩。
            return response.data?.result?.data?.data ?? [];
        },
        60 // 60s 应用层缓存
    );

    const items = collected.slice(0, limit).map((item) => {
        const content = item.content || '';
        const newsId = item.id;
        const pubDate = timezone(parseDate(item.ctime), +8);

        const title = buildTitle(item);

        // 构建描述（去掉开头的【】部分）
        let description = content.replace(/【[^】]+】/, '').trim();

        // 把上游 original_pic 渲染到 description 最前面（AGENTS.md #40：不写 referrerpolicy）
        const imageHtml = buildImageHtml(item.original_pic);
        if (imageHtml) {
            description = `${imageHtml}<br>${description}`;
        }

        // 添加股票行情信息（区分板块/非个股与个股，按 stocktype 字段分类）
        const stocks: Sina724Stock[] = item.stock || [];
        if (stocks.length > 0) {
            const { individualStocks, sectors } = classifyStocks(stocks);

            // 显示板块（蓝色边框）
            if (sectors.length > 0) {
                const sectorHtml = formatStockItems(sectors);
                description += `<br><div style="background: #f5f5f5; border-left: 3px solid #1890ff; padding: 10px 15px; margin: 15px 0 10px 0; border-radius: 4px;">`;
                description += `<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333;">相关板块</h3>${sectorHtml}`;
                description += `</div>`;
            }

            // 显示股票（绿色边框）
            if (individualStocks.length > 0) {
                const stockHtml = formatStockItems(individualStocks);
                description += `<br><div style="background: #f5f5f5; border-left: 3px solid #52c41a; padding: 10px 15px; margin: 15px 0 10px 0; border-radius: 4px;">`;
                description += `<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333;">相关股票</h3>${stockHtml}`;
                description += `</div>`;
            }
        }

        // 构建分类
        const categories: string[] = [];

        // 添加股票信息到分类（只显示股票名称）
        for (const stock of stocks) {
            if (stock.name) {
                categories.push(stock.name);
            }
        }

        return {
            title,
            description,
            link: pickLink(item),
            guid: `sina-724-${newsId}`,
            pubDate,
            category: categories,
            author: '新浪财经',
        };
    });

    return {
        title: `新浪财经724 - ${tagParam === 'all' ? '全部' : tagParam}快讯`,
        link: 'https://finance.sina.com.cn/7x24/',
        description: '新浪财经724移动端接口实时财经快讯',
        item: items,
    };
}
