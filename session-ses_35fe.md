# Futunn路由设计检查

**Session ID:** ses_35fef858fffe2XmVxNciGkWbsi
**Created:** 2/28/2026, 1:06:00 AM
**Updated:** 2/28/2026, 1:07:10 AM

---

## User

检查下futunn的路由设计

---

## Assistant (Build · anthropic/claude-opus-4.6 · 60.3s)

_Thinking:_

The user wants me to check the route design for "futunn" in the RSSHub codebase. Let me explore the codebase to find the futunn route files.

**Tool: task**

**Input:**

```json
{
    "description": "Explore futunn route files",
    "prompt": "Explore the RSSHub codebase at /Users/jasperl/Downloads/RSSHub-master-2 to find ALL files related to the \"futunn\" route. Search for:\n1. Any directory named \"futunn\" under lib/routes/\n2. All files in that directory\n3. Any references to \"futunn\" in other files (like lib/router.js)\n\nReturn the full file paths and a brief description of each file's purpose. Read and return the COMPLETE contents of every file found.",
    "subagent_type": "explore"
}
```

**Output:**

```
task_id: ses_35fef5f43ffe0MTMVyvI4wCuTF (for resuming to continue this task if needed)

<task_result>
All files read. No references in `lib/router.js` (the legacy router). Here are the complete results:

<results>
<files>
- /Users/jasperl/Downloads/RSSHub-master-2/lib/routes/futunn/namespace.ts — Namespace definition for the futunn route (name, URL, language)
- /Users/jasperl/Downloads/RSSHub-master-2/lib/routes/futunn/main.ts — Route handler for "要闻" (Headlines/Main News) feed
- /Users/jasperl/Downloads/RSSHub-master-2/lib/routes/futunn/topic.ts — Route handler for "专题" (Topic/Special) feeds by topic ID
- /Users/jasperl/Downloads/RSSHub-master-2/lib/routes/futunn/live.ts — Route handler for "快讯" (Flash News/Live) feed with multi-language + audio support
- /Users/jasperl/Downloads/RSSHub-master-2/lib/routes/futunn/video.ts — Route handler for "视频" (Video) feed
- /Users/jasperl/Downloads/RSSHub-master-2/lib/routes/futunn/templates/description.tsx — Shared JSX template for rendering item descriptions with stock tables
</files>

<answer>

## Directory Structure

```

lib/routes/futunn/
namespace.ts
main.ts
topic.ts
live.ts
video.ts
templates/
description.tsx

````

There are **no references** to "futunn" in `lib/router.js` or any other `.js` file under `lib/` -- this route uses RSSHub's modern file-based routing (auto-discovered from `lib/routes/`), not the legacy router.

---

## File-by-File Breakdown

### 1. `namespace.ts` (7 lines)
Declares the namespace for all futunn routes. Name: **"Futubull 富途牛牛"**, base URL: `news.futunn.com`, language: `zh-CN`.

