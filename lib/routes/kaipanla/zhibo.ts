import { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { config } from '@/config';

export const route: Route = {
    path: '/dapanzhibo/:category?',
    name: '大盘直播',
    url: 'longhuvip.com',
    maintainers: [],
    handler,
    example: '/kaipanla/dapanzhibo',
    parameters: {
        category: '可选筛选：板块名（如"人工智能"）、分析师名（如"Livermore"）、"个股"（含个股的直播）、"板块"（含板块的直播）',
    },
    description: `
开盘啦大盘直播，AI+资深分析师实时解读市场，包含个股异动、板块轮动、大盘走势分析

**特点**:
- 🎯 实时直播（分钟级更新）
- 👥 多位资深分析师（Livermore等）
- 🤖 AI大模型自动生成
- 📊 关联个股和板块数据
- 🖼️ 部分直播含配图

**使用方法**:
- \`/kaipanla/dapanzhibo\` - 所有直播内容
- \`/kaipanla/dapanzhibo/人工智能\` - 人工智能板块直播
- \`/kaipanla/dapanzhibo/Livermore\` - Livermore分析师
- \`/kaipanla/dapanzhibo/个股\` - 包含个股的直播
    `,
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

async function handler(ctx) {
    const category = ctx.req.param('category') || '全部';
    const apiUrl = 'https://apphwhq.longhuvip.com/w1/api/index.php';

    const { data: response } = await cache.tryGet(
        'kaipanla:zhibo:classified',
        async () => {
            const { data } = await got(apiUrl, {
                searchParams: {
                    a: 'ZhiBoContent',
                    apiv: 'w42',
                    c: 'ConceptionPoint',
                    PhoneOSNew: '2',
                    VerSion: '5.21.0.3',
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

    let newsList = response.List || [];

    // 根据分类筛选
    if (category === '个股') {
        // 只显示包含个股的快讯
        newsList = newsList.filter((item) => item.Stock && item.Stock.length > 0);
    } else if (category === '板块') {
        // 只显示有板块信息的快讯
        newsList = newsList.filter((item) => item.PlateName && item.PlateName.trim() !== '');
    } else if (category !== '全部') {
        // 按板块名称或发布者筛选
        newsList = newsList.filter((item) => item.PlateName === category || item.UserName === category);
    }

    // 统计分类信息
    const stats = {
        plates: new Set(),
        authors: new Set(),
        stockCount: 0,
    };

    for (const item of response.List || []) {
        if (item.PlateName) {
            stats.plates.add(item.PlateName);
        }
        if (item.UserName) {
            stats.authors.add(item.UserName);
        }
        if (item.Stock && item.Stock.length > 0) {
            stats.stockCount++;
        }
    }

    const items = newsList.map((item) => {
        // 标题：优先使用Comment前50字，如果太短则用完整内容
        const title = item.Comment.length > 50 ? item.Comment.slice(0, 50) + '...' : item.Comment;

        // 构建描述内容
        let description = '';

        // 1. 添加配图（如果有）- 充分利用Image字段
        if (item.Image && item.Image.trim() !== '') {
            description += `<div style="margin-bottom: 15px;"><img src="${item.Image}" style="max-width: 100%; border-radius: 8px;"/></div>`;
        }

        // 2. 主要内容
        description += `<div style="padding: 15px; background: #f8f9fa; border-left: 4px solid #667eea; border-radius: 5px; margin-bottom: 10px;">`;
        description += `<p style="margin: 0; line-height: 1.8; font-size: 15px;">${item.Comment}</p>`;
        description += `</div>`;

        // 3. 板块信息（充分利用PlateZDF字段）
        if (item.PlateName && item.PlateName.trim() !== '') {
            const plateZdf = item.PlateZDF ? Number.parseFloat(item.PlateZDF) : null;
            const plateColor = plateZdf !== null && plateZdf > 0 ? '#ff4d4f' : plateZdf !== null && plateZdf < 0 ? '#52c41a' : '#666';

            description += `<div style="margin-bottom: 10px;">`;
            description += `<strong>📂 板块：</strong>`;
            description += `<span style="background: #667eea; color: white; padding: 3px 10px; border-radius: 4px; margin: 0 5px;">${item.PlateName}</span>`;

            if (plateZdf !== null && !Number.isNaN(plateZdf)) {
                description += `<span style="color: ${plateColor}; font-weight: bold; font-size: 16px;">`;
                description += `${plateZdf > 0 ? '+' : ''}${plateZdf.toFixed(2)}%`;
                description += `</span>`;
            }

            if (item.PlateJE && item.PlateJE.trim() !== '') {
                description += `<span style="color: #999; margin-left: 10px;">成交额: ${item.PlateJE}</span>`;
            }
            description += `</div>`;
        }

        // 4. 相关个股（优化显示，最多显示前15只）
        if (item.Stock && item.Stock.length > 0) {
            description += `<div style="background: white; padding: 12px; border-radius: 5px; margin-bottom: 10px;">`;
            description += `<strong>📊 相关个股 (${item.Stock.length}只)：</strong>`;
            description += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; margin-top: 8px;">`;

            for (const stock of item.Stock.slice(0, 15)) {
                const [code, name, change] = stock;
                const emoji = change > 0 ? '🔴' : change < 0 ? '🟢' : '⚪';
                const color = change > 0 ? '#ff4d4f' : change < 0 ? '#52c41a' : '#666';

                description += `<div style="padding: 6px 10px; background: #f5f5f5; border-radius: 4px; font-size: 13px;">`;
                description += `${emoji} <strong>${name}</strong> (${code})<br>`;
                description += `<span style="color: ${color}; font-weight: bold;">${change > 0 ? '+' : ''}${change}%</span>`;
                description += `</div>`;
            }

            if (item.Stock.length > 15) {
                description += `<div style="padding: 6px 10px; color: #999;">...还有${item.Stock.length - 15}只</div>`;
            }

            description += `</div></div>`;
        }

        // 5. 解读内容（充分利用Interpretation字段）
        if (item.Interpretation && item.Interpretation.trim() !== '') {
            description += `<div style="background: #e6f7ff; border-left: 4px solid #1890ff; padding: 12px; border-radius: 5px; margin-bottom: 10px;">`;
            description += `<strong>💡 解读：</strong>`;
            description += `<p style="margin: 5px 0 0 0;">${item.Interpretation}</p>`;
            description += `</div>`;
        }

        // 6. 爆发原因（充分利用BoomReason字段）
        if (item.BoomReason && item.BoomReason.trim() !== '') {
            description += `<div style="background: #fff7e6; border-left: 4px solid #faad14; padding: 12px; border-radius: 5px; margin-bottom: 10px;">`;
            description += `<strong>🔥 爆发原因：</strong>`;
            description += `<p style="margin: 5px 0 0 0;">${item.BoomReason}</p>`;
            description += `</div>`;
        }

        // 7. 发布者信息（优化显示）
        if (item.UserName) {
            const authorInfo = {
                Livermore: { color: '#ff6b6b', title: '资深分析师' },
                xmm: { color: '#4ecdc4', title: 'AI智能分析' },
                xqm: { color: '#45b7d1', title: '市场分析师' },
            };
            const info = authorInfo[item.UserName] || { color: '#95a5a6', title: '分析师' };

            description += `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e8e8e8;">`;
            description += `<small style="color: #666;">👤 `;
            description += `<span style="color: ${info.color}; font-weight: bold;">${item.UserName}</span>`;
            description += ` · <span style="color: #999;">${info.title}</span>`;
            description += `</small></div>`;
        }

        return {
            title,
            description,
            pubDate: parseDate(item.Time * 1000),
            link: 'https://www.longhuvip.com/',
            guid: `kaipanla:zhibo:${item.ID}`,
            author: item.UserName || '开盘啦',
            category: item.PlateName ? [item.PlateName] : [],
            image: item.Image && item.Image.trim() !== '' ? item.Image : undefined,
        };
    });

    // 构建标题
    let feedTitle = '开盘啦 - 大盘直播';
    if (category === '个股') {
        feedTitle += ' (个股异动)';
    } else if (category === '板块') {
        feedTitle += ' (板块直播)';
    } else if (category !== '全部') {
        feedTitle += ` (${category})`;
    }

    // 构建描述
    let feedDescription = `开盘啦大盘直播，AI+资深分析师实时解读市场动态、个股异动、板块轮动。`;
    if (category !== '全部') {
        feedDescription += `<br><strong>当前筛选：${category}</strong>`;
    }
    feedDescription += `<br><br>📊 <strong>直播统计</strong>：`;
    feedDescription += `<br>• 涉及板块：${stats.plates.size}个`;
    if (stats.plates.size > 0) {
        feedDescription += ` (${Array.from(stats.plates).slice(0, 5).join('、')}${stats.plates.size > 5 ? '...' : ''})`;
    }
    feedDescription += `<br>• 分析师：${stats.authors.size}位 (${Array.from(stats.authors).join('、')})`;
    feedDescription += `<br>• 关联个股：${stats.stockCount}条直播 (${((stats.stockCount / (response.List?.length || 1)) * 100).toFixed(1)}%)`;

    return {
        title: feedTitle,
        link: 'https://www.longhuvip.com/',
        description: feedDescription,
        item: items,
    };
}
