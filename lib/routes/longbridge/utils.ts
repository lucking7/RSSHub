import type { DataItem } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import parser from '@/utils/rss-parser';

export const API_BASE = 'https://m.lbkrs.com/api/forward';

export const API_HEADERS = {
    'x-app-id': 'longbridge',
    'x-platform': 'web',
    'accept-language': 'zh-CN',
    'x-prefer-language': 'zh-CN',
    'X-Forwarded-For': '116.228.111.18',
    'X-Real-IP': '116.228.111.18',
    'Client-IP': '116.228.111.18',
};

export const API_HEADERS_JSON = {
    ...API_HEADERS,
    'content-type': 'application/json',
};

export const cleanText = (value?: string): string => (value || '').replaceAll(/\s+/g, ' ').trim();

export const parseRssDate = (value?: string): Date | undefined => {
    const dateText = cleanText(value);
    if (!dateText) {
        return undefined;
    }
    const date = parseDate(dateText);
    return Number.isNaN(date.getTime()) ? undefined : date;
};

export const getNewsId = (link?: string): string | undefined => cleanText(link).match(/\/news\/(?:post\/)?(\d+)(?:[/?#]|$)/)?.[1];

export type OfficialRssItemOptions = {
    guidPrefix: string;
    author: string;
    requireNewsId?: boolean;
    requirePubDate?: boolean;
};

export const buildOfficialRssItem = (item, options: OfficialRssItemOptions): DataItem | undefined => {
    const link = cleanText(item.link);
    const description = cleanText(item.contentSnippet || item.content || item.summary);
    const title = cleanText(item.title) || description;
    const newsId = getNewsId(link);
    const pubDate = parseRssDate(item.isoDate || item.pubDate);
    if (!link || !title) {
        return undefined;
    }
    if (options.requireNewsId && !newsId) {
        return undefined;
    }
    if (options.requirePubDate && !pubDate) {
        return undefined;
    }

    return {
        title,
        description: description || title,
        link,
        guid: `${options.guidPrefix}${newsId || link}`,
        author: options.author,
        ...(pubDate && { pubDate }),
    };
};

export const fetchOfficialRssItems = async (url: string, options: OfficialRssItemOptions): Promise<DataItem[]> => {
    const { body } = await got(url);
    const feed = await parser.parseString(body);
    return feed.items.map((item) => buildOfficialRssItem(item, options)).filter((rssItem): rssItem is DataItem => !!rssItem);
};
