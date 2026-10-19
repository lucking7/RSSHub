import type { Context } from 'hono';

import { config } from '@/config';
import NotFoundError from '@/errors/types/not-found';
import type { Language, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const rootUrl = 'https://247wallst.com';
const apiUrl = `${rootUrl}/wp-json/wp/v2`;

export const route: Route = {
    path: '/:path{.+}?',
    categories: ['finance'],
    example: '/247wallst/investing/etf',
    parameters: {
        path: 'Path of a category, company or desk page on the site, latest articles by default',
    },
    radar: [
        { source: ['247wallst.com/'], target: '/' },
        { source: ['247wallst.com/companies/:ticker'], target: '/companies/:ticker' },
        { source: ['247wallst.com/cryptocurrencies/:symbol'], target: '/cryptocurrencies/:symbol' },
        { source: ['247wallst.com/desks/:desk'], target: '/desks/:desk' },
        { source: ['247wallst.com/category/:category'], target: '/:category' },
        { source: ['247wallst.com/:category/:subcategory?'], target: '/:category/:subcategory?' },
    ],
    name: 'Articles',
    maintainers: [],
    handler,
    url: '247wallst.com',
    description: `Full-text articles from the WordPress REST API. The path mirrors the page URL on the site:

| Page     | Site URL                                      | Route                             |
| -------- | --------------------------------------------- | --------------------------------- |
| Latest   | \`https://247wallst.com/\`                      | \`/247wallst\`                      |
| Category | \`https://247wallst.com/investing/etf/\`        | \`/247wallst/investing/etf\`        |
| Company  | \`https://247wallst.com/companies/aapl/\`       | \`/247wallst/companies/aapl\`       |
| Crypto   | \`https://247wallst.com/cryptocurrencies/btc/\` | \`/247wallst/cryptocurrencies/btc\` |
| Desk     | \`https://247wallst.com/desks/market-movers/\`  | \`/247wallst/desks/market-movers\`  |`,
};

const taxonomies = new Map([
    ['companies', { endpoint: 'stocks', param: 'stocks' }],
    ['cryptocurrencies', { endpoint: 'cryptocurrencies', param: 'cryptocurrencies' }],
    ['desks', { endpoint: 'coverage-desks', param: 'coverage-desks' }],
    ['category', { endpoint: 'categories', param: 'categories' }],
]);

const getTerm = (endpoint: string, slug: string) =>
    cache.tryGet(
        `247wallst:term:${endpoint}:${slug}`,
        async () => {
            const terms = await ofetch(`${apiUrl}/${endpoint}`, {
                query: { slug, _fields: 'id,name,link,description' },
            });
            return terms[0] ?? null;
        },
        config.cache.contentExpire,
        false
    ) as Promise<{ id: number; name: string; link: string; description: string } | null>;

async function handler(ctx: Context) {
    const segments = (ctx.req.param('path') ?? '').split('/').filter(Boolean);
    const parsedLimit = Math.trunc(Number(ctx.req.query('limit')));
    const limit = parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20;

    let taxonomy: { endpoint: string; param: string } | undefined;
    let slug: string | undefined;
    if (segments.length) {
        const [first, ...rest] = segments;
        if (taxonomies.has(first) && rest.length) {
            taxonomy = taxonomies.get(first);
            slug = rest.at(-1);
        } else {
            taxonomy = taxonomies.get('category');
            slug = segments.at(-1);
        }
    }

    const term = taxonomy && slug ? await getTerm(taxonomy.endpoint, slug) : undefined;
    if (taxonomy && !term) {
        throw new NotFoundError(`Cannot find ${taxonomy.endpoint} "${slug}"`);
    }

    const posts = await ofetch(`${apiUrl}/posts`, {
        query: {
            per_page: limit,
            _embed: 'wp:term',
            _fields: 'id,title,link,date_gmt,modified_gmt,content,yoast_head_json.author,yoast_head_json.og_image,_links,_embedded',
            ...(term && { [taxonomy!.param]: term.id }),
        },
    });

    const items = posts.map((post) => {
        const image = post.yoast_head_json?.og_image?.[0]?.url;
        return {
            title: post.title.rendered,
            link: post.link,
            guid: `${rootUrl}/?p=${post.id}`,
            description: (image ? `<img src="${encodeURI(image)}">` : '') + post.content.rendered,
            pubDate: parseDate(`${post.date_gmt}Z`),
            updated: parseDate(`${post.modified_gmt}Z`),
            author: post.yoast_head_json?.author,
            category: [
                ...new Set(
                    (post._embedded?.['wp:term'] ?? [])
                        .flat()
                        .filter((t) => ['category', 'post_tag', 'stocks', 'cryptocurrencies', 'coverage_desk'].includes(t.taxonomy))
                        .map((t) => t.name)
                ),
            ],
            image,
        };
    });

    return {
        title: term ? `${term.name} - 24/7 Wall St.` : '24/7 Wall St.',
        description: term?.description || 'Insightful Analysis and Commentary for U.S. and Global Equity Investors',
        link: term?.link ?? rootUrl,
        language: 'en' as Language,
        item: items,
    };
}
