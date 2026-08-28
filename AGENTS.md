## Commands

- Use `pnpm` only; `package.json` pins `pnpm@10.34.5` and Node `^22.22.2 || ^24.15.0`.
- After installing dependencies, CI runs `pnpm rb && pnpm exec playwright install chromium` before build/test.
- Run `pnpm build:routes` after adding or changing route metadata; generated route assets are needed by builds/tests.
- Focused route test: `pnpm vitest lib/routes/<namespace>/<file>.test.ts[x]`.
- Full local checks: `pnpm run format:check`, `pnpm run lint`, then `pnpm run vitest:coverage`.
- `pnpm run test` is not just tests; it runs `format:check` first, then coverage.

## Runtime And Deploy

- The server defaults to port `1200` and exposes `GET /healthz`; `PORT` overrides the port.
- Docker is the safest Railway/Render path: `Dockerfile` exposes `1200`, and `docker-compose.yml` wires RSSHub + Redis + optional browserless.
- Production cache defaults to memory; set `CACHE_TYPE=redis` and `REDIS_URL` for shared/persistent cache.
- Playwright routes need browser support: use `PLAYWRIGHT_WS_ENDPOINT`/`PUPPETEER_WS_ENDPOINT`, `CHROMIUM_EXECUTABLE_PATH`, or a Chromium-bundled image.
- Cloudflare Workers/Containers and Fly.io have repo configs (`wrangler.toml`, `wrangler-container.toml`, `fly.toml`).

## Route Files

- Do not add routes to deprecated `lib/router.js`; route metadata belongs with the route module.
- Do not create per-route `README.md` or `radar.ts`; put docs in `Route['description']` and radar rules in `Route['radar']`.
- `example` must be an RSSHub route path starting with `/`, not a source-site URL.
- Route `name` should not repeat the namespace name already defined in `namespace.ts`.
- `namespace.ts` `url` and `radar[].source` use host/path without `https://`; `radar[].target` must match the route path and parameters.
- Keep `categories` to one category, and ensure `parameters` keys exactly match path params.
- Set `features.requirePuppeteer: true` only for routes that actually use Puppeteer/Playwright.

## Feed Data Rules

- When fetching article details in a loop, cache processed item results with `cache.tryGet()`.
- `description` contains only article body content; put tags in `category`, author in `author`, and dates in `pubDate`.
- Use `parseDate()` when source dates exist; never use `new Date()` as a fallback date.
- Feed-level `link` should be a human-readable page, not an API endpoint.
- Item `link` values must be unique because RSSHub uses them as GUIDs.
- Do not manually trim or truncate titles; RSSHub core handles title processing.

## Fetching And Browser Rules

- Prefer documented or discovered APIs over HTML scraping; `ofetch` already parses JSON.
- Feeds should request only the first page; use common params like `limit` rather than custom pagination/filter query params.
- Do not implement custom tag/category filters; users can use RSSHub common filtering params.
- If an API requires a build hash, extract it dynamically from the page instead of hardcoding it.
- Use `config.trueUA` when a realistic browser User-Agent is needed.
- Puppeteer/Playwright code should allow only needed request types, wait on selectors instead of fixed delays, and avoid browser calls inside `Promise.all()` loops.
- Await `page.close()`/`browser.close()`; do not bypass empty feed checks by returning empty arrays with custom messages.

## Style And Review Traps

- Use `import type { ... }` for type-only imports and keep imports sorted.
- Use `camelCase`; avoid `snake_case`, unnecessary template literals, explicit `null`, and repeated `cheerio.load()` on the same HTML.
- RSS items only support fields from `lib/types.ts`; custom fields like `avatar` or `bio` are ignored.
- Use valid MIME types for `enclosure_type`, direct media URLs for `enclosure_url`, and `<video poster="...">` for video thumbnails.
- Do not add `referrerpolicy` to route HTML; middleware handles it.
- Preserve working examples, documented defaults, and alphabetical order in sorted lists unless they are demonstrably broken.
- Write code comments in English and keep helper functions at the highest practical scope.