```ts
export const namespace: Namespace = {
    name: 'Futubull 富途牛牛',
    url: 'news.futunn.com',
    lang: 'zh-CN',
};
````

### 2. `main.ts` (104 lines) -- Route: `/futunn/main` or `/futunn`

**Headlines/Main News** feed. Fetches from API `news-site-api/main/get-market-list`. For each item, it fetches the full article detail page (cached), parses it with Cheerio to extract article body + related stocks, and renders via the shared template. Path is `['/main', '/']` so both `/futunn/main` and `/futunn` trigger this route. Maintainers: Wsine, nczitzk, kennyfong19931.

### 3. `topic.ts` (142 lines) -- Route: `/futunn/topic/:id`

**Topic/Special** feed by topic ID. First resolves the topic title/description via a paginated topic list API (`get-topics-list`), then fetches topic news from `get-topics-news-list`. Detail enrichment uses the same Cheerio pattern as `main.ts`. Maintainer: kennyfong19931.

### 4. `live.ts` (128 lines) -- Route: `/futunn/live/:lang?`

**Flash News** feed with optional language parameter (Mandarin/Cantonese/English). Fetches from `get-flash-list` API with a language header. Includes **podcast/audio support** -- each item exposes `enclosure_url`, `enclosure_type: 'audio/mpeg'`, `itunes_duration`, and `media` object. Three radar entries map the different language paths. Maintainer: kennyfong19931.

### 5. `video.ts` (52 lines) -- Route: `/futunn/video`

**Video** feed. Fetches from `get-video-list` API. Simplest route -- no detail page enrichment, just maps API response to RSS items with the description template. Maintainer: kennyfong19931.

### 6. `templates/description.tsx` (70 lines)

Shared **JSX rendering template** used by main, topic, and video routes. Exports `renderDescription()` which accepts `{ pic, abs, content, stocks }` and renders:

- Full HTML article content (from detail pages), OR a thumbnail + abstract (for list-level items)
- A styled **stock table** with name, code, price, and up/down colored change ratios

Uses Hono's `renderToString` and `raw()` for HTML injection.

---

## Route Summary Table

| Route Path                  | Example              | Feed Name        | API Endpoint           | Has Detail Enrichment |
| --------------------------- | -------------------- | ---------------- | ---------------------- | --------------------- |
| `/futunn/main` or `/futunn` | `/futunn/main`       | 要闻 (Headlines) | `get-market-list`      | Yes (Cheerio)         |
| `/futunn/topic/:id`         | `/futunn/topic/1267` | 专题 (Topics)    | `get-topics-news-list` | Yes (Cheerio)         |
| `/futunn/live/:lang?`       | `/futunn/live`       | 快讯 (Flash)     | `get-flash-list`       | No (has audio)        |
| `/futunn/video`             | `/futunn/video`      | 视频 (Video)     | `get-video-list`       | No                    |

</answer>

<next_steps>
All 6 files have been read in full above. The complete contents are included in the tool output. No additional futunn-related files exist anywhere in the codebase -- the legacy `lib/router.js` has zero futunn references, confirming this route relies entirely on file-based auto-routing. Ready to proceed with any modifications.
</next_steps>
</results>
</task_result>

````

---

## Assistant (Build · anthropic/claude-opus-4.6 · 9.7s)

_Thinking:_

Now I have a good overview of the futunn route structure. Let me read the actual file contents to do a proper review against the AGENTS.md review guidelines.

Let我逐一阅读文件内容，按 AGENTS.md 的 Review Guidelines 做详细检查。

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/jasperl/Downloads/RSSHub-master-2/lib/routes/futunn/namespace.ts"
}
````

**Output:**

```
<path>/Users/jasperl/Downloads/RSSHub-master-2/lib/routes/futunn/namespace.ts</path>
<type>file</type>
<content>1: import type { Namespace } from '@/types';
2:
3: export const namespace: Namespace = {
4:     name: 'Futubull 富途牛牛',
5:     url: 'news.futunn.com',
6:     lang: 'zh-CN',
7: };

