# 项目检查

**Session ID:** ses_362c72dcbffeG449B9HeZB3a62
**Created:** 2/27/2026, 11:51:12 AM
**Updated:** 2/27/2026, 11:52:01 AM

---

## User

检查下项目

---

## Assistant (Orchestrator · anthropic/claude-opus-4.6 · 13.3s)

_Thinking:_

The user wants me to check the project. Let me start by understanding the project structure and key configuration files.

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/jasperl/Downloads/RSSHub-master-2"
}
```

**Output:**
```
<path>/Users/jasperl/Downloads/RSSHub-master-2</path>
<type>directory</type>
<entries>
.codecov.yml
.devcontainer/
.dockerignore
.editorconfig
.envrc
.github/
.gitignore
.husky/
.idx/
.npmrc
.oxfmtrc.json
.puppeteerrc.cjs
AGENTS.md
app.json
assets/
CODE_OF_CONDUCT.md
CONTRIBUTING.md
devenv.nix
docker-compose.yml
Dockerfile
eslint-plugins/
eslint.config.mjs
flake.lock
flake.nix
fly.toml
lib/
LICENSE
logs/
package.json
patches/
pnpm-lock.yaml
public/
README.md
scripts/
SECURITY.md
tailwind.config.js
tsconfig.json
tsdown-container.config.ts
tsdown-lib.config.ts
tsdown-vercel.config.ts
tsdown-worker.config.ts
tsdown.config.ts
vercel.json
vitest.config.ts
wrangler-container.toml
wrangler.toml

