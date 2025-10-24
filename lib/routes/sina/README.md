## 新浪路由抓取方法总览

本文档总结本项目内与新浪相关的路由实现、数据来源与提取差异，便于维护与扩展。

### 范围

- `sina/rollnews` 滚动新闻（含多频道）
- `sina/discovery` 科技-科学探索（多分类）
- `sina/finance/china` 财经-国内（多频道）
- `sina/sports` 体育（多分类）
- `sina/zhibo` 7x24 财经直播

### 抓取来源与核心流程

- 滚动/频道类（rollnews、discovery、finance/china、sports）

    1. 列表页：请求滚动接口 `https://feed.mix.sina.com.cn/api/roll/get`（或抓静态频道页）获取条目列表。
    2. 详情页：逐条请求文章详情页 HTML，使用 `cheerio` 抽取正文与元信息（作者/时间/关键词）。
    3. 多媒体特殊处理：
        - 幻灯页（`slide.sports.sina.com.cn` / `slide.tech.sina.com.cn`）：解析内联 `slide_data`，用模板 `templates/slide.art` 渲染图片列表。
        - 视频页（`video.sina.com.cn`）：调用 `https://api.ivideo.sina.com.cn/public/video/play` 获取海报与 MP4，使用模板 `templates/video.art` 嵌入。
        - 常规新闻页：优先 `#article`，否则 `#artibody`。

