import type { Route } from '@/types';
import { ViewType } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

// 分类映射表
const categories = {
    '100': '焦点',
    '101': '要闻',
    '102': '7*24全球直播',
    '103': '上市公司',
    '104': '中国公司',
    '105': '全球公司',
    '106': '商品',
    '107': '外汇',
    '108': '债券',
    '109': '基金',
    '110': '地区-中国',
    '111': '地区-美国',
    '112': '地区-欧元区',
    '113': '地区-英国',
    '114': '地区-日本',
    '115': '地区-加拿大',
    '116': '地区-澳洲',
    '117': '地区-新兴市场',
    '118': '央行-中国',
    '119': '央行-美联储',
    '120': '央行-欧洲',
    '121': '央行-英国',
    '122': '央行-日本',
    '123': '央行-加拿大',
    '124': '央行-澳洲',
    '125': '数据-中国',
    '126': '数据-美国',
    '127': '数据-欧元区',
    '128': '数据-英国',
    '129': '数据-日本',
    '130': '数据-加拿大',
    '131': '数据-澳洲',
    '110,111,112,113,114,115,116,117': '地区',
    '118,119,120,121,122,123,124': '全球央行',
    '125,126,127,128,129,130,131': '经济数据',
};

export const route: Route = {
    path: '/kuaixun/:category?',
    categories: ['finance'],
    view: ViewType.Notifications,
    example: '/eastmoney/kuaixun',
    parameters: {
        category: '分类代码，可选，见下表，留空为全部快讯',
    },
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
            source: ['kuaixun.eastmoney.com/', 'kuaixun.eastmoney.com'],
        },
    ],
    name: '全球财经快讯',
    maintainers: [''],
    handler,
    description: `获取东方财富全球财经快讯的实时信息。

### 分类代码

| 基础分类 | 代码 | 公司相关 | 代码 | 市场相关 | 代码 |
| -------- | ---- | -------- | ---- | -------- | ---- |
| 7*24直播 | 102  | 焦点     | 100  | 商品     | 106  |
| 要闻     | 101  | 上市公司 | 103  | 外汇     | 107  |
| 股市直播 | zhibo| 中国公司 | 104  | 债券     | 108  |
|          |      | 全球公司 | 105  | 基金     | 109  |

| 地区筛选 | 代码 | 全球央行 | 代码 | 经济数据 | 代码 |
| -------- | ---- | -------- | ---- | -------- | ---- |
| 地区-中国   | 110  | 央行-中国   | 118  | 数据-中国   | 125  |
| 地区-美国   | 111  | 央行-美联储 | 119  | 数据-美国   | 126  |
| 地区-欧元区 | 112  | 央行-欧洲   | 120  | 数据-欧元区 | 127  |
| 地区-英国   | 113  | 央行-英国   | 121  | 数据-英国   | 128  |
| 地区-日本   | 114  | 央行-日本   | 122  | 数据-日本   | 129  |
| 地区-加拿大 | 115  | 央行-加拿大 | 123  | 数据-加拿大 | 130  |
| 地区-澳洲   | 116  | 央行-澳洲   | 124  | 数据-澳洲   | 131  |
| 地区-新兴市场 | 117  |   |      |   |      |

### 查询参数

- \`limit=50\` 限制返回数量（默认50条，建议不超过200）
- \`important_only=1\` 仅返回重要快讯

### 数据范围

- 每页50条，第1页覆盖最近1-2小时
- 第10页可回溯约1天
- 第50页可回溯约5天
- API支持获取约7-10天内的历史快讯
- 建议日常订阅使用默认50条即可

### 示例

- \`/eastmoney/kuaixun\` - 所有快讯（最近50条）
- \`/eastmoney/kuaixun/100\` - 焦点快讯
- \`/eastmoney/kuaixun/103\` - 上市公司快讯
- \`/eastmoney/kuaixun/zhibo\` - 股市直播
- \`/eastmoney/kuaixun/106\` - 商品快讯
- \`/eastmoney/kuaixun/119\` - 美联储相关快讯
- \`/eastmoney/kuaixun/126\` - 美国经济数据
- \`/eastmoney/kuaixun?limit=20\` - 限制20条
- \`/eastmoney/kuaixun?limit=100\` - 获取最近100条（约2-3小时）
- \`/eastmoney/kuaixun?important_only=1\` - 仅重要快讯`,
};