(46 entries)
</entries>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/jasperl/Downloads/RSSHub-master-2/package.json"
}
```

**Output:**
```
<path>/Users/jasperl/Downloads/RSSHub-master-2/package.json</path>
<type>file</type>
<content>1: {
2:     "name": "rsshub",
3:     "version": "1.0.0",
4:     "description": "Make RSS Great Again!",
5:     "keywords": [
6:         "RSS"
7:     ],
8:     "homepage": "https://github.com/DIYgod/RSSHub#readme",
9:     "bugs": {
10:         "url": "https://github.com/DIYgod/RSSHub/issues"
11:     },
12:     "license": "AGPL-3.0",
13:     "author": "DIYgod",
14:     "repository": {
15:         "type": "git",
16:         "url": "git+https://github.com/DIYgod/RSSHub.git"
17:     },
18:     "files": [
19:         "dist-lib"
20:     ],
21:     "type": "module",
22:     "exports": {
23:         ".": {
24:             "types": "./dist-lib/pkg.d.mts",
25:             "import": "./dist-lib/pkg.mjs"
26:         }
27:     },
28:     "scripts": {
29:         "build": "npm run build:routes && tsdown",
30:         "build:docs": "npm run build:routes && tsx scripts/workflow/build-docs.ts",
31:         "build:lib": "npm run build:routes && tsdown --config ./tsdown-lib.config.ts",
32:         "build:routes": "cross-env NODE_ENV=dev tsx scripts/workflow/build-routes.ts",
33:         "build:routes:worker": "cross-env NODE_ENV=dev WORKER_BUILD=true tsx scripts/workflow/build-routes.ts",
34:         "container-build": "tsdown --config ./tsdown-container.config.ts",
35:         "container-deploy": "npm run container-build && wrangler deploy --config wrangler-container.toml --containers-rollout=immediate",
36:         "dev": "cross-env NODE_ENV=dev NODE_OPTIONS='--max-http-header-size=32768' tsx watch --inspect --clear-screen=false lib/index.ts",
37:         "dev:cache": "cross-env NODE_ENV=production NODE_OPTIONS='--max-http-header-size=32768' tsx watch --clear-screen=false lib/index.ts",
38:         "format": "eslint --cache --fix \"**/*.{ts,tsx,js,yml}\" --concurrency auto && oxfmt .",
39:         "format:check": "eslint --cache \"**/*.{ts,tsx,js,yml}\" --concurrency auto && oxfmt . --check",
40:         "format:staged": "lint-staged",
41:         "lint": "eslint --cache . --concurrency auto",
42:         "prepare": "husky || true",
43:         "prepublishOnly": "npm run build:lib",
44:         "profiling": "cross-env NODE_ENV=production tsx --prof lib/index.ts",
45:         "start": "cross-env NODE_ENV=production NODE_OPTIONS='--max-http-header-size=32768' node dist/index.mjs",
46:         "test": "npm run format:check && npm run vitest:coverage",
47:         "vercel-build": "npm run build:routes && tsdown --config ./tsdown-vercel.config.ts",
48:         "vitest": "cross-env NODE_ENV=test vitest",
49:         "vitest:coverage": "cross-env NODE_ENV=test vitest --coverage.enabled --reporter=junit",
50:         "vitest:fullroutes": "cross-env NODE_ENV=test FULL_ROUTES_TEST=true vitest --reporter=json --reporter=default --outputFile=\"./assets/build/test-full-routes.json\" routes",
51:         "vitest:watch": "cross-env NODE_ENV=test vitest --watch",
52:         "worker-build": "npm run build:routes:worker && tsdown --config ./tsdown-worker.config.ts",
53:         "worker-deploy": "npm run worker-build && wrangler deploy",
54:         "worker-dev": "npm run worker-build && wrangler dev",
55:         "worker-test": "npm run worker-build && vitest run lib/worker.worker.test.ts"
56:     },
57:     "dependencies": {
58:         "@bbob/html": "4.3.1",
59:         "@bbob/plugin-helper": "4.3.1",
60:         "@bbob/preset-html5": "4.3.1",
61:         "@hono/node-server": "1.19.9",
62:         "@hono/zod-openapi": "1.2.2",
63:         "@jocmp/mercury-parser": "3.0.3",
64:         "@notionhq/client": "5.9.0",
65:         "@opentelemetry/api": "1.9.0",
66:         "@opentelemetry/exporter-prometheus": "0.212.0",
67:         "@opentelemetry/exporter-trace-otlp-http": "0.212.0",
68:         "@opentelemetry/resources": "2.5.1",
69:         "@opentelemetry/sdk-metrics": "2.5.1",
70:         "@opentelemetry/sdk-trace-base": "2.5.1",
71:         "@opentelemetry/semantic-conventions": "1.39.0",
72:         "@rss3/sdk": "0.0.25",
73:         "@scalar/hono-api-reference": "0.9.45",
74:         "@sentry/node": "10.40.0",
75:         "aes-js": "3.1.2",
76:         "cheerio": "1.2.0",
77:         "city-timezones": "1.3.3",
78:         "cross-env": "10.1.0",
79:         "crypto-js": "4.2.0",
80:         "currency-symbol-map": "5.1.0",
81:         "dayjs": "1.11.19",
82:         "destr": "2.0.5",
83:         "dotenv": "17.3.1",
84:         "entities": "7.0.1",
85:         "etag": "1.8.1",
86:         "fanfou-sdk": "6.0.0",
87:         "form-data": "4.0.5",
88:         "google-play-scraper": "10.1.2",
89:         "googleapis": "171.4.0",
90:         "header-generator": "2.1.80",
91:         "hono": "4.12.2",
92:         "html-to-text": "9.0.5",
93:         "http-cookie-agent": "7.0.3",
94:         "https-proxy-agent": "7.0.6",
95:         "iconv-lite": "0.7.2",
96:         "imapflow": "1.2.10",
97:         "instagram-private-api": "1.46.1",
98:         "ioredis": "5.9.3",
99:         "ip-regex": "5.0.0",
100:         "jsdom": "27.0.0",
101:         "json-bigint": "1.0.0",
102:         "jsonpath-plus": "10.4.0",
103:         "jsrsasign": "11.1.1",
104:         "lru-cache": "11.2.6",
105:         "lz-string": "1.5.0",
106:         "mailparser": "3.9.3",
107:         "markdown-it": "14.1.1",
108:         "mixi2": "0.2.2",
109:         "narou": "2.0.1",
110:         "notion-to-md": "3.1.9",
111:         "oauth-1.0a": "2.2.6",
112:         "ofetch": "1.5.1",
113:         "otplib": "13.3.0",
114:         "p-map": "7.0.4",
115:         "pac-proxy-agent": "7.2.0",
116:         "proxy-chain": "2.7.1",
117:         "puppeteer-real-browser": "1.4.4",
118:         "query-string": "9.3.1",
119:         "rate-limiter-flexible": "9.1.1",
120:         "re2js": "1.2.2",
121:         "rebrowser-puppeteer": "24.8.1",
122:         "rfc4648": "1.5.4",
123:         "rss-parser": "3.13.0",
124:         "sanitize-html": "2.17.1",
125:         "simplecc-wasm": "1.1.1",
126:         "socks-proxy-agent": "8.0.5",
127:         "source-map": "0.7.6",
128:         "telegram": "2.26.22",
129:         "title": "4.0.1",
130:         "tldts": "7.0.23",
131:         "tosource": "2.0.0-alpha.3",
132:         "tough-cookie": "6.0.0",
133:         "tsx": "4.21.0",
134:         "twitter-api-v2": "1.29.0",
135:         "ufo": "1.6.3",
136:         "undici": "7.22.0",
137:         "uuid": "13.0.0",
138:         "winston": "3.19.0",
139:         "xxhash-wasm": "1.1.0",
140:         "youtube-caption-extractor": "1.9.1",
141:         "youtubei.js": "16.0.1",
142:         "zod": "4.3.6"
143:     },
144:     "devDependencies": {
145:         "@bbob/types": "4.3.1",
146:         "@cloudflare/containers": "0.1.0",
147:         "@cloudflare/puppeteer": "1.0.6",
148:         "@cloudflare/workers-types": "4.20260304.0",
149:         "@eslint/eslintrc": "3.3.4",
150:         "@eslint/js": "10.0.1",
151:         "@stylistic/eslint-plugin": "5.9.0",
152:         "@types/aes-js": "3.1.4",
153:         "@types/babel__preset-env": "7.10.0",
154:         "@types/crypto-js": "4.2.2",
155:         "@types/eslint": "9.6.1",
156:         "@types/etag": "1.8.4",
157:         "@types/fs-extra": "11.0.4",
158:         "@types/html-to-text": "9.0.4",
159:         "@types/js-beautify": "1.14.3",
160:         "@types/jsdom": "27.0.0",
161:         "@types/json-bigint": "1.0.4",
162:         "@types/jsrsasign": "10.5.15",
163:         "@types/mailparser": "3.4.6",
164:         "@types/markdown-it": "14.1.2",
165:         "@types/module-alias": "2.0.4",
166:         "@types/node": "25.3.0",
167:         "@types/sanitize-html": "2.16.0",
168:         "@types/supertest": "6.0.3",
169:         "@typescript-eslint/eslint-plugin": "8.56.1",
170:         "@typescript-eslint/parser": "8.56.1",
171:         "@vercel/nft": "1.3.2",
172:         "@vitest/coverage-v8": "4.0.9",
173:         "discord-api-types": "0.38.40",
174:         "domhandler": "5.0.3",
175:         "eslint": "10.0.2",
176:         "eslint-nibble": "9.1.1",
177:         "eslint-plugin-github": "6.0.0",
178:         "eslint-plugin-import-x": "4.16.1",
179:         "eslint-plugin-n": "17.24.0",
180:         "eslint-plugin-simple-import-sort": "12.1.1",
181:         "eslint-plugin-unicorn": "63.0.0",
182:         "eslint-plugin-yml": "3.3.0",
183:         "fs-extra": "11.3.3",
184:         "globals": "17.3.0",
185:         "got": "14.6.6",
186:         "husky": "9.1.7",
187:         "js-beautify": "1.15.4",
188:         "lint-staged": "16.2.7",
189:         "magic-string": "0.30.21",
190:         "mockdate": "3.0.5",
191:         "msw": "2.4.3",
192:         "node-network-devtools": "1.0.29",
193:         "oxfmt": "0.35.0",
194:         "remark-parse": "11.0.0",
195:         "supertest": "7.2.2",
196:         "tsdown": "0.20.3",
197:         "typescript": "5.9.3",
198:         "unified": "11.0.5",
199:         "vite-tsconfig-paths": "6.1.1",
200:         "vitest": "4.0.9",
201:         "wrangler": "4.68.1",
202:         "yaml-eslint-parser": "2.0.0"
203:     },
204:     "lint-staged": {
205:         "!(*.ts|*.tsx|*.js|*.yml)": [
206:             "oxfmt --no-error-on-unmatched-pattern"
207:         ],
208:         "*.{ts,tsx,js,yml}": [
209:             "eslint --cache --fix --concurrency auto",
210:             "oxfmt --no-error-on-unmatched-pattern"
211:         ]
212:     },
213:     "engines": {
214:         "node": "^22.20.0 || ^24"
215:     },
216:     "packageManager": "pnpm@10.30.1+sha512.3590e550d5384caa39bd5c7c739f72270234b2f6059e13018f975c313b1eb9fefcc09714048765d4d9efe961382c312e624572c0420762bdc5d5940cdf9be73a",
217:     "pnpm": {
218:         "onlyBuiltDependencies": [
219:             "bufferutil",
220:             "core-js",
221:             "es5-ext",
222:             "esbuild",
223:             "eslint-nibble",
224:             "msw",
225:             "protobufjs",
226:             "puppeteer",
227:             "rebrowser-puppeteer",
228:             "rolldown",
229:             "sharp",
230:             "sleep",
231:             "unrs-resolver",
232:             "utf-8-validate",
233:             "vue-demi",
234:             "workerd",
235:             "wrangler"
236:         ],
237:         "overrides": {
238:             "array-includes": "npm:@nolyfill/array-includes@^1",
239:             "array.prototype.findlastindex": "npm:@nolyfill/array.prototype.findlastindex@^1",
240:             "array.prototype.flat": "npm:@nolyfill/array.prototype.flat@^1",
241:             "array.prototype.flatmap": "npm:@nolyfill/array.prototype.flatmap@^1",
242:             "difflib": "https://codeload.github.com/postlight/difflib.js/tar.gz/32e8e38c7fcd935241b9baab71bb432fd9b166ed",
243:             "es-set-tostringtag": "npm:@nolyfill/es-set-tostringtag@^1",
244:             "google-play-scraper>got": "^14.6.4",
245:             "google-play-scraper>ramda": "^0.32.0",
246:             "google-play-scraper>tough-cookie": "^6.0.0",
247:             "hasown": "npm:@nolyfill/hasown@^1",
248:             "is-core-module": "npm:@nolyfill/is-core-module@^1",
249:             "object.assign": "npm:@nolyfill/object.assign@^1",
250:             "object.fromentries": "npm:@nolyfill/object.fromentries@^1",
251:             "object.groupby": "npm:@nolyfill/object.groupby@^1",
252:             "object.values": "npm:@nolyfill/object.values@^1",
253:             "request>form-data": "^2.5.5",
254:             "rss-parser@3.13.0>entities": "^7.0.0",
255:             "rss-parser@3.13.0>xml2js": "^0.6.2",
256:             "safe-buffer": "npm:@nolyfill/safe-buffer@^1",
257:             "safe-regex-test": "npm:@nolyfill/safe-regex-test@^1",
258:             "safer-buffer": "npm:@nolyfill/safer-buffer@^1",
259:             "side-channel": "npm:@nolyfill/side-channel@^1",
260:             "string.prototype.includes": "npm:@nolyfill/string.prototype.includes@^1",
261:             "string.prototype.trimend": "npm:@nolyfill/string.prototype.trimend@^1"
262:         },
263:         "patchedDependencies": {
264:             "rss-parser@3.13.0": "patches/rss-parser@3.13.0.patch"
265:         }
266:     }
267: }

