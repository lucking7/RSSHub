import CryptoJS from 'crypto-js';

import type { SourceImportanceSignal } from '../_finance/source-importance';
import type { StockItem } from '../_finance/stock-card';

const rootUrl = 'https://www.cls.cn';

const params = {
    app: 'CailianpressWeb',
    os: 'web',
    sv: '8.4.6',
};

const getSearchParams = (moreParams) => {
    const searchParams = new URLSearchParams({ ...params, ...moreParams });
    searchParams.sort();
    searchParams.append('sign', CryptoJS.MD5(CryptoJS.SHA1(searchParams.toString()).toString()).toString());
    return searchParams;
};

const getClsImportanceSignals = (item): SourceImportanceSignal[] => {
    const signals: SourceImportanceSignal[] = [];

    if (item.level) {
        const normalized = item.level === 'A' ? 'important' : item.level === 'B' ? 'watch' : item.level === 'C' ? 'normal' : undefined;
        signals.push({
            source: 'cls',
            field: 'level',
            value: item.level,
            label: '新闻等级',
            normalized,
        });
    }

    if (Number(item.recommend) === 1) {
        signals.push({
            source: 'cls',
            field: 'recommend',
            value: item.recommend,
            label: '推荐',
        });
    }

    if (Number(item.jpush) === 1) {
        signals.push({
            source: 'cls',
            field: 'jpush',
            value: item.jpush,
            label: '推送',
        });
    }

    if (Number(item.is_top) === 1) {
        signals.push({
            source: 'cls',
            field: 'is_top',
            value: item.is_top,
            label: '置顶',
        });
    }

    return signals;
};

const toStockItem = (s: any): StockItem => ({
    name: s.name,
    code: s.StockID || '',
    change: s.RiseRange,
});

function extractTitle(content: string): string {
    const match = content.match(/^【([^】]+)】/);
    return match ? match[1] : '';
}

function stripTitlePrefix(content: string): string {
    return content.replace(/^【[^】]+】/, '').trim();
}

function isPromotionalContent(content: string): boolean {
    if (typeof content !== 'string') {
        return false;
    }
    if (!content) {
        return false;
    }

    const strongKeywords = ['点击阅读', '点击查看', '点击观看', '扫码', '进群', '下载APP', '下载app', '安装客户端', '扫码领取', '限时免费', '立即加入', '戳这里', '››', '《《'];

    const promotionalPatterns = [/点击.*(阅读|观看|查看)/, /(阅读|观看).*直播中/, /›\s*还有.*行情.*直播/, /直播中.*点击/, /扫码.*(进群|关注|下载)/];

    if (strongKeywords.some((kw) => content.includes(kw))) {
        return true;
    }

    if (promotionalPatterns.some((pattern) => pattern.test(content))) {
        return true;
    }

    if (content.includes('›') && /(直播|点击|阅读|观看)/.test(content)) {
        return true;
    }

    return false;
}

const cleanAndFilter = (items: any[]) => {
    if (!items) {
        return [];
    }
    return items.filter((item) => {
        if (!item) {
            return false;
        }
        const itemType = item.type === undefined || item.type === null ? -1 : Number(item.type);
        if (itemType !== -1) {
            return false;
        }
        if (item.share_img && typeof item.share_img === 'string' && item.share_img.includes('vip')) {
            return false;
        }
        if (Number(item.is_ad) === 1 || Number(item.is_fad) === 1 || item.is_ad === true || item.is_fad === true) {
            return false;
        }
        if (isPromotionalContent(item.content || '')) {
            return false;
        }
        return true;
    });
};

export { cleanAndFilter, extractTitle, getClsImportanceSignals, getSearchParams, rootUrl, stripTitlePrefix, toStockItem };

export { type StockItem } from '../_finance/stock-card';
