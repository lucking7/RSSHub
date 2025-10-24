import { Route } from '@/types';

import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { art } from '@/utils/render';
import path from 'node:path';

import { rootUrl, getSearchParams } from './utils';

const categories = {
    watch: '看盘',
    announcement: '公司',
    explain: '解读',
    red: '加红',
    jpush: '推送',
    remind: '提醒',
    fund: '基金',
    hk: '港股',
};

export const route: Route = {
    path: '/telegraph/:category?',
    categories: ['finance'],
    example: '/cls/telegraph',
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
            target: '/telegraph',
        },
    ],
    name: '电报',
    maintainers: ['nczitzk'],
    handler,
    url: 'cls.cn/telegraph',
    description: `| 看盘  | 公司         | 解读    | 加红 | 推送  | 提醒   | 基金 | 港股 |
| ----- | ------------ | ------- | ---- | ----- | ------ | ---- | ---- |
| watch | announcement | explain | red  | jpush | remind | fund | hk   |`,
};

async function handler(ctx) {
    const category = ctx.req.param('category') ?? '';
    const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 50;

    let apiUrl = `${rootUrl}/nodeapi/updateTelegraphList`;
    if (category) {
        apiUrl = `${rootUrl}/v1/roll/get_roll_list`;
    }

    const currentUrl = `${rootUrl}/telegraph`;

    const response = await got({
        method: 'get',
        url: apiUrl,
        searchParams: getSearchParams({
            category,
            hasFirstVipArticle: 1,
        }),
        headers: {
            Referer: 'https://www.cls.cn/telegraph',
        },
    });

    const items = response.data.data.roll_data.slice(0, limit).map((item) => {
        // 处理股票信息，格式化股票代码为大写
        const processedStockList = (item.stock_list || []).map((stock) => ({
            ...stock,
            StockID: stock.StockID ? stock.StockID.toUpperCase() : stock.StockID,
        }));

        // 区分板块和个股（板块代码通常包含801）
        const sectors = processedStockList.filter((stock) => stock.StockID && stock.StockID.includes('801'));
        const stocks = processedStockList.filter((stock) => !stock.StockID || !stock.StockID.includes('801'));

        // 分别处理主题分类和股票分类
        const subjectCategories = item.subjects?.map((s) => s.subject_name) || [];

        // 股票名称作为独立的 category
        const stockNameCategories = processedStockList.map((stock) => stock.name);

        // 合并所有 categories：主题、股票名称（涨跌幅只在正文显示，不在category中）
        const categories = [...subjectCategories, ...stockNameCategories];

        // 根据 level 添加标题前缀 (只显示重要级别)
        const levelPrefix = item.level === 'A' ? '【重要】' : '';
        const title = levelPrefix + (item.title || item.content);

        // 移除 content 中的【标题】重复部分
        const processedItem = {
            ...item,
            content: item.content.replace(/^【[^】]+】/, '').trim(),
            stock_list: processedStockList,
        };

        // 构建基础 RSS item
        const rssItem = {
            title,
            link: item.shareurl,
            description: art(path.join(__dirname, 'templates/telegraph.art'), {
                item: processedItem,
                images: item.images || [],
                author: item.author || '',
                sectors,
                stocks,
                level: item.level || '',
                assocArticleUrl: item.assocArticleUrl || '',
            }),
            pubDate: parseDate(item.ctime * 1000),
            category: categories,
            author: item.author || '',
        };

        // 如果有音频，添加为 RSS enclosure（播客功能）
        if (item.audio_url && item.audio_url.length > 0) {
            rssItem.enclosure_url = item.audio_url[0];
            rssItem.enclosure_type = 'audio/mpeg';
            rssItem.enclosure_title = title;
        }

        return rssItem;
    });

    return {
        title: `财联社 - 电报${category === '' ? '' : ` - ${categories[category]}`}`,
        link: currentUrl,
        description: `财联社电报 - 实时财经快讯${category === '' ? '' : `，关注${categories[category]}领域`}`,
        language: 'zh-cn',
        item: items,
    };
}
