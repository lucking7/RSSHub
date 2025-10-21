import { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { config } from '@/config';

export const route: Route = {
    path: '/news/:type?',
    name: '新闻快讯',
    url: 'longhuvip.com',
    maintainers: [],
    handler,
    example: '/kaipanla/news',
    parameters: {
        type: '新闻类型，可选：stock（股票，默认）、commodity（商品期货）',
    },
    description: `
开盘啦新闻快讯，来自财联社等权威财经媒体的实时资讯

**类型说明**:
- \`stock\` 或留空 - 股票类新闻（港股、A股、上市公司等）
- \`commodity\` - 商品期货类新闻（黄金、原油、期货等）

**数据特点**:
- 📰 权威来源（财联社等）
- 📊 关联股票代码
- ⚡ 实时更新
- 🎯 专业财经资讯

**使用方法**:
- \`/kaipanla/news\` - 股票类新闻（默认）
- \`/kaipanla/news/stock\` - 股票类新闻
- \`/kaipanla/news/commodity\` - 商品期货类新闻
    `,
    categories: ['finance'],
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportRadar: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
};

async function handler(ctx) {
    const typeParam = ctx.req.param('type') || 'stock';

    // Type参数映射
    const typeMap = {
        stock: '0', // 股票类
        commodity: '1', // 商品期货类
    };

    const type = typeMap[typeParam] || '0';
    const apiUrl = 'https://apparticle.longhuvip.com/w1/api/index.php';

    const { data: response } = await cache.tryGet(
        `kaipanla:news:${type}`,
        async () => {
            const { data } = await got(apiUrl, {
                searchParams: {
                    a: 'GetList',
                    apiv: 'w42',
                    c: 'PCNewsFlash',
                    PhoneOSNew: '2',
                    VerSion: '5.21.0.3',
                    Type: type,
                    Index: '0',
                    NewsID: '0',
                    st: '30', // 获取30条
                },
                headers: {
                    'User-Agent': 'lhb/5.21.3 (com.kaipanla.www; build:0; iOS 26.0.1) Alamofire/4.9.1',
                    Accept: '*/*',
                },
            });
            return data;
        },
        config.cache.routeExpire,
        false
    );

    const newsList = response.List || [];

    const items = newsList.map((item) => {
        const title = item.Title || '无标题';
        let description = '';

        // 1. 新闻内容
        description += `<div style="padding: 15px; background: #f8f9fa; border-left: 4px solid #1890ff; border-radius: 5px; margin-bottom: 10px;">`;
        description += `<p style="margin: 0; line-height: 1.8; font-size: 15px; color: #333;">${item.Content || item.Title}</p>`;
        description += `</div>`;

        // 2. 相关股票/商品（充分利用Stocks字段）
        if (item.Stocks && item.Stocks.length > 0) {
            description += `<div style="background: white; padding: 12px; border-radius: 5px; border: 1px solid #e8e8e8; margin-bottom: 10px;">`;
            description += `<strong>📊 相关标的 (${item.Stocks.length}个)：</strong>`;
            description += `<div style="margin-top: 8px;">`;

            for (const stock of item.Stocks) {
                const [code, name, changeStr] = stock;
                // 解析涨跌幅字符串（如"0.95%"）
                const change = changeStr ? Number.parseFloat(changeStr.replace('%', '')) : 0;
                const emoji = change > 0 ? '🔴' : change < 0 ? '🟢' : '⚪';
                const color = change > 0 ? '#ff4d4f' : change < 0 ? '#52c41a' : '#666';

                description += `<div style="display: inline-block; padding: 6px 12px; background: #f5f5f5; border-radius: 4px; margin: 4px; font-size: 13px;">`;
                description += `${emoji} <strong>${name}</strong> (${code}) `;
                if (changeStr) {
                    description += `<span style="color: ${color}; font-weight: bold;">${changeStr}</span>`;
                }
                description += `</div>`;
            }

            description += `</div></div>`;
        }

        // 3. 来源信息
        if (item.Source && item.Source.trim() !== '') {
            description += `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e8e8e8;">`;
            description += `<small style="color: #666;">📰 来源：<strong>${item.Source}</strong></small>`;
            description += `</div>`;
        }

        return {
            title,
            description,
            pubDate: parseDate(Number.parseInt(item.Time) * 1000),
            link: item.PushUrl && item.PushUrl.trim() !== '' ? item.PushUrl : 'https://www.longhuvip.com/',
            guid: `kaipanla:news:${item.CID}`,
            author: item.Source || '开盘啦',
            category: item.Stocks && item.Stocks.length > 0 ? item.Stocks.map((s) => s[1]) : [],
        };
    });

    // 构建标题
    const typeName = typeParam === 'commodity' ? '商品期货' : '股票';
    const feedTitle = `开盘啦 - ${typeName}新闻快讯`;
    const feedDescription = `来自财联社等权威财经媒体的${typeName}实时资讯`;

    return {
        title: feedTitle,
        link: 'https://www.longhuvip.com/',
        description: feedDescription,
        item: items,
    };
}