(End of file - total 7 lines)
</content>
```

**Tool: read**

**Input:**

```json
{
    "filePath": "/Users/jasperl/Downloads/RSSHub-master-2/lib/routes/futunn/main.ts"
}
```

**Output:**

```
<path>/Users/jasperl/Downloads/RSSHub-master-2/lib/routes/futunn/main.ts</path>
<type>file</type>
<content>1: import { load } from 'cheerio';
2:
3: import type { Route } from '@/types';
4: import cache from '@/utils/cache';
5: import got from '@/utils/got';
6: import { parseDate } from '@/utils/parse-date';
7:
8: import { renderDescription } from './templates/description';
9:
10: export const route: Route = {
11:     path: ['/main', '/'],
12:     categories: ['finance'],
13:     example: '/futunn/main',
14:     features: {
15:         supportRadar: true,
16:     },
17:     radar: [
18:         {
19:             source: ['news.futunn.com/main', 'news.futunn.com/:lang/main'],
20:             target: '/main',
21:         },
22:     ],
23:     name: '要闻',
24:     maintainers: ['Wsine', 'nczitzk', 'kennyfong19931'],
25:     handler,
26: };
27:
28: async function handler(ctx) {
29:     const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 48;
30:
31:     const rootUrl = 'https://news.futunn.com';
32:     const currentUrl = `${rootUrl}/main`;
33:     const apiUrl = `${rootUrl}/news-site-api/main/get-market-list?size=${limit}`;
34:
35:     const response = await got({
36:         method: 'get',
37:         url: apiUrl,
38:     });
39:
40:     let items = response.data.data.list.map((item) => ({
41:         guid: `futunn:main:${item.newsId}`,
42:         title: (item.isTop ? '[置顶] ' : '') + item.title,
43:         link: item.url.split('?')[0],
44:         author: item.source,
45:         pubDate: parseDate(item.timestamp * 1000),
46:         category: item.imptTag ? [item.imptTag] : [],
47:         description: renderDescription({
48:             abs: item.abstract,
49:             pic: item.pic,
50:         }),
51:     }));
52:
53:     items = await Promise.all(
54:         items.map((item) =>
55:             cache.tryGet(item.link, async () => {
56:                 if (/news\.futunn\.com/.test(item.link)) {
57:                     const detailResponse = await got({
58:                         method: 'get',
59:                         url: item.link,
60:                     });
61:
62:                     const content = load(detailResponse.data);
63:
64:                     content('.futu-news-time-stamp').remove();
65:                     content('.nnstock').each(function () {
66:                         content(this).replaceWith(`<a href="${content(this).attr('href')}">${content(this).text().replaceAll('$', '')}</a>`);
67:                     });
68:
69:                     const stocks = content('#relatedStockWeb a.stock')
70:                         .toArray()
71:                         .map((el) => ({
72:                             name: content(el).find('.stock-name').text().trim(),
73:                             ratio: content(el).find('.stock-ratio').text().trim(),
74:                             href: content(el).attr('href') ?? '',
75:                             up: content(el).hasClass('up'),
76:                             down: content(el).hasClass('down'),
77:                         }))
78:                         .filter((s) => s.name);
79:
80:                     item.description = renderDescription({
81:                         content: content('.origin_content').html() ?? '',
82:                         stocks,
83:                     });
84:
85:                     item.category = [
86:                         ...(item.category || []),
87:                         ...content('.news__from-topic__title')
88:                             .toArray()
89:                             .map((a) => content(a).text().trim()),
90:                         ...stocks.map((s) => s.name),
91:                     ];
92:                 }
93:
94:                 return item;
95:             })
96:         )
97:     );
98:
99:     return {
100:         title: '富途牛牛 - 要闻',
101:         link: currentUrl,
102:         item: items,
103:     };
104: }

