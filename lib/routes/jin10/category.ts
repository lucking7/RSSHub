import { Route, ViewType } from '@/types';

import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';
import { art } from '@/utils/render';
import path from 'node:path';
import { config } from '@/config';

export const route: Route = {
    path: '/category/:id/:filter?',
    categories: ['finance'],
    view: ViewType.Notifications,
    example: '/jin10/category/36',
    parameters: {
        id: '分类id，见下表',
        filter: '广告过滤控制。默认过滤广告，填写 `all` 显示全部内容（包含广告），留空则过滤广告',
    },
    description: `
:::tip
**默认过滤广告**，提供纯净的快讯订阅体验。

使用方法：
- \`/jin10/category/36\` - 过滤广告（默认，推荐）⭐
- \`/jin10/category/36/all\` - 显示全部内容（包含广告）

过滤规则（默认启用）：
1. 过滤VIP锁定内容（如"VIP专享快讯，解锁直达"）
2. 过滤推广文章（type=2，通常包含"点击查看..."）
3. 过滤包含诱导点击的内容

如需查看所有内容（包含广告），请使用 \`all\` 参数。
:::

## 分类列表


| Name           | ID   |
|----------------|------|
| 贵金属         | 1    |
| 黄金           | 2    |
| 白银           | 3    |
| 钯金           | 4    |
| 铂金           | 5    |
| 石油           | 6    |
| WTI原油        | 7    |
| 布伦特原油     | 8    |
| 欧佩克         | 9    |
| 页岩气         | 10   |
| 原油市场报告   | 11   |
| 外汇           | 12   |
| 欧元           | 13   |
| 英镑           | 14   |
| 日元           | 15   |
| 美元           | 16   |
| 瑞郎           | 17   |
| 人民币         | 18   |
| 期货           | 36   |
| 油脂油料       | 145  |
| 钢矿           | 146  |
| 煤炭           | 147  |
| 化工           | 148  |
| 有色           | 149  |
| 谷物           | 150  |
| 糖棉果蛋       | 151  |
| 生猪           | 152  |
| 碳排放         | 154  |
| 数字货币       | 19   |
| 数字人民币     | 107  |
| 科技           | 22   |
| 手机           | 23   |
| 电动汽车       | 39   |
| 芯片           | 40   |
| 中国突破       | 41   |
| 5G             | 42   |
| 量子计算       | 43   |
| 航空航天       | 158  |
| 元宇宙         | 165  |
| 人工智能       | 168  |
| 地缘局势       | 24   |
| 缅甸局势       | 44   |
| 印巴纷争       | 45   |
| 中东风云       | 46   |
| 阿富汗局势     | 155  |
| 俄乌冲突       | 167  |
| 人物           | 25   |
| 鲍威尔         | 47   |
| 马斯克         | 48   |
| 拉加德         | 49   |
| 特朗普         | 50   |
| 拜登           | 51   |
| 巴菲特         | 157  |
| 央行           | 26   |
| 美联储         | 53   |
| 中国央行       | 54   |
| 欧洲央行       | 55   |
| 日本央行       | 56   |
| 货币政策调整   | 137  |
| 英国央行       | 141  |
| 澳洲联储       | 159  |
| 新西兰联储     | 160  |
| 加拿大央行     | 161  |
| 美股           | 27   |
| 财报           | 59   |
| Reddit散户动态 | 60   |
| 个股动态       | 108  |
| 港股           | 28   |
| 美股回港       | 61   |
| 交易所动态     | 62   |
| 指数动态       | 63   |
| 个股动态       | 109  |
| A股            | 29   |
| 美股回A        | 64   |
| 券商分析       | 65   |
| 板块异动       | 66   |
| 大盘动态       | 67   |
| 南北资金       | 68   |
| 亚盘动态       | 69   |
| IPO信息        | 70   |
| 个股动态       | 110  |
| 北交所         | 166  |
| 基金           | 30   |
| 投行机构       | 31   |
| 标普、惠誉、穆迪 | 71  |
| 美银           | 72   |
| 高盛           | 112  |
| 疫情           | 32   |
| 疫苗动态       | 73   |
| 确诊数据       | 74   |
| 新冠药物       | 113  |
| 债券           | 33   |
| 政策           | 34   |
| 中国           | 75   |
| 美国           | 76   |
| 欧盟           | 77   |
| 日本           | 78   |
| 贸易、关税     | 79   |
| 碳中和         | 80   |
| 中国香港       | 81   |
| 英国           | 120  |
| 房地产动态     | 156  |
| 经济数据       | 35   |
| 中国           | 82   |
| 美国           | 83   |
| 欧盟           | 84   |
| 日本           | 85   |
| 公司           | 37   |
| 特斯拉         | 86   |
| 苹果           | 90   |
| 独角兽         | 91   |
| 谷歌           | 92   |
| 华为           | 93   |
| 阿里巴巴       | 94   |
| 小米           | 95   |
| 字节跳动       | 116  |
| 腾讯           | 117  |
| 微软           | 118  |
| 百度           | 119  |
| 美团           | 162  |
| 滴滴           | 163  |
| 中国恒大       | 164  |
| 灾害事故       | 38   |
| 地震           | 96   |
| 爆炸           | 97   |
| 海啸           | 98   |
| 寒潮           | 99   |
| 洪涝           | 100  |
| 火灾           | 101  |
| 矿难           | 102  |
| 枪击案         | 103  |
`,
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
    name: '外汇',
    maintainers: ['laampui'],
    handler,
    url: 'jin10.com/',
};

