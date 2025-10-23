import { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { config } from '@/config';

export const route: Route = {
    path: '/zt',
    name: '涨停表现',
    url: 'longhuvip.com',
    maintainers: [],
    handler,
    example: '/kaipanla/zt',
    description: '开盘啦涨停表现，包含连板分布、封板率和平均封单数据',
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
        'kaipanla:zt-expression',
        async () => {
            const { data } = await got(apiUrl, {
                searchParams: {
                    a: 'ZhangTingExpression',
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

    const info = response.info || [];

    // 解析数据
    const yiBan = info[0] || 0; // 一板数量
    const erBan = info[1] || 0; // 二板数量
    const sanBan = info[2] || 0; // 三板数量
    const gaoBan = info[3] || 0; // 更高板数量
    const yiBanRate = info[4] || 0; // 一板封板率
    const erBanRate = info[5] || 0; // 二板封板率
    const sanBanRate = info[6] || 0; // 三板封板率
    const gaoBanRate = info[7] || 0; // 更高板封板率
    const yiBanSeal = info[8] || 0; // 一板平均封单
    const erBanSeal = info[9] || 0; // 二板平均封单
    const sanBanSeal = info[10] || 0; // 三板平均封单
    const comment = info[11] || '数据更新中'; // 涨停表现评语

    const totalZt = yiBan + erBan + sanBan + gaoBan;
    const avgSealRate = ((yiBanRate + erBanRate + sanBanRate + gaoBanRate) / 4).toFixed(2);

    // 判断市场情绪
    let emoji = '😐';
    let sentiment = '中性';
    if (avgSealRate >= 80 && gaoBan > 5) {
        emoji = '🔥';
        sentiment = '极强';
    } else if (avgSealRate >= 60) {
        emoji = '💪';
        sentiment = '偏强';
    } else if (avgSealRate >= 40) {
        emoji = '😐';
        sentiment = '中性';
    } else {
        emoji = '😟';
        sentiment = '偏弱';
    }

    const title = `${emoji} 涨停表现：${sentiment} (平均封板率${avgSealRate}%)`;

    const description = `
        <div style="padding: 15px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border-radius: 10px; margin-bottom: 10px;">
            <h2 style="margin: 0 0 10px 0; color: white;">🎯 涨停表现分析</h2>
            <div style="text-align: center; font-size: 20px; margin: 10px 0;">
                ${emoji} ${sentiment} | 平均封板率 ${avgSealRate}%
            </div>
            <div style="text-align: center; font-size: 16px; color: rgba(255,255,255,0.9);">
                ${comment}
            </div>
        </div>

        <div style="padding: 15px; background: #f8f9fa; border-radius: 5px; margin-bottom: 10px;">
            <h3 style="margin-top: 0; color: #333;">📊 连板分布 (共${totalZt}家)</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                <thead>
                    <tr style="background: #667eea; color: white;">
                        <th style="padding: 10px; text-align: left;">连板</th>
                        <th style="padding: 10px; text-align: center;">数量</th>
                        <th style="padding: 10px; text-align: center;">封板率</th>
                        <th style="padding: 10px; text-align: center;">平均封单</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="background: white;">
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">🔴 一板</td>
                        <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;"><strong>${yiBan}家</strong></td>
                        <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">${yiBanRate.toFixed(2)}%</td>
                        <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">${yiBanSeal.toFixed(2)}万手</td>
                    </tr>
                    <tr style="background: #f8f9fa;">
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">🟠 二板</td>
                        <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;"><strong>${erBan}家</strong></td>
                        <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">${erBanRate.toFixed(2)}%</td>
                        <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">${erBanSeal.toFixed(2)}万手</td>
                    </tr>
                    <tr style="background: white;">
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">🟡 三板</td>
                        <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;"><strong>${sanBan}家</strong></td>
                        <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">${sanBanRate.toFixed(2)}%</td>
                        <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">${sanBanSeal.toFixed(2)}万手</td>
                    </tr>
                    <tr style="background: #f8f9fa;">
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">🔥 高板(4+)</td>
                        <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;"><strong>${gaoBan}家</strong></td>
                        <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">${gaoBanRate.toFixed(2)}%</td>
                        <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">-</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div style="padding: 15px; background: #d4edda; border-left: 4px solid #28a745; border-radius: 5px;">
            <h4 style="margin-top: 0; color: #155724;">💡 数据说明</h4>
            <ul style="margin: 5px 0; padding-left: 20px; color: #155724;">
                <li><strong>封板率</strong>：当前封住涨停的股票占该连板总数的比例</li>
                <li><strong>平均封单</strong>：该连板涨停股的平均封单量（万手）</li>
                <li><strong>高板</strong>：4连板及以上的股票</li>
            </ul>
        </div>

        <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 5px;">
            <h4 style="margin-top: 0; color: #856404;">📈 市场情绪参考</h4>
            <ul style="margin: 5px 0; padding-left: 20px; color: #856404;">
                <li>🔥 极强：平均封板率>80% 且 高板>5家</li>
                <li>💪 偏强：平均封板率>60%</li>
                <li>😐 中性：平均封板率 40%-60%</li>
                <li>😟 偏弱：平均封板率<40%</li>
            </ul>
        </div>
    `;

    return {
        title: '开盘啦 - 涨停表现',
        link: 'https://www.longhuvip.com/',
        description: '实时涨停板连板分布和封板率统计',
        item: [
            {
                title,
                description,
                pubDate: parseDate(new Date()),
                link: 'https://www.longhuvip.com/',
                guid: `kaipanla:zt-expression:${Date.now()}`,
                author: '开盘啦',
            },
        ],
    };
}