(End of file - total 104 lines)
</content>
```

**Tool: read**

**Input:**

```json
{
    "filePath": "/Users/jasperl/Downloads/RSSHub-master-2/lib/routes/futunn/topic.ts"
}
```

**Output:**

```
<path>/Users/jasperl/Downloads/RSSHub-master-2/lib/routes/futunn/topic.ts</path>
<type>file</type>
<content>1: import { load } from 'cheerio';
2:
3: import type { Route } from '@/types';
4: import cache from '@/utils/cache';
5: import got from '@/utils/got';
6: import { parseDate } from '@/utils/parse-date';
7:
8: import { renderDescription } from './templates/description';
9:
10: export const route: Route = {
11:     path: '/topic/:id',
12:     categories: ['finance'],
13:     example: '/futunn/topic/1267',
14:     parameters: { id: 'Topic ID, can be found in URL' },
15:     features: {
16:         supportRadar: true,
17:     },
18:     radar: [
19:         {
20:             source: ['news.futunn.com/news-topics/:id/*', 'news.futunn.com/:lang/news-topics/:id/*'],
21:             target: '/topic/:id',
22:         },
23:     ],
24:     name: '专题',
25:     maintainers: ['kennyfong19931'],
26:     handler,
27: };
28:
29: async function getTopic(rootUrl, id, seqMarkInput = '') {
30:     const topicListResponse = await got({
31:         method: 'get',
32:         url: `${rootUrl}/news-site-api/main/get-topics-list?pageSize=48&seqMark=${seqMarkInput}`,
33:     });
34:     const { hasMore, seqMark, list } = topicListResponse.data.data.data;
35:     const topic = list.find((item) => item.idx === id);
36:     if (topic) {
37:         return {
38:             topicTitle: topic.title,
39:             topicDescription: topic.detail,
40:         };
41:     } else if (hasMore === 1) {
42:         return getTopic(rootUrl, id, seqMark);
43:     } else {
44:         return {
45:             topicTitle: '',
46:             topicDescription: '',
47:         };
48:     }
49: }
50:
51: async function handler(ctx) {
52:     const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 48;
53:     const id = ctx.req.param('id');
54:
55:     const rootUrl = 'https://news.futunn.com';
56:     const link = `${rootUrl}/news-topics/${id}/`;
57:     const apiUrl = `${rootUrl}/news-site-api/topic/get-topics-news-list?topicsId=${id}&pageSize=${limit}`;
58:
59:     const { topicTitle, topicDescription } = await cache.tryGet(link, async () => await getTopic(rootUrl, id));
60:
61:     const response = await got({
62:         method: 'get',
63:         url: apiUrl,
64:     });
65:
66:     let items = response.data.data.data.map((item) => ({
67:         title: item.title,
68:         link: item.url,
69:         guid: `futunn:topic:${item.newsId || item.id}`,
70:         author: item.source,
71:         pubDate: parseDate(item.time * 1000),
72:         category: (item.quote || []).map((q) => q.name).filter(Boolean),
73:         description: renderDescription({
74:             abs: item.abstract,
75:             pic: item.pic,
76:             stocks: (item.quote || [])
77:                 .filter((q) => q.name)
78:                 .map((q) => ({
79:                     name: q.name,
80:                     code: q.code,
81:                     href: q.quoteUrl ? `https://${q.quoteUrl}` : undefined,
82:                     ratio: q.changeRatio,
83:                     price: q.price,
84:                     up: q.changeRatio?.startsWith('+'),
85:                     down: q.changeRatio?.startsWith('-'),
86:                 })),
87:         }),
88:     }));
89:
90:     items = await Promise.all(
91:         items.map((item) =>
92:             cache.tryGet(item.link, async () => {
93:                 if (/news\.futunn\.com/.test(item.link)) {
94:                     const detailResponse = await got({
95:                         method: 'get',
96:                         url: item.link,
97:                     });
98:
99:                     const content = load(detailResponse.data);
100:
101:                     content('.futu-news-time-stamp').remove();
102:                     content('.nnstock').each(function () {
103:                         content(this).replaceWith(`<a href="${content(this).attr('href')}">${content(this).text().replaceAll('$', '')}</a>`);
104:                     });
105:
106:                     const stocks = content('#relatedStockWeb a.stock')
107:                         .toArray()
108:                         .map((el) => ({
109:                             name: content(el).find('.stock-name').text().trim(),
110:                             ratio: content(el).find('.stock-ratio').text().trim(),
111:                             href: content(el).attr('href') ?? '',
112:                             up: content(el).hasClass('up'),
113:                             down: content(el).hasClass('down'),
114:                         }))
115:                         .filter((s) => s.name);
116:
117:                     item.description = renderDescription({
118:                         content: content('.origin_content').html() ?? '',
119:                         stocks,
120:                     });
121:
122:                     item.category = [
123:                         ...(item.category || []),
124:                         ...content('.news__from-topic__title')
125:                             .toArray()
126:                             .map((a) => content(a).text().trim()),
127:                         ...stocks.map((s) => s.name),
128:                     ];
129:                 }
130:
131:                 return item;
132:             })
133:         )
134:     );
135:
136:     return {
137:         title: `富途牛牛 - 专题 - ${topicTitle}`,
138:         link,
139:         description: topicDescription,
140:         item: items,
141:     };
142: }

