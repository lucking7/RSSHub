import { renderToString } from 'hono/jsx/dom/server';

import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

import type { StockItem } from '../_finance/stock-card';
import { renderSectorAndStockCards } from '../_finance/stock-card';
import { getSearchParams, rootUrl } from './utils';

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

const VIP_TYPE_CODE = 20015;

const toStockItem = (s: any): StockItem => ({
    name: s.name,
    code: s.StockID || '',
    change: s.RiseRange,
});

function extractTitle(content: string): string {
    const match = content.match(/^【([^】]+)】/);
    return match ? match[1] : '';
}

function stripTitlePrefix(content: string): string {
    return content.replace(/^【[^】]+】/, '').trim();
}

function renderTelegraphDescription(item: any) {
    const titleFromContent = extractTitle(item.content || '');
    const bodyContent = stripTitlePrefix(item.content || '');

    return renderToString(
        <>
            {item.level === 'A' ? (
                <div style="background: #fff1f0; border-left: 3px solid #ff4d4f; padding: 8px 12px; margin-bottom: 10px; border-radius: 3px;">
                    <strong style="color: #ff4d4f;">【重要】</strong>
                </div>
            ) : null}
            {titleFromContent ? <h1 style="font-size: 18px; font-weight: bold; margin: 0 0 10px 0; color: #222; line-height: 1.5;">【{titleFromContent}】</h1> : null}
            {bodyContent ? <p style="font-size: 15px; line-height: 1.8; color: #333; margin: 0 0 10px 0; max-width: 800px;">{bodyContent}</p> : null}
            {item.images?.length ? (
                <>
                    {item.images.map((image: string) => (
                        <img src={image} key={image} style="max-width: 100%; height: auto; margin: 5px 0;" />
                    ))}
                </>
            ) : null}
            <div style="display: flex; gap: 16px; margin: 12px 0; font-size: 13px; color: #999; flex-wrap: wrap;">
                {item.reading_num === undefined ? null : <span>阅读 {item.reading_num}</span>}
                {item.comment_num === undefined ? null : <span>评论 {item.comment_num}</span>}
                {item.share_num === undefined ? null : <span>分享 {item.share_num}</span>}
            </div>
            {item.subjects?.length ? (
                <div style="margin: 10px 0; display: flex; gap: 6px; flex-wrap: wrap;">
                    {item.subjects.map((s: any) => (
                        <span key={s.subject_id} style="background: #f0f5ff; color: #1890ff; padding: 2px 8px; border-radius: 3px; font-size: 12px;">
                            {s.subject_name}
                        </span>
                    ))}
                </div>
            ) : null}
        </>
    );
}

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
    });

    const items = response.data.data.roll_data
        .filter((item) => Number(item.type) !== VIP_TYPE_CODE)
        .slice(0, limit)
        .map((item) => {
            const processedStockList = (item.stock_list || []).map((stock: any) => ({
                ...stock,
                StockID: stock.StockID ? stock.StockID.toUpperCase() : stock.StockID,
            }));

            const sectors = processedStockList.filter((s: any) => s.StockID?.includes('801')).map((s: any) => toStockItem(s));
            const stocks = processedStockList.filter((s: any) => !s.StockID?.includes('801')).map((s: any) => toStockItem(s));

            const subjectCategories = item.subjects?.map((s: any) => s.subject_name) || [];
            const stockNameCategories = processedStockList.map((stock: any) => stock.name);

            const titleFromContent = extractTitle(item.content || '');
            const levelPrefix = item.level === 'A' ? '【重要】' : '';
            const title = levelPrefix + (item.title || titleFromContent || item.brief || item.content);

            let description = renderTelegraphDescription(item);

            const stockCards = renderSectorAndStockCards(sectors, stocks);
            if (stockCards) {
                description += stockCards;
            }

            const rssItem: any = {
                title,
                link: item.shareurl,
                description,
                pubDate: parseDate(item.ctime * 1000),
                category: [...subjectCategories, ...stockNameCategories],
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
        title: `财联社 - 电报${category === '' ? '' : ` - ${categories[category]}`}`,
        link: currentUrl,
        item: items,
    };
}
