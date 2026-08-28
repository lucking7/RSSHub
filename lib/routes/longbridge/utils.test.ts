import { describe, expect, test } from 'vitest';

import { getNewsId } from './utils';

describe('getNewsId', () => {
    test('extracts ids from official news URLs and API post URLs', () => {
        expect(getNewsId('https://longbridge.com/zh-CN/news/12345')).toBe('12345');
        expect(getNewsId('https://m.lbctrl.com/news/post/12345')).toBe('12345');
        expect(getNewsId('https://longbridge.com/zh-CN/news/12345?x=1')).toBe('12345');
    });

    test('returns undefined when no numeric news id is present', () => {
        expect(getNewsId('https://longbridge.com/zh-CN/news/live')).toBeUndefined();
        expect(getNewsId('')).toBeUndefined();
        expect(getNewsId()).toBeUndefined();
    });
});