(End of file - total 267 lines)
</content>
```

**Tool: bash**

**Input:**
```json
{
  "command": "node -v && pnpm -v 2>/dev/null || npm -v",
  "description": "Check Node and package manager versions"
}
```

**Output:**
```
v24.11.0
10.30.1

```

---

## Assistant (Orchestrator · anthropic/claude-opus-4.6 · 8.2s)

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/jasperl/Downloads/RSSHub-master-2/tsconfig.json"
}
```

**Output:**
```
<path>/Users/jasperl/Downloads/RSSHub-master-2/tsconfig.json</path>
<type>file</type>
<content>1: {
2:     "compilerOptions": {
3:         "target": "ESNext",
4:         "module": "ESNext",
5:         "moduleResolution": "bundler",
6:         "strict": true,
7:         "jsx": "react-jsx",
8:         "jsxImportSource": "hono/jsx",
9:         "paths": {
10:             "@/*": ["./lib/*"]
11:         },
12:         "esModuleInterop": true,
13:         "noImplicitAny": false,
14:         "outDir": "./dist",
15:         "skipLibCheck": true,
16:         "noEmit": true,
17:         "incremental": true,
18:         "resolveJsonModule": true,
19:         "isolatedModules": true
20:     },
21:     "include": ["./lib/**/*"],
22:     "exclude": ["node_modules", "*.test.*"]
23: }

(End of file - total 23 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/jasperl/Downloads/RSSHub-master-2/lib"
}
```

**Output:**
```
<path>/Users/jasperl/Downloads/RSSHub-master-2/lib</path>
<type>directory</type>
<entries>
api/
app-bootstrap.test.tsx
app-bootstrap.tsx
app.test.ts
app.ts
app.worker.tsx
assets/
config.remote-error.test.ts
config.test.ts
config.ts
container.ts
entrypoints.test.ts
errors/
index.test.ts
index.ts
middleware/
pkg.test.ts
pkg.ts
registry.dynamic.test.ts
registry.test.ts
registry.ts
route-paths.d.ts
router.js
routes-deprecated/
routes.test.ts
routes/
server.ts
setup.test.ts
shims/
types.ts
utils/
views/
worker.ts
worker.worker.test.ts

(34 entries)
</entries>
```

**Tool: bash**

**Input:**
```json
{
  "command": "ls -la node_modules/.pnpm 2>/dev/null | head -5 || echo \"node_modules not installed\"",
  "description": "Check if dependencies are installed"
}
```

---

## Assistant (Orchestrator · anthropic/claude-opus-4.6 · 8.3s)

_Thinking:_

Dependencies aren't installed. Let me check some more details and give the user a summary.

**Tool: bash**

**Input:**
```json
{
  "command": "ls node_modules 2>/dev/null | head -3 || echo \"NO_NODE_MODULES\"",
  "description": "Verify node_modules existence"
}
```

