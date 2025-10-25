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
        // 合并主题分类和股票分类（包含涨跌幅）
        const stockCategories = (item.stock_list || []).map((stock) => {
            const arrow = stock.RiseRange > 0 ? '↑' : (stock.RiseRange < 0 ? '↓' : '—');
            return `${stock.name} ${arrow}${stock.RiseRange}%`;
        });

        const categories = [...(item.subjects?.map((s) => s.subject_name) || []), ...stockCategories];

        // 根据 level 添加标题前缀
        const levelPrefix = item.level === 'A' ? '🔴 ' : (item.level === 'B' ? '🟡 ' : '');
        const title = levelPrefix + (item.title || item.content);

        // 构建基础 RSS item
        const rssItem = {
            title,
            link: item.shareurl,
            description: art(path.join(__dirname, 'templates/telegraph.art'), {
                item,
                images: item.images || [],
                author: item.author || '',
                stock_list: item.stock_list || [],
                level: item.level || '',
                audio_url: item.audio_url || [],
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
        }

        return rssItem;
    });

    return {
        title: `财联社 - 电报${category === '' ? '' : ` - ${categories[category]}`}`,
        link: currentUrl,
        item: items,
    };
}