- 7x24 财经直播（`sina/zhibo`）
    1. 列表页：请求 `https://zhibo.sina.com.cn/api/zhibo/feed` 获取直播流，核心字段为 `rich_text`（可能含 HTML 片段）。
    2. 条目链接：为每条构造 7x24 单条详情链接 `https://finance.sina.com.cn/7x24/sina-finance-zhibo-<id>`，便于查看上下文（总页见 [`https://finance.sina.com.cn/7x24/`](https://finance.sina.com.cn/7x24/)）。
    3. 图片补充（“一图看懂”）：若 `rich_text` 不含图片但文本包含“一图看懂”，则抓取详情页并解析 `og:image`/`twitter:image`，将图片以 `<img>` 附加到 `description`。为兼容显式防盗链，图片标签带 `referrerpolicy="no-referrer"`。

### 路由与实现文件

- `sina/rollnews` → `lib/routes/sina/rollnews.ts`

    - 列表/详情工具：`lib/routes/sina/utils.ts` 中的 `getRollNewsList`、`parseRollNewsList`、`parseArticle`
    - 多媒体模板：`lib/routes/sina/templates/slide.art`、`lib/routes/sina/templates/video.art`

- `sina/discovery` → `lib/routes/sina/discovery.ts`（复用 `utils.ts`）
- `sina/finance/china` → `lib/routes/sina/finance/china.ts`（复用 `utils.ts`）
- `sina/sports` → `lib/routes/sina/sports.ts`（频道页抓取 + 详情复用 `utils.ts`）
- `sina/zhibo` → `lib/routes/sina/finance/zhibo.ts`

### 统一抓取方法的差异点

| 维度      | 滚动/频道类（rollnews/discovery/finance/sports）             | 7x24 财经直播（zhibo）                                                     |
| --------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| 列表来源  | `feed.mix.sina.com.cn/api/roll/get` 或频道页 DOM             | `zhibo.sina.com.cn/api/zhibo/feed`                                         |
| 条目标题  | 列表字段 `title`                                             | 由 `rich_text` 去标签截取（80 字内）                                       |
| 条目链接  | 列表字段 `url`（https 替换）                                 | 构造 `https://finance.sina.com.cn/7x24/sina-finance-zhibo-<id>`            |
| 内容抽取  | 访问详情页，按类型分支：幻灯/视频/常规正文                   | 直接使用 `rich_text`；必要时访问详情页补图                                 |
| 图片策略  | 幻灯解析 `slide_data`；常规正文内 `<img>` 原样；视频模板嵌入 | 优先 `rich_text` 自带 `<img>`；“一图看懂”额外抓 `og:image`/`twitter:image` |
| 反盗链    | 详情页图片通常同源可直接显示                                 | 追加图片使用 `referrerpolicy="no-referrer"` 降低防盗链风险                 |
| 依赖      | `cheerio`、`art` 模板、`got`                                 | `got`、`cheerio`（仅在补图时用）                                           |
| Puppeteer | 不需要                                                       | 不需要                                                                     |

### 参数与示例

- `GET /sina/rollnews/:lid?`（默认 `lid=2509` 全部）
- `GET /sina/discovery/:type`（如 `zx`/`twhk`/…）
- `GET /sina/finance/china/:lid?`（如 `1686` 国内滚动）
- `GET /sina/sports/:type?`（如 `ufc`/`winter`/`horse`）
- `GET /sina/zhibo/:zhibo_id?`（默认 `152` 财经）
    - 额外查询参数：`limit`（默认 20）、`pagesize`（1-10，默认 10）、`tag`（默认 0）、`dire`（`f`/`b`，默认 `f`）、`dpc`（默认 `1`）

### 已知边界

- 7x24 详情页若无 `og:image` 且页面完全依赖动态渲染，可能无法补图（不影响文本）。
- 新浪若调整 7x24 单条链接格式（`sina-finance-zhibo-<id>`），需同步更新。
- 个别频道正文结构差异较大（如专题页），可能需要按频道扩展解析逻辑。

### 参考

- 7x24 列表页：[`https://finance.sina.com.cn/7x24/`](https://finance.sina.com.cn/7x24/)
- 在线预览示例（财经直播）：[`https://rss-hub-topaz-ten.vercel.app/sina/zhibo`](https://rss-hub-topaz-ten.vercel.app/sina/zhibo)

### 变更记录（摘）

- 2025-10-27：新增 `sina/finance/724` 移动端财经快讯接口，支持直接获取股票涨跌幅
- 2025-08-11：`sina/zhibo` 补充条目详情链接，并为包含"一图看懂"的条目抓取详情页 `og:image`/`twitter:image` 以追加展示。

---

## 新浪财经724接口 - 移动端快讯

### 🚀 快速开始

#### 基础使用

```
GET /sina/finance/724
```

获取最新的财经快讯（默认20条）

#### 带参数使用

```
GET /sina/finance/724?limit=50
GET /sina/finance/724/stock?limit=30
GET /sina/finance/724?num=30&limit=100
```

### 📖 参数说明

#### 路径参数

| 参数 | 说明 | 可选值 | 默认值 |
|------|------|--------|--------|
| tag | 分类标签 | `all`（全部）<br>`macro`（宏观）<br>`stock`（股市）<br>`international`（国际）<br>`opinion`（观点） | `all` |

#### 查询参数

| 参数 | 说明 | 范围 | 默认值 |
|------|------|------|--------|
| limit | 返回总数量 | 1-1000 | 20 |
| num | 每次请求数量 | 5-30 | 10 |

### ✨ 功能特点

#### 1. 股票涨跌幅展示

每条新闻自动显示相关股票的实时涨跌幅：

```
相关行情
• 中煤能源
  ↑ +3.62%
• 物产中大
  ↑ +1.31%
```

**特点**：
- ✅ 红色上涨箭头 ↑
- ✅ 绿色下跌箭头 ↓
- ✅ 加粗显示关键数据
- ✅ 灰色显示股票代码

#### 2. 分类标签

RSS的category字段包含：
- 股票名称 + 代码 + 涨跌幅
- 例如：`中煤能源(601898)+3.62%`

#### 3. 时间特性

- **实时性强**：平均30秒/条新闻
- **时间跨度**：90条覆盖约35分钟
- **历史支持**：可通过分页获取历史数据

#### 4. 数据完整性

**包含股票信息的新闻**：约65.6%
**平均每条新闻相关股票数**：约1.3个

### 📊 接口对比

| 特性 | `/sina/finance/724` | `/sina/zhibo` |
|------|---------------------|---------------|
| 数据源 | 移动端724 API | 网页端zhibo API |
| 股票信息 | ✅ 直接提供 | ✅ 需二次查询 |
| 股票代码 | ❌ 部分缺失 | ✅ 完整 |
| 涨跌幅格式 | `+3.62%` | `+3.62` |
| 实时性 | ✅ 很强（30秒/条） | ✅ 强（23秒/条） |
| 多媒体 | ❌ 不支持 | ✅ 支持图片/视频 |
| 历史数据 | ✅ 支持分页 | ✅ 支持分页 |
| 稳定性 | ✅ 移动端专用 | ✅ 网页端专用 |

### 🎯 使用场景

#### 场景1：股票快讯监控

适合场景：需要实时监控股市相关新闻

```
GET /sina/finance/724/stock?limit=50
```

**优势**：
- 股票涨跌幅直接显示在Feed中
- 分类标签包含完整股票信息
- 无需额外API查询行情

#### 场景2：综合财经监控

适合场景：全面了解财经动态

```
GET /sina/finance/724?limit=100
```

**优势**：
- 覆盖所有分类
- 时间跨度更长
- 数据量可控

#### 场景3：移动端优化

适合场景：移动RSS阅读器

```
GET /sina/finance/724?num=20
```

**优势**：
- 移动端专用接口
- 数据格式简洁
- 加载速度快

### 📝 输出示例

#### RSS结构

```xml
<item>
  <title>【中煤能源：第三季度净利润为47.8亿元，同比下降1.0%】...</title>

  <description>
    【中煤能源：第三季度净利润为47.8亿元...】

    相关行情
    • 中煤能源
      ↑ +3.62%
    • 中煤能源ADR
      ↓ 0.00%
  </description>

  <link>http://finance.sina.com.cn/focus/app/7x24_share.shtml?id=4457572</link>
  <guid>sina-724-4457572</guid>
  <pubDate>Mon, 27 Oct 2025 08:40:51 GMT</pubDate>
  <author>新浪财经</author>

  <category>中煤能源+3.62%</category>
  <category>中煤能源ADR0.00%</category>
</item>
```

#### Description样式

```html
<p style="font-weight: bold; margin: 8px 0 4px 0;">相关行情</p>
<div style="margin: 6px 0;">
  • <strong>中煤能源</strong>
  <br>
  <span style="margin-left: 12px; color: #f5222d; font-weight: bold;">
    ↑ +3.62%
  </span>
</div>
```

### 🔧 技术细节

#### API来源

```
https://news.cj.sina.cn/app/v1/news724/list
```

#### 必需请求头

```http
User-Agent: sinafinance__9.0.1__iOS__{deviceid}__26.0.1__iPhone18,2
Cookie: genTime={timestamp}; vt=4; wm=b122
```

#### 分页机制

使用ID分页：
1. 第1页：不传`id`参数
2. 第2页：传入上一页最后的`id`
3. 继续迭代...

#### 设备ID

- 自动生成并缓存24小时
- 使用`crypto.randomBytes(16).toString('hex')`
- 确保请求连续性

### ⚠️ 注意事项

#### 1. 股票代码缺失

部分股票没有`code`字段，只有`name`：
```json
{
  "name": "中煤能源",
  "code": "",  // 可能为空
  "range": "+3.62%"
}
```

**影响**：分类标签可能缺少代码

#### 2. 涨跌幅格式

直接返回带`%`的字符串：
- `+3.62%`（上涨）
- `-1.23%`（下跌）
- `0.00%`（平盘）

**处理**：需要解析字符串判断涨跌方向

#### 3. 请求频率

建议：
- 每次请求间隔 ≥ 0.5秒
- 避免短时间大量分页
- 使用合理的`num`参数（10-20）

#### 4. 与zhibo的选择

**使用724的场景**：
- ✅ 需要直接获取股票涨跌幅
- ✅ 移动端优化需求
- ✅ 股票代码不重要

**使用zhibo的场景**：
- ✅ 需要多媒体内容（图片/视频）
- ✅ 需要完整股票代码
- ✅ 需要焦点新闻过滤

### 📈 性能数据

基于实际测试（90条新闻）：

| 指标 | 数值 |
|------|------|
| 时间跨度 | 35分钟 |
| 平均间隔 | 23秒/条 |
| 包含股票 | 65.6% |
| 股票总数 | 117个 |
| 响应时间 | <1秒 |

### 🚧 已知限制

1. **股票代码不完整**：部分股票缺少code字段
2. **无多媒体支持**：不包含图片/视频
3. **无焦点标记**：无法筛选重要新闻
4. **移动端专用**：需要特定User-Agent

### 推荐搭配

**全面监控方案**：
```
1. /sina/finance/724 - 快讯+股票行情
2. /sina/zhibo - 多媒体内容
3. /jin10/flash - 金十数据快讯
```

**移动端方案**：
```
1. /sina/finance/724?num=20 - 主力快讯
2. /sina/zhibo?zhibo_id=focus - 焦点新闻
```
