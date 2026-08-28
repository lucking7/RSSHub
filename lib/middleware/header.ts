import etagCalculate from 'etag';
import type { Context, MiddlewareHandler } from 'hono';
import { routePath } from 'hono/route';

import { config } from '@/config';
import type { Data } from '@/types';

type CommonResponseHeaders = {
    'Access-Control-Allow-Methods': string;
    'Content-Type': string;
    'Cache-Control': string;
    'X-Content-Type-Options': string;
    'RSSHub-Node'?: string;
};

const headers: CommonResponseHeaders = {
    'Access-Control-Allow-Methods': 'GET',
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': `public, max-age=${config.cache.routeExpire}`,
    'X-Content-Type-Options': 'nosniff',
};
if (config.nodeName) {
    headers['RSSHub-Node'] = config.nodeName;
}

const getRouteCacheTtl = (ctx: Context) => {
    const routeCacheTtl = ctx.get('routeCacheTtl');
    return typeof routeCacheTtl === 'number' && Number.isFinite(routeCacheTtl) && routeCacheTtl > 0 ? routeCacheTtl : undefined;
};

function etagMatches(etag: string, ifNoneMatch: string | null) {
    return ifNoneMatch !== null && ifNoneMatch.split(/,\s*/).includes(etag);
}

const middleware: MiddlewareHandler = async (ctx, next) => {
    for (const key in headers) {
        ctx.header(key, headers[key]);
    }
    ctx.header('Access-Control-Allow-Origin', config.allowOrigin || new URL(ctx.req.url).host);

    await next();
    const rPath = routePath(ctx);
    // Per-route routeCacheTtl is only set on ctx by the handler wrapper during next(), so Cache-Control must be (re)applied here.
    const routeCacheTtl = getRouteCacheTtl(ctx);
    if (routeCacheTtl) {
        ctx.header('Cache-Control', `public, max-age=${routeCacheTtl}`);
    }

    if (rPath !== '/*') {
        ctx.header('X-RSSHub-Route', rPath);
    }

    const data: Data = ctx.get('data');
    if (!data || ctx.res.headers.get('ETag')) {
        return;
    }

    const { lastBuildDate, ...etagData } = data;
    const etag = etagCalculate(JSON.stringify(etagData));

    ctx.header('ETag', etag);

    const ifNoneMatch = ctx.req.header('If-None-Match') ?? null;
    if (etagMatches(etag, ifNoneMatch)) {
        ctx.status(304);
        ctx.set('no-content', true);
    } else {
        ctx.header('Last-Modified', lastBuildDate);
    }
};

export default middleware;