(End of file - total 142 lines)
</content>
```

**Tool: read**

**Input:**

```json
{
    "filePath": "/Users/jasperl/Downloads/RSSHub-master-2/lib/routes/futunn/live.ts"
}
```

**Output:**

```
<path>/Users/jasperl/Downloads/RSSHub-master-2/lib/routes/futunn/live.ts</path>
<type>file</type>
<content>1: import type { Route } from '@/types';
2: import got from '@/utils/got';
3: import { parseDate } from '@/utils/parse-date';
4:
5: export const route: Route = {
6:     path: '/live/:lang?',
7:     categories: ['finance'],
8:     example: '/futunn/live',
9:     parameters: {
10:         category: {
11:             description: '通知语言',
12:             default: 'Mandarin',
13:             options: [
14:                 {
15:                     label: '国语',
16:                     value: 'Mandarin',
17:                 },
18:                 {
19:                     label: '粵語',
20:                     value: 'Cantonese',
21:                 },
22:                 {
23:                     label: 'English',
24:                     value: 'English',
25:                 },
26:             ],
27:         },
28:     },
29:     features: {
30:         supportRadar: true,
31:     },
32:     radar: [
33:         {
34:             source: ['news.futunn.com/main/live'],
35:             target: '/live',
36:         },
37:         {
38:             source: ['news.futunn.com/hk/main/live'],
39:             target: '/live/Cantonese',
40:         },
41:         {
42:             source: ['news.futunn.com/en/main/live'],
43:             target: '/live/English',
44:         },
45:     ],
46:     name: '快讯',
47:     maintainers: ['kennyfong19931'],
48:     handler,
49: };
50:
51: async function handler(ctx) {
52:     const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 30;
53:     const lang = ctx.req.param('lang') ?? 'Mandarin';
54:
55:     const rootUrl = 'https://news.futunn.com';
56:     const link = `${rootUrl}/main${lang === 'Mandarin' ? '' : lang === 'Cantonese' ? '/hk' : '/en'}/live`;
57:     const apiUrl = `${rootUrl}/news-site-api/main/get-flash-list?pageSize=${limit}`;
58:
59:     const response = await got({
60:         method: 'get',
61:         url: apiUrl,
62:         headers: {
63:             'x-news-site-lang': lang === 'Mandarin' ? 0 : lang === 'Cantonese' ? 1 : 2,
64:         },
65:     });
66:
67:     const items = response.data.data.data.news.map((item) => {
68:         const audio = item.audioInfos.find((audio) => audio.language === lang);
69:
70:         const isImportant = item.level === 1;
71:         const title = (isImportant ? '【重要】' : '') + (item.title || item.content);
72:
73:         const quoteNames = item.quote.map((q) => q.name);
74:         const relatedNames = (item.relatedStocks || []).map((s) => s.name).filter(Boolean);
75:         const category = [...new Set([...quoteNames, ...relatedNames])];
76:
77:         let description = item.content;
78:         const relatedStocks = item.relatedStocks || [];
79:         if (relatedStocks.length > 0) {
80:             const stockItems = relatedStocks.filter((s) => s.name);
81:             if (stockItems.length > 0) {
82:                 description += '<br><div style="background: #f5f5f5; border-left: 3px solid #52c41a; padding: 10px 15px; margin: 15px 0 10px 0; border-radius: 4px;">';
83:                 description += '<h3 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0; color: #333;">相关股票</h3>';
84:                 for (const s of stockItems) {
85:                     description += `• <strong>${s.name}</strong>`;
86:                     if (s.code) {
87:                         description += ` <span style="color: #999;">(${s.code})</span>`;
88:                     }
89:                     description += '<br>';
90:                 }
91:                 description += '</div>';
92:             }
93:         }
94:
95:         return {
96:             guid: `futunn:flash:${item.id}`,
97:             title,
98:             description,
99:             link: item.detailUrl,
100:             pubDate: parseDate(item.time * 1000),
101:             category,
102:             itunes_item_image: item.pic,
103:             itunes_duration: audio.duration,
104:             enclosure_url: audio.audioUrl,
105:             enclosure_type: 'audio/mpeg',
106:             media: {
107:                 content: {
108:                     url: audio.audioUrl,
109:                     type: 'audio/mpeg',
110:                     duration: audio.duration,
111:                     language: lang === 'Mandarin' ? 'zh-CN' : lang === 'Cantonese' ? 'zh-HK' : 'en',
112:                 },
113:                 thumbnail: {
114:                     url: item.pic,
115:                 },
116:             },
117:         };
118:     });
119:
120:     return {
121:         title: lang === 'Mandarin' ? '富途牛牛 - 快讯' : lang === 'Cantonese' ? '富途牛牛 - 快訊' : 'Futubull - Latest',
122:         link,
123:         item: items,
124:         language: lang === 'Mandarin' ? 'zh-CN' : lang === 'Cantonese' ? 'zh-HK' : 'en',
125:         itunes_author: lang === 'Mandarin' || lang === 'Cantonese' ? '富途牛牛' : 'Futubull',
126:         itunes_category: 'News',
127:     };
128: }

