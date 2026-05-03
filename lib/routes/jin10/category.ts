import { config } from '@/config';
import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

import { applySourceImportance } from '../_finance/source-importance';
import { isJin10AdFeedItem, isJin10PromotionalItem } from './filters';
import { renderDescription } from './templates/description';
import { buildFlashLink } from './utils';

const JIN10_API_BASE = 'https://4a735ea38f8146198dc205d2e2d1bd28.z3c.jin10.com';
const JIN10_API_HEADERS = {
    'x-app-id': 'bVBF4FyRTn5NJF5n',
    'x-version': '1.0',
};

type ClassifyNode = { id: number; name: string; child?: ClassifyNode[] };

const fetchClassifyTree = async (): Promise<ClassifyNode[]> =>
    (await cache.tryGet(
        'jin10:classify:tree',
        async () => {
            const { data: response } = await got(`${JIN10_API_BASE}/classify`, {
                headers: JIN10_API_HEADERS,
            });
            return response.data as ClassifyNode[];
        },
        config.cache.contentExpire,
        false
    )) as ClassifyNode[];

const findClassifyName = (tree: ClassifyNode[], id: number): string | undefined => {
    for (const top of tree) {
        if (top.id === id) {
            return top.name;
        }
        for (const child of top.child ?? []) {
            if (child.id === id) {
                return `${top.name}/${child.name}`;
            }
        }
    }
};

export const route: Route = {
    path: '/category/:id',
    categories: ['finance'],
    view: ViewType.Notifications,
    example: '/jin10/category/36',
    parameters: { id: '分类 id' },
    description: `获取金十数据指定分类的实时快讯。

分类 id 来自 [分类树接口](https://4a735ea38f8146198dc205d2e2d1bd28.z3c.jin10.com/classify)，路由会在运行时动态拉取并校验，id 不存在会报错。

常用一级分类：

| 分类     | id  | 分类     | id  |
|----------|-----|----------|-----|
| 贵金属   | 1   | 美股     | 27  |
| 石油     | 6   | 港股     | 28  |
| 外汇     | 12  | A股      | 29  |
| 期货     | 36  | 基金     | 30  |
| 科技     | 22  | 投行机构 | 31  |
| 地缘局势 | 24  | 债券     | 33  |
| 人物     | 25  | 政策     | 34  |
| 央行     | 26  | 经济数据 | 35  |
| 公司     | 37  | 灾害事故 | 38  |

子分类（黄金=2、WTI原油=7、美联储=53、特斯拉=86 等）从接口实时查询。`,
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
            target: '',
        },
    ],
    name: '分类快讯',
    maintainers: ['laampui'],
    handler,
    url: 'jin10.com/',
};

async function handler(ctx) {
    const idParam = ctx.req.param('id');
    const id = Number.parseInt(idParam, 10);
    if (!Number.isFinite(id)) {
        throw new InvalidParameterError(`分类 id 必须为数字，收到: ${idParam}`);
    }

    const tree = await fetchClassifyTree();
    const classifyName = findClassifyName(tree, id);
    if (!classifyName) {
        throw new InvalidParameterError(`分类 id ${id} 不存在，可访问 ${JIN10_API_BASE}/classify 查看当前分类树`);
    }

    const data = await cache.tryGet(
        `jin10:category:${id}`,
        async () => {
            const { data: response } = await got(`${JIN10_API_BASE}/flash`, {
                headers: JIN10_API_HEADERS,
                searchParams: {
                    channel: '-8200',
                    vip: '1',
                    classify: `[${id}]`,
                },
            });
            return response.data.filter((item) => !isJin10PromotionalItem(item));
        },
        config.cache.routeExpire,
        false
    );

    const item = data
        .map((item) => {
            const content = item.data?.content ?? '';
            const titleMatch = content.match(/^【([^】]+)】/s);
            let title;
            let body = content;
            if (titleMatch) {
                title = titleMatch[1];
                body = content.replace(titleMatch[0], '');
            } else {
                const fallback = item.data?.vip_title || content;
                title = fallback.length > 80 ? fallback.slice(0, 80) + '…' : fallback;
            }

            return applySourceImportance(
                {
                    title,
                    description: renderDescription(body, item.data?.pic),
                    pubDate: timezone(parseDate(item.time), 8),
                    link: buildFlashLink(item),
                    guid: `jin10:category:${item.id}`,
                },
                [
                    {
                        source: 'jin10',
                        field: 'important',
                        value: item.important,
                        label: '重要',
                        normalized: item.important === 1 ? 'important' : 'normal',
                    },
                ]
            );
        })
        .filter((item) => !isJin10AdFeedItem(item));

    return {
        title: `金十数据 - ${classifyName}`,
        link: 'https://www.jin10.com/',
        item,
    };
}
