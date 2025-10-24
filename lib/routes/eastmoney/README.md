# 东方财富

## 全球财经快讯

<Route author="" path="/eastmoney/kuaixun/:category?" example="/eastmoney/kuaixun" :paramsDesc="['分类，可选，留空为全部快讯']" />

获取东方财富全球财经快讯的实时信息。

### 分类代码

共支持 **32 个分类**，通过 `category` 参数指定：

**基础分类**: `100`焦点 | `101`要闻 | `102`7\*24直播 | `zhibo`股市直播

**公司相关**: `103`上市公司 | `104`中国公司 | `105`全球公司

**市场相关**: `106`商品 | `107`外汇 | `108`债券 | `109`基金

**地区筛选**: `110`中国 | `111`美国 | `112`欧元区 | `113`英国 | `114`日本 | `115`加拿大 | `116`澳洲 | `117`新兴市场

**全球央行**: `118`中国 | `119`美联储 | `120`欧洲 | `121`英国 | `122`日本 | `123`加拿大 | `124`澳洲

**经济数据**: `125`中国 | `126`美国 | `127`欧元区 | `128`英国 | `129`日本 | `130`加拿大 | `131`澳洲

### 查询参数

- `limit`: 限制返回数量（默认 50 条，建议不超过 200）
- `important_only`: 仅返回重要快讯（设置为 `1` 启用）

### 数据时间范围

| 数据量 (limit) | 时间覆盖范围  | 适用场景 |
| -------------- | ------------- | -------- |
| 20 条          | 最近 40 分钟  | 快速浏览 |
| 50 条（默认）  | 最近 1-2 小时 | 实时订阅 |
| 100 条         | 最近 3-4 小时 | 半日回顾 |
| 200 条         | 最近 5-6 小时 | 全日回顾 |

**历史数据范围**

- 通过分页最多可回溯约 **7-10 天**
- 每 50 条约覆盖 1-2 小时
- API 支持获取约 **5000+ 条**历史快讯

**推荐设置**

- 日常RSS订阅：使用默认 **50 条**，自动获取最新快讯
- 特定监控：使用 **20-30 条** + 分类筛选
- 深度回顾：使用 **100-200 条**

### 示例

**基础使用**

- `/eastmoney/kuaixun` - 所有快讯
- `/eastmoney/kuaixun/100` - 焦点快讯
- `/eastmoney/kuaixun/101` - 要闻快讯
- `/eastmoney/kuaixun/103` - 上市公司快讯

**市场分类**

- `/eastmoney/kuaixun/106` - 商品快讯
- `/eastmoney/kuaixun/107` - 外汇快讯
- `/eastmoney/kuaixun/108` - 债券快讯
- `/eastmoney/kuaixun/109` - 基金快讯

**地区筛选**

- `/eastmoney/kuaixun/110` - 中国地区快讯
- `/eastmoney/kuaixun/111` - 美国地区快讯

**央行动态**

- `/eastmoney/kuaixun/118` - 中国央行快讯
- `/eastmoney/kuaixun/119` - 美联储快讯

**经济数据**

- `/eastmoney/kuaixun/125` - 中国经济数据
- `/eastmoney/kuaixun/126` - 美国经济数据

**组合使用**

- `/eastmoney/kuaixun/100?limit=20` - 焦点快讯（限制20条）
- `/eastmoney/kuaixun/103?important_only=1` - 上市公司重要快讯
- `/eastmoney/kuaixun/zhibo` - 股市直播模式

### 功能特性

**✅ 智能股票信息获取**（自动）

- 自动批量获取关联股票的名称和实时涨跌幅
- **`category` 字段显示股票名称**（如"比亚迪"），而非代码
- **描述中显示股票详情**：名称、价格、涨跌幅（红绿色标识）
- 批量请求，性能优化，单次额外200-500ms

**✅ 其他功能**

- 智能提取【】标题
- 自动处理新闻配图
- 时区自动转换（东八区）
- 支持重要快讯筛选

**效果示例**

快讯关联股票 `["0.002594", "116.01211"]` 会自动转换为：

- Category 显示: `比亚迪`, `比亚迪股份`
- 描述显示:
    ```
    📈 相关股票:
      • 比亚迪: 103.72 -0.28% ↓
      • 比亚迪股份: 104.80 -0.85% ↓
    ```

### API 信息

**使用的接口**

- 快讯列表: `https://np-weblist.eastmoney.com/comm/web/getFastNewsList`
- 直播列表: `https://np-weblist.eastmoney.com/comm/web/getFastNewsZhibo`
- 股票行情: `https://push2.eastmoney.com/api/qt/clist/get`（自动批量调用）

**数据处理流程**

1. 获取快讯列表
2. 收集所有 `stockList` 中的股票代码
3. 批量请求股票行情API获取名称和涨跌幅
4. 将股票名称添加到 `category`
5. 将股票详情添加到 `description`

**快讯API字段**

- `code` - 快讯唯一ID
- `title` - 快讯标题
- `summary` - 快讯内容
- `showTime` - 发布时间
- `image[]` - 图片URL列表
- `stockList[]` - 关联股票代码（格式: "交易所.代码"，如 `0.002594`）
- `source` - 新闻来源

**股票行情API字段**

- `f14` - 股票名称（用于category和description）
- `f2` - 最新价
- `f3` - 涨跌幅%
- `f4` - 涨跌额

---

## 其他路由

### 研报

<Route author="nczitzk" path="/eastmoney/report/:category?" example="/eastmoney/report" :paramsDesc="['分类，见下表，默认为全部']" />

### 个股研报

<Route author="nczitzk" path="/eastmoney/report/:symbol" example="/eastmoney/report/000001" :paramsDesc="['股票代码']" />

### 基金经理

<Route author="nczitzk" path="/eastmoney/ttjj/user/:id" example="/eastmoney/ttjj/user/80000001" :paramsDesc="['基金经理 ID，可在基金经理页面 URL 中找到']" />
