import type { Route } from '@/types';
import { ViewType } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

import { renderSectorAndStockCards, type StockItem } from '../../_finance/stock-card';

export const route: Route = {
    path: '/finance/newslist',
    name: '财经快讯 - 自选股',
    url: 'gu.qq.com',
    maintainers: [''],
    handler,
    example: '/tencent/finance/newslist',
    description: `使用腾讯自选股移动端接口获取实时财经快讯

⚠️ **重要说明**：
- 由于API需要签名验证，当前使用固定签名（可能会过期）
- 每次固定返回最新10条快讯
- 如签名过期，需要更新代码中的 fixedParams

支持查询参数：
- \`limit=10\` - 限制返回数量（最多10条，默认10条）

特点：
- 📱 移动端专用接口
- 📊 包含股票涨跌幅数据
- 🏷️ 支持热门标签分类
- ⏱️ 实时性强

示例：
- \`/tencent/finance/newslist\` - 获取最新10条财经快讯
- \`/tencent/finance/newslist?limit=5\` - 获取最新5条快讯`,
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
            source: ['gu.qq.com/'],
            target: '/finance/newslist',
        },
    ],
    view: ViewType.Notifications,
};

async function handler(ctx) {
    const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 10;

    const baseUrl = 'https://snp.tenpay.com';
    const apiUrl = `${baseUrl}/cgi-bin/snpgw_724_newslist.fcgi`;

    // 固定参数（从抓包数据中获取 - 2025-10-28）
    // 注意：签名可能会过期，届时需要更新
    const fixedParams = {
        reserve: '2149056560',
        filter: '0',
        limit: '10',
        offset: '0',
        hot_label: '0',
        req_session: '0',
        zappid: 'zxg_h5',
        sign: '116148801e817c775f5e31565bd8a8c1',
        nonce: '8431',
        _appver: '11.32.0',
        _devId: '7e8ba3a8ed2491b4c906dbb430e86b887acc5c7e',
        check: '-1',
        _ui: '7e8ba3a8ed2491b4c906dbb430e86b887acc5c7e',
        fskey: 'anonymous',
        _appName: 'ios',
        openid: 'anonymous',
        buildType: 'store',
        _osVer: '26.0.1',
        _dev: 'iPhone18,2',
        lang: 'en_US',
        _isChId: '1',
    };

    // 只请求一次，获取10条数据
    let hotLabels: any[] = [];
    let collected: any[] = [];

    try {
        const response = await got(apiUrl, {
            searchParams: fixedParams,
            headers: {
                'User-Agent': 'QQStock/11.32.0 (iPhone; iOS 26.0.1; Scale/3.00)',
                Referer: 'http://zixuanguapp.finance.qq.com',
                Accept: '*/*',
                'Accept-Language': 'en-US;q=1, zh-Hans-US;q=0.9',
                'Accept-Encoding': 'gzip,deflate',
            },
            timeout: 30000,
        });

        const data = response.data;

        // 检查返回码
        if (data.retcode !== '0') {
            throw new Error(`API Error: ${data.retmsg || 'Unknown error'}`);
        }

        // 保存热门标签
        if (data.hot_label && data.hot_label.length > 0) {
            hotLabels = data.hot_label;
        }

        // 获取新闻列表（注意：API返回的字段是 data 不是 list）
        const newsList = data.data || [];
        collected = newsList.slice(0, Math.min(limit, 10)); // 最多返回10条
    } catch (error) {
        throw new Error(`Failed to fetch news: ${error.message}`, { cause: error });
    }

    const allStocks = new Set<string>();
    for (const item of collected.slice(0, limit)) {
        if (item.relate_stocks && Array.isArray(item.relate_stocks)) {
            for (const stock of item.relate_stocks) {
                if (stock.symbol) {
                    allStocks.add(stock.symbol);
                }
            }
        }
    }

    const stockMap: Record<string, any> = {};
    if (allStocks.size > 0) {
        try {
            const stockCodes = [...allStocks].join(',');
            const stockResponse = await got({
                method: 'get',
                url: 'https://qt.gtimg.cn/q=' + stockCodes,
                headers: {
                    Referer: 'https://gu.qq.com/',
                },
                responseType: 'text',
            });

            const lines = stockResponse.data.split('\n');
            for (const line of lines) {
                const match = line.match(/v_([^=]+)="([^"]+)"/);
                if (match) {
                    const code = match[1];
                    const fields = match[2].split('~');
                    if (fields.length > 5) {
                        stockMap[code] = {
                            name: fields[1], // 股票名称
                            price: fields[3], // 最新价
                            change: fields[32] || fields[5], // 涨跌幅
                        };
                    }
                }
            }
        } catch {
            // ignore
        }
    }

    const items = collected.slice(0, limit).map((item) => {
        const content = item.new_content || item.content || '';
        const newsId = item.id;
        const pubDate = timezone(parseDate(item.publish_time * 1000), +8);

        // 解析标题（优先使用 new_title，否则提取【】内的内容）
        const title =
            item.new_title ||
            (() => {
                const cleanContent = content.replaceAll(/<[^>]+>/g, '');
                const titleMatch = cleanContent.match(/【([^】]+)】/);
                return titleMatch ? titleMatch[1] : cleanContent.slice(0, 100) || `财经快讯 ${newsId}`;
            })();

        let description = '<div style="padding: 15px; background: #f8f9fa; border-left: 4px solid #667eea; border-radius: 5px; margin-bottom: 10px;">';
        description += '<p style="margin: 0; line-height: 1.8; font-size: 15px;">';
        let cleanContent = content.replace(/【[^】]+】/, '').trim();
        cleanContent = cleanContent.replaceAll(/<a[^>]*href\s*=\s*"stock:\/\/[^"]*"[^>]*>([^<]+)<\/a>/g, '<em><strong>$1</strong></em>');

        description += cleanContent;
        description += '</p></div>';

        const stockList = item.relate_stocks || [];
        if (stockList.length > 0) {
            const sectors: StockItem[] = [];
            const individualStocks: StockItem[] = [];

            for (const stock of stockList) {
                const stockCode = stock.symbol || '';
                const stockInfo = stockMap[stockCode];
                if (!stockInfo) {
                    continue;
                }

                const isSector = stockCode.startsWith('cs') || stockCode.startsWith('pt') || stockCode.startsWith('bk');
                const si: StockItem = { name: stock.name || stockInfo.name, code: stockCode.toUpperCase(), change: Number.parseFloat(stockInfo.change) || 0 };

                if (isSector) {
                    sectors.push(si);
                } else {
                    individualStocks.push(si);
                }
            }

            description += renderSectorAndStockCards(sectors, individualStocks);
        }

        // 构建分类标签
        const categories: string[] = [];

        // 添加标签信息
        const labelList = item.label_list || [];
        for (const label of labelList) {
            if (label.label_name) {
                categories.push(label.label_name);
            }
        }

        // 添加股票名称标签
        for (const stock of stockList) {
            if (stock.name) {
                categories.push(stock.name);
            }
        }

        return {
            title,
            description,
            link: item.url || `https://gu.qq.com/news/${newsId}`,
            guid: `tencent-zxg-${newsId}`,
            pubDate,
            category: [...new Set(categories)],
            author: item.source || '腾讯自选股', // 使用API返回的来源作为作者，如"财联社"、"央视新闻"等
        };
    });

    // 构建标题
    let titleSuffix = '';
    if (hotLabels.length > 0) {
        const labelNames = hotLabels.map((l) => l.name).join('、');
        titleSuffix = ` - 热门: ${labelNames}`;
    }

    return {
        title: `腾讯自选股 - 财经快讯${titleSuffix}`,
        link: 'https://gu.qq.com/',
        description: '腾讯自选股实时财经快讯',
        item: items,
        language: 'zh-CN',
        author: '腾讯自选股',
        image: 'https://gu.qq.com/favicon.ico',
    };
}
