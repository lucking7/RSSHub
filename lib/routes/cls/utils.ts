import CryptoJS from 'crypto-js';

const rootUrl = 'https://www.cls.cn';

const params = {
    app: 'CailianpressWeb',
    os: 'web',
    sv: '8.6.6',
};

const getSearchParams = (moreParams) => {
    const searchParams = new URLSearchParams({ ...params, ...moreParams });
    searchParams.sort();
    searchParams.append('sign', CryptoJS.MD5(CryptoJS.SHA1(searchParams.toString()).toString()).toString());
    return searchParams;
};

export { rootUrl, getSearchParams };
