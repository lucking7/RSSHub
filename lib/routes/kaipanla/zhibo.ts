import { config } from '@/config';
import type { Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/dapanzhibo/:category?',
    name: '大盘直播',
    url: 'longhuvip.com',
    maintainers: [],
    handler,
    example: '/kaipanla/dapanzhibo',
    view: ViewType.Articles,
    parameters: {
        category: '可选筛选：板块名（如"人工智能"）、分析师名（如"Livermore"）、"个股"（含个股的直播）、"板块"（含板块的直播）',
    },
    description: '开盘啦大盘直播，AI+资深分析师实时解读市场，包含个股异动、板块轮动、大盘走势分析',
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

    const response = await cache.tryGet(
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

        // 1. 添加配图（如果有）
        if (item.Image && item.Image.trim() !== '') {
            description += `<p><img src="${item.Image}" referrerpolicy="no-referrer" /></p>`;
        }

        // 2. 主要内容
        description += `<p>${item.Comment}</p>`;

        // 3. 板块信息（下划线标题 + 中间点格式）
        if (item.PlateName && item.PlateName.trim() !== '') {
            const plateZdf = item.PlateZDF ? Number.parseFloat(item.PlateZDF) : null;
            const arrow = plateZdf !== null && plateZdf > 0 ? '↑' : plateZdf !== null && plateZdf < 0 ? '↓' : '-';
            const color = plateZdf !== null && plateZdf > 0 ? '#f5222d' : plateZdf !== null && plateZdf < 0 ? '#52c41a' : '#666';

            description += '<div style="background: #f5f5f5; border-left: 3px solid #1890ff; padding: 10px 15px; margin: 15px 0 10px 0; border-radius: 4px;">';
            description += '<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333; text-decoration: underline;">板块</h3>';
            description += `• <strong>${item.PlateName}</strong>`;
            if (plateZdf !== null && !Number.isNaN(plateZdf)) {
                description += `<br><span style="color: ${color}; font-weight: bold;">${arrow} ${plateZdf > 0 ? '+' : ''}${plateZdf.toFixed(2)}%</span>`;
            }
            if (item.PlateJE && item.PlateJE.trim() !== '') {
                description += ` <span style="color: #999;">成交额: ${item.PlateJE}</span>`;
            }
            description += '</div>';
        }

        // 4. 相关个股（下划线标题 + 中间点 + 股票名加粗）
        if (item.Stock && item.Stock.length > 0) {
            description += '<div style="background: #f5f5f5; border-left: 3px solid #52c41a; padding: 10px 15px; margin: 15px 0 10px 0; border-radius: 4px;">';
            description += '<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333; text-decoration: underline;">相关个股</h3>';

            for (const stock of item.Stock.slice(0, 15)) {
                const [code, name, change] = stock;
                const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '-';
                const color = change > 0 ? '#f5222d' : change < 0 ? '#52c41a' : '#666';
                description += `• <strong>${name}</strong> <span style="color: #999;">(${code})</span><br>`;
                description += `<span style="color: ${color}; font-weight: bold;">${arrow} ${change > 0 ? '+' : ''}${change}%</span><br>`;
            }

            if (item.Stock.length > 15) {
                description += `<span style="color: #999;">...还有${item.Stock.length - 15}只</span>`;
            }
            description += '</div>';
        }

        // 5. 解读内容（下划线标题）
        if (item.Interpretation && item.Interpretation.trim() !== '') {
            description += '<div style="background: #f5f5f5; border-left: 3px solid #722ed1; padding: 10px 15px; margin: 15px 0 10px 0; border-radius: 4px;">';
            description += '<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333; text-decoration: underline;">解读</h3>';
            description += `<p style="margin: 0;">${item.Interpretation}</p></div>`;
        }

        // 6. 爆发原因（下划线标题）
        if (item.BoomReason && item.BoomReason.trim() !== '') {
            description += '<div style="background: #f5f5f5; border-left: 3px solid #faad14; padding: 10px 15px; margin: 15px 0 10px 0; border-radius: 4px;">';
            description += '<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333; text-decoration: underline;">爆发原因</h3>';
            description += `<p style="margin: 0;">${item.BoomReason}</p></div>`;
        }

        // 构建分类信息：板块 + 相关个股
        const categories: string[] = [];

        if (item.PlateName) {
            categories.push(item.PlateName);
        }

        if (item.Stock && item.Stock.length > 0) {
            const stockCategories = item.Stock.slice(0, 10).map((stock) => {
                const [code, name] = stock;
                return `${name}(${code})`;
            });
            categories.push(...stockCategories);
        }

        return {
            title,
            description,
            pubDate: parseDate(item.Time * 1000),
            link: 'https://www.longhuvip.com/',
            guid: `kaipanla:zhibo:${item.ID}`,
            author: item.UserName || '开盘啦',
            category: categories,
        };
    });

    // 构建标题
    let feedTitle = '开盘啦 - 大盘直播';
    if (category === '个股') {
        feedTitle += ' - 个股异动';
    } else if (category === '板块') {
        feedTitle += ' - 板块直播';
    } else if (category !== '全部') {
        feedTitle += ` - ${category}`;
    }

    const feedDescription = '开盘啦大盘直播，AI+资深分析师实时解读市场动态、个股异动、板块轮动';

    return {
        title: feedTitle,
        link: 'https://www.longhuvip.com/',
        description: feedDescription,
        language: 'zh-cn',
        item: items,
    };
}