**Output:**
```


<system-reminder>
[category-skill-reminder] You are the orchestrator — your primary role is to delegate, not to do direct work.

You have used direct work tools 3+ times in this session without delegating. Consider delegating to a specialized agent instead.

Available subagents:
  - orchestrator (primary): Powerful AI orchestrator. Plans obsessively with todos, assesses search complexity before exploration, delegates strategically via category+skills combinations.
  - explore (subagent): Contextual grep for codebases. Answers 'Where is X?', 'Which file has Y?', 'Find the code that does Z'. Fire multiple in parallel for broad searches.
  - deep (primary): Autonomous Deep Worker - goal-oriented execution with medium reasoning. Explores thoroughly before acting, uses explore/librarian agents for comprehensive context, completes tasks end-to-end.
  - executor (subagent): Focused task executor. Executes delegated tasks directly without spawning other agents. Records learnings to notepad. Never modifies plan files.
  - plan-consultant (subagent): Pre-planning consultant that analyzes requests to identify hidden intentions, ambiguities, and AI failure points before planning begins.
  - oracle (subagent): Read-only consultation agent. High-IQ reasoning specialist for debugging hard problems and high-difficulty architecture design.
  - planner (subagent): Strategic work planner. Creates detailed plans with dependency graphs, parallel execution waves, and category/skill recommendations. NEVER writes code.
  - plan-executor (subagent): Master Orchestrator - completes ALL tasks in a work plan via task() delegation. Conductor, not musician. Delegates, coordinates, and verifies. Never writes code directly.
  - librarian (subagent): Specialized codebase understanding agent for multi-repository analysis, searching remote codebases, retrieving official documentation, and finding implementation examples using GitHub CLI, Context7, and Web Search.
  - plan-reviewer (subagent): Rigorous work plan reviewer - verifies executability, reference validity, and documentation completeness with strict quality standards.
  - multimodal (subagent): Analyze media files (PDFs, images, diagrams) that require interpretation beyond raw text. Extracts specific information, describes visual content. Saves context tokens by processing files the main agent can't.

Available skill categories:
  - ui-ux-pro-max: UI/UX design intelligence. 50 styles, 21 palettes, 50 font pairings, 20 charts, 9 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui). Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, check UI/UX code. Projects: website, landing page, dashboard, admin panel, e-commerce, SaaS, portfolio, blog, mobile app, .html, .tsx, .vue, .svelte. Elements: button, modal, navbar, sidebar, card, table, form, chart. Styles: glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, responsive, skeuomorphism, flat design. Topics: color palette, accessibility, animation, layout, typography, font pairing, spacing, hover, shadow, gradient. Integrations: shadcn/ui MCP for component search and examples.
  - using-git-worktrees: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees with smart directory selection and safety verification
  - init: Initialize a new repository with AGENTS.md
  - agent-browser: Browser automation CLI for AI agents. Use when the user needs to interact with websites, including navigating pages, filling forms, clicking buttons, taking screenshots, extracting data, testing web apps, or automating any browser task. Triggers include requests to "open a website", "fill out a form", "click a button", "take a screenshot", "scrape data from a page", "test this web app", "login to a site", "automate browser actions", or any task requiring programmatic web interaction.
  - test-driven-development: Use when implementing any feature or bugfix, before writing implementation code
  - prompt-refiner: Refine prompts for Claude, GPT, and Gemini models using each family's best practices. Use when asked to improve, refine, rewrite, or optimize any prompt — auto-detects the target model or asks if unclear.
  - tui-application-playbook: |
  - fixing-motion-performance: Audit and fix animation performance issues including layout thrashing, compositor properties, scroll-linked motion, and blur effects. Use when animations stutter, transitions jank, or reviewing CSS/JS animation performance.
  - systematic-debugging: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
  - animejs: Use when creating JavaScript animations with Anime.js v4, implementing web animations, or when user mentions anime.js/animejs. Triggers on v3 code symptoms: anime() instead of animate(), translateX instead of x, easeOutExpo instead of outExpo, anime.timeline() instead of createTimeline(). Also triggers on: CSS animation, SVG animation, scroll-driven animation, drag interaction, text splitting, layout FLIP, spring physics, stagger patterns in JavaScript.
  - threejs-shaders: Three.js shaders - GLSL, ShaderMaterial, uniforms, custom effects. Use when creating custom visual effects, modifying vertices, writing fragment shaders, or extending built-in materials.
  - threejs-lighting: Three.js lighting - light types, shadows, environment lighting. Use when adding lights, configuring shadows, setting up IBL, or optimizing lighting performance.
  - coding-standards: Universal coding standards, best practices, and patterns for TypeScript, JavaScript, React, and Node.js development.
  - refactoring-playbook: |
  - threejs-geometry: Three.js geometry creation - built-in shapes, BufferGeometry, custom geometry, instancing. Use when creating 3D shapes, working with vertices, building custom meshes, or optimizing with instanced rendering.
  - threejs-interaction: Three.js interaction - raycasting, controls, mouse/touch input, object selection. Use when handling user input, implementing click detection, adding camera controls, or creating interactive 3D experiences.
  - 12-principles-of-animation: Audit animation code against Disney's 12 principles adapted for web. Use when reviewing motion, implementing animations, or checking animation quality. Outputs file:line findings.
  - threejs-postprocessing: Three.js post-processing - EffectComposer, bloom, DOF, screen effects. Use when adding visual effects, color grading, blur, glow, or creating custom screen-space shaders.
  - web-design-guidelines: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
  - using-superpowers: Use when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions
  - dispatching-parallel-agents: Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies
  - rams: Use when UI components have missing ARIA labels, removed focus outlines, color-only status indicators, unlabeled form inputs, low contrast ratios, inconsistent spacing or typography, missing interactive states, or when asked to audit accessibility or visual design quality.
  - human-writing: |
  - find-skills: Helps users discover and install agent skills when they ask questions like "how do I do X", "find a skill for X", "is there a skill that can...", or express interest in extending capabilities. This skill should be used when the user is looking for functionality that might exist as an installable skill.
  - baseline-ui: Validates animation durations, enforces typography scale, checks component accessibility, and prevents layout anti-patterns in Tailwind CSS projects. Use when building UI components, reviewing CSS utilities, styling React views, or enforcing design consistency.
  - executing-plans: Use when you have a written implementation plan to execute in a separate session with review checkpoints
  - motion: Animates React, Vue, and JavaScript UIs with gestures, scroll effects, spring physics, and layout transitions. Use when building drag-and-drop, hover effects, scroll animations, modals, carousels, or troubleshooting AnimatePresence exit issues.
  - finishing-a-development-branch: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup
  - backend-patterns: Backend architecture patterns, API design, database optimization, and server-side best practices for Node.js, Express, and Next.js API routes.
  - threejs-loaders: Three.js asset loading - GLTF, textures, images, models, async patterns. Use when loading 3D models, textures, HDR environments, or managing loading progress.
  - browser-navigation: |
  - threejs-animation: Three.js animation - keyframe animation, skeletal animation, morph targets, animation mixing. Use when animating objects, playing GLTF animations, creating procedural motion, or blending animations.
  - skill-creation: |
  - wcag-audit-patterns: Conduct WCAG 2.2 accessibility audits with automated testing, manual verification, and remediation guidance. Use when auditing websites for accessibility, fixing WCAG violations, or implementing accessible design patterns.
  - skill-creator: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Claude's capabilities with specialized knowledge, workflows, or tool integrations.
  - canvas-design: Create beautiful visual art in .png and .pdf documents using design philosophy. You should use this skill when the user asks to create a poster, piece of art, design, or other static piece. Create original visual designs, never copying existing artists' work to avoid copyright violations.
  - mapcn-docs: Use when building documentation sites with live code previews, component library docs, API reference pages, or interactive code examples using Next.js App Router and shadcn/ui.
  - full-stack-playbook: |
  - next-best-practices: Next.js best practices - file conventions, RSC boundaries, data patterns, async APIs, metadata, error handling, route handlers, image/font optimization, bundling
  - brainstorming: You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation.
  - continuous-learning-v2: Instinct-based learning system that observes sessions via hooks, creates atomic instincts with confidence scoring, and evolves them into skills/commands/agents.
  - fixing-accessibility: Audit and fix HTML accessibility issues including ARIA labels, keyboard navigation, focus management, color contrast, and form errors. Use when adding interactive controls, forms, dialogs, or reviewing WCAG compliance.
  - karpathy-guidelines: Behavioral guidelines to reduce common LLM coding mistakes. Use when writing, reviewing, or refactoring code to avoid overcomplication, make surgical changes, surface assumptions, and define verifiable success criteria.
  - tdd-workflow: Use this skill when writing new features, fixing bugs, or refactoring code. Enforces test-driven development with 80%+ coverage including unit, integration, and E2E tests.
  - threejs-fundamentals: Three.js scene setup, cameras, renderer, Object3D hierarchy, coordinate systems. Use when setting up 3D scenes, creating cameras, configuring renderers, managing object hierarchies, or working with transforms.
  - writing-plans: Use when you have a spec or requirements for a multi-step task, before touching code
  - next-upgrade: Upgrade Next.js to the latest version following official migration guides and codemods
  - requesting-code-review: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
  - frontend-design: |
  - receiving-code-review: Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementation
  - opencode-session-navigation: >-
  - writing-skills: Use when creating new skills, editing existing skills, or verifying skills work before deployment
  - tuistory: |
  - vercel-react-best-practices: React and Next.js performance optimization guidelines from Vercel Engineering. This skill should be used when writing, reviewing, or refactoring React/Next.js code to ensure optimal performance patterns. Triggers on tasks involving React components, Next.js pages, data fetching, bundle optimization, or performance improvements.
  - browser-use: Automates browser interactions for web testing, form filling, screenshots, and data extraction. Use when the user needs to navigate websites, interact with web pages, fill forms, take screenshots, or extract information from web pages.
  - next-cache-components: Next.js 16 Cache Components - PPR, use cache directive, cacheLife, cacheTag, updateTag
  - threejs-textures: Three.js textures - texture types, UV mapping, environment maps, texture settings. Use when working with images, UV coordinates, cubemaps, HDR environments, or texture optimization.
  - frontend-patterns: Frontend development patterns for React, Next.js, state management, performance optimization, and UI best practices.
  - verification-before-completion: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always
  - fixing-metadata: >
  - subagent-driven-development: Use when executing implementation plans with independent tasks in the current session
  - threejs-materials: Three.js materials - PBR, basic, phong, shader materials, material properties. Use when styling meshes, working with textures, creating custom shaders, or optimizing material performance.
  - memory-capture: Capture and save memories when user says remember, note, or save this. Auto-triggers on # prefix or phrase triggers.

RECOMMENDED: Use delegate_task to assign work to the appropriate subagent.
</system-reminder>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/jasperl/Downloads/RSSHub-master-2/lib/routes"
}
```

