import { Route } from '@/types';

import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { art } from '@/utils/render';
import path from 'node:path';

import { getSearchParams } from './utils';

export const route: Route = {
    path: '/dianbao',
    categories: ['finance'],
    example: '/cls/dianbao',
    parameters: {},
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
    description: '获取财联社电报快讯，使用api3.cls.cn接口',
};

async function handler(ctx) {
    const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 20;

    // 使用 api3.cls.cn 接口
    const apiUrl = 'https://api3.cls.cn/v1/roll/get_roll_list';

    // 获取当前时间戳作为 last_time
    const lastTime = Math.floor(Date.now() / 1000);

    const response = await got({
        method: 'get',
        url: apiUrl,
        searchParams: getSearchParams({
            last_time: lastTime,
            rn: limit,
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

        // 合并所有 categories：主题、股票名称
        const categories = [...subjectCategories, ...stockNameCategories];

        // 根据 level 添加标题前缀 (只显示重要级别)
        const levelPrefix = item.level === 'A' ? '【重要】' : '';
        const title = levelPrefix + (item.title || item.brief || item.content);

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
        title: '财联社 - 电报（API3）',
        link: 'https://www.cls.cn/telegraph',
        description: '财联社电报快讯 - 使用API3接口实时获取财经新闻',
        language: 'zh-cn',
        item: items,
    };
}
