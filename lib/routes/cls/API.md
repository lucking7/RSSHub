# 财联社 API 文档

## 公共参数

所有接口通用参数：

| 参数  | 值                | 说明   |
| ----- | ----------------- | ------ |
| `app` | `CailianpressWeb` | 应用名 |
| `os`  | `web`             | 平台   |
| `sv`  | `8.4.6`           | 版本号 |

`Referer: https://www.cls.cn/telegraph` 对所有接口都需要。

## 签名算法

```
sign = MD5(SHA1(sorted_query_string_with_raw_commas))
```

在 `URLSearchParams.sort()` 后的 query string 上计算，但**逗号不能 URL 编码**。即签名计算时 `%2C` 应还原为 `,`。

```js
const sp = new URLSearchParams(params);
sp.sort();
const raw = sp.toString().replace(/%2C/g, ',');
const sign = CryptoJS.MD5(CryptoJS.SHA1(raw).toString()).toString();
```

> `lib/routes/cls/utils.ts` 第 14 行当前使用 `searchParams.toString()` 未做逗号还原，对不含逗号的参数无影响，但对 `stock_list` 等含逗号参数的接口会导致签名错误。

## 接口列表

### 1. 电报列表（增量轮询）

```
GET https://www.cls.cn/nodeapi/updateTelegraphList
```

**参数：**

| 参数                  | 值             | 说明                                       |
| --------------------- | -------------- | ------------------------------------------ |
| `hasFirstVipArticle`  | `1`            | 是否包含 VIP 首条                          |
| `lastTime`            | Unix timestamp | 上次轮询时间，服务端返回此时间之后的新数据 |
| `rn`                  | `20`           | 每次返回条数                               |
| `subscribedColumnIds` | `""`           | 已订阅栏目 ID，可为空                      |
| `sign`                | 不需要         | 此接口无需签名                             |

**返回结构：**

```json
{
    "error": 0,
    "data": {
        "roll_data": [
            {
                "id": 2357732,
                "title": "...",
                "content": "...",
                "brief": "...",
                "ctime": 1777347190,
                "level": "C", // A/B/C, A=重要
                "type": -1, // -1=普通, 20015=VIP内容, 20026=大佬持仓跟踪
                "subjects": [{ "subject_id": 1811, "subject_name": "民航机场" }],
                "stock_list": [{ "StockID": "sh688788", "name": "科思科技", "RiseRange": -1.36 }],
                "images": ["https://..."],
                "audio_url": ["https://..."],
                "shareurl": "https://api3.cls.cn/share/article/2357732",
                "author": "第一财经",
                "reading_num": 3818,
                "comment_num": 0,
                "share_num": 7
            }
        ],
        "update_num": 6
    },
    "vipData": [], // VIP 数据，应过滤
    "vipGlobal": [] // VIP 全局推荐，应过滤
}
```

**注意：**

- `type === 20015` 且顶层 `vipData`/`vipGlobal` 中的条目均为 VIP 付费内容，不应包含在 RSS feed 中
- `item.shareurl` 域名固定为 `api3.cls.cn`，用作 item.link
- `content` 开头通常包含 `【xxx】` 标题标记，建议用 `item.title || item.content` 作为 title

### 2. 电报列表（全量刷新）

```
GET https://www.cls.cn/nodeapi/refreshTelegraphList
```

**参数：**

| 参数       | 值             | 说明         |
| ---------- | -------------- | ------------ |
| `lastTime` | Unix timestamp | 上次刷新时间 |

**返回结构：**

```json
{
    "l": {
        "2357713": {
            "id": 2357713,
            "title": "...",
            "content": "...",
            "ctime": 1777347139,
            "type": 20026,
            "level": "C"
        }
    }
}
```

数据封装在 `l` 对象中，key 为文章 ID。部分条目仅含 `id`+`ctime`（轻量轮询信号），不含完整内容。

> 全量接口主要用于判断是否有新文章，完整内容仍需通过 `updateTelegraphList` 获取。

### 3. 指数行情

```
GET https://x-quote.cls.cn/v2/quote/a/web/stocks/basic
```

**参数：**

