import { Route, ViewType } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

export const route: Route = {
    path: '/quotes/:market?',
    categories: ['finance'],
    view: ViewType.Articles,
    example: '/eastmoney/quotes/asia',
    parameters: {
        market: '市场分类，可选，默认为亚洲市场',
    },
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
            source: ['kuaixun.eastmoney.com/', 'quote.eastmoney.com/'],
        },
    ],
    name: '全球股市行情',
    maintainers: [''],
    handler,
    description: `获取东方财富全球股市实时行情数据。

支持市场分类：
- \`asia\` - 亚洲市场（上证、深证、恒指、日经等）
- \`us\` - 美洲市场（道指、纳指、标普等）
- \`europe\` - 欧洲市场（富时、德指、法指等）
- \`futures\` - 全球期货指数
- \`commodity\` - 国内商品期货
- \`forex\` - 主要外汇
- \`forex_cny\` - 人民币汇率

示例：
- \`/eastmoney/quotes/asia\` - 亚洲股市
- \`/eastmoney/quotes/us\` - 美国股市
- \`/eastmoney/quotes/futures\` - 期货指数`,
};

// 市场代码配置
const MARKET_CONFIGS = {
    asia: {
        name: '亚洲股市',
        codes: 'i:1.000001,i:0.399001,i:1.000300,i:0.399006,i:100.HSI,i:100.HSCEI,i:124.HSCCI,i:100.N225,i:100.KS11,i:100.STI,i:100.TWII',
        description: '亚洲主要股指实时行情',
    },
    us: {
        name: '美洲股市',
        codes: 'i:100.DJIA,i:100.SPX,i:100.NDX,i:100.TSX,i:100.MXX,i:100.BVSP',
        description: '美洲主要股指实时行情',
    },
    europe: {
        name: '欧洲股市',
        codes: 'i:100.FTSE,i:100.GDAXI,i:100.FCHI,i:100.MIB,i:100.IBEX,i:100.AEX,i:100.SSMI',
        description: '欧洲主要股指实时行情',
    },
    futures: {
        name: '全球期货指数',
        codes: 'i:104.CN00Y,i:103.YM00Y,i:103.ES00Y,i:103.NQ00Y,i:220.IFM',
        description: '全球主要期货指数',
    },
    commodity: {
        name: '国内商品期货',
        codes: 'i:142.scm,i:114.jmm,i:113.agm,i:113.alm,i:113.pbm,i:113.rbm,i:114.mm',
        description: '国内商品期货主力合约',
    },
    forex: {
        name: '主要外汇',
        codes: 'i:119.EURUSD,i:119.USDJPY,i:119.GBPUSD,i:119.AUDUSD',
        description: '全球主要外汇汇率',
    },
    forex_cny: {
        name: '人民币汇率',
        codes: 'i:120.CNYRUBC,i:120.HKDCNYC,i:120.CHFCNYC,i:120.SGDCNYC',
        description: '人民币对主要货币汇率',
    },
};

