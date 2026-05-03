import CryptoJS from 'crypto-js';

import type { SourceImportanceSignal } from '../_finance/source-importance';

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

export { getClsImportanceSignals, getSearchParams, rootUrl };
