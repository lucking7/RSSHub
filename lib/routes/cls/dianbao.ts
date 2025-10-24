import type { Route } from '@/types';

import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

import { getSearchParams } from './utils';

const categories = {
    watch: '看盘',
    announcement: '公司',
    explain: '解读',
    red: '加红',
    jpush: '推送',
    remind: '提醒',
    fund: '基金',
    hk_us: '港美股',
};

function renderStockItems(items: any[]) {
    let html = '';
    for (const stock of items) {
        html += `• <strong style="color: #333;">${stock.name}</strong> <span style="color: #999;">(${stock.StockID})</span><br>`;
        if (stock.RiseRange > 0) {
            html += `<span style="color: #ff4d4f; font-weight: bold;">↑ +${stock.RiseRange}%</span><br>`;
        } else if (stock.RiseRange < 0) {
            html += `<span style="color: #52c41a; font-weight: bold;">↓ ${stock.RiseRange}%</span><br>`;
        } else {
            html += `<span style="color: #666; font-weight: bold;">- 0.00%</span><br>`;
        }
    }
    return html;
}

function renderDescription({ item, images, sectors, stocks, level, assocArticleUrl }) {
    let html = '';

    if (level === 'A') {
        html += '<div style="background: #fff1f0; border-left: 3px solid #ff4d4f; padding: 8px 12px; margin-bottom: 10px; border-radius: 3px;">';
        html += '<strong style="color: #ff4d4f;">【重要】</strong>';
        html += '</div>';
    }

    if (item.content) {
        html += item.content;
    }

    if (images && images.length > 0) {
        html += '<br>';
        for (const img of images) {
            html += `<img src="${img}" style="max-width: 100%; height: auto;">`;
        }
    }

    if (sectors && sectors.length > 0) {
        html += '<br>';
        html += '<div style="background: #f5f5f5; border-left: 3px solid #1890ff; padding: 10px 15px; margin: 15px 0 10px 0; border-radius: 4px;">';
        html += '<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333;">相关板块</h3>';
        html += renderStockItems(sectors);
        html += '</div>';
    }

    if (stocks && stocks.length > 0) {
        html += '<br>';
        html += '<div style="background: #f5f5f5; border-left: 3px solid #52c41a; padding: 10px 15px; margin: 15px 0 10px 0; border-radius: 4px;">';
        html += '<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333;">相关股票</h3>';
        html += renderStockItems(stocks);
        html += '</div>';
    }

    if (assocArticleUrl) {
        html += '<br>';
        html += '<div style="background: #f6ffed; border-left: 3px solid #52c41a; padding: 10px 15px; margin: 15px 0; border-radius: 4px;">';
        html += `<a href="${assocArticleUrl}" target="_blank" style="color: #1890ff; text-decoration: none;">点击查看原始公告文档 →</a>`;
        html += '</div>';
    }

    return html;
}

export const route: Route = {
    path: '/dianbao/:category?',
    categories: ['finance'],
    example: '/cls/dianbao',
    parameters: { category: '分类，见下表，默认为全部' },
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
            source: ['cls.cn/telegraph', 'cls.cn/'],
            target: '/dianbao',
        },
    ],
    name: '电报（API3接口）',
    maintainers: ['nczitzk'],
    handler,
    url: 'cls.cn/telegraph',
    description: `获取财联社电报快讯，使用api3.cls.cn接口

| 看盘  | 公司         | 解读    | 加红 | 推送  | 提醒   | 基金 | 港美股  |
| ----- | ------------ | ------- | ---- | ----- | ------ | ---- | ------- |
| watch | announcement | explain | red  | jpush | remind | fund | hk_us   |`,
};

async function handler(ctx) {
    const category = ctx.req.param('category') ?? '';
    const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 20;

    const apiUrl = 'https://api3.cls.cn/v1/roll/get_roll_list';

    const lastTime = Math.floor(Date.now() / 1000);

    const params = {
        last_time: lastTime,
        rn: limit,
        hasFirstVipArticle: 1,
    };

    if (category) {
        params.category = category;
    }

    const response = await got({
        method: 'get',
        url: apiUrl,
        searchParams: getSearchParams(params),
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Referer: 'https://www.cls.cn/telegraph',
            Accept: 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            Origin: 'https://www.cls.cn',
        },
    });

    const items = response.data.data.roll_data.slice(0, limit).map((item) => {
        const processedStockList = (item.stock_list || []).map((stock) => ({
            ...stock,
            StockID: stock.StockID ? stock.StockID.toUpperCase() : stock.StockID,
        }));

        const sectors = processedStockList.filter((stock) => stock.StockID && stock.StockID.includes('801'));
        const stocks = processedStockList.filter((stock) => !stock.StockID || !stock.StockID.includes('801'));

        const subjectCategories = item.subjects?.map((s) => s.subject_name) || [];
        const stockNameCategories = processedStockList.map((stock) => stock.name);
        const allCategories = [...subjectCategories, ...stockNameCategories];

        const levelPrefix = item.level === 'A' ? '【重要】' : '';
        const title = levelPrefix + (item.title || item.brief || item.content);

        const processedItem = {
            ...item,
            content: item.content.replace(/^【[^】]+】/, '').trim(),
            stock_list: processedStockList,
        };

        const rssItem: any = {
            title,
            link: item.shareurl,
            description: renderDescription({
                item: processedItem,
                images: item.images || [],
                sectors,
                stocks,
                level: item.level || '',
                assocArticleUrl: item.assocArticleUrl || '',
            }),
            pubDate: parseDate(item.ctime * 1000),
            category: allCategories,
            author: item.author || '',
        };

        if (item.audio_url && item.audio_url.length > 0) {
            rssItem.enclosure_url = item.audio_url[0];
            rssItem.enclosure_type = 'audio/mpeg';
            rssItem.enclosure_title = title;
        }

        return rssItem;
    });

    return {
        title: `财联社 - 电报（API3）${category === '' ? '' : ` - ${categories[category]}`}`,
        link: 'https://www.cls.cn/telegraph',
        description: `财联社电报快讯 - 使用API3接口实时获取财经新闻${category === '' ? '' : `，关注${categories[category]}领域`}`,
        language: 'zh-cn',
        item: items,
    };
}
