import { Route, ViewType } from '@/types';

import cache from '@/utils/cache';
import got from '@/utils/got';
import { config } from '@/config';

export const route: Route = {
    path: '/categories',
    categories: ['finance'],
    view: ViewType.Articles,
    example: '/jin10/categories',
    parameters: {},
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
            source: ['jin10.com/'],
            target: '/categories',
        },
    ],
    name: '分类列表',
    maintainers: ['laampui'],
    handler,
    description: '获取金十数据所有可用的分类和子分类列表，用于查看可用的分类ID',
    url: 'jin10.com/',
};

async function handler() {
    const data = await cache.tryGet(
        'jin10:categories',
        async () => {
            const { data: response } = await got('https://4a735ea38f8146198dc205d2e2d1bd28.z3c.jin10.com/classify', {
                headers: {
                    'x-app-id': 'bVBF4FyRTn5NJF5n',
                    'x-version': '1.0',
                    'handleerror': 'true',
                },
            });
            return response.data;
        },
        config.cache.routeExpire,
        false
    );

    const items: any[] = [];

    // 遍历所有分类
    for (const category of data) {
        // 添加父分类
        items.push({
            title: `📁 ${category.name}`,
            description: `
                <h3>分类ID: ${category.id}</h3>
                <p><strong>是否新增:</strong> ${category.isNew ? '✅ 是' : '❌ 否'}</p>
                <p><strong>子分类数量:</strong> ${category.child?.length || 0} 个</p>
                ${
                    category.child && category.child.length > 0
                        ? `
                <h4>子分类列表:</h4>
                <ul>
                    ${category.child
                        .map(
                            (child) => `
                        <li><strong>${child.name}</strong> (ID: ${child.id})${child.isNew ? ' <span style="color: red;">🆕 新增</span>' : ''}</li>
                    `
                        )
                        .join('')}
                </ul>
                `
                        : '<p>无子分类</p>'
                }
                <hr>
                <p><strong>使用方法:</strong></p>
                <p>访问 <code>/jin10/category/${category.id}</code> 可获取该分类的快讯</p>
                ${
                    category.child && category.child.length > 0
                        ? `<p>或访问子分类，例如: <code>/jin10/category/${category.child[0].id}</code></p>`
                        : ''
                }
            `,
            link: `https://www.jin10.com/`,
            guid: `jin10:category:info:${category.id}`,
            category: [category.name],
        });

        // 添加所有子分类
        if (category.child && category.child.length > 0) {
            for (const child of category.child) {
                items.push({
                    title: `　└─ ${child.name}`,
                    description: `
                        <h4>${category.name} > ${child.name}</h4>
                        <p><strong>分类ID:</strong> ${child.id}</p>
                        <p><strong>父分类:</strong> ${category.name} (ID: ${category.id})</p>
                        <p><strong>是否新增:</strong> ${child.isNew ? '✅ 是' : '❌ 否'}</p>
                        <hr>
                        <p><strong>使用方法:</strong></p>
                        <p>访问 <code>/jin10/category/${child.id}</code> 可获取该分类的快讯</p>
                    `,
                    link: `https://www.jin10.com/`,
                    guid: `jin10:category:info:${child.id}`,
                    category: [category.name, child.name],
                });
            }
        }
    }

    return {
        title: '金十数据 - 分类列表',
        link: 'https://www.jin10.com/',
        description: '金十数据所有可用的分类和子分类，包含分类ID和使用方法',
        item: items,
    };
}

