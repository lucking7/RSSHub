# 财联社 API 文档

## 公共参数

`getSearchParams()` 默认附加：

| 参数      | 值                | 说明   |
| --------- | ----------------- | ------ |
| `appName` | `CailianpressWeb` | 应用名 |
| `os`      | `web`             | 平台   |
| `sv`      | `8.7.9`           | 版本号 |

`app` 与 telegraph 的 `Referer`/`Origin` **不是**全站共用。仅 `telegraph.tsx` 把 `appName` 换成 `app=CailianpressWeb`，并设置 `Origin: https://www.cls.cn`、`Referer: https://www.cls.cn/telegraph` 和浏览器 UA。`subject.ts` 使用默认 `appName`，不发 `app`，也不带这些 headers。

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

> 签名在 `getSearchParams` 的 searchParams serialization（`URLSearchParams.sort()` 之后的 `searchParams.toString()`）上计算，当前**不做** `%2C` → `,` 还原。不含逗号的参数无影响，但对 `stock_list` 等含逗号参数的接口会导致签名错误。

## 接口列表

### 1. 电报列表（当前）

```
GET https://api3.cls.cn/v1/roll/get_roll_list
```

**参数：**

| 参数                 | 值             | 说明         |
| -------------------- | -------------- | ------------ |
| `hasFirstVipArticle` | `1`            | 是否包含 VIP |
| `last_time`          | Unix timestamp | 上次轮询时间 |
| `rn`                 | `50`           | 每次返回条数 |
| `category`           | 分类 ID        | 可为空       |
| `sign`               | 自动生成       | 需要签名     |

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
                "type": -1, // -1=普通；非 -1（如 20015 VIP、20026 大佬持仓跟踪）会被 cleanAndFilter 丢弃
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
    "vipData": [], // 顶层 VIP 数据；路由只读 data.roll_data，不消费此字段
    "vipGlobal": [] // 顶层 VIP 全局推荐；路由不消费此字段
}
```

**注意：**

- `www.cls.cn/nodeapi/updateTelegraphList` 已返回 404，不再作为 `/cls/telegraph` 的数据源；当前完整条目来自本接口 `get_roll_list`
- `cleanAndFilter` 丢弃：`type !== -1` 的条目（`undefined`/`null` 视为 `-1`）、`share_img` 含 `vip` 的条目、广告（`is_ad` / `is_fad`）、以及促销文案。顶层 `vipData` / `vipGlobal` 不进入 feed
- item.link 使用原始 `shareurl`，不做域名改写
- title 回退链为 `title || extractTitle(content) || brief || content`（`extractTitle` 取 content 开头的 `【…】`）

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

> 全量接口主要用于判断是否有新文章。完整正文不在本接口；当前 `/cls/telegraph` 从 `get_roll_list` 取完整条目（`updateTelegraphList` 已 404，不再使用）。

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

| 路由文件        | 使用的 API                          |
| --------------- | ----------------------------------- |
| `telegraph.tsx` | `api3.cls.cn/v1/roll/get_roll_list` |
| `hot.ts`        | `v2/article/hot/list`               |
| `subject.ts`    | `api/subject/:id/article`           |
| `depth.ts`      | 深度文章相关                        |

`/cls/dianbao` 是 `telegraph.tsx` 上的别名路径（`path: ['/telegraph/:category?', '/dianbao/:category?']`），不再有独立的 `dianbao.ts`。

## 其他发现的 API（需进一步探索）

| API      | URL 模式                                                     | 说明                                       |
| -------- | ------------------------------------------------------------ | ------------------------------------------ |
| 个股行情 | `x-quote.cls.cn/quote/stock/refresh?secu_codes=sh688788,...` | 批量个股行情（参数极长）                   |
| 头条文章 | 页面内嵌 `__NEXT_DATA__` SSR 数据                            | `detail/:id` 页面的 `script#__NEXT_DATA__` |