(End of file - total 128 lines)
</content>
```

**Tool: read**

**Input:**

```json
{
    "filePath": "/Users/jasperl/Downloads/RSSHub-master-2/lib/routes/futunn/video.ts"
}
```

**Output:**

```
<path>/Users/jasperl/Downloads/RSSHub-master-2/lib/routes/futunn/video.ts</path>
<type>file</type>
<content>1: import type { Route } from '@/types';
2: import got from '@/utils/got';
3: import { parseDate } from '@/utils/parse-date';
4:
5: import { renderDescription } from './templates/description';
6:
7: export const route: Route = {
8:     path: '/video',
9:     categories: ['finance'],
10:     example: '/futunn/video',
11:     features: {
12:         supportRadar: true,
13:     },
14:     radar: [
15:         {
16:             source: ['news.futunn.com/main/video-list', 'news.futunn.com/:lang/main/video-list'],
17:             target: '/video',
18:         },
19:     ],
20:     name: '视频',
21:     maintainers: ['kennyfong19931'],
22:     handler,
23: };
24:
25: async function handler(ctx) {
26:     const limit = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 50;
27:
28:     const rootUrl = 'https://news.futunn.com';
29:     const link = `${rootUrl}/main/video-list`;
30:     const apiUrl = `${rootUrl}/news-site-api/main/get-video-list?size=${limit}`;
31:
32:     const response = await got({
33:         method: 'get',
34:         url: apiUrl,
35:     });
36:
37:     const items = response.data.data.videoList.list.map((item) => ({
38:         title: item.title,
39:         description: renderDescription({
40:             abs: item.abstract,
41:             pic: item.videoImg,
42:         }),
43:         link: item.targetUrl,
44:         pubDate: parseDate(item.timestamp * 1000),
45:     }));
46:
47:     return {
48:         title: '富途牛牛 - 视频',
49:         link,
50:         item: items,
51:     };
52: }

