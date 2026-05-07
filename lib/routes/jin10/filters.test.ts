import { describe, expect, test } from 'vitest';

import { isJin10AdFeedItem, isJin10PromotionalItem } from './filters';

describe('isJin10PromotionalItem', () => {
    test('should filter entries with empty title and image-only summary', () => {
        expect(
            isJin10PromotionalItem({
                id: 11357,
                title: '',
                summary: '<img src="https://www.jin10.com/activities/2026/3/gold_price_alert/index.html" />',
            })
        ).toBe(true);
    });

    test('should keep normal chart entries', () => {
        expect(
            isJin10PromotionalItem({
                id: 11353,
                data: {
                    content: '【金十图示】全球最大白银ETF--iShares Silver Trust持仓报告',
                    pic: 'https://cdn.example.com/silver.jpg',
                },
                summary: '全球最大白银ETF--iShares Silver Trust持仓报告',
            })
        ).toBe(false);
    });

    test('should keep normal news entries', () => {
        expect(
            isJin10PromotionalItem({
                id: 12661,
                data: {
                    content: '市场消息：阿曼萨拉拉港暂停运营。',
                },
                summary: '市场消息：阿曼萨拉拉港暂停运营。',
            })
        ).toBe(false);
    });

    test('should filter upstream ad flagged live entries', () => {
        expect(
            isJin10PromotionalItem({
                id: '20260506201231508800',
                type: 0,
                important: 0,
                channel: [5],
                extras: {
                    ad: true,
                    ad_info: {
                        show_ad_label: true,
                    },
                },
                remark: [
                    {},
                    {
                        id: 1024,
                        link: 'https://tv.jin10.com/#/vip',
                        type: 'link',
                        title: '相关链接',
                    },
                ],
                data: {
                    title: '黄金行情直播中',
                    content: '美伊接近达成停战协议，黄金能否站稳4700关口？金十研究员Steven正在直播中，点击观看<font class="important-text"></font>',
                },
            })
        ).toBe(true);
    });

    test('should filter qihuo article detail redirect entries even when ad flag is false', () => {
        expect(
            isJin10PromotionalItem({
                id: '20260506205229258800',
                type: 0,
                important: 1,
                channel: [1, 2],
                extras: {
                    ad: false,
                },
                remark: [
                    {
                        id: 1024,
                        link: 'https://qihuo.jin10.com/articleDetail.html?id=1117777&comments=all',
                        type: 'link',
                        title: '相关链接',
                    },
                ],
                data: {
                    content: '【期货热点追踪】重磅！几内亚与阿联酋全球铝业公司（EGA）达成和解，铝土矿运输得以恢复。点击阅读。',
                },
            })
        ).toBe(true);
    });

    test('should keep normal entries with market quote remarks', () => {
        expect(
            isJin10PromotionalItem({
                id: 12662,
                type: 0,
                important: 1,
                channel: [1, 2],
                remark: [
                    {
                        type: 'quotes',
                        title: '现货黄金',
                        symbol: 'XAUUSD.GOODS',
                    },
                ],
                data: {
                    content: '现货黄金短线走高。',
                },
            })
        ).toBe(false);
    });
});

describe('isJin10AdFeedItem', () => {
    test('should filter feed items with empty title', () => {
        expect(
            isJin10AdFeedItem({
                title: ' ',
                description: '<img src="https://cdn.example.com/banner.jpg" />',
            })
        ).toBe(true);
    });

    test('should keep feed items with text content', () => {
        expect(
            isJin10AdFeedItem({
                title: '市场消息',
                description: '<p>阿曼萨拉拉港暂停运营。</p><img src="https://cdn.example.com/news.jpg" />',
            })
        ).toBe(false);
    });
});
