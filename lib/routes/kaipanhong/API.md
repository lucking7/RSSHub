# 开盘红上游 API 参考

> 本文是面向维护者的非官方观察参考，核验日期为 2026-09-07。抓包数据已脱敏；字段和可用性仅代表观察样本。

## 范围与证据等级

抓包识别 237 条相关记录，其中 202 条 PHP API、35 条静态图片；198 条含请求体，归并为 47 组 `host + path + c + a`。4 条 API 记录没有请求体，未猜测 action。47 组是观察覆盖范围，不是产品完整 API 列表。

| 证据等级     | 含义                                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| 匿名实测成功 | 本文明确列出的 4 组，在一次不带登录凭据的请求中返回 `errcode=0`；不代表长期公开、授权稳定或不受限流。 |
| 抓包观察     | 其余接口仅见于抓包；参数和响应是抽样，不宣称匿名可用或 schema 完整。                                  |
| 未知         | 字段单位、缩写口径、速率限制、授权条件和长期兼容性均未由本次资料证实。                                |

版本公共参数为 `apiv=w47`、`VerSion=6.2.31.1`、`PhoneOSNew=2`。主体网关为 `POST https://{host}.kaipanhong.com/w1/api/index.php`，`appuser` 使用 `/index.php`，`appupchina` 使用 `/payw1/api/index.php`。请求体为 `application/x-www-form-urlencoded`，`c` 是模块、`a` 是动作。不要把 `Token` 出现在文档示例或日志中。

## 47 组抓包清单

完整次数、顶层字段和请求编号以研究资料为来源；下表是可移植的 `host + path + c + a` 精确集合（47 组），名称只复述 `c/a`，不把未经证实的业务语义写成事实。

[OpenAPI 3.1 文件](./openapi.yaml)仅覆盖下文 4 组已匿名实测 action；标准生成客户端不会依据自定义 `x-upstream-server` 自动选择 host，调用方必须按文档选择。