async function handler(ctx) {
    const market = ctx.req.param('market') ?? 'asia';
    const config = MARKET_CONFIGS[market] || MARKET_CONFIGS.asia;

    const apiUrl = 'https://push2.eastmoney.com/api/qt/clist/get';

    const response = await got({
        method: 'get',
        url: apiUrl,
        searchParams: {
            pn: 1,
            pz: 50,
            po: 1,
            np: 1,
            fltt: 2,
            invt: 2,
            fs: config.codes,
            fields: 'f1,f2,f3,f4,f5,f6,f7,f12,f13,f14,f15,f16,f17,f18,f107,f152',
            ut: '13697a1cc677c8bfa9a496437bfef419',
            cb: 'callback',
        },
        headers: {
            Referer: 'https://kuaixun.eastmoney.com/',
        },
    });

    let data = response.data;

    // 解析JSONP格式
    if (typeof data === 'string') {
        const match = data.match(/callback\((.*)\)/);
        if (match) {
            data = JSON.parse(match[1]);
        }
    }

    const list = data?.data?.diff || [];

    // 交易状态映射
    const statusMap = {
        1: '🟢 交易中',
        3: '🟡 休市',
        5: '🔴 已收盘',
    };

    const items = list.map((item) => {
        const code = item.f12; // 代码
        const name = item.f14; // 名称
        const price = item.f2; // 最新价
        const changePercent = item.f3; // 涨跌幅
        const changeAmount = item.f4; // 涨跌额
        const volume = item.f5; // 成交量
        const amount = item.f6; // 成交额
        const turnover = item.f7; // 换手率
        const open = item.f17; // 开盘价
        const high = item.f15; // 最高价
        const low = item.f16; // 最低价
        const preClose = item.f18; // 昨收
        const status = item.f107; // 交易状态
        const decimal = item.f1; // 小数位
        const marketCode = item.f13; // 市场代码

        // 格式化数字
        const formatNum = (num, precision = decimal || 2) => {
            if (num === null || num === undefined || num === '-') {return '-';}
            return Number(num).toFixed(precision);
        };

        // 格式化金额
        const formatAmount = (amt) => {
            if (!amt || amt === '-') {return '-';}
            const num = Number(amt);
            if (num >= 1e12) {return `${(num / 1e12).toFixed(2)}万亿`;}
            if (num >= 1e8) {return `${(num / 1e8).toFixed(2)}亿`;}
            if (num >= 1e4) {return `${(num / 1e4).toFixed(2)}万`;}
            return num.toFixed(2);
        };

        // 涨跌颜色
        const isUp = changeAmount > 0;
        const isDown = changeAmount < 0;
        const colorStyle = isUp ? 'color: #ff4d4f;' : (isDown ? 'color: #52c41a;' : 'color: #666;');

        // 构建标题
        const arrow = isUp ? '📈' : (isDown ? '📉' : '➡️');
        const title = `${arrow} ${name}(${code}) ${formatNum(price)} ${isUp ? '+' : ''}${formatNum(changePercent)}%`;

        // 构建详细描述
        const description = `
<div style="font-family: Arial, sans-serif; padding: 15px; background: #f5f5f5; border-radius: 8px;">
    <div style="margin-bottom: 15px;">
        <h3 style="margin: 0 0 10px 0; color: #333;">${name} (${code})</h3>
        <div style="font-size: 12px; color: #999;">${statusMap[status] || '未知状态'} | 市场代码: ${marketCode}</div>
    </div>

    <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 4px;">
        <tr style="background: #fafafa;">
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>最新价</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; ${colorStyle} font-weight: bold; font-size: 18px;">
                ${formatNum(price)}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>涨跌幅</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; ${colorStyle} font-weight: bold;">
                ${isUp ? '+' : ''}${formatNum(changePercent)}%
            </td>
        </tr>
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>涨跌额</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; ${colorStyle}">
                ${isUp ? '+' : ''}${formatNum(changeAmount)}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>昨收</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                ${formatNum(preClose)}
            </td>
        </tr>
        <tr style="background: #fafafa;">
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>开盘</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${formatNum(open)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>最高</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${formatNum(high)}</td>
        </tr>
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>最低</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${formatNum(low)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>换手率</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${formatNum(turnover)}%</td>
        </tr>
        <tr style="background: #fafafa;">
            <td style="padding: 10px;"><strong>成交量</strong></td>
            <td style="padding: 10px;">${formatAmount(volume)}</td>
            <td style="padding: 10px;"><strong>成交额</strong></td>
            <td style="padding: 10px;">${formatAmount(amount)}</td>
        </tr>
    </table>

    <div style="margin-top: 15px; padding: 10px; background: #e6f7ff; border-left: 3px solid #1890ff; font-size: 12px;">
        💡 查看详情: <a href="https://quote.eastmoney.com/unify/r/${marketCode}.${code}" target="_blank">https://quote.eastmoney.com/unify/r/${marketCode}.${code}</a>
    </div>
</div>
`;

        const link = `https://quote.eastmoney.com/unify/r/${marketCode}.${code}`;
        const pubDate = timezone(parseDate(new Date()), +8);

        return {
            title,
            description,
            link,
            pubDate,
            category: [config.name, statusMap[status] || '未知'],
            guid: `${marketCode}.${code}`,
            author: '东方财富网',
        };
    });

    return {
        title: `东方财富 - ${config.name}行情`,
        link: 'https://quote.eastmoney.com/',
        item: items,
        description: config.description,
    };
}
