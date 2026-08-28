import { describe, expect, test } from 'vitest';

import { mapWallstreetcnLiveCategories } from './live';

describe('mapWallstreetcnLiveCategories', () => {
    test('maps channel slugs and related themes', () => {
        expect(
            mapWallstreetcnLiveCategories({
                channels: ['global-channel', 'goldc-channel', 'oil-channel', 'unknown-channel'],
                related_themes: [{ title: 'A股7×24快讯直播' }, { title: '' }],
            })
        ).toEqual(['要闻', '黄金', '原油', 'A股7×24快讯直播']);
    });
});
