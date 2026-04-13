type Jin10FeedItem = {
    title?: string;
    description?: string;
};

type Jin10RawItem = {
    type?: number;
    title?: string;
    summary?: string;
    data?: {
        content?: string;
        title?: string;
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

export const isJin10PromotionalItem = (item: Jin10RawItem) => {
    if (item.type === 1 || item.type === 2) {
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