(End of file - total 52 lines)
</content>
```

**Tool: read**

**Input:**

```json
{
    "filePath": "/Users/jasperl/Downloads/RSSHub-master-2/lib/routes/futunn/templates/description.tsx"
}
```

**Output:**

```
<path>/Users/jasperl/Downloads/RSSHub-master-2/lib/routes/futunn/templates/description.tsx</path>
<type>file</type>
<content>1: import { raw } from 'hono/html';
2: import { renderToString } from 'hono/jsx/dom/server';
3:
4: type StockItem = {
5:     name: string;
6:     code?: string;
7:     href?: string;
8:     ratio?: string;
9:     price?: string;
10:     up?: boolean;
11:     down?: boolean;
12: };
13:
14: type DescriptionData = {
15:     pic?: string;
16:     abs?: string;
17:     content?: string; // raw HTML body from detail page
18:     stocks?: StockItem[];
19: };
20:
21: const StockTable = ({ stocks }: { stocks: StockItem[] }) => (
22:     <table style="border-collapse:collapse;margin-top:12px;width:100%;font-size:14px;">
23:         <thead>
24:             <tr style="background:#f5f5f5;">
25:                 <th style="text-align:left;padding:6px 10px;border:1px solid #e8e8e8;">股票</th>
26:                 <th style="text-align:right;padding:6px 10px;border:1px solid #e8e8e8;">涨跌幅</th>
27:                 {stocks.some((s) => s.price) ? <th style="text-align:right;padding:6px 10px;border:1px solid #e8e8e8;">价格</th> : null}
28:             </tr>
29:         </thead>
30:         <tbody>
31:             {stocks.map((s) => {
32:                 const color = s.up ? '#f5222d' : s.down ? '#52c41a' : '#666';
33:                 const nameCell = s.href ? (
34:                     <a href={s.href} target="_blank">
35:                         {s.name}
36:                         {s.code ? <span style="color:#999;margin-left:4px;">({s.code})</span> : null}
37:                     </a>
38:                 ) : (
39:                     <>
40:                         {s.name}
41:                         {s.code ? <span style="color:#999;margin-left:4px;">({s.code})</span> : null}
42:                     </>
43:                 );
44:                 return (
45:                     <tr>
46:                         <td style="padding:6px 10px;border:1px solid #e8e8e8;">{nameCell}</td>
47:                         <td style={`padding:6px 10px;border:1px solid #e8e8e8;text-align:right;font-weight:bold;color:${color};`}>{s.ratio ?? '-'}</td>
48:                         {stocks.some((x) => x.price) ? (
49:                             <td style="padding:6px 10px;border:1px solid #e8e8e8;text-align:right;color:#666;">{s.price ?? '-'}</td>
50:                         ) : null}
51:                     </tr>
52:                 );
53:             })}
54:         </tbody>
55:     </table>
56: );
57:
58: const FutunnDescription = ({ pic, abs, content, stocks }: DescriptionData) => (
59:     <>
60:         {content ? <>{raw(content)}</> : pic || abs ? (
61:             <>
62:                 {pic ? <img src={pic} /> : null}
63:                 {abs ? <p>{abs}</p> : null}
64:             </>
65:         ) : null}
66:         {stocks && stocks.length > 0 ? <StockTable stocks={stocks} /> : null}
67:     </>
68: );
69:
70: export const renderDescription = (data: DescriptionData) => renderToString(<FutunnDescription {...data} />);