| host                        | path                   | c / a                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apparticle.kaipanhong.com` | `/w1/api/index.php`    | `APPNewsFlash/GetUserPermission`; `ForumsMsgColumn/GetInfo`; `ForumsMsgColumn/GetList`; `ForumsMsgJX/GetFocusMsg`; `ForumsMsgJX/GetSelList`; `IndexPlate/GetIndexList`; `PCNewsFlash/GetList`; `PCNewsFlash/GetTopList`; `StockDataCenter/GetHotThemes`; `StockDataCenter/GetRelation`                                                                                                                                                                                                                                        |
| `apphis.kaipanhong.com`     | `/w1/api/index.php`    | `HKStockLineData/GetHKStockKLine`; `StockBidYiDong/GetYDTPZFPL_W46_HisAll`; `StockNewHigh/GetDayNewHigh_W28`                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `apphwhq.kaipanhong.com`    | `/w1/api/index.php`    | `Admin/L2DateShowHid`; `AppFuncExplain/GetFunction_Art_Last`; `ConceptionPoint/GetPoint`; `ConceptionPoint/TopContent`; `ConceptionPoint/ZhiBoContent`; `HKStockLineData/GetHKStockKLine_Today`; `HomeDingPan/ModuleVersatile`; `HomeDingPan/Radar`; `Index/GetArtTitle`; `Index/GetInfo`; `MarketMood/MoodNumCount`; `StockBidYiDong/GetPianLiZhi_W46`; `StockL2Data/GetZsTrend`; `StockNewHigh/GroupCount_W28`; `StockNewHigh/GroupStock_W28`; `UserSelectStock/RefreshStockList`; `UserSelectStock/RefreshStockList_price` |
| `applhb.kaipanhong.com`     | `/w1/api/index.php`    | `Index/GetList`; `SysAppVersion/GetArrangeIndex`; `SysAppVersion/GetIndexMod`; `System/AdGet`; `System/AdGetKHD`; `System/ModuleSwitch`; `System/OneSwitch`; `System/WebJsGet`; `Task/UseFun`; `Theme/InfoGR`; `User/DeviceUpdate`; `UserInfo/AppNews`; `UserInfo/GetPermission`; `UserInfo/ModTodayBrowseCount`                                                                                                                                                                                                              |
| `appupchina.kaipanhong.com` | `/payw1/api/index.php` | `JiFenPay/GetJFPrice`; `PayFuncRemind/GetPopUpRemind`                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `appuser.kaipanhong.com`    | `/index.php`           | `Log/LogUserAddNew`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

上表由脱敏记录按四元组去重得到，恰为 47 组；同名 `c/a` 在不同 host/path 时仍是不同接口。

`Type=1` 不应命名为“商品期货”，`Type=2` 不应命名为“原创”。这些值的产品分类仍未知。

## 公共请求契约

公共参数通常包括：

| 参数                                 | 示例             | 说明                                                           |
| ------------------------------------ | ---------------- | -------------------------------------------------------------- |
| `c`                                  | `PCNewsFlash`    | 模块名，与 `a` 共同决定 action。                               |
| `a`                                  | `GetList`        | 动作名。                                                       |
| `apiv`                               | `w47`            | 抓包版本标识。                                                 |
| `VerSion`                            | `6.2.31.1`       | 客户端版本。部分记录还出现大小写变体 `Version`，不要自行合并。 |
| `PhoneOSNew`                         | `2`              | 平台标识。语义未证实。                                         |
| `Index`、`st`                        | `0`、`5` 或 `20` | 分页/数量样式参数，仅在相应 action 中使用；含义和上限未知。    |
| `Type`                               | `0`、`1`、`2`    | 快讯等请求中的分类值，业务名称未知。                           |
| `Token`、`UserID`、`DeviceID`、`Red` | 已省略           | 抓包中存在的身份或设备相关值。本文不保存，也不假定必需。       |

### 已验证的 4 组 action

下表只列一次匿名实测中成功的契约。字段类型来自抽样响应，不能当作完整 schema。

#### `apparticle.PCNewsFlash/GetList`

请求可使用 `Type`、`Index=0`、`NewsID=0`、`st`。匿名实测 `Type=0/1/2` 均返回 `errcode=0` 和 5 条样本（一次请求每种值），但分类含义未证实。`List[].Type` 与请求 `Type` 不应直接翻译成业务名称。

结构示例（值为格式示例，非本次响应转录；`errcode=0` 是已观察成功值）：

```json
{
    "List": [
        {
            "CID": "93166",
            "Time": "1788744600",
            "Title": "示例标题",
            "Type": "0",
            "PushUrl": "",
            "Source": "财联社",
            "Content": "示例正文",
            "Stocks": [],
            "ai_rate": "0",
            "ai_read": "0",
            "status": "1",
            "list_data1": null,
            "list_data2": null,
            "code": []
        }
    ],
    "Time": 1788744600,
    "errcode": "0",
    "t": 1788744600
}
```

`Time`（快讯条目）和直播/雷达条目的 `Time/time` 按当前实现作为 Unix 秒解析。顶层 `t`、`ttag` 的单位仍未知；雷达顶层 `time` 的单位也未证实。`PushUrl` 可能为空，RSSHub 会使用安全回退链接。

### 关键响应字段

| action                | 字段                                                                    | 类型                                           | 用途/限制                                                                 |
| --------------------- | ----------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------- |
| `PCNewsFlash/GetList` | `List[].CID`, `Time`, `Title`, `Content`, `Source`, `PushUrl`           | string                                         | 文章身份、Unix 秒时间、标题/正文、来源和可选链接。                        |
| `PCNewsFlash/GetList` | `List[].Stocks`                                                         | tuple array                                    | 股票/板块关联，元素首项为代码、次项为名称，后续变化值可能存在，单位未知。 |
| `ZhiBoContent`        | `List[].ID`, `Time`, `Comment`, `UserName`                              | string, number, string, string                 | 直播身份、Unix 秒时间、正文和署名。                                       |
| `ZhiBoContent`        | `List[].PlateName`, `Stock`, `Image`, `Interpretation`, `BoomReason`    | string, array, string, string, string          | 板块、个股、媒体和补充文本，空值/结构差异需允许。                         |
| `MoodNumCount`        | `list.SZJS`, `XDJS`, `ZTJS`, `DTJS`, `qscln`, `q_zrcs`, `bl`, `color`   | number                                         | 市场统计字段，缩写口径、单位和颜色编码未知。                              |
| `Radar`               | `list[].time`, `stockid`, `stock_name`, `status`, `content`, `content2` | number, string, string, string, string, string | 事件时间、股票、事件状态和正文；时间单位、状态编码未知。                  |

#### `apphwhq.ConceptionPoint/ZhiBoContent`

无需额外参数的匿名请求返回 `errcode=0`；一次样本含 41 条。`List` 中可见 `ID`、`Time`、`Comment`、`PlateCode`、`PlateName`、`Interpretation`、`UserName`、`Image`、`Stock`、`DisStock`、`BoomReason` 等字段。昵称、字段名和内容均不能证明“原创”或 AI 生成。

本轮同批匿名对照中，新旧端点 41/41 条 `ID` 重合；去掉旧端点 `Comment` 末尾固定的“该内容由AI大模型根据行情自动生成”尾注后，`Comment` 全部一致。新端点不返回该尾注，不能据此证明内容转为人工原创，也不推断差异原因；这是本轮样本观察，不是长期保证。

#### `apphwhq.MarketMood/MoodNumCount`

无需额外参数的匿名请求返回 `errcode=0`。`list` 抽样含 `SZJS`、`XDJS`、`ZTJS`、`DTJS`、`qscln`、`q_zrcs`、`bl`、`color`。各缩写的口径、金额/比例单位、分母和 `color` 编码均未知。

#### `apphwhq.HomeDingPan/Radar`

匿名实测使用 `Index=0`、`st=5`，返回 `errcode=0` 和 5 条事件。`list[]` 抽样含 `time`、`status`、`stock_name`、`plate_type`、`status_color`、`zf`、`content`、`content2`、`stockid`、`LBstatus`。事件类型、颜色编码、`zf` 单位和时间时区未知。

### 匿名请求形态

以下示例只含公共参数和 action 参数，不含凭据。它们是可复现的请求形态，不在本文伪造响应输出；一次成功不代表长期可用。

部署侧 request-rewriter 自动注入 browser UA 时，`apphwhq` 的 `ZhiBoContent` 和 `Radar` 可能返回空双列表并导致 RSSHub 空 feed；直接请求或显式使用下列已从公开抓包字段提取的 App UA，两组均曾返回 20 条。该观察不证明所有 UA 规则，也不表示其他 action 必须使用此 UA。固定 `Referer` 单独不能修复该现象。

```sh
curl -sS -X POST 'https://apparticle.kaipanhong.com/w1/api/index.php' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'User-Agent: %E5%BC%80%E7%9B%98%E7%BA%A2/0 CFNetwork/3860.700.1 Darwin/25.6.0' \
  --data 'apiv=w47&VerSion=6.2.31.1&PhoneOSNew=2&c=PCNewsFlash&a=GetList&Type=0&Index=0&st=5'

