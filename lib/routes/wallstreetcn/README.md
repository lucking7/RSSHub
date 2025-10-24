# 华尔街见闻 API 使用说明

## API 端点

### 1. Live API（快讯）

```
GET https://api-one.wallstcn.com/apiv1/content/lives
```

**参数**：

- `channel` - 频道（必需）：`{category}-channel`，如 `global-channel`
- `limit` - 数量限制（可选）：默认 100

**示例**：

```bash
# 全球快讯，前 20 条
https://api-one.wallstcn.com/apiv1/content/lives?channel=global-channel&limit=20

# 美股快讯
https://api-one.wallstcn.com/apiv1/content/lives?channel=us-stock-channel&limit=20
```

**可用频道**：

- `global-channel` - 要闻
- `a-stock-channel` - A股
- `us-stock-channel` - 美股
- `hk-stock-channel` - 港股
- `forex-channel` - 外汇
- `commodity-channel` - 商品
- `financing-channel` - 理财

---

### 2. News List API（资讯列表）

```
GET https://api-one.wallstcn.com/apiv1/content/information-flow
```

**参数**：

- `channel` - 频道（必需）：`{category}-channel`
- `accept` - 类型（必需）：`article`
- `limit` - 数量限制（可选）：默认 25

**示例**：

```bash
# 最新资讯
https://api-one.wallstcn.com/apiv1/content/information-flow?channel=global-channel&accept=article&limit=25
```

---

### 3. News Detail API（资讯详情）

```
GET https://api-one.wallstcn.com/apiv1/content/articles/{id}
```

**参数**：

- `extract` - 提取模式（可选）：`0` 表示不提取，返回完整内容

**示例**：

```bash
# 获取文章详情
https://api-one.wallstcn.com/apiv1/content/articles/3757873?extract=0
```

---

### 4. Hot API（最热文章）

```
GET https://api-one-wscn.awtmt.com/apiv1/content/articles/hot
```

**参数**：

- `period` - 时间段（必需）：`all`

**示例**：

```bash
https://api-one-wscn.awtmt.com/apiv1/content/articles/hot?period=all
```

**返回字段**：

- `day_items` - 当日热门
- `week_items` - 本周热门

---

## 响应结构

### Live API 响应

```json
{
    "code": 20000,
    "message": "OK",
    "data": {
        "items": [
            {
                "id": 2993558,
                "title": "标题",
                "content": "<p>HTML内容</p>",
                "content_text": "纯文本内容",
                "content_more": "更多内容",
                "uri": "https://wallstreetcn.com/livenews/2993558",
                "display_time": 1761325002,
                "score": 1,
                "author": {
                    "display_name": "作者名",
                    "avatar": "头像URL",
                    "uri": "作者链接"
                },
                "channels": ["global-channel", "us-stock-channel"],
                "images": [],
                "cover_images": [],
                "comment_count": 0,
                "global_channel_name": "7x24快讯",
                "symbols": [],
                "tags": [],
                "related_themes": []
            }
        ],
        "next_cursor": "1761323310",
        "polling_cursor": "2993558"
    }
}
```

### 关键字段说明

| 字段                  | 说明                     | 数据情况            |
| --------------------- | ------------------------ | ------------------- |
| `id`                  | 唯一标识                 | ✅ 必有             |
| `title`               | 标题                     | ✅ 必有（可能为空） |
| `content`             | HTML内容                 | ✅ 必有             |
| `content_text`        | 纯文本内容               | ✅ 必有             |
| `channels`            | 频道分类数组             | ✅ 必有（平均7个）  |
| `display_time`        | 发布时间（Unix时间戳）   | ✅ 必有             |
| `score`               | 重要度（1=普通，2=重要） | ✅ 必有             |
| `author`              | 作者信息                 | ✅ 必有             |
| `comment_count`       | 评论数                   | ✅ 必有（通常为0）  |
| `global_channel_name` | 频道中文名               | ✅ 必有             |
| `cover_images`        | 封面图（高质量）         | ⚠️ 部分有           |
| `images`              | 图片数组                 | ⚠️ 部分有           |
| `related_themes`      | 相关主题                 | ⚠️ 少量有           |
| `symbols`             | 股票代码                 | ⚠️ 极少有           |
| `tags`                | 标签                     | ⚠️ 极少有           |

---

## RSSHub 实现

当前 RSSHub 实现已使用以下字段：

### Live 路由（`/wallstreetcn/live/:category?/:score?`）

**已实现字段**：

- ✅ `id` → `guid`（唯一标识）
- ✅ `title` / `content_text` → `title`
- ✅ `content` + `content_more` → `description`
- ✅ `display_time` → `pubDate`
- ✅ `author.display_name` → `author`
- ✅ `channels` → `category`（RSS分类标签）
- ✅ `tags` → `category`（如果有数据）
- ✅ `related_themes` → `category`（如果有数据）
- ✅ `cover_images` / `images` → 描述中的图片
- ✅ `global_channel_name` → 描述中显示
- ✅ `comment_count` → 描述中显示（如果>0）
- ✅ `symbols` → 描述中显示（如果有数据）

**字段使用率**：16/28 = **57%**

---

## 注意事项

### 1. 关于股票信息

- `symbols` 字段**极少有数据**（测试150条快讯全部为空）
- 即使有数据，也**不包含涨跌幅**（这是新闻API，不是行情API）
- 预计包含：股票代码、名称、链接

### 2. 关于标签

- `tags` 字段**极少有数据**（测试150条快讯全部为空）
- 可能仅在特定类型的快讯中使用

### 3. 关于频道分类

- `channels` 是**最可靠的字段**，100%有数据
- 平均每条快讯属于7个频道
- 已去除 `-channel` 后缀，用作RSS category

### 4. 关于图片

- 优先使用 `cover_images`（质量更高）
- 如果 `cover_images` 为空，回退到 `images`

---

## 测试命令

```bash
# 测试 Live API
curl "https://api-one.wallstcn.com/apiv1/content/lives?channel=global-channel&limit=5"

# 测试 News List API
curl "https://api-one.wallstcn.com/apiv1/content/information-flow?channel=global-channel&accept=article&limit=3"

# 测试 Hot API
curl "https://api-one-wscn.awtmt.com/apiv1/content/articles/hot?period=all"

# 测试 RSSHub
curl "http://localhost:1200/wallstreetcn/live/global/1?limit=10"
```

---

## 更新日期

2025-10-24