**Output:**
```
<path>/Users/jasperl/Downloads/RSSHub-master-2/lib/routes</path>
<type>directory</type>
<entries>
005/
0818tuan/
0x80/
0xxx/
10000link/
10jqka/
121/
12306/
12371/
141jav/
141ppv/
163/
18comic/
199it/
19lou/
1lou/
1point3acres/
1x/
2023game/
2048/
21caijing/
2cycd/
30secondsofcode/
36kr/
3dmgame/
3kns/
423down/
4gamers/
4khd/
4ksj/
4kup/
500px/
50forum/
51cto/
51read/
52hrtt/
56kog/
591/
5eplay/
5music/
69shu/
6park/
6v123/
78dm/
7mmtv/
81/
8264/
8kcos/
8world/
91porn/
95mm/
9to5/
a9vg/
aa1/
aamacau/
abc/
abmedia/
abskoop/
academia/
accessbriefing/
acfun/
acg17/
acgvinyl/
acpaa/
acs/
adquan/
aeaweb/
aeon/
afdian/
aflcio/
afr/
agefans/
agirls/
agora0/
agri/
ahjzu/
ai-bot/
aiaa/
aibase/
aiblog-2xv/
aicaijing/
aiea/
aijishu/
ainvest/
aip/
air-level/
airchina/
aisixiang/
ajcass/
ajmide/
ali213/
alicesoft/
alipan/
aliresearch/
alistapart/
aliyun/
aljazeera/
ally/
alpinelinux/
alternativeto/
altotrain/
alwayscontrol/
amazfitwatchfaces/
amazon/
amz123/
android/
anime1/
annualreviews/
anquanke/
anthropic/
anytxt/
apache/
apiseven/
apkpure/
apnews/
apnic/
app-center/
app-sales/
apple/
appleinsider/
appstare/
appstore/
appstorrent/
aqara/
aqicn/
arcteryx/
artstation/
asiafruitchina/
asianfanfics/
asiantolick/
asmr-200/
asus/
atcoder/
atptour/
augmentcode/
auto-stats/
autocentre/
azul/
azurlane/
baai/
backlinko/
bad/
baidu/
baijing/
bakamh/
bandcamp/
bandisoft/
bangumi.moe/
bangumi.online/
bangumi.tv/
banshujiang/
banyuetan/
baobua/
baoyu/
baozimh/
barronschina/
baselang/
bast/
bbc/
bbcnewslabs/
bc3ts/
bdys/
behance/
beijingprice/
bellroy/
bendibao/
bestblogs/
bestofjs/
bfl/
bgmlist/
bigquant/
bilibili/
binance/
bing/
biodiscover/
bioone/
biquge/
bit/
bitbucket/
bitget/
bitmovin/
bjfu/
bjnews/
bjp/
bjsk/
bjtu/
bjwxdxh/
bjx/
blizzard/
blockworks/
blogread/
bloomberg/
bluearchive/
bluestacks/
bmkg/
bnext/
bntnews/
bnu/
boc/
bookfere/
bookwalker/
booru/
bossdesign/
brave/
brooklynmuseum/
bse/
bsky/
bt0/
btbtla/
btzj/
buaa/
buct/
bugzilla/
bulianglin/
bullionvault/
bupt/
bvisness/
bwsg/
byau/
byteclicks/
bytes/
c114/
caai/
caam/
caareviews/
cags/
cahkms/
caijing/
caixin/
caixinglobal/
camchina/
canada.ca/
cankaoxiaoxi/
capitalmind/
cara/
carousell/
cartoonmad/
cas/
casssp/
cast/
catti/
cau/
caus/
cbaigui/
cbc/
cbirc/
cbndata/
cbnweek/
cbpanet/
ccac/
ccagm/
cccfna/
cccmc/
ccf/
ccfa/
ccg/
ccmn/
ccnu/
ccreports/
cctv/
cde/
cdi/
cdu/
cdzjryb/
ce/
cebbank/
ceph/
cfachina/
cffex/
cfmmc/
cfr/
cgtn/
chaincatcher/
changba/
chaoxing/
chaping/
cherrytimes/
chiculture/
chikubi/
china/
chinacdc/
chinadaily/
chinadegrees/
chinafactcheck/
chinaisa/
chinamoney/
chinanews/
chinania/
chinaratings/
chinathinktanks/
chinatimes/
chinaventure/
chinawriter/
chiphell/
chlinlearn/
chnmuseum/
chocolatey/
chongbuluo/
chongdiantou/
chsi/
chuanliu/
chuapp/
chub/
cib/
cih-index/
ciidbnu/
cisia/
civitai/
ciweimao/
cjlu/
clickme/
cline/
cloudflarestatus/
cloudnative/
cls/
cma/
cmde/
cmpxchg8b/
cmu/
cn-healthcare/
cna/
cnbc/
cnbeta/
cnblogs/
cncf/
cneb/
cngal/
cngold/
cnjxol/
cnki/
cnljxh/
cntheory/
cntv/
cnu/
cockroachlabs/
codefather/
codeforces/
cognition/
cohere/
coindesk/
cointelegraph/
colamanga/
collabo-cafe/
comic-fuz/
comicat/
comicskingdom/
commonhealth/
consumer/
cool18/
coolapk/
coolbuy/
coolidge/
coolpc/
coomer/
copymanga/
cosplaytele/
costar/
counter-strike/
cpcaauto/
cpcey/
cpta/
cpuid/
cqgas/
cqu/
cqwu/
crac/
creative-comic/
crossbell/
crush/
cryptoslate/
cs/
csdn/
css-tricks/
cssn/
cste/
csu/
csust/
ctbu/
ctinews/
cts/
cuc/
cuilingmag/
cupl/
curiouscat/
curius/
cursor/
cw/
cybersecurityventures/
cyzone/
cztv/
dahecube/
daily/
dailypush/
damai/
dangdang/
daoxuan/
dapenti/
darwinawards/
dataguidance/
daum/
dayanzai/
dbaplus/
dblp/
dcard/
dcfever/
ddosi/
deadbydaylight/
deadline/
dealstreetasia/
decrypt/
dedao/
deepin/
deepl/
deeplearning/
deepmind/
deepseek/
dehenglaw/
deltaio/
denonbu/
dev.to/
devolverdigital/
devtrium/
dewu/
dgjyw/
dgtle/
dgut/
dhu/
diandong/
dianping/
diariofruticola/
diershoubing/
digg/
digitalcameraworld/
digitalpolicyalert/
dingshao/
discord/
discourse/
discuz/
disinfo/
diskanalyzer/
distill/
dlnews/
dlsite/
dmzj/
dn/
dnaindia/
dockerhub/
docschina/
dol/
domp4/
dongqiudi/
dora-world/
dorohedoro/
douban/
douyin/
douyu/
dribbble/
dtcj/
duckdb/
duozhi/
duozhuayu/
dushu/
dut/
dw/
dx2025/
dxy/
dykszx/
dytt/
e-hentai/
ea/
eagle/
earthquake/
eastday/
eastmoney/
easynomad/
ebc/
ecnu/
economist/
ecust/
eeo/
egsea/
ehentai/
ekantipur/
elamigos/
elasticsearch-cn/
elecfans/
eleduck/
elsevier/
embassy/
engineering/
englishhome/
enterprisecraftsmanship/
epicgames/
eprice/
eshukan/
espn/
esquirehk/
europechinese/
eventbrite/
eventernote/
everia/
expats/
f-droid/
f95zone/
famitsu/
fanbox/
fangchan/
fanqienovel/
fansly/
fantia/
fantube/
fanxinzhui/
farcaster/
farmatters/
fashionnetwork/
fastbull/
fda/
fediverse/
feng/
ff14/
fffdm/
finology/
finviz/
firecore/
firefox/
fisher-spb/
fishshell/
fjksbm/
flashcat/
flyert/
focustaiwan/
follow/
followin/
foodtalks/
foreignaffairs/
foresightnews/
foreverblog/
forklog/
fortnite/
fortunechina/
fosshub/
free/
freebuf/
freecomputerbooks/
freewechat/
freexcomic/
ft/
ftchinese/
ftm/
fuliba/
furaffinity/
furstar/
futunn/
fx-markets/
fx678/
fxiaoke/
fzmtr/
galxe/
gameapps/
gamebase/
gamegene/
gamekee/
gamer/
gamer520/
gamersecret/
gamersky/
gamme/
ganjingworld/
gaoyu/
gc.ca/
gcores/
gdsrx/
gdufs/
gdut/
geekpark/
gelbooru/
gelonghui/
genossenschaften/
geocaching/
gesiba/
getdr/
getitfree/
gettr/
gf-cn/
gihyo/
gisreportsonline/
gitcode/
gitee/
github/
gitkraken/
gitpod/
gitstar-ranking/
globallawreview/
gmcmonline/
gmu/
go/
gocn/
gofans/
gogoanimehd/
google/
gov/
gq/
grainoil/
greasyfork/
grist/
grubstreet/
gs/
guancha/
guangdiu/
guangzhoumetro/
guanhai/
guduodata/
gumroad/
guokr/
guozaoke/
gxmzu/
gzdaily/
gzhu/
hackernews/
hackertalk/
hacking8/
hackmd/
hackyournews/
hafu/
hakkatv/
hamel/
hameln/
hanime1/
harvard/
hashnode/
hbooker/
hbr/
hdu/
healthz.ts
hebtv/
hedwig/
hellobtc/
hellogithub/
hex-rays/
hexun/
hfut/
hicairo/
hinatazaka46/
hiring.cafe/
hit/
hitcon/
hitsz/
hitwh/
hizu/
hk01/
hkej/
hkepc/
hket/
hkjunkcall/
hko/
hkushop/
hlju/
hljucm/
hnrb/
hnu/
home-assistant/
hongkong/
hostmonit/
hottoys/
hotukdeals/
houxu/
howtoforge/
hoyolab/
hpoi/
hrbeu/
hrbust/
huanqiu/
huawei/
hubu/
hudsonrivertrading/
huggingface/
huijin-inv/
huitun/
hunanpea/
hunau/
huoxian/
hupu/
hust/
huxiu/
hyperdash/
hypergryph/
i-cable/
ianspriggs/
icac/
icbc/
idaily/
idolmaster/
idolypride/
ieee-security/
ieee/
iehou/
ielts/
ifanr/
ifeng/
ifi-audio/
ifun/
iguoguo/
iheima/
iiilab/
ikea/
iknowwhatyoudownload/
imagemagick/
imdb/
imhcg/
imiker/
immich/
imop/
index.tsx
indianexpress/
indiansinkuwait/
indienova/
inewsweek/
infoq/
informs/
infzm/
inoreader/
inspirehep/
instagram/
instructables/
investor/
iplaysoft/
ippa/
ipsw.dev/
ipsw/
iqilu/
iqiyi/
iqnew/
iresearch/
isct/
issuehunt/
itc/
itch/
ithome/
iwara/
ixigua/
j-test/
jamesclear/
jandan/
japanpost/
javbus/
javdb/
javlibrary/
javtiful/
javtrailers/
jbma/
jd/
jetbrains/
jewishmuseum/
jianshu/
jiaoliudao/
jiemian/
jike/
jimmyspa/
jin10/
jingzhengu/
jinritemai/
jinse/
jisilu/
jiuyangongshe/
jjwxc/
jl1mall/
jlu/
joins/
joneslanglasalle/
jornada/
joshwcomeau/
jou/
jpmorganchase/
jpxgmn/
jrj/
jseea/
jsu/
juejin/
jumeili/
jump/
junhe/
kadokawa/
kaipanla/
kakuyomu/
kamen-rider-official/
kantarworldpanel/
kanxue/
kaopu/
kbs/
kcna/
ke/
keep/
keepass/
kelownacapnews/
kemono/
kepu/
keylol/
kimlaw/
kiro/
kisskiss/
komiic/
konachan/
konghq/
koreaherald/
kovidgoyal/
koyso/
kpmg/
kpopping/
ktown4u/
kuaidi100/
kuaishou/
kunchengblog/
kurogames/
kuwaitlocal/
kyodonews/
laimanhua/
lala/
lancedb/
landiannews/
lang/
langchain/
lanqiao/
laohu8/
last-origin/
latepost/
layoffs/
leagueoflegends/
learnblockchain/
learnku/
leetcode/
leiphone/
lemmy/
lenovo/
lens/
lephoceen/
letterboxd/
lfsyd/
lhratings/
lianxh/
lifeweek/
lightnovel/
likeshop/
line/
lineageos/
link3/
linkedin/
linkresearcher/
linovelib/
liquipedia/
literotica/
liulinblog/
liveuamap/
lkong/
lmu/
lofter/
logclub/
logonews/
logrocket/
loltw/
loongarch/
lorientlejour/
lovelive-anime/
lrepacks/
lsnu/
ltaaa/
luma/
luogu/
luolei/
luxiangdong/
lvv2/
lxixsxa/
m-78/
m4/
maccms/
macfilos/
macmenubar/
macupdate/
magazinelib/
magnumphotos/
mail/
makerworld/
malaysiakini/
mangadex/
manhuagui/
manus/
manyvids/
maoyan/
mashiro/
mastodon/
mathpix/
matters/
maven/
mckinsey/
mcmod/
mdpi/
medieval-china/
medium/
medsci/
meishichina/
meituan/
melonbooks/
mercari/
meta/
metacritic/
meteoblue/
meteor/
metmuseum/
metrics.ts
mi/
microsoft/
mihoyo/
mindmeister/
minecraft/
mingpao/
miniflux/
mirror/
mirrormedia/
missav/
misskey/
misskon/
mit/
mittrchina/
miui/
mixcloud/
mixi2/
miyuki/
modb/
modelscope/
modian/
modrinth/
mohw/
moodysmismicrosite/
mox/
mpaypass/
mrdx/
mrinalxdev/
mrm/
msn/
musify/
musikguru/
mwm/
my-formosa/
mycard520/
mydrivers/
myfans/
myfigurecollection/
mygopen/
mymusicsheet/
mysql/
nankai/
nasa/
natgeo/
nationalgeographic/
naturalism/
nature/
nautil/
nautiljon/
nbd/
nber/
ncc-cma/
ncepu/
ncku/
ncpssd/
ncu/
ncwu/
ndss-symposium/
neatdownloadmanager/
neea/
nenu/
netflav/
netflix/
neu/
newmuseum/
newrank/
news/
newseed/
newslaundry/
newsmarket/
newswav/
newyorker/
newzmz/
nextapple/
nextjs/
nga/
ngocn2/
nhentai/
nhk/
niaogebiji/
nicovideo/
nielsberglund/
nifd/
nikkei/
nintendo/
nio/
nippon/
njglyy/
njit/
njnu/
nju/
njucm/
njuferret/
njupt/
njust/
njxzc/
nlc/
nltimes/
nmc/
nmtv/
nodejs/
nogizaka46/
nosec/
notateslaapp/
notefolio/
notion/
now/
nowcoder/
npm/
npr/
ntdm/
ntdtv/
ntrblog/
nua/
nuaa/
nudt/
nuist/
nwafu/
nwnu/
nyaa/
nyc/
nycu/
nymity/
nytimes/
obsidian/
oceanengine/
oct0pu5/
odaily/
oeeee/
oesw/
oevw/
oilchem/
okx/
olevod/
ollama/
oncc/
onehu/
onet/
oo-software/
openai/
openalex/
openrice/
openwrt/
orcid/
oreno3d/
ornl/
oschina/
oshwhub/
osu/
otobanana/
ouc/
oup/
outagereport/
p-articles/
pacilution/
panewslab/
papers/
paradigm/
parliament.uk/
parliament/
patagonia/
patreon/
paulgraham/
pconline/
pencilnews/
penguin-random-house/
people/
peopo/
perplexity/
phoronix/
pianyivps/
pianyuan/
picnob.info/
picnob/
picuki/
pikabu/
pincong/
pingwest/
pinterest/
pixabay/
pixelstech/
pixiv/
pixivision/
piyao/
pkmer/
pku/
playno1/
playpcesor/
plurk/
pnas/
podwise/
pornhub/
postman/
priconne-redive/
producereport/
producthunt/
ps/
psnine/
psyche/
pts/
publico/
pubmed/
pubscholar/
pumc/
putty/
pwc/
python/
qbitai/
qbittorrent/
qdu/
qianp/
qianzhan/
qiche365/
qidian/
qingting/
qipamaijia/
qiyoujiage/
qlu/
qm120/
qoo-app/
qq/
qq88/
qqorw/
qstheory/
quantamagazine/
questmobile/
questn/
quicker/
qust/
qweather/
qwenlm/
qztc/
radio-canada/
radio/
railway/
rarehistoricalphotos/
raspberrypi/
rattibha/
rawkuma/
raycast/
react/
reactiflux/
reactnewsletter/
readhub/
readsomethingwonderful/
readwise/
rebase/
remnote/
researchgate/
resetera/
resonac/
reuters/
rfa/
rfi/
right/
robots.txt.ts
rockthejvm/
rodong/
routledge/
rsc/
rss3/
rsshub/
ruancan/
ruankao/
ruc/
runtrail/
rustcc/
sakurazaka46/
samd/
samrdprc/
samsung/
sankei/
sara/
saraba1st/
sass/
scau/
science/
sciencedirect/
sciencenet/
scientificamerican/
scitechvista/
scmp/
scnu/
scoop/
scpta/
sctv/
scu/
scut/
scvtc/
sdo/
sdu/
sdust/
sdzk/
sec-in/
sec-wiki/
secretsanfrancisco/
secrss/
seekingalpha/
sega/
segmentfault/
sehuatang/
semiconductors/
sensortower/
setn/
seu/
sfacg/
shcstheatre/
shiep/
shisu/
shmeea/
shmtu/
shoac/
shopback/
shopify/
shoppingdesign/
showstart/
shu/
shuiguopai/
sicau/
sigsac/
simpleinfo/
sina/
sinchew/
sis001/
sjtu/
skeb/
skebetter/
sketis/
skysports/
slashdot/
slowmist/
smartlink/
smashingmagazine/
smzdm/
snnu/
snowpeak/
sobooks/
sogou/
sohu/
solidot/
sony/
sorrycc/
sotwe/
soundofhope/
soundon/
sourceforge/
southcn/
spankbang/
spglobal/
spotify/
springer/
sputniknews/
sqmc/
sse/
ssm/
sspai/
sspu/
stanford/
startuplatte/
stbu/
stcn/
stdaily/
steam/
stheadline/
stockedge/
storm/
storyfm/
straitstimes/
stratechery/
stream-capital/
studygolang/
subhd/
substack/
supchina/
supercell/
surfshark/
sustainabilitymag/
sustech/
swissinfo/
swjtu/
swpu/
sycl/
syosetu/
sysu/
szftedu/
szse/
szu/
t66y/
tableau/
tailwindcss/
taiwanmobile/
taiwannews/
tangshufang/
taobao/
taoguba/
taptap/
tass/
tctmd/
techcrunch/
techflowpost/
techpowerup/
techsir/
telecompaper/
telegram/
tencent/
tesla/
test/
tfc-taiwan/
tgbus/
the/
theatlantic/
theblock/
theblockbeats/
thebrain/
thecover/
thegadgetflow/
thegradient/
thehindu/
theinitium/
themoviedb/
thenewslens/
thepaper/
thepetcity/
theverge/
thewirehindi/
thoughtco/
thoughtworks/
threads/
thwiki/
thzt/
tidb/
tiddlywiki/
tiktok/
timednews/
tingshuitz/
tingtingfm/
tisi/
tju/
tkww/
tmtpost/
tokeninsight/
tongji/
tongli/
toodaylab/
tophub/
topys/
toranoana/
toutiao/
towardsdatascience/
tradingview/
transcriptforest/
transformer-circuits/
trendforce/
trendingpapers/
tribalfootball/
trow/
tsdm39/
tsinghua/
ttv/
tumblr/
tvb/
tver/
tvtropes/
twitch/
twitter/
twreporter/
txks/
txrjy/
tynu/
typeless/
typora/
typst/
u3c3/
u9a9/
uber/
ucas/
uchicago/
udn/
uestc/
uibe/
ulapia/
unipd/
uniqlo/
unraid/
unusualwhales/
upc/
ups/
uptimerobot/
uraaka-joshi/
urbandictionary/
usenix/
usepanda/
ustb/
ustc/
usts/
utgd/
uw/
v1tx/
v2ex/
v2rayshare/
vcb-s/
verfghbw/
vertikal/
vice/
vimeo/
visionias/
visualstudio/
vocus/
vom/
voronoiapp/
wabei/
wainao/
wallhaven/
wallpaperhub/
wallstreetcn/
wanqu/
warhammer-community/
warp/
warthunder/
washingtonpost/
wbv-gpa/
wchscu/
wdc/
wdfxw/
web/
web3caff/
webcatalog/
wechat/
weekendhk/
weibo/
wellcee/
wenku8/
wfdf/
wfu/
whitehouse/
who/
whu/
wiensued/
wikinews/
wikipedia/
windsurf/
winstall/
wired/
wise/
withgoogle/
wizfile/
wmc-bj/
wmpvp/
wnacg/
wogem/
wohnnet/
wordpress/
worldjournal/
worldofwarships/
woshipm/
wsj/
wsyu/
wtu/
wufazhuce/
wyzxwk/
wzu/
x-mol/
x410/
x6d/
xaufe/
xaut/
xbmu/
xbookcn/
xboxfan/
xianbao/
xiaoheihe/
xiaohongshu/
xiaomiyoupin/
xiaote/
xiaoyuzhou/
xiaozhuanlan/
xidian/
ximalaya/
xinpianchang/
xjtlu/
xjtu/
xkb/
xmanhua/
xmnn/
xmu/
xmut/
xsijishe/
xueqiu/
xunhupay/
xwenming/
xys/
xyu/
xyzrank/
yahoo/
yamap/
yamibo/
yande/
yangtzeu/
ycwb/
yenpress/
ygkkk/
yicai/
yilinzazhi/
ymgal/
yna/
ynet/
yoasobi-music/
yomiuri/
yomujp/
youku/
youmemark/
youtube/
youzhiyouxing/
yuanliao/
yuque/
yxdown/
yxdzqb/
yxrb/
yyets/
yystv/
zagg/
zaimanhua/
zaker/
zaobao/
zaozao/
zcmu/
zcool/
zed/
zhibo8/
zhihu/
zhitongcaijing/
zhiy/
zhizhuan100/
zhonglun/
zhubai/
zhujiceping/
zhuwang/
zimuxia/
zjgtjy/
zjol/
zju/
zjut/
zjuvag/
zodgame/
zongheng/
zotero/
zrblog/
zsxq/
zuel/
zuvio/
zxcs/
zyshow/
zyw/
zzu/

(1562 entries)
</entries>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/jasperl/Downloads/RSSHub-master-2/vitest.config.ts"
}
```

