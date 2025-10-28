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

    const response = await cache.tryGet(
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
        // 标题：有就用，没有就留空
        const title = item.Title || '';

        // 构建HTML描述
        let contentText = item.Content || item.Title || '';

        // 移除description开头重复的【标题】
        if (title && contentText) {
            const titleMatch = contentText.match(/^【(.+?)】/);
            if (titleMatch) {
                const bracketTitle = titleMatch[1];
                if (bracketTitle === title || title.includes(bracketTitle) || bracketTitle.includes(title)) {
                    contentText = contentText.replace(/^【.+?】\s*/, '');
                }
            }
        }

        // 开始构建HTML description
        let description = '';

        // 1. 新闻正文（HTML卡片样式）
        description += `<div style="padding: 15px; background: #f8f9fa; border-left: 4px solid #1890ff; border-radius: 5px; margin-bottom: 10px;">`;
        description += `<p style="margin: 0; line-height: 1.6; color: #333;">${contentText}</p>`;
        description += `</div>`;

        // 2. 相关板块和股票信息（如果有）
        if (item.Stocks && item.Stocks.length > 0) {
            // 判断代码类型：8开头是板块，其他是股票
            const plates: any[] = [];
            const stocks: any[] = [];

            for (const stock of item.Stocks) {
                const [code] = stock;
                if (code.startsWith('8')) {
                    plates.push(stock);
                } else {
                    stocks.push(stock);
                }
            }

            // 格式化输出函数（HTML格式）
            const formatItems = (items: any[]) => {
                let result = '';
                for (const [code, name, changeStr] of items) {
                    // 解析涨跌幅
                    let arrow = '-';
                    let color = '#666';
                    let changeDisplay = '0.00%';

                    if (changeStr && changeStr.trim() !== '') {
                        const changeNum = Number.parseFloat(changeStr.replace('%', ''));
                        if (changeNum > 0) {
                            arrow = '↑';
                            color = '#ff4d4f';
                            changeDisplay = `+${changeStr}`;
                        } else if (changeNum < 0) {
                            arrow = '↓';
                            color = '#52c41a';
                            changeDisplay = changeStr;
                        } else {
                            arrow = '-';
                            color = '#666';
                            changeDisplay = changeStr;
                        }
                    }

                    result += `• <strong>${name}</strong> <span style="color: #999;">(${code})</span><br>`;
                    result += `<span style="color: ${color}; font-weight: bold;">${arrow} ${changeDisplay}</span><br>`;
                }
                return result;
            };

            // 显示板块
            if (plates.length > 0) {
                description += `<br><div style="background: #f5f5f5; border-left: 3px solid #1890ff; padding: 10px 15px; margin: 15px 0 10px 0; border-radius: 4px;">`;
                description += `<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333;">相关板块</h3>`;
                description += formatItems(plates);
                description += `</div>`;
            }

            // 显示股票
            if (stocks.length > 0) {
                description += `<br><div style="background: #f5f5f5; border-left: 3px solid #52c41a; padding: 10px 15px; margin: 15px 0 10px 0; border-radius: 4px;">`;
                description += `<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333;">相关股票</h3>`;
                description += formatItems(stocks);
                description += `</div>`;
            }
        }

        // 构建分类信息：股票名(代码)，不包含涨跌幅（避免动态数据）
        const categories =
            item.Stocks && item.Stocks.length > 0
                ? item.Stocks.map((s) => {
                      const [code, name] = s;
                      // 格式：股票名(代码)，不包含涨跌幅
                      return `${name}(${code})`;
                  })
                : [];

        return {
            title,
            description,
            pubDate: parseDate(Number.parseInt(item.Time) * 1000),
            link: item.PushUrl && item.PushUrl.trim() !== '' ? item.PushUrl : 'https://www.longhuvip.com/',
            guid: `kaipanla:news:${item.CID}`,
            author: item.Source || '开盘啦',
            category: categories,
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
        language: 'zh-cn',
        item: items,
    };
}
