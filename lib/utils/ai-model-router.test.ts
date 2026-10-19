import { describe, expect, it } from 'vitest';

import { AiModelRouter } from './ai-model-router';

const options = {
    slowMs: { title: 1000, description: 5000 },
    windowMs: 60000,
    minSamples: 4,
    slowRatio: 0.5,
    fallbackDurationMs: 30000,
    maxFallbackShare: 0.9,
};

const createRouter = (overrides: Partial<typeof options> = {}) => {
    const clock = { now: 0, random: 0.5 };
    const router = new AiModelRouter(
        () => ({ ...options, ...overrides }),
        () => clock.now,
        () => clock.random
    );
    return { router, clock };
};

describe('AiModelRouter', () => {
    it('stays on the primary model until enough slow samples are collected', () => {
        const { router } = createRouter();
        for (let i = 0; i < 3; i++) {
            expect(router.record('title', 2000, false).entered).toBe(false);
        }
        expect(router.useFallback()).toBe(false);
        expect(router.status().active).toBe(false);
    });

    it('uses per-task thresholds and counts failures as slow', () => {
        const { router } = createRouter();
        router.record('description', 4000, false);
        router.record('description', 4000, false);
        router.record('title', 100, true);
        expect(router.record('title', 100, false)).toMatchObject({ entered: false, ratio: 0.25 });
    });

    it('hands a share equal to the slow ratio to the fallback model during takeover', () => {
        const { router, clock } = createRouter();
        router.record('title', 100, false);
        router.record('title', 2000, false);
        router.record('title', 2000, false);
        expect(router.record('title', 2000, false)).toEqual({ entered: true, share: 0.75, ratio: 0.75 });

        clock.random = 0.7;
        expect(router.useFallback()).toBe(true);
        clock.random = 0.8;
        expect(router.useFallback()).toBe(false);
    });

    it('caps the share so some requests keep probing the primary model', () => {
        const { router, clock } = createRouter({ maxFallbackShare: 0.6 });
        for (let i = 0; i < 4; i++) {
            router.record('title', 2000, false);
        }
        expect(router.status().share).toBe(0.6);
        clock.random = 0.65;
        expect(router.useFallback()).toBe(false);
    });

    it('ends the takeover after the duration and re-enters only if still slow', () => {
        const { router, clock } = createRouter();
        for (let i = 0; i < 4; i++) {
            router.record('title', 2000, false);
        }
        clock.now = 30000;
        expect(router.status().active).toBe(false);
        expect(router.useFallback()).toBe(false);

        // the old slow samples leave the window, fast probes keep the router on the primary model
        clock.now = 61000;
        for (let i = 0; i < 4; i++) {
            expect(router.record('title', 100, false).entered).toBe(false);
        }
        expect(router.status().active).toBe(false);

        for (let i = 0; i < 4; i++) {
            router.record('title', 2000, false);
        }
        expect(router.status().active).toBe(true);
    });

    it('follows the probes during takeover without extending it', () => {
        const { router, clock } = createRouter();
        for (let i = 0; i < 4; i++) {
            router.record('title', 2000, false);
        }
        const { until } = router.status();
        clock.now = 10000;
        for (let i = 0; i < 4; i++) {
            router.record('title', 100, false);
        }
        expect(router.status()).toEqual({ active: true, share: 0.5, until });
    });

    it('never takes over when the duration is 0', () => {
        const { router } = createRouter({ fallbackDurationMs: 0 });
        for (let i = 0; i < 4; i++) {
            expect(router.record('title', 2000, false).entered).toBe(false);
        }
        expect(router.status().active).toBe(false);
    });
});
