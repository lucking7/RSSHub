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
