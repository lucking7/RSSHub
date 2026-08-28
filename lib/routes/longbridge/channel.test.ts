import { describe, expect, test } from 'vitest';

import InvalidParameterError from '@/errors/types/invalid-parameter';

import { resolveChannel } from './channel';

describe('resolveChannel', () => {
    test.each(['mp-lb-daily', 'dolphin'])('keeps retired slug %s unsupported and names replacements', (slug) => {
        expect(() => resolveChannel(slug)).toThrow(InvalidParameterError);
        expect(() => resolveChannel(slug)).toThrow(/mp-lb-daily/);
        expect(() => resolveChannel(slug)).toThrow(/dolphin/);
        expect(() => resolveChannel(slug)).toThrow('/longbridge/channel/news');
        expect(() => resolveChannel(slug)).toThrow('/longbridge/flash');
    });

    test('does not map retired slugs onto current feeds', () => {
        expect(resolveChannel('news').feedUrl).toBe('https://longbridge.com/zh-CN/news/feed');
        expect(resolveChannel('live').feedUrl).toBe('https://longbridge.com/zh-CN/news/live/feed');
        expect(() => resolveChannel('mp-lb-daily')).not.toThrow(/Valid: news, live/);
    });

    test('rejects unknown slugs without treating them as retired', () => {
        expect(() => resolveChannel('unknown')).toThrow(InvalidParameterError);
        expect(() => resolveChannel('unknown')).toThrow('Unsupported Longbridge channel: unknown. Valid: news, live.');
        expect(() => resolveChannel('unknown')).not.toThrow(/retired/i);
    });
});