| 参数         | 值                                                          | 说明               |
| ------------ | ----------------------------------------------------------- | ------------------ |
| `fields`     | `secu_name,secu_code,trade_status,change,change_px,last_px` | 返回字段           |
| `secu_codes` | `sh000001,sz399001,sh000905,sz399006`                       | 指数代码，逗号分隔 |
| `sign`       | 不需要                                                      |                    |

**返回结构：**

```json
{
    "code": 200,
    "data": {
        "sh000001": {
            "secu_name": "上证指数",
            "secu_code": "sh000001",
            "trade_status": "BREAK",
            "change": -0.0007,
            "change_px": -2.87,
            "last_px": 4083.471
        }
    }
}
```

> `data` 为 object（key 为 secu_code），非 array。

### 4. 热门板块

```
GET https://x-quote.cls.cn/web_quote/plate/hot_plate
```

**参数：**

| 参数    | 值         | 说明       |
| ------- | ---------- | ---------- |
| `rever` | `1`        | 排序方向   |
| `type`  | `industry` | 板块类型   |
| `way`   | `change`   | 按涨幅排序 |

**返回结构：**

```json
{
    "code": 200,
    "data": [
        {
            "secu_code": "cls81985",
            "secu_name": "证券",
            "change": 0.016,
            "main_fund_diff": 2374990283,
            "up_stock": [{ "secu_code": "sz000776", "secu_name": "广发证券", "change": 0.0693 }]
        }
    ]
}
```

### 5. 个股涨跌榜

```
GET https://x-quote.cls.cn/web_quote/web_stock/stock_list
```

**需要签名（参数含逗号，注意 `%2C` → `,` 还原）**

**参数：**

| 参数    | 值                 | 说明               |
| ------- | ------------------ | ------------------ |
| `rever` | `1`                |                    |
| `types` | `change_px,change` | 返回字段，逗号分隔 |
| `way`   | `change`           | 按涨幅排序         |

**返回结构：**

```json
{
    "code": 200,
    "data": {
        "is_all": false,
        "data": [{ "secu_code": "sz301261", "secu_name": "恒工精密", "change_px": 14.96, "change": 0.2 }]
    }
}
```

### 6. 付费栏目列表

```
GET https://www.cls.cn/featured/v1/column/list
```

**需要签名 + 完整浏览器 Headers：**

```
Referer: https://www.cls.cn/telegraph
Origin: https://www.cls.cn
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36
```

> 缺少 Origin/UA 会被 CloudWAF 拦截（418）。

**返回结构：**

```json
{
    "data": {
        "total": 11,
        "buy_num": 0,
        "column_list": [
            {
                "id": 20015,
                "title": "盘中宝",
                "brief": "盘中有「宝」，快人一步！",
                "price": "￥1888 起",
                "buy_num": 3452384,
                "article_list": { "id": 2357707, "title": "..." }
            }
        ]
    }
}
```

### 7. 深度推荐 Banner

```
GET https://www.cls.cn/v3/depth/banner
```

无额外参数。返回滚动 Banner 内容，代码为 `200`。

### 8. 滚动推荐配置

```
GET https://www.cls.cn/v1/roll/recommend/conf
```

无额外参数。返回推荐配置列表。

### 9. 广告配置

```
GET https://www.cls.cn/v2/web/ad
```

无额外参数。返回广告位配置。

---

## 现有路由对应的 API

| 路由文件        | 使用的 API                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------- |
| `telegraph.tsx` | `nodeapi/updateTelegraphList` (category=全部) / `v1/roll/get_roll_list` (category=特定分类) |
| `dianbao.ts`    | `api3.cls.cn/v1/roll/get_roll_list`（旧接口，数据格式兼容）                                 |
| `hot.ts`        | `v2/article/hot/list`                                                                       |
| `subject.ts`    | `api/subject/:id/article`                                                                   |
| `depth.ts`      | 深度文章相关                                                                                |

## 其他发现的 API（需进一步探索）

| API      | URL 模式                                                     | 说明                                       |
| -------- | ------------------------------------------------------------ | ------------------------------------------ |
| 个股行情 | `x-quote.cls.cn/quote/stock/refresh?secu_codes=sh688788,...` | 批量个股行情（参数极长）                   |
| 头条文章 | 页面内嵌 `__NEXT_DATA__` SSR 数据                            | `detail/:id` 页面的 `script#__NEXT_DATA__` |
