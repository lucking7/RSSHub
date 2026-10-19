export type AiTask = 'title' | 'description';

export interface AiModelRouterOptions {
    slowMs: Record<AiTask, number>;
    windowMs: number;
    minSamples: number;
    slowRatio: number;
    fallbackDurationMs: number;
    maxFallbackShare: number;
}

interface Sample {
    at: number;
    slow: boolean;
}

/**
 * Tracks primary-model latency and decides when to hand a share of requests to the fallback model.
 *
 * Every primary call records a sample; a sample is slow when it exceeds the task threshold or failed.
 * When the slow ratio within the sliding window reaches `slowRatio` (with at least `minSamples`),
 * the router enters a takeover period of `fallbackDurationMs`, during which each request goes to the
 * fallback model with probability equal to the slow ratio, capped at `maxFallbackShare`. The remaining
 * requests keep probing the primary model, so recovery is detected once the takeover period ends.
 */
export class AiModelRouter {
    private samples: Sample[] = [];
    private takeoverUntil = 0;
    private share = 0;

    constructor(
        private readonly getOptions: () => AiModelRouterOptions,
        private readonly now: () => number = Date.now,
        private readonly random: () => number = Math.random
    ) {}

    useFallback(): boolean {
        return this.now() < this.takeoverUntil && this.random() < this.share;
    }

    record(task: AiTask, durationMs: number, failed: boolean): { entered: boolean; share: number; ratio: number } {
        const options = this.getOptions();
        const now = this.now();
        this.samples.push({ at: now, slow: failed || durationMs > options.slowMs[task] });
        this.samples = this.samples.filter((sample) => now - sample.at <= options.windowMs);

        const ratio = this.samples.filter((sample) => sample.slow).length / this.samples.length;
        const active = now < this.takeoverUntil;
        if (active) {
            // follow the probes during takeover, without extending it
            this.share = Math.min(ratio, options.maxFallbackShare);
            return { entered: false, share: this.share, ratio };
        }
        if (this.samples.length < options.minSamples || ratio < options.slowRatio || options.fallbackDurationMs <= 0) {
            return { entered: false, share: 0, ratio };
        }

        this.takeoverUntil = now + options.fallbackDurationMs;
        this.share = Math.min(ratio, options.maxFallbackShare);
        return { entered: true, share: this.share, ratio };
    }

    status() {
        const active = this.now() < this.takeoverUntil;
        return { active, share: active ? this.share : 0, until: active ? this.takeoverUntil : undefined };
    }
}
