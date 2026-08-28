import { describe, expect, test } from 'vitest';

import { buildOfficialRssItem, FLASH_GUID_PREFIX, getFlashMergeKey, getNewsId, officialNewsLink } from './utils';

describe('getNewsId', () => {
    test('extracts ids from official news URLs and API post URLs', () => {
        expect(getNewsId('https://longbridge.com/zh-CN/news/12345')).toBe('12345');
        expect(getNewsId('https://longbridge.com/news/12345')).toBe('12345');
        expect(getNewsId('https://m.lbctrl.com/news/post/12345')).toBe('12345');
        expect(getNewsId('https://longbridge.com/zh-CN/news/12345?x=1')).toBe('12345');
    });

    test('prefers numeric id from the URL over fallback item.id', () => {
        expect(getNewsId('https://m.lbctrl.com/news/post/111', '999')).toBe('111');
        expect(getNewsId('https://longbridge.com/news/111', 999)).toBe('111');
    });

    test('falls back to item.id when the URL has no numeric news id', () => {
        expect(getNewsId(undefined, '111')).toBe('111');
        expect(getNewsId('https://longbridge.com/zh-CN/news/live', '111')).toBe('111');
        expect(getNewsId('', 111)).toBe('111');
    });

    test('returns undefined when no numeric news id is present', () => {
        expect(getNewsId('https://longbridge.com/zh-CN/news/live')).toBeUndefined();
        expect(getNewsId('')).toBeUndefined();
        expect(getNewsId()).toBeUndefined();
    });
});

describe('officialNewsLink', () => {
    test('builds a stable public news URL for numeric ids', () => {
        expect(officialNewsLink('111')).toBe('https://longbridge.com/news/111');
        expect(officialNewsLink('abc')).toBeUndefined();
    });
});

describe('getFlashMergeKey', () => {
    test('uses the same key for API post URLs and official news URLs', () => {
        expect(
            getFlashMergeKey({
                guid: `${FLASH_GUID_PREFIX}111`,
                link: 'https://m.lbctrl.com/news/post/111',
            })
        ).toBe(`${FLASH_GUID_PREFIX}111`);
        expect(
            getFlashMergeKey({
                guid: `${FLASH_GUID_PREFIX}111`,
                link: 'https://longbridge.com/news/111',
            })
        ).toBe(`${FLASH_GUID_PREFIX}111`);
        expect(
            getFlashMergeKey({
                guid: 'https://longbridge.com/news/111',
                link: 'https://longbridge.com/news/111',
            })
        ).toBe(`${FLASH_GUID_PREFIX}111`);
    });

    test('prefers numeric id from the URL when guid uses a different item.id', () => {
        expect(
            getFlashMergeKey({
                guid: `${FLASH_GUID_PREFIX}999`,
                link: 'https://m.lbctrl.com/news/post/111',
            })
        ).toBe(`${FLASH_GUID_PREFIX}111`);
    });
});

describe('buildOfficialRssItem', () => {
    test('shares flash guid and official link with API post items', () => {
        const item = buildOfficialRssItem(
            {
                title: 'Hello',
                contentSnippet: 'Body',
                link: 'https://longbridge.com/zh-CN/news/111',
                isoDate: '2024-01-01T00:00:00.000Z',
            },
            {
                guidPrefix: FLASH_GUID_PREFIX,
                author: '长桥快讯',
                requireNewsId: true,
                requirePubDate: true,
            }
        );

        expect(item?.guid).toBe(`${FLASH_GUID_PREFIX}111`);
        expect(item?.link).toBe('https://longbridge.com/news/111');
        expect(
            getFlashMergeKey({
                guid: `${FLASH_GUID_PREFIX}111`,
                link: 'https://m.lbctrl.com/news/post/111',
            })
        ).toBe(getFlashMergeKey(item!));
    });
});
