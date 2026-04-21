import { config } from '@/config';
import type { Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/review',
    name: '盘面点评',
    url: 'longhuvip.com',
    maintainers: [],
    handler,
    example: '/kaipanla/review',
    view: ViewType.Articles,
    description: '开盘啦盘面点评，包含市场综合强度评分和实时点评',
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

async function handler() {
    const apiUrl = 'https://apphq.longhuvip.com/w1/api/index.php';

    const response = await cache.tryGet(
        'kaipanla:review:v3',
        async () => {
            const { data } = await got(apiUrl, {
                searchParams: {
                    a: 'DiskReview',
                    apiv: 'w21',
                    c: 'HomeDingPan',
                    PhoneOSNew: '1',
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    Accept: '*/*',
                },
            });
            return data;
        },
        config.cache.routeExpire,
        false
    );

    const info = response.info || {};
    const strong = Number.parseInt(info.strong, 10) || 0;
    const sign = info.sign || '';

    // 判断市场情绪
    let sentiment = '中性';
    if (strong >= 80) {
        sentiment = '极强';
    } else if (strong >= 60) {
        sentiment = '偏强';
    } else if (strong >= 40) {
        sentiment = '中性';
    } else {
        sentiment = '偏弱';
    }

    const title = `市场情绪：${sentiment} (${strong}分)`;

    // 构建 sina 风格的 description
    let description = '';

    // 市场综合强度（下划线标题）
    description += '<div style="background: #f5f5f5; border-left: 3px solid #1890ff; padding: 10px 15px; margin: 0 0 15px 0; border-radius: 4px;">';
    description += '<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333; text-decoration: underline;">市场综合强度</h3>';
    description += `<p style="font-size: 24px; font-weight: bold; text-align: center; margin: 0; color: #333;">${strong}分 - ${sentiment}</p>`;
    description += '</div>';

    // 盘面点评（下划线标题）
    description += '<div style="background: #f5f5f5; border-left: 3px solid #52c41a; padding: 10px 15px; margin: 0 0 15px 0; border-radius: 4px;">';
    description += '<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333; text-decoration: underline;">盘面点评</h3>';
    description += `<p style="margin: 0; line-height: 1.6;">${sign}</p>`;
    description += '</div>';

    // 强度评分说明（下划线标题）
    description += '<div style="background: #f5f5f5; border-left: 3px solid #faad14; padding: 10px 15px; margin: 0; border-radius: 4px;">';
    description += '<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333; text-decoration: underline;">强度评分说明</h3>';
    description += '• <strong>80-100分</strong>：市场情绪极强，可积极参与<br>';
    description += '• <strong>60-79分</strong>：市场情绪偏强，适度参与<br>';
    description += '• <strong>40-59分</strong>：市场情绪中性，谨慎观望<br>';
    description += '• <strong>0-39分</strong>：市场情绪偏弱，控制仓位';
    description += '</div>';

    return {
        title: '开盘啦 - 盘面点评',
        link: 'https://www.longhuvip.com/',
        description: '实时市场情绪评分和盘面点评',
        language: 'zh-cn',
        item: [
            {
                title,
                description,
                pubDate: parseDate(new Date()),
                link: 'https://www.longhuvip.com/',
                guid: `kaipanla:review:${Date.now()}`,
                author: '开盘啦',
            },
        ],
    };
}
