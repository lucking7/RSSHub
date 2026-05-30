import { renderToString } from 'hono/jsx/dom/server';

import { config } from '@/config';
import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

import { applySourceImportance } from '../_finance/source-importance';
import type { StockItem } from '../_finance/stock-card';
import { renderSectorAndStockCards } from '../_finance/stock-card';
import { getClsImportanceSignals, getSearchParams, rootUrl } from './utils';

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
const apiUrl = 'https://api3.cls.cn/v1/roll/get_roll_list';
const rollListSize = 50;
const CLS_TELEGRAPH_CACHE_TTL = 30;

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

function isPromotionalContent(content: string): boolean {
    if (!content) {
        return false;
    }

    const strongKeywords = ['点击阅读', '点击查看', '点击观看', '正在直播中', '正在直播', '直播中', '扫码', '进群', '下载APP', '下载app', '安装客户端', '扫码领取', '限时免费', '立即加入', '戳这里', '››', '《《'];

    const promotionalPatterns = [/点击.*(阅读|观看|查看)/, /(阅读|观看).*直播中/, /›\s*还有.*行情.*直播/, /直播中.*点击/, /扫码.*(进群|关注|下载)/];

    if (strongKeywords.some((kw) => content.includes(kw))) {
        return true;
    }

    if (promotionalPatterns.some((pattern) => pattern.test(content))) {
        return true;
    }

    if (content.includes('›') && /(直播|点击|阅读|观看)/.test(content)) {
        return true;
    }

    return false;
}

function renderTelegraphDescription(item: any) {
    const bodyContent = stripTitlePrefix(item.content || '');

    return renderToString(
        <>
            {item.level === 'A' ? (
                <div style="background: #fff1f0; border-left: 3px solid #ff4d4f; padding: 8px 12px; margin-bottom: 10px; border-radius: 3px;">
                    <strong style="color: #ff4d4f;">【重要】</strong>
                </div>
            ) : null}
            {bodyContent ? <p style="font-size: 15px; line-height: 1.8; color: #333; margin: 0 0 10px 0; max-width: 800px;">{bodyContent}</p> : null}
            {item.images?.length ? (
                <>
                    {item.images.map((image: string) => (
                        <img src={image} key={image} style="max-width: 100%; height: auto; margin: 5px 0;" />
                    ))}
                </>
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
    cacheTtl: CLS_TELEGRAPH_CACHE_TTL,
    description: `| 看盘  | 公司         | 解读    | 加红 | 推送  | 提醒   | 基金 | 港股 |
| ----- | ------------ | ------- | ---- | ----- | ------ | ---- | ---- |
| watch | announcement | explain | red  | jpush | remind | fund | hk   |`,
};

async function handler(ctx) {
    const category = ctx.req.param('category') ?? '';
    const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 50;

    const currentUrl = `${rootUrl}/telegraph`;

    const rawData = await cache.tryGet(
        `cls:telegraph:${category}`,
        async () => {
            const response = await got({
                method: 'get',
                url: apiUrl,
                searchParams: getSearchParams({
                    ...(category ? { category } : {}),
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
                },
            });
            return response.data?.data?.roll_data ?? [];
        },
        CLS_TELEGRAPH_CACHE_TTL,
        false
    );

    const items = rawData
        .filter((item) => Number(item.type) !== VIP_TYPE_CODE)
        .filter((item) => !isPromotionalContent(item.content || ''))
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
            const title = item.title || titleFromContent || item.brief || item.content;

            let description = renderTelegraphDescription(item);

            const stockCards = renderSectorAndStockCards(sectors, stocks);
            if (stockCards) {
                description += stockCards;
            }

            const rssItem: any = applySourceImportance(
                {
                    title,
                    link: item.shareurl,
                    description,
                    pubDate: parseDate(item.ctime * 1000),
                    category: [...subjectCategories, ...stockNameCategories],
                    author: item.author || '',
                },
                getClsImportanceSignals(item)
            );

            // Audio enclosure is disabled for now; keep this block for later reuse.
            // if (item.audio_url && item.audio_url.length > 0) {
            //     rssItem.enclosure_url = item.audio_url[0];
            //     rssItem.enclosure_type = 'audio/mpeg';
            //     rssItem.enclosure_title = title;
            // }

            return rssItem;
        });

    return {
        title: `财联社 - 电报${category === '' ? '' : ` - ${categories[category]}`}`,
        link: currentUrl,
        item: items,
    };
}
