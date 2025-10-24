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
- \`num=30\` - 每次请求数量（5-30，默认10）

特点：
- 📱 移动端专用接口
- 📊 包含股票涨跌幅数据
- ⏱️ 实时性强（平均30秒/条）
- 🔄 支持历史数据分页

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
    const numPerPage = ctx.req.query('num') ? Number.parseInt(ctx.req.query('num')) : 10;

    const tag = TAG_MAP[tagParam] ?? 0;
    const baseUrl = 'https://news.cj.sina.cn';
    const apiUrl = `${baseUrl}/app/v1/news724/list`;

    // 生成设备ID（缓存24小时）
    const deviceId = await cache.tryGet('sina:724:deviceid', async () => {
        const crypto = await import('crypto');
        return crypto.randomBytes(16).toString('hex');
    });

    // 计算需要获取的页数
    const maxPages = Math.max(1, Math.ceil(limit / numPerPage));
    const collected: any[] = [];
    let currentId: number | null = null;

    // 分页获取数据（必须串行，因为需要上一页的last_id）

    for (let page = 1; page <= maxPages; page++) {
        const params: any = {
            deviceid: deviceId,
            version: '9.0.1',
            num: numPerPage,
            tag,
            dire: 'b',
        };

        if (currentId) {
            params.id = currentId;
        }

        try {
            // eslint-disable-next-line no-await-in-loop
            const response = await got(apiUrl, {
                searchParams: params,
                headers: {
                    'User-Agent': `sinafinance__9.0.1__iOS__${deviceId}__26.0.1__iPhone18,2`,
                    Cookie: `genTime=${Math.floor(Date.now() / 1000)}; vt=4; wm=b122`,
                },
                timeout: 30000,
            });

            const newsData = response.data?.result?.data?.data ?? [];
            if (newsData.length === 0) {
                break;
            }

            collected.push(...newsData);
            currentId = newsData.at(-1)?.id;

            if (collected.length >= limit) {
                break;
            }
        } catch {
            break;
        }
    }

    const items = collected.slice(0, limit).map((item) => {
        const content = item.content || '';
        const newsId = item.id;
        const pubDate = timezone(parseDate(item.ctime), +8);

        // 解析标题（提取【】内的内容，但title不保留【】符号）
        const cleanContent = content.replaceAll(/<[^>]+>/g, '');
        const titleMatch = cleanContent.match(/【([^】]+)】/);
        const title = titleMatch ? titleMatch[1] : cleanContent.slice(0, 100) || `财经快讯 ${newsId}`;

        // 构建描述（去掉开头的【】部分）
        let description = content.replace(/【[^】]+】/, '').trim();

        // 添加股票行情信息（区分板块和股票）
        const stocks = item.stock || [];
        if (stocks.length > 0) {
            // 判断代码类型：8开头是板块，其他是股票
            const sectors: any[] = [];
            const individualStocks: any[] = [];

            for (const stock of stocks) {
                const stockCode = stock.code || '';
                if (stockCode.startsWith('8')) {
                    sectors.push(stock);
                } else {
                    individualStocks.push(stock);
                }
            }

            // 格式化输出函数（HTML格式）
            const formatStockItems = (items: any[]) => {
                let result = '';
                for (const stock of items) {
                    const stockName = stock.name || '';
                    const stockCode = stock.code || '';
                    const stockRange = stock.range || '';

                    if (stockRange) {
                        const isPositive = stockRange.startsWith('+') || (!stockRange.startsWith('-') && Number.parseFloat(stockRange) > 0);
                        const changeColor = isPositive ? '#f5222d' : '#52c41a';
                        const arrow = isPositive ? '↑' : '↓';

                        result +=
                            `• <strong>${stockName}</strong> ` + (stockCode ? `<span style="color: #999;">(${stockCode})</span>` : '') + `<br><span style="color: ${changeColor}; font-weight: bold;">${arrow} ${stockRange}</span><br>`;
                    }
                }
                return result;
            };

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
            link: item.url || `${baseUrl}/7x24/${newsId}`,
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