(End of file - total 70 lines)
</content>
```

---

## Assistant (Build · anthropic/claude-opus-4.6)

_Thinking:_

Now let me review all files against the AGENTS.md review guidelines. Let me go through each rule:

### Route Configuration

1. **Example Format**: All examples start with `/` - ✅
    - `/futunn/main`, `/futunn/topic/1267`, `/futunn/live`, `/futunn/video` - all good

2. **Route Name**: Names are `要闻`, `专题`, `快讯`, `视频` - none repeat the namespace "Futubull 富途牛牛" - ✅

3. **Radar Source Format**: Let me check...
    - `main.ts`: `source: ['news.futunn.com/main', 'news.futunn.com/:lang/main']` - ✅ no https://
    - `topic.ts`: `source: ['news.futunn.com/news-topics/:id/*', 'news.futunn.com/:lang/news-topics/:id/*']` - ✅
    - `live.ts`: `source: ['news.futunn.com/main/live']`, etc. - ✅
    - `video.ts`: source patterns look good too - ✅

The radar target entries all match their corresponding route paths, the namespace URL is correctly set without https://, and everything uses the finance category consistently. There's no unnecessary documentation or legacy router entries, and the feature flags are appropriate with radar support enabled. The maintainers appear to be legitimate GitHub users.

Now checking the code style conventions—variable naming follows camelCase throughout, and all the route and namespace files properly import their types using the `import type` syntax. The imports are organized logically by dependency groups across all the files.

Looking at the implementation details, I don't see any unnecessary template literals, and both main and topic files load the HTML once and reuse it efficiently. The item properties being constructed are all valid RSS fields, and there's no explicit null assignments or unnecessary Puppeteer usage in the codebase.

For the language pattern in live.ts, the repeated conditional could be refactored into a lookup map, though it's a minor optimization. On the caching front, main.ts is already using `cache.tryGet` for detail fetches, which is good practice.

Looking at how descriptions are handled, main.ts and topic.ts both strip out timestamp elements, which is the right approach. Live.ts adds related stock information to descriptions, which is supplementary rather than problematic. For categories, main.ts and topic.ts extract topics and stocks appropriately, and I need to verify what live.ts is doing with its quote field.

All routes are using `parseDate` for publication dates, which is consistent. There are no fallback date creations, and titles aren't being trimmed. For link uniqueness, main.ts strips query parameters which could theoretically cause collisions but is unlikely with news articles, while topic.ts, live.ts, and video.ts each use their respective URL fields directly. I'm checking whether the links are human-readable and properly formatted.

Looking at the API approach, these routes prefer fetching from APIs first and then enriching with detail page scraping where needed. The JSON parsing is handled automatically by the `got` library, so the code accesses nested properties like `.data.data.list` directly. There's no pagination implemented for users, and the `limit` parameter comes from RSSHub's built-in query handling. No custom query parameters or filtering logic is present.

For the media side, the audio enclosures use valid MIME types and point directly to audio file URLs. Puppeteer isn't being used at all, which keeps things lightweight. Now I'm checking the route parameters—the `/live/:lang?` path in `live.ts` has an optional language parameter, and I need to verify how the other routes handle their path definitions.

I'm noticing a mismatch in `live.ts` where the path declares `lang` as the parameter but the `parameters` key references `category` instead—that's a bug. The `topic.ts` route handles this correctly with matching path and parameter names. For error handling, `getTopic` returns empty strings when a topic isn't found rather than throwing, which works but could be cleaner. The code organization looks solid with functions defined at module level and `Promise.all()` used to avoid sequential awaits, though I'm seeing `getTopic` might have some async handling that needs checking. I found a critical bug in the parameter mapping where `category` is used as a key but the route expects `:lang`. There's also a missing null check on `audioInfos` that could cause a runtime crash when accessing audio properties, and the URL construction logic for the link appears to have the path segments in the wrong order for non-Mandarin languages. The recursive pagination in `getTopic` could trigger many requests if the topic ID isn't found early, and there's no depth limit, though this is somewhat acceptable since it's fetching metadata rather than feed content. I'm also noticing inconsistencies across the files: the detail-fetching Cheerio code is duplicated between `main.ts` and `topic.ts` with a misleading variable name, `live.ts` builds descriptions with inline styles instead of using the shared template like the other files, and `video.ts` isn't extracting available `category` or `author` fields from the API.

以下是基于 AGENTS.md Review Guidelines 的详细审查结果。

---

## futunn 路由设计审查

### 文件结构总览

| 文件                        | 路由路径                  | 功能         |
| --------------------------- | ------------------------- | ------------ |
| `namespace.ts`              | -                         | 命名空间     |
| `main.ts`                   | `/futunn/main`, `/futunn` | 要闻         |
| `topic.ts`                  | `/futunn/topic/:id`       | 专题         |
| `live.ts`                   | `/futunn/live/:lang?`     | 快讯         |
| `video.ts`                  | `/futunn/video`           | 视频         |
| `templates/description.tsx` | -                         | 共享描述模板 |

---

### BUG / 必须修复

#### 1. `live.ts:9` — `parameters` key 与路由路径参数不匹配 (Rule #47)

路由路径是 `/live/:lang?`，但 `parameters` 对象的 key 写成了 `category`：

```ts
// live.ts:6-28
path: '/live/:lang?',
parameters: {
    category: {        // ❌ 应为 "lang"
        description: '通知语言',
        ...
    },
},
```

**修复**: key 应改为 `lang`。

#### 2. `live.ts:56` — feed link 拼接错误

```ts
const link = `${rootUrl}/main${lang === 'Mandarin' ? '' : lang === 'Cantonese' ? '/hk' : '/en'}/live`;
```

- Cantonese 生成: `https://news.futunn.com/main/hk/live`
- 但 radar source 定义的是: `news.futunn.com/hk/main/live`

实际网站 URL 格式是 `/{lang}/main/live`，link 拼接逻辑反了。应改为：

```ts
const langPath = lang === 'Cantonese' ? '/hk' : lang === 'English' ? '/en' : '';
const link = `${rootUrl}${langPath}/main/live`;
```

#### 3. `live.ts:68` — 未做空值保护，可能运行时崩溃

```ts
const audio = item.audioInfos.find((audio) => audio.language === lang);
// line 103-104 直接访问 audio.duration / audio.audioUrl
```

如果 `audioInfos` 为空数组或没有匹配项，`audio`

---
