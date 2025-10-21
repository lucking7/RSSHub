import { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { config } from '@/config';

export const route: Route = {
    path: '/review',
    name: '盘面点评',
    url: 'longhuvip.com',
    maintainers: [],
    handler,
    example: '/kaipanla/review',
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

    const { data: response } = await cache.tryGet(
        'kaipanla:review',
        async () => {
            const { data } = await got(apiUrl, {
                searchParams: {
                    a: 'DiskReview',
                    apiv: 'w21',
                    c: 'HomeDingPan',
                    PhoneOSNew: '1',
                },
                headers: {
                    'User-Agent': 'lhb/5.9.3 (com.kaipanla.www; build:0; iOS 15.4.0) Alamofire/5.9.3',
                    Accept: '*/*',
                },
            });
            return data;
        },
        config.cache.routeExpire,
        false
    );

    const info = response.info || {};
    const strong = Number.parseInt(info.strong, 10);
    const sign = info.sign || '';

    // 判断市场情绪
    let emoji = '😐';
    let sentiment = '中性';
    if (strong >= 80) {
        emoji = '🔥';
        sentiment = '极强';
    } else if (strong >= 60) {
        emoji = '💪';
        sentiment = '偏强';
    } else if (strong >= 40) {
        emoji = '😐';
        sentiment = '中性';
    } else {
        emoji = '😟';
        sentiment = '偏弱';
    }

    const title = `${emoji} 市场情绪：${sentiment} (${strong}分)`;
    const description = `
        <div style="padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px; margin-bottom: 10px;">
            <h2 style="margin: 0 0 10px 0; color: white;">📊 市场综合强度</h2>
            <div style="font-size: 48px; font-weight: bold; text-align: center; margin: 20px 0;">
                ${strong}分
            </div>
            <div style="text-align: center; font-size: 24px; margin: 10px 0;">
                ${emoji} ${sentiment}
            </div>
        </div>
        <div style="padding: 15px; background: #f8f9fa; border-left: 4px solid #667eea; border-radius: 5px;">
            <h3 style="margin-top: 0; color: #333;">💡 盘面点评</h3>
            <p style="font-size: 16px; line-height: 1.6; color: #555;">${sign}</p>
        </div>
        <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 5px;">
            <h4 style="margin-top: 0; color: #856404;">📈 强度评分说明</h4>
            <ul style="margin: 5px 0; padding-left: 20px; color: #856404;">
                <li>80-100分：🔥 市场情绪极强，可积极参与</li>
                <li>60-79分：💪 市场情绪偏强，适度参与</li>
                <li>40-59分：😐 市场情绪中性，谨慎观望</li>
                <li>0-39分：😟 市场情绪偏弱，控制仓位</li>
            </ul>
        </div>
    `;

    return {
        title: '开盘啦 - 盘面点评',
        link: 'https://www.longhuvip.com/',
        description: '实时市场情绪评分和盘面点评',
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
