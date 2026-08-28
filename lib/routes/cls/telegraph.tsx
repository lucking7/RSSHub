import type { Context } from 'hono';
import { renderToString } from 'hono/jsx/dom/server';

import { config } from '@/config';
import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Data, DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

import { applySourceImportance } from '../_finance/source-importance';
import { renderSectorAndStockCards } from '../_finance/stock-card';
import { cleanAndFilter, extractTitle, getClsImportanceSignals, getSearchParams, rootUrl, stripTitlePrefix, toStockItem } from './utils';

const categories: Record<string, string> = {
    watch: '看盘',
    announcement: '公司',
    explain: '解读',
    red: '加红',
    jpush: '推送',
    remind: '提醒',
    fund: '基金',
    hk: '港股',
    hk_us: '港美股',
};

const apiUrl = 'https://api3.cls.cn/v1/roll/get_roll_list';
const rollListSize = 50;
const CLS_TELEGRAPH_CACHE_TTL = 1;

function renderTelegraphDescription(item: any) {
    const bodyContent = stripTitlePrefix(item.content || '');

    return renderToString(
        <>
            {bodyContent ? <p style="font-size: 15px; line-height: 1.8; color: #333; margin: 0 0 10px 0; max-width: 800px;">{bodyContent}</p> : null}
            {item.images?.length ? (
                <>
                    {item.images.map((image: string) => (
                        <img src={image} key={image} style="max-width: 100%; height: auto; margin: 5px 0;" />
                    ))}
                </>
            ) : null}
            {item.assocArticleUrl ? (
                <div style="background: #f6ffed; border-left: 3px solid #52c41a; padding: 10px 15px; margin: 15px 0; border-radius: 4px;">
                    <a href={item.assocArticleUrl} target="_blank" style="color: #1890ff; text-decoration: none;">
                        点击查看原始公告文档 →
                    </a>
                </div>
            ) : null}
        </>
    );
}

export const route: Route = {
    path: ['/telegraph/:category?', '/dianbao/:category?'],
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
    cacheTtl: CLS_TELEGRAPH_CACHE_TTL,
    description: `\`/cls/dianbao/:category?\` 是本路由的别名，与 \`/cls/telegraph\` 共用同一 handler，默认返回 50 条（此前独立 \`dianbao\` 路由默认为 20 条）。可通过 RSSHub 通用参数 \`limit\` 调整条数，例如 \`/cls/dianbao?limit=20\`。

| 看盘  | 公司         | 解读    | 加红 | 推送  | 提醒   | 基金 | 港股 | 港美股 |
| ----- | ------------ | ------- | ---- | ----- | ------ | ---- | ---- | ------ |
| watch | announcement | explain | red  | jpush | remind | fund | hk   | hk\\_us |`,
};

async function handler(ctx: Context): Promise<Data> {
    const category = ctx.req.param('category') ?? '';
    if (category && !Object.hasOwn(categories, category)) {
        throw new InvalidParameterError(`Invalid category: "${category}". Supported categories are: ${Object.keys(categories).join(', ')}.`);
    }
    const limitQuery = ctx.req.query('limit');
    const limit = limitQuery ? Number.parseInt(limitQuery) : 50;

    const currentUrl = `${rootUrl}/telegraph`;

    const rawData = await cache.tryGet(
        `cls:telegraph:${category || 'all'}`,
        async () => {
            const response = await ofetch(apiUrl, {
                query: getSearchParams({
                    appName: undefined,
                    app: 'CailianpressWeb',
                    ...(category && { category }),
                    last_time: 0,
                    rn: rollListSize,
                    hasFirstVipArticle: 1,
                }),
                headers: {
                    accept: 'application/json, text/plain, */*',
                    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    origin: rootUrl,
                    referer: currentUrl,
                    'user-agent': config.trueUA,
                    'X-Forwarded-For': '116.228.111.18',
                    'X-Real-IP': '116.228.111.18',
                    'Client-IP': '116.228.111.18',
                },
            });
            return response.data?.roll_data ?? [];
        },
        CLS_TELEGRAPH_CACHE_TTL,
        false
    );

    const items = cleanAndFilter(rawData)
        .slice(0, limit)
        .map((item) => {
            const processedStockList = (item.stock_list || []).map((stock: any) => ({
                ...stock,
                StockID: stock.StockID ? stock.StockID.toUpperCase() : stock.StockID,
            }));

            const sectors = processedStockList.filter((s: any) => s.StockID?.startsWith('801')).map((s: any) => toStockItem(s));
            const stocks = processedStockList.filter((s: any) => !s.StockID?.startsWith('801')).map((s: any) => toStockItem(s));

            const subjectCategories = item.subjects?.map((s: any) => s.subject_name) || [];
            const stockNameCategories = processedStockList.map((stock: any) => stock.name);

            const titleFromContent = extractTitle(item.content || '');
            const title = item.title || titleFromContent || item.brief || item.content;

            let description = renderTelegraphDescription(item);
            description += renderSectorAndStockCards(sectors, stocks);

            const rssItem: DataItem = applySourceImportance(
                {
                    title,
                    link: item.shareurl,
                    description,
                    pubDate: parseDate(item.ctime, 'X'),
                    category: [...subjectCategories, ...stockNameCategories],
                    author: item.author || '',
                },
                getClsImportanceSignals(item)
            );

            return rssItem;
        });

    return {
        title: `财联社 - 电报${category ? ` - ${categories[category]}` : ''}`,
        link: currentUrl,
        language: 'zh-CN',
        item: items,
    };
}