async function handler(ctx) {
    const category = ctx.req.param('category') ?? '';
    const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 50;
    const importantOnly = ctx.req.query('important_only') === '1';

    const rootUrl = 'https://kuaixun.eastmoney.com';

    // 东方财富快讯API接口
    const apiUrl = 'https://np-weblist.eastmoney.com/comm/web/getFastNewsList';

    // 如果category为'zhibo'则使用直播接口
    const isZhibo = category === 'zhibo';
    const finalApiUrl = isZhibo ? 'https://np-weblist.eastmoney.com/comm/web/getFastNewsZhibo' : apiUrl;

    const response = await got({
        method: 'get',
        url: finalApiUrl,
        searchParams: {
            client: 'web',
            biz: 'web_724',
            fastColumn: isZhibo ? '' : category || '102', // 102为7*24快讯
            sortEnd: '',
            pageSize: limit,
            req_trace: Date.now(),
            callback: 'jQuery',
        },
        headers: {
            Referer: rootUrl,
        },
    });

    let data = response.data;

    // 解析JSONP格式
    if (typeof data === 'string') {
        const match = data.match(/jQuery\((.*)\)/);
        if (match) {
            data = JSON.parse(match[1]);
        }
    }

    const list = data?.data?.fastNewsList || [];

    // 过滤重要快讯
    let filteredList = list;
    if (importantOnly) {
        filteredList = list.filter((item) => item.important === 1 || item.importantLevel > 0);
    }

    // 收集所有股票代码，批量获取股票信息
    const allStocks = new Set<string>();
    for (const item of filteredList.slice(0, limit)) {
        if (item.stockList && Array.isArray(item.stockList)) {
            for (const stock of item.stockList) {
                allStocks.add(stock);
            }
        }
    }

    // 批量请求股票信息
    const stockMap: Record<string, any> = {};
    if (allStocks.size > 0) {
        try {
            const stockCodes = [...allStocks].map((s) => `i:${s}`).join(',');
            const stockResponse = await got({
                method: 'get',
                url: 'https://push2.eastmoney.com/api/qt/clist/get',
                searchParams: {
                    fs: stockCodes,
                    fields: 'f1,f2,f3,f4,f12,f13,f14,f29',
                    pz: 100,
                    fltt: 2,
                    invt: 2,
                    pn: 1,
                    po: 1,
                    np: 1,
                    ut: '13697a1cc677c8bfa9a496437bfef419',
                },
            });

            // 建立股票代码到详情的映射
            if (stockResponse.data?.data?.diff) {
                for (const stock of stockResponse.data.data.diff) {
                    const key = `${stock.f13}.${stock.f12}`;
                    stockMap[key] = {
                        name: stock.f14, // 股票名称
                        price: stock.f2, // 最新价
                        change: stock.f3, // 涨跌幅
                        changeAmount: stock.f4, // 涨跌额
                    };
                }
            }
        } catch {
            // 股票信息获取失败不影响主流程
        }
    }

    const items = filteredList.slice(0, limit).map((item) => {
        // 提取标题和内容
        let title = item.title || '';
        let content = item.summary || item.content || '';
        const id = item.code || item.id || '';

        // 处理【】标记 - API的summary通常包含【标题】正文的格式
        const bracketMatch = content.match(/^【([^】]+)】(.*)$/s);
        if (bracketMatch) {
            // 如果API没有提供title，使用【】内的内容作为title
            if (!title) {
                title = bracketMatch[1];
            }
            // 总是移除【】部分，只保留正文（避免title和description重复）
            content = bracketMatch[2].trim();
        }

        // 如果仍然没有标题，使用内容前50个字符
        if (!title) {
            title = content.slice(0, 50).replaceAll(/<[^>]+>/g, '');
        }

        const pubDate = timezone(parseDate(item.showTime || item.publishTime), +8);

        // 构建链接
        const link = `https://finance.eastmoney.com/a/${id}.html`;

        // 构建描述
        let description = content;

        // 添加图片
        if (item.image && item.image.length > 0) {
            const images = item.image.map((img) => `<img src="${img}">`).join('');
            description += `<br><br>${images}`;
        }

        // 添加股票信息到描述（统一为两行布局 + 彩色边框）
        if (item.stockList && item.stockList.length > 0) {
            // 区分板块和股票（东方财富代码格式：市场.代码，如 0.399001 是指数/板块）
            const sectors: any[] = [];
            const stocks: any[] = [];

            for (const stockCode of item.stockList) {
                const info = stockMap[stockCode];
                if (info) {
                    const [market] = stockCode.split('.');
                    // 0 开头通常是指数/板块，1/105/106/107 等是股票市场
                    if (market === '0' || market === '90') {
                        sectors.push({ code: stockCode, ...info });
                    } else {
                        stocks.push({ code: stockCode, ...info });
                    }
                }
            }

            // 格式化股票/板块显示
            const formatStockItems = (items: any[]) => {
                let result = '';
                for (const item of items) {
                    const changeColor = item.change > 0 ? '#f5222d' : item.change < 0 ? '#52c41a' : '#666';
                    const arrow = item.change > 0 ? '↑' : item.change < 0 ? '↓' : '-';
                    const sign = item.change > 0 ? '+' : '';
                    const code = item.code.split('.')[1];

                    result += `• <strong>${item.name}</strong> <span style="color: #999;">(${code})</span><br>`;
                    result += `<span style="color: ${changeColor}; font-weight: bold;">${arrow} ${sign}${item.change}%</span><br>`;
                }
                return result;
            };

            // 显示板块（蓝色边框）
            if (sectors.length > 0) {
                const sectorHtml = formatStockItems(sectors);
                description += '<br><div style="background: #f5f5f5; border-left: 3px solid #1890ff; padding: 10px 15px; margin: 15px 0 10px 0; border-radius: 4px;">';
                description += '<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333;">相关板块</h3>';
                description += sectorHtml;
                description += '</div>';
            }

            // 显示股票（绿色边框）
            if (stocks.length > 0) {
                const stockHtml = formatStockItems(stocks);
                description += '<br><div style="background: #f5f5f5; border-left: 3px solid #52c41a; padding: 10px 15px; margin: 15px 0 10px 0; border-radius: 4px;">';
                description += '<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333;">相关股票</h3>';
                description += stockHtml;
                description += '</div>';
            }
        }

        // 添加来源信息
        if (item.source) {
            description += `<br><p style="color: #666; font-size: 0.9em;">📰 来源: ${item.source}</p>`;
        }

        // 构建分类标签
        const category: string[] = [];

        // 添加重要性标识
        if (item.important === 1 || item.importantLevel > 0) {
            category.push('重要');
        }

        // 添加股票名称标签（而不是代码）
        if (item.stockList && Array.isArray(item.stockList)) {
            for (const stockCode of item.stockList) {
                const info = stockMap[stockCode];
                if (info && info.name) {
                    category.push(info.name); // 使用股票名称
                }
            }
        }

        // 添加栏目名称
        if (item.columnName) {
            category.push(item.columnName);
        }

        const result: any = {
            title,
            description,
            link,
            pubDate,
            category: [...new Set(category)],
            guid: id,
            author: item.source || '东方财富网',
        };

        // 如果有图片，添加第一张作为封面
        if (item.image && item.image.length > 0) {
            result.image = item.image[0];
            result.enclosure_url = item.image[0];
            result.enclosure_type = 'image/jpeg';
        }

        return result;
    });

    const categoryName = category && categories[category] ? categories[category] : category;
    const titleSuffix = categoryName ? ` - ${categoryName}` : '';

    return {
        title: `东方财富 - 全球财经快讯${titleSuffix}${importantOnly ? ' - 重要' : ''}`,
        link: rootUrl,
        item: items,
        description: `东方财富全球财经快讯${titleSuffix ? ` - ${categoryName}` : ''}${importantOnly ? '（仅重要）' : ''}`,
        language: 'zh-CN',
        author: '东方财富网',
        image: 'https://www.eastmoney.com/favicon.ico',
    };
}