curl -sS -X POST 'https://apphwhq.kaipanhong.com/w1/api/index.php' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'User-Agent: %E5%BC%80%E7%9B%98%E7%BA%A2/0 CFNetwork/3860.700.1 Darwin/25.6.0' \
  --data 'apiv=w47&VerSion=6.2.31.1&PhoneOSNew=2&c=ConceptionPoint&a=ZhiBoContent'

curl -sS -X POST 'https://apphwhq.kaipanhong.com/w1/api/index.php' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'User-Agent: %E5%BC%80%E7%9B%98%E7%BA%A2/0 CFNetwork/3860.700.1 Darwin/25.6.0' \
  --data 'apiv=w47&VerSion=6.2.31.1&PhoneOSNew=2&c=MarketMood&a=MoodNumCount'

curl -sS -X POST 'https://apphwhq.kaipanhong.com/w1/api/index.php' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'User-Agent: %E5%BC%80%E7%9B%98%E7%BA%A2/0 CFNetwork/3860.700.1 Darwin/25.6.0' \
  --data 'apiv=w47&VerSion=6.2.31.1&PhoneOSNew=2&c=HomeDingPan&a=Radar&Index=0&st=5'
```

请求必须使用各 action 所属 host；例如 `PCNewsFlash` 不得发送到 `apphwhq`，即使 path 相同。

## 错误、分页与媒体

HTTP 状态和业务 `errcode` 是两层契约。HTTP 2xx 不等于业务成功，必须检查响应中的 `errcode`；业务错误也不应被伪装为正常空列表或数字 0。非 2xx、超时、无效 JSON、`errcode != 0`、缺少预期顶层字段和授权不足应分别记录，具体错误码语义目前未知。

`Index`、`st`、`Time` 等看起来像游标或数量参数，但本次未确认分页规则、是否包含边界项、最大值或排序稳定性。RSSHub 实现只应按实现约定请求首批数据，不把未知字段当作可公开分页承诺。速率限制未知。

直播和专栏样本出现图片 URL，部分资源仍使用 `appresi.longhuvip.com` 或旧图片域名。未确认音频接口或音频正文结构。图片、文章、付费栏目和其他媒体受上游版权、授权和付费限制，RSSHub 不应绕过登录或付费分发；缺少 `IsPay` 字段也不等于免费。

## 与 RSSHub 路由的边界

上游是 POST 表单 JSON；RSSHub 对订阅者提供的是 GET 路由和 XML feed，二者不是同一契约：

| RSSHub GET 路径                                            | 状态                                                      |
| ---------------------------------------------------------- | --------------------------------------------------------- |
| `/kaipanhong/news/:type?`                                  | 新品牌入口，沿用共享新闻解析实现。                        |
| `/kaipanhong/dapanzhibo/:category?`                        | 新品牌入口，沿用共享直播解析实现。                        |
| `/kaipanhong/radar`                                        | 新增事件流入口，使用 Radar。                              |
| `/kaipanla/news/:type?`、`/kaipanla/dapanzhibo/:category?` | 保留兼容入口，共享 handler。                              |
| `/kaipanla/zt`、`/kaipanla/review`                         | 旧功能仅修复缺字段导致的假零值，不宣称新 API 已恢复可用。 |
| market 路由                                                | 尚未实现。不要把 `MoodNumCount` 误写成已存在的 RSS 路由。 |

新闻 `type` 默认 `stock`，映射上游 `Type=0`；`commodity` 保留映射 `Type=1`，但该名称不代表已确认的产品分类；`0`、`1`、`2` 也可直接传递为原始类型。直播 `category` 默认 `全部`，仅在 RSSHub 本地按 `个股`（`Stock` 非空）、`板块`（`PlateName` 非空）、板块名或 `UserName` 筛选，不发送给上游。`radar` 无路径参数，上游请求固定首批 `Index=0, st=20`。

RSSHub 订阅者请求上述 GET 路径得到 XML feed，不会得到上游 JSON。上游正常空 `List/list` 会交给 RSSHub 的空 feed 处理，具体 HTTP 结果由框架和路由配置决定，本文不承诺 HTTP 200；HTTP/JSON 错误、业务 `errcode != 0` 或必要字段缺失应让路由失败，不得以假零值代替。缓存 TTL 为 1 秒，速率限制未知；`limit` 等 RSSHub 通用参数由 RSSHub 层处理，不是上游分页承诺。

新闻与直播的旧 GUID 前缀应保持稳定，跨 namespace 是否同一 ID 空间仍需实现验收；不要因为品牌改名而宣称部署完成或保证消费者去重。当前共享实现的内部缓存 key 为 `kaipanhong:news:{type}`、`kaipanhong:zhibo`、`kaipanhong:radar`，TTL 为 1 秒；这些是实现细节，外层 RSSHub 缓存仍按请求路径等维度区分。错误处理会区分 HTTP 层失败、JSON/字段缺失和 `errcode != 0`，但具体业务错误码语义未知。实际参数、错误分支和缓存行为以实现代码为准，本参考文档不预先替代实现验收。

## 证据限制

47 组清单和字段类型来自脱敏抓包抽样；4 组匿名成功是单次观察。字段单位、业务错误码非零含义、授权条件、排序/分页边界、速率限制和长期兼容性仍未知。OpenAPI 只描述这 4 组，不能替代上游授权文档。
