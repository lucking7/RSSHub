export const API_BASE = 'https://m.lbkrs.com/api/forward';

export const API_HEADERS = {
    'x-app-id': 'longbridge',
    'x-platform': 'web',
    'accept-language': 'zh-CN',
    'x-prefer-language': 'zh-CN',
};

export const API_HEADERS_JSON = {
    ...API_HEADERS,
    'content-type': 'application/json',
};