async function handler(ctx) {
    const { id, filter = '' } = ctx.req.param();
    // 默认开启过滤，只有明确指定 'all' 才显示全部（包含广告）
    const enableFilter = filter !== 'all';

    const data = await cache.tryGet(
        `jin10:category:${id}`,
        async () => {
            const { data: response } = await got('https://4a735ea38f8146198dc205d2e2d1bd28.z3c.jin10.com/flash', {
                headers: {
                    'x-app-id': 'bVBF4FyRTn5NJF5n',
                    'x-version': '1.0',
                    'handleerror': 'true',
                },
                searchParams: {
                    channel: '-8200',
                    vip: '1',
                    classify: `[${id}]`,
                },
            });
            return response.data.filter((item) => item.type !== 1);
        },
        config.cache.routeExpire,
        false
    );

    // 过滤广告函数
    const filterAds = (item) => {
        // 1. 过滤VIP锁定内容（lock=true）
        if (item.data.lock === true) {
            return false;
        }

        // 2. 过滤推广文章（type=2）
        if (item.type === 2) {
            return false;
        }

        // 3. 过滤包含"点击查看..."的诱导内容
        const content = item.data.content || '';
        if (content.includes('点击查看...')) {
            return false;
        }

        // 4. 过滤VIP专享内容（通过remark判断）
        if (item.remark && item.remark.length > 0) {
            const hasVipRemark = item.remark.some((r) => r.lock === true || r.content?.includes('VIP用户'));
            if (hasVipRemark) {
                return false;
            }
        }

        return true;
    };

    // 应用过滤
    const filteredData = enableFilter ? data.filter(filterAds) : data;

    const item = filteredData.map((item) => {
        const titleMatch = item.data.content.match(/^【(.*?)】/);
        let title;
        let content = item.data.content;
        if (titleMatch) {
            title = titleMatch[1];
            content = content.replace(titleMatch[0], '');
        } else {
            title = item.data.vip_title || item.data.content;
        }

        return {
            title,
            description: art(path.join(__dirname, 'templates/description.art'), {
                content,
                pic: item.data.pic,
            }),
            pubDate: timezone(parseDate(item.time), 8),
            guid: `jin10:category:${item.id}`,
        };
    });

    return {
        title: enableFilter ? '金十数据' : '金十数据（含广告）',
        link: 'https://www.jin10.com/',
        item,
    };
}
