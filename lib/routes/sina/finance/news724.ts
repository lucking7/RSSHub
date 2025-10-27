import { Route, ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

export const route: Route = {
    path: '/finance/724/:tag?',
    name: '财经快讯 - 724接口',
    url: 'finance.sina.com.cn',
    maintainers: [''],
    handler,
    example: '/sina/finance/724',
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
- \`/sina/finance/724\` - 所有财经快讯
- \`/sina/finance/724/stock\` - 股市快讯
- \`/sina/finance/724?limit=50\` - 获取50条快讯`,
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
            target: '/finance/724',
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

        // 解析标题（从content前80字符提取）
        const title = content.replaceAll(/<[^>]+>/g, '').slice(0, 100) || `财经快讯 ${newsId}`;

        // 构建描述
        let description = content;

        // 添加股票行情信息
        const stocks = item.stock || [];
        if (stocks.length > 0) {
            const stockQuotesHtml: string[] = [];
            for (const stock of stocks) {
                const stockName = stock.name || '';
                const stockCode = stock.code || '';
                const stockRange = stock.range || '';

                if (stockRange) {
                    const isPositive = stockRange.startsWith('+') || (!stockRange.startsWith('-') && Number.parseFloat(stockRange) > 0);
                    const changeColor = isPositive ? '#f5222d' : '#52c41a';
                    const arrow = isPositive ? '↑' : '↓';

                    stockQuotesHtml.push(
                        `<div style="margin: 6px 0;">• <strong>${stockName}</strong> ` +
                            (stockCode ? `<span style="color: #999;">(${stockCode})</span>` : '') +
                            `<br><span style="margin-left: 12px; color: ${changeColor}; font-weight: bold;">${arrow} ${stockRange}</span></div>`
                    );
                }
            }

            if (stockQuotesHtml.length > 0) {
                description += `<br><p style="font-weight: bold; margin: 8px 0 4px 0;">相关行情</p>${stockQuotesHtml.join('')}`;
            }
        }

        // 构建分类
        const categories: string[] = [];

        // 添加股票信息到分类
        for (const stock of stocks) {
            if (stock.name) {
                const stockStr = stock.code ? `${stock.name}(${stock.code})${stock.range || ''}` : `${stock.name}${stock.range || ''}`;
                categories.push(stockStr);
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
        item: items,
        description: '新浪财经724移动端接口实时财经快讯',
    };
}
