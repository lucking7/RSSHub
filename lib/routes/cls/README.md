# 财联社 (CLS.CN) RSS 订阅

## 📖 目录

- [API 调用方法](#api-调用方法)
- [已实现的路由](#已实现的路由)
- [使用示例](#使用示例)
- [开发指南](#开发指南)

---

## 🔐 API 调用方法

### 签名机制

财联社 API 使用双重哈希签名验证请求：

```javascript
// 1. 准备基础参数
const baseParams = {
    app: 'CailianpressWeb',
    os: 'web',
    sv: '7.7.5'
};

// 2. 合并请求参数
const allParams = { ...baseParams, ...customParams };

// 3. 按键名排序并生成查询字符串
const sortedKeys = Object.keys(allParams).sort();
const queryString = sortedKeys
    .map(key => `${key}=${allParams[key]}`)
    .join('&');

// 4. 生成签名: MD5(SHA1(queryString))
const sha1Hash = crypto.createHash('sha1').update(queryString).digest('hex');
const sign = crypto.createHash('md5').update(sha1Hash).digest('hex');

// 5. 添加签名到参数
allParams.sign = sign;
```

### 工具函数

项目中已实现签名工具函数 [`utils.ts`](./utils.ts#L8)：

```typescript
import { getSearchParams } from './utils';

// 使用示例
const searchParams = getSearchParams({
    category: 'watch',
    hasFirstVipArticle: 1
});
```

---

## 📡 已实现的路由

### 1. 电报快讯 - telegraph (原接口)

实时财经快讯，支持分类订阅。

**路由**: `/cls/telegraph/:category?`

**文件**: [telegraph.ts](./telegraph.ts)

**API 端点**:
- 全部快讯: `https://www.cls.cn/nodeapi/updateTelegraphList`
- 分类快讯: `https://www.cls.cn/v1/roll/get_roll_list`

**支持的分类**:

| 分类名 | 参数 | 说明 |
|--------|------|------|
| 看盘 | `watch` | 盘面分析 |
| 公司 | `announcement` | 公司公告 |
| 解读 | `explain` | 深度解读 |
| 加红 | `red` | 重要标记 |
| 推送 | `jpush` | 推送消息 |
| 提醒 | `remind` | 提醒事项 |
| 基金 | `fund` | 基金相关 |
| 港股 | `hk` | 港股信息 |

**功能特性**:
- ✅ 作者信息显示
- ✅ 新闻配图（在内容中显示）
- ✅ 股票信息卡片（显示价格和涨跌幅）
- ✅ 股票标签含涨跌幅（如：`中信证券 ↑1.19%`）
- ✅ 主题分类标签

**使用示例**:
```bash
# 获取全部电报
/cls/telegraph

# 获取看盘类新闻
/cls/telegraph/watch

# 获取公司公告，限制10条
/cls/telegraph/announcement?limit=10
```

---

### 1.5 电报快讯 - dianbao (API3接口) ✨

使用最新 API3 接口获取实时电报快讯。

**路由**: `/cls/dianbao/:category?`

**文件**: [dianbao.ts](./dianbao.ts)

**API 端点**: `https://api3.cls.cn/v1/roll/get_roll_list`

**参数**:

| 参数 | 说明 | 可选值 | 默认值 |
|------|------|--------|--------|
| category | 新闻分类 | 见下表 | 全部 |
| limit | 返回数量 | 数字 | 20 |

**支持的分类**:

| 分类名 | 参数 | 说明 |
|--------|------|------|
| 看盘 | `watch` | 盘面分析 |
| 公司 | `announcement` | 公司公告 |
| 解读 | `explain` | 深度解读 |
| 加红 | `red` | 重要标记 |
| 推送 | `jpush` | 推送消息 |
| 提醒 | `remind` | 提醒事项 |
| 基金 | `fund` | 基金相关 |
| 港美股 | `hk_us` | 港美股信息 |

**特点**:
- ✨ 使用最新 API3 接口
- ✨ **支持 8 个分类过滤** ✅
- ✨ 动态时间戳（获取最新数据）
- ✨ 更优的标题处理（title/brief/content 三重回退）

**功能特性**:
- ✅ 股票涨跌幅完整展示
- ✅ 板块和个股自动分离
- ✅ A级新闻重要标记（【重要】红色高亮）
- ✅ 音频播客支持（RSS enclosure）
- ✅ 图片自动展示
- ✅ 关联文档链接（公告PDF）
- ✅ 完整分类标签

**使用示例**:
```bash
# 获取全部电报
/cls/dianbao

# 获取看盘类新闻
/cls/dianbao/watch

# 获取公司公告，限制10条
/cls/dianbao/announcement?limit=10

# 获取港美股新闻
/cls/dianbao/hk_us

# 获取加红重要新闻
/cls/dianbao/red
```

**接口对比**:

| 特性 | telegraph | dianbao |
|------|-----------|---------|
| 接口域名 | www.cls.cn | api3.cls.cn |
| 接口路径 | /nodeapi/updateTelegraphList | /v1/roll/get_roll_list |
| 支持分类 | ✅ 8个分类 | ✅ 8个分类 |
| 分类参数 | hk (港股) | hk_us (港美股) |
| 时间参数 | ❌ 无 | ✅ last_time |
| 默认数量 | 50 | 20 |
| 音频支持 | ❌ | ✅ |

**分类差异说明**:

两个接口的分类基本相同，唯一区别：
- `telegraph` 使用 `hk` 参数（港股）
- `dianbao` 使用 `hk_us` 参数（港美股）

**选择建议**:

| 使用场景 | 推荐路由 | 原因 |
|----------|----------|------|
| 获取最新消息 | `/cls/dianbao` | ✨ API3 最新接口 + 音频支持 |
| 需要大量历史 | `/cls/telegraph` | 默认50条 |
| 轻量级订阅 | `/cls/dianbao` | 默认20条 |
| 播客收听 | `/cls/dianbao` | ✅ 支持音频 enclosure |
| 港美股新闻 | `/cls/dianbao/hk_us` | 包含美股信息 |
| 仅港股新闻 | `/cls/telegraph/hk` | 仅港股信息 |

---

### 2. 热门文章排行榜 (Hot)

当前最热门的文章排行。

**路由**: `/cls/hot`

**文件**: [hot.ts](./hot.ts)

**API 端点**: `https://www.cls.cn/v2/article/hot/list`

---

### 3. 深度文章 (Depth)

分类深度分析文章。

**路由**: `/cls/depth/:category`

**文件**: [depth.ts](./depth.ts)

**API 端点**: `https://www.cls.cn/v3/depth/home/assembled/:category`

**支持的分类**:

| 分类 | 代码 | 分类 | 代码 |
|------|------|------|------|
| 头条 | `1000` | 股市 | `1003` |
| 港股 | `1135` | 环球 | `1007` |
| 公司 | `1005` | 券商 | `1118` |
| 基金 | `1110` | 地产 | `1006` |
| 金融 | `1032` | 汽车 | `1119` |
| 科创 | `1111` | 创业版 | `1127` |
| 品见 | `1160` | 期货 | `1124` |
| 投教 | `1176` | | |

---

### 4. 话题/专题 (Subject)

特定话题的文章聚合。

**路由**: `/cls/subject/:id`

**文件**: [subject.ts](./subject.ts)

**API 端点**: `https://www.cls.cn/api/subject/:id/article`

**常用话题 ID**:
- `1103`: A股盘面直播
- `1151`: 有声早报

---

## 📋 使用示例

### 电报快讯

```bash
# 订阅所有快讯
https://rsshub.app/cls/telegraph

# 订阅看盘类快讯
https://rsshub.app/cls/telegraph/watch

# 订阅公司公告
https://rsshub.app/cls/telegraph/announcement

# 限制返回数量（默认50条）
https://rsshub.app/cls/telegraph?limit=20
```

### 热门文章

```bash
https://rsshub.app/cls/hot
```

### 深度文章

```bash
# 头条深度
https://rsshub.app/cls/depth/1000

# 股市深度
https://rsshub.app/cls/depth/1003

# 港股深度
https://rsshub.app/cls/depth/1135
```

### 话题专题

```bash
# A股盘面直播
https://rsshub.app/cls/subject/1103
```

---

## 🛠️ 开发指南

### 调用 API 示例

```typescript
import got from '@/utils/got';
import { getSearchParams } from './utils';

// 示例：获取电报快讯
const response = await got({
    method: 'get',
    url: 'https://www.cls.cn/nodeapi/updateTelegraphList',
    searchParams: getSearchParams({
        hasFirstVipArticle: 1,
    }),
});

const data = response.data.data.roll_data;
```

### RSS Item 数据结构

电报快讯的 RSS item 包含以下字段：

```typescript
{
    title: string,           // 标题
    link: string,            // 新闻链接
    description: string,     // HTML 内容（包含作者、正文、图片）
    pubDate: Date,           // 发布时间
    category: string[],      // 分类标签（主题 + 股票名称）
    author: string,          // 作者
    guid: string,            // 唯一标识
}
```

### 模板系统

使用 Art-Template 渲染内容，模板文件位于 [templates/](./templates/) 目录：

```typescript
import { art } from '@/utils/render';
import path from 'node:path';

const description = art(path.join(__dirname, 'templates/telegraph.art'), {
    item,              // 原始数据
    images: [],        // 图片数组
    author: '',        // 作者
});
```

### 电报快讯模板结构

[templates/telegraph.art](./templates/telegraph.art) 包含：

1. **作者信息**: 如果有作者则显示
2. **股票信息卡片**:
   - 股票名称和代码
   - 最新价格
   - 涨跌幅（红涨绿跌）
3. **正文内容**: item.content
4. **配图**: 响应式图片（max-width: 100%）

### 股票信息处理

股票信息在两个地方显示：

1. **内容中的股票卡片**（详细信息）:
```html
📊 相关股票
┌─────────────────────────────┐
│ 中信证券 (sh600030)          │
│ 价格: ¥29.87  ↑ 1.19%       │
└─────────────────────────────┘
```

2. **RSS category 标签**（用于筛选，包含涨跌幅）:
```typescript
// 生成带涨跌幅的股票标签
const stockCategories = (item.stock_list || []).map((stock) => {
    const arrow = stock.RiseRange > 0 ? '↑' : stock.RiseRange < 0 ? '↓' : '—';
    return `${stock.name} ${arrow}${stock.RiseRange}%`;
});

const categories = [
    ...(item.subjects?.map((s) => s.subject_name) || []),  // 主题分类
    ...stockCategories,                                    // 股票 + 涨跌幅
];
```

**Category 标签示例**:
- 主题：`盘面直播`、`股市`、`板块`
- 股票：`中信证券 ↑1.19%`、`华工科技 ↓-1.91%`、`N超颖 ↑397.6%`

**涨跌幅显示规则**：
- 🔴 **上涨**：↑ 显示正数
- 🟢 **下跌**：↓ 显示负数
- ⚪ **持平**：— 显示 0.00%

**优势**：RSS 阅读器可以通过 category 标签快速筛选特定股票和涨跌幅范围的快讯

### API 数据字段说明

电报快讯 API 返回的主要字段：

| 字段 | 类型 | 说明 | 使用状态 |
|------|------|------|---------|
| `id` | number | 快讯ID | ✅ 已使用 |
| `title` | string | 标题 | ✅ 已使用 |
| `content` | string | 正文（HTML） | ✅ 已使用 |
| `ctime` | number | 发布时间戳 | ✅ 已使用 |
| `shareurl` | string | 分享链接 | ✅ 已使用 |
| `author` | string | 作者 | ✅ 已使用 |
| `images` | string[] | 配图URL | ✅ 已使用 |
| `subjects` | object[] | 主题分类 | ✅ 已使用 |
| `stock_list` | object[] | 相关股票（含价格、涨跌幅） | ✅ 已使用（卡片显示 + category 标签含涨跌幅） |
| `reading_num` | number | 阅读数 | ❌ 未使用 |
| `audio_url` | string[] | 音频播报 | ❌ 未使用 |
| `assocArticleUrl` | string | 关联PDF | ❌ 未使用 |
| `comment_num` | number | 评论数 | ❌ 未使用 |
| `share_num` | number | 分享数 | ❌ 未使用 |
| `level` | string | 内容级别 | ❌ 未使用 |
| `jpush` | number | 推送标记 | ❌ 未使用 |
| `is_top` | number | 置顶标记 | ❌ 未使用 |

---

## 🧪 测试 API

项目根目录提供了测试脚本 [`test-cls-api.js`](../../test-cls-api.js)：

```bash
# 测试所有 API 端点
node test-cls-api.js
```

该脚本会：
- ✅ 测试各个 API 端点连接
- ✅ 显示返回的数据结构
- ✅ 分析已使用和未使用的字段

---

## 📝 注意事项

1. **签名必须正确**: 所有请求必须包含有效的签名，否则会被拒绝
2. **参数排序**: 生成签名前必须对参数按键名排序
3. **图片加载**: 部分图片可能需要 Referer 验证
4. **股票代码格式**:
   - 深圳股票: `sz002047`
   - 上海股票: `sh600000`
   - 香港股票: `hk06181`

---

## 📚 相关文件

- [telegraph.ts](./telegraph.ts) - 电报快讯路由
- [hot.ts](./hot.ts) - 热门文章路由
- [depth.ts](./depth.ts) - 深度文章路由
- [subject.ts](./subject.ts) - 话题专题路由
- [utils.ts](./utils.ts) - 签名工具函数
- [templates/telegraph.art](./templates/telegraph.art) - 电报快讯模板

---

**维护者**: [@nczitzk](https://github.com/nczitzk)
**最后更新**: 2025-10-25
