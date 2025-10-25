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

        // 构建纯文本描述，包含股票/板块信息
        let description = item.Content || item.Title || '';

        // 添加相关股票/板块信息到正文
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

            // 格式化输出函数
            const formatItems = (items: any[]) => {
                let result = '';
                for (const [code, name, changeStr] of items) {
                    // 解析涨跌幅
                    let prefix = '[平]';
                    let changeDisplay = '';

                    if (changeStr && changeStr.trim() !== '') {
                        const changeNum = Number.parseFloat(changeStr.replace('%', ''));
                        if (changeNum > 0) {
                            prefix = '[涨]';
                            changeDisplay = ` +${changeStr}`;
                        } else if (changeNum < 0) {
                            prefix = '[跌]';
                            changeDisplay = ` ${changeStr}`;
                        } else {
                            prefix = '[平]';
                            changeDisplay = ` ${changeStr}`;
                        }
                    }

                    result += `${prefix} ${name} (${code})${changeDisplay}\n`;
                }
                return result;
            };

            // 先显示板块，再显示股票
            if (plates.length > 0) {
                description += '\n\n相关板块：\n';
                description += formatItems(plates);
            }

            if (stocks.length > 0) {
                description += plates.length > 0 ? '\n相关股票：\n' : '\n\n相关股票：\n';
                description += formatItems(stocks);
            }
        }

        // 构建分类信息：股票名(代码)±涨跌幅
        const categories =
            item.Stocks && item.Stocks.length > 0
                ? item.Stocks.map((s) => {
                      const [code, name, changeStr] = s;
                      // 格式：股票名(代码)+涨跌幅 或 股票名(代码)-涨跌幅
                      return `${name}(${code})${changeStr || ''}`;
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
        item: items,
    };
}