**Output:**
```
<path>/Users/jasperl/Downloads/RSSHub-master-2/vitest.config.ts</path>
<type>file</type>
<content>1: import tsconfigPaths from 'vite-tsconfig-paths';
2: import { configDefaults, defineConfig } from 'vitest/config';
3: 
4: export default defineConfig({
5:     plugins: [tsconfigPaths()],
6:     test: {
7:         watch: false,
8:         coverage: {
9:             include: ['lib/**/*.ts', 'lib/**/*.tsx'],
10:             exclude: ['lib/routes/**', 'lib/routes-deprecated/**'],
11:         },
12:         testTimeout: 10000,
13:         setupFiles: ['./lib/setup.test.ts'],
14:         exclude: [...configDefaults.exclude, './lib/setup.test.ts'],
15:     },
16: });

(End of file - total 16 lines)
</content>
```

---

## Assistant (Orchestrator · anthropic/claude-opus-4.6 · 19.1s)

_Thinking:_

Let me summarize what I found about the project. The user asked to "检查下项目" (check the project). Let me provide a concise summary.

Key findings:
1. **Project**: RSSHub - an RSS feed aggregator
2. **Tech Stack**: TypeScript, Hono (web framework), ESM modules, pnpm
3. **Node**: v24.11.0, pnpm 10.30.1
4. **Engine requirement**: Node ^22.20.0 || ^24 - compatible ✓
5. **Dependencies**: NOT installed (no node_modules)
6. **Routes**: 1562 route directories - massive codebase


