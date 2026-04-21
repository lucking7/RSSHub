import { config } from '@/config';
import type { Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/zt',
    name: '涨停表现',
    url: 'longhuvip.com',
    maintainers: [],
    handler,
    example: '/kaipanla/zt',
    view: ViewType.Articles,
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
        'kaipanla:zt-expression:v3',
        async () => {
            const { data } = await got(apiUrl, {
                searchParams: {
                    a: 'ZhangTingExpression',
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

    const info = response.info || [];

    // 解析数据
    const yiBan = info[0] || 0;
    const erBan = info[1] || 0;
    const sanBan = info[2] || 0;
    const gaoBan = info[3] || 0;
    const yiBanRate = info[4] || 0;
    const erBanRate = info[5] || 0;
    const sanBanRate = info[6] || 0;
    const gaoBanRate = info[7] || 0;
    const yiBanSeal = info[8] || 0;
    const erBanSeal = info[9] || 0;
    const sanBanSeal = info[10] || 0;
    const comment = info[11] || '数据更新中';

    const totalZt = yiBan + erBan + sanBan + gaoBan;
    const avgSealRate = ((yiBanRate + erBanRate + sanBanRate + gaoBanRate) / 4).toFixed(2);

    // 判断市场情绪
    let sentiment = '中性';
    if (Number(avgSealRate) >= 80 && gaoBan > 5) {
        sentiment = '极强';
    } else if (Number(avgSealRate) >= 60) {
        sentiment = '偏强';
    } else if (Number(avgSealRate) >= 40) {
        sentiment = '中性';
    } else {
        sentiment = '偏弱';
    }

    const title = `涨停表现：${sentiment} (平均封板率${avgSealRate}%)`;

    // 构建 sina 风格的 description
    let description = '';

    // 涨停表现分析（下划线标题）
    description += '<div style="background: #f5f5f5; border-left: 3px solid #1890ff; padding: 10px 15px; margin: 0 0 15px 0; border-radius: 4px;">';
    description += '<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333; text-decoration: underline;">涨停表现分析</h3>';
    description += `• <strong>${sentiment}</strong> | 平均封板率 ${avgSealRate}%<br>`;
    description += `<p style="margin: 10px 0 0 0; line-height: 1.6;">${comment}</p>`;
    description += '</div>';

    // 连板分布（下划线标题 + 表格）
    description += '<div style="background: #f5f5f5; border-left: 3px solid #52c41a; padding: 10px 15px; margin: 0 0 15px 0; border-radius: 4px;">';
    description += `<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333; text-decoration: underline;">连板分布 (共${totalZt}家)</h3>`;
    description += '<table style="width: 100%; border-collapse: collapse;">';
    description += '<thead><tr style="background: #e8e8e8;">';
    description += '<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">连板</th>';
    description += '<th style="padding: 8px; text-align: center; border: 1px solid #ddd;">数量</th>';
    description += '<th style="padding: 8px; text-align: center; border: 1px solid #ddd;">封板率</th>';
    description += '<th style="padding: 8px; text-align: center; border: 1px solid #ddd;">平均封单</th>';
    description += '</tr></thead><tbody>';
    description += '<tr><td style="padding: 8px; border: 1px solid #ddd;">一板</td>';
    description += `<td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${yiBan}家</td>`;
    description += `<td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${yiBanRate.toFixed(2)}%</td>`;
    description += `<td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${yiBanSeal.toFixed(2)}万手</td></tr>`;
    description += '<tr><td style="padding: 8px; border: 1px solid #ddd;">二板</td>';
    description += `<td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${erBan}家</td>`;
    description += `<td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${erBanRate.toFixed(2)}%</td>`;
    description += `<td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${erBanSeal.toFixed(2)}万手</td></tr>`;
    description += '<tr><td style="padding: 8px; border: 1px solid #ddd;">三板</td>';
    description += `<td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${sanBan}家</td>`;
    description += `<td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${sanBanRate.toFixed(2)}%</td>`;
    description += `<td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${sanBanSeal.toFixed(2)}万手</td></tr>`;
    description += '<tr><td style="padding: 8px; border: 1px solid #ddd;">高板(4+)</td>';
    description += `<td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${gaoBan}家</td>`;
    description += `<td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${gaoBanRate.toFixed(2)}%</td>`;
    description += '<td style="padding: 8px; text-align: center; border: 1px solid #ddd;">-</td></tr>';
    description += '</tbody></table></div>';

    // 数据说明（下划线标题）
    description += '<div style="background: #f5f5f5; border-left: 3px solid #722ed1; padding: 10px 15px; margin: 0 0 15px 0; border-radius: 4px;">';
    description += '<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333; text-decoration: underline;">数据说明</h3>';
    description += '• <strong>封板率</strong>：当前封住涨停的股票占该连板总数的比例<br>';
    description += '• <strong>平均封单</strong>：该连板涨停股的平均封单量（万手）<br>';
    description += '• <strong>高板</strong>：4连板及以上的股票';
    description += '</div>';

    // 市场情绪参考（下划线标题）
    description += '<div style="background: #f5f5f5; border-left: 3px solid #faad14; padding: 10px 15px; margin: 0; border-radius: 4px;">';
    description += '<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333; text-decoration: underline;">市场情绪参考</h3>';
    description += '• <strong>极强</strong>：平均封板率>80% 且 高板>5家<br>';
    description += '• <strong>偏强</strong>：平均封板率>60%<br>';
    description += '• <strong>中性</strong>：平均封板率 40%-60%<br>';
    description += '• <strong>偏弱</strong>：平均封板率&lt;40%';
    description += '</div>';

    return {
        title: '开盘啦 - 涨停表现',
        link: 'https://www.longhuvip.com/',
        description: '实时涨停板连板分布和封板率统计',
        language: 'zh-cn',
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
