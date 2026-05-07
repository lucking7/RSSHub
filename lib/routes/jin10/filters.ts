export type Jin10FeedItem = {
    title?: string;
    description?: string;
};

export type Jin10RawItem = {
    id?: string | number;
    time?: string;
    type?: number;
    title?: string;
    summary?: string;
    important?: number;
    tags?: unknown[];
    channel?: number[];
    remark?: Array<{
        id?: number;
        type?: string;
        title?: string;
        link?: string;
        url?: string;
        content?: string;
        symbol?: string;
        category_name?: string;
        pic?: string;
    }>;
    extras?: {
        ad?: boolean;
        ad_info?: {
            show_ad_label?: boolean;
        };
    };
    data?: {
        content?: string;
        link?: string;
        title?: string;
        source?: string;
        source_link?: string;
        vip_title?: string;
        vip_level?: number;
        lock?: boolean | number;
        pic?: string;
    };
};

const stripHtml = (value?: string) =>
    value
        ?.replaceAll(/<[^>]*>/g, ' ')
        .replaceAll(/&nbsp;|&#160;/gi, ' ')
        .replaceAll(/\s+/g, ' ')
        .trim() ?? '';

const hasTextContent = (value?: string) => stripHtml(value).length > 0;

const isPureImageContent = (value?: string) => /<img\b/i.test(value ?? '') && !hasTextContent(value);

const getRawTitle = (item: Jin10RawItem) => {
    const content = item.data?.content;
    const titleMatch = content?.match(/^【([^】]+)】/s);

    return titleMatch?.[1] ?? item.data?.title ?? item.data?.vip_title ?? item.title ?? content ?? '';
};

const isPromotionalRemarkLink = (value?: string) => {
    if (!value) {
        return false;
    }

    return value.startsWith('https://tv.jin10.com/') || value.startsWith('https://qihuo.jin10.com/articleDetail.html');
};

const hasPromotionalRemarkLink = (item: Jin10RawItem) => item.remark?.some((remark) => isPromotionalRemarkLink(remark.link) || isPromotionalRemarkLink(remark.url)) ?? false;

export const isJin10PromotionalItem = (item: Jin10RawItem) => {
    if (item.type === 1 || item.type === 2) {
        return true;
    }

    if (item.extras?.ad || hasPromotionalRemarkLink(item)) {
        return true;
    }

    if (item.data?.lock || (item.data?.vip_level ?? 0) > 0) {
        return true;
    }

    const content = item.data?.content ?? '';
    const summary = item.summary ?? content;
    const title = getRawTitle(item);

    if (content.includes('点击查看')) {
        return true;
    }

    if (content.includes('>>') || content.endsWith('》')) {
        return true;
    }

    if (content.includes('……') && content.length < 200 && !content.includes('【')) {
        return true;
    }

    if (content.includes('——今日') || content.includes('——本周') || content.includes('——本月')) {
        return true;
    }

    if ((content.includes('个重点') || content.includes('个要点')) && (content.includes('需要关注') || content.includes('需要留意'))) {
        return true;
    }

    if (!hasTextContent(title)) {
        return true;
    }

    if (isPureImageContent(summary)) {
        return true;
    }

    return Boolean(item.data?.pic) && !hasTextContent(content);
};

export const isJin10AdFeedItem = (item: Jin10FeedItem) => !hasTextContent(item.title) || isPureImageContent(item.description);