7. **Build & tooling**: Uses tsdown for building, Vitest for testing with coverage, ESLint and oxfmt for linting
8. **Code quality**: Maintains strict TypeScript standards with linter configs, lint-staged, and husky hooks for pre-commit checks
9. **Not a git repo** according to the env info

**RSSHub 项目概览**

| 项 | 状态 |
|---|------|
| **项目** | RSSHub v1.0.0 — RSS 聚合器 |
| **Tech Stack** | TypeScript + Hono (web framework) + ESM |
| **Node** | v24.11.0 ✅ (要求 `^22.20.0 \|\| ^24`) |
| **包管理** | pnpm 10.30.1 ✅ |
| **依赖安装** | ❌ **未安装** (`node_modules` 不存在) |
| **Git** | ❌ 不是 git 仓库 |
| **路由数** | **1562** 个 route 目录 |
| **构建** | tsdown (多配置: vercel/worker/container/lib) |
| **测试** | Vitest + coverage-v8 |
| **Lint** | ESLint + oxfmt + lint-staged + Husky |
| **TypeScript** | strict 模式, `noEmit`, bundler resolution |

**代码规范评估: Disciplined** — 有完整的 linter/formatter 配置、lint-staged hooks、strict TS、详尽的 AGENTS.md review guidelines。

**需要操作:**
1. 运行 `pnpm install` 安装依赖
2. 如果需要版本控制，需要 `git init`

要我安装依赖吗？

---

