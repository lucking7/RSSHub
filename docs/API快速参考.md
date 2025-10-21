# API 快速参考手册

## 📋 目录

- [问财 API](#问财-api)
- [开盘啦 API](#开盘啦-api)
- [Django REST API](#django-rest-api)

---

## 🔍 问财 API

### 基础信息

- **URL**: `http://www.iwencai.com`
- **认证**: Cookie + Hexin-V Token

### 核心接口

| 接口           | URL                                          | 用途         |
| -------------- | -------------------------------------------- | ------------ |
| get-robot-data | `/customized/chart/get-robot-data`           | 获取查询条件 |
| getDataList    | `/gateway/urp/v7/landing/getDataList`        | 获取数据列表 |
| find           | `/unifiedwap/unified-wap/v2/stock-pick/find` | 查找股票     |

### 常用查询

```python
# 1. 查询涨停股
pywencai.get(query='20240109日 涨停股 涨停原因', loop=True)

# 2. 查询量比排名
pywencai.get(query='量比从大到小排名前50')

# 3. 查询炸板股
pywencai.get(query='20231019 炸板股池')

# 4. 查询技术指标
pywencai.get(query='均线多头排列')

# 5. 查询竞价幅度
pywencai.get(query='竞价幅度大于4.3%')
```

### 请求头配置

```python
headers = {
    'hexin-v': get_token(),  # 动态生成
    'User-Agent': 'Mozilla/5.0...',
    'Cookie': cookie_string,
    'Content-Type': 'application/json'
}
```

---

## 📊 开盘啦 API

### 基础信息

- **实时**: `https://apphq.longhuvip.com/w1/api/index.php`
- **历史**: `https://apphis.longhuvip.com/w1/api/index.php`
- **请求方式**: POST (application/x-www-form-urlencoded)

### 核心接口速查表

| 功能       | 参数 a           | 参数 c          | PidType | 说明       |
| ---------- | ---------------- | --------------- | ------- | ---------- |
| 涨跌幅详情 | ZhangFuDetail    | HomeDingPan     | -       | 涨跌停家数 |
| 市场量能   | MarketCapacity   | HomeDingPan     | -       | 成交量数据 |
| 涨停板     | DaBanList        | HomeDingPan     | 1       | 涨停列表   |
| 炸板       | DaBanList        | HomeDingPan     | 2       | 炸板列表   |
| 跌停       | DaBanList        | HomeDingPan     | 3       | 跌停列表   |
| 自然涨停   | DaBanList        | HomeDingPan     | 4       | 自然涨停   |
| 指数数据   | RefreshStockList | UserSelectStock | -       | 大盘指数   |

### 历史数据参数

| 功能       | 参数 a           | 参数 c         | 额外参数  |
| ---------- | ---------------- | -------------- | --------- |
| 涨跌幅详情 | HisZhangFuDetail | HisHomeDingPan | Day=日期  |
| 市场量能   | MarketCapacity   | HisHomeDingPan | Date=日期 |
| 打板列表   | HisDaBanList     | HisHomeDingPan | Day=日期  |
| 指数数据   | GetZsReal        | StockL2History | Day=日期  |

### 快速调用示例

```python
# 1. 获取今日涨停
params = {
    "urlOfToday": "https://apphq.longhuvip.com/w1/api/index.php",
    "queryStringOfToday": "PidType=1&a=DaBanList&c=HomeDingPan&st=100",
    "hostOfToday": "apphq.longhuvip.com"
}

# 2. 获取历史炸板
params = {
    "urlOfHistory": "https://apphis.longhuvip.com/w1/api/index.php",
    "queryStringOfHistory": "Day={0}&PidType=2&a=HisDaBanList&c=HisHomeDingPan",
    "hostOfHistory": "apphis.longhuvip.com"
}

# 3. 获取市场成交量
RequestVolumnDataByDates(['2023-04-27'], dbConnection)

# 4. 获取涨跌停家数
RequestZhangDieTingJiashu(['2023-04-27'], dbConnection)
```

### 返回数据字段映射

**打板列表数组索引**:

```
[0] = 股票代码
[1] = 股票名称
[4] = 涨幅
[6] = 首次涨停时间
[7] = 炸板时间
[8] = 封单额
[9] = 状态
[11] = 板块
[12] = 金额
[13] = 成交量
[14] = 换手率
[15] = 流通市值
[16] = 涨停原因
[23] = 最大封单
[25] = 最后涨停时间
```

---

## 🌐 Django REST API

### 基础 URL

`http://localhost:8000`

### API 端点速查

#### 📈 股票数据

| 接口     | 方法 | 路径              | 功能         |
| -------- | ---- | ----------------- | ------------ |
| 东财数据 | POST | `/stock/stock_ah` | A 股基础数据 |
| 涨停股   | POST | `/stock/stock_zt` | 涨停股列表   |
| 基础查询 | POST | `/stock/query`    | 通用查询     |
| 基础更新 | POST | `/stock/update`   | 配置更新     |

#### 🎯 题材选股

```bash
POST /stock/select
{
  "industry": "新能源|芯片",  # 多题材用|分隔
  "name": "",                # 股票名称
  "code": "",                # 股票代码
  "area": "",                # 地区
  "Sort": "px_change_rate",  # 排序字段
  "SortType": 0,             # 0=降序, 1=升序
  "Offset": 0,
  "Limit": 20
}
```

#### 💰 买入管理

```bash
# 添加买入
POST /stock/add_buy
{
  "Code": "000001",
  "Date": "2023-04-27",
  "Value": 1
}

# 查询买入
GET /stock/buy?date=now&mode=0
```

**mode 参数**:

- `0-4`: 买入模式
- `100`: 题材筛选
- `空`: 根据配置自动判断

#### ⚙️ 配置管理

```bash
# 查询配置
GET /stock/config

# 更新配置
POST /stock/config
{
  "pos": 25000,       # 仓位
  "enable": 1,        # 启用
  "num": 2,           # 数量
  "pos300": 10000,    # 创业板仓位
  "enable300": 1,     # 创业板启用
  "num300": 2         # 创业板数量
}
```

#### 📊 市场数据

```bash
# 市场情绪
POST /stock/query_market_temp
{"Date": "2023-04-27"}

# 每日数据
GET /stock/daily?date=now&type=stock
```

**type 参数**:

- `stock`: 股票列表
- `zt`: 涨停股
- `buy`: 买入列表
- `空`: 完整市场数据

#### 🔧 手动任务

| 接口         | 路径                        | 功能             |
| ------------ | --------------------------- | ---------------- |
| 更新基础数据 | `/stock/update_stock_basic` | 手动更新股票数据 |
| 测试每日任务 | `/stock/test_daily`         | 测试定时任务     |
| 更新可转债   | `/stock/update_stock_cb`    | 更新转债数据     |

#### 📋 其他接口

| 功能       | 路径                               |
| ---------- | ---------------------------------- |
| 龙虎榜     | `/stock/sina_lhb_ggtj`             |
| 大宗交易   | `/stock/block_trade`               |
| 可转债查询 | `/stock/query_stock_cb`            |
| 资金流向   | `/capital_flow/plate_capital_flow` |
| 买入猜想   | `/guess_indicators/buy`            |
| 卖出猜想   | `/guess_indicators/sell`           |
| 系统日志   | `/sys/query_logs`                  |

---

## 🔑 认证信息

### 问财 Cookie (存储在数据库)

```sql
SELECT cookie FROM cookies WHERE name = "iwencai";
```

### Cloudflare 配置 [[memory:10034187]]

```python
CLOUDFLARE_CONFIG = {
    "zone_id": "4b190d94cc2f6dd0a16a1ce8db3a14f6",
    "account_id": "b07604df05305dcc85b482a4d2f9bad4",
    "api_token": "5I-zpBk87eNsbSWI9El-MrwqjEXGFRTtqBsX23EV"
}

# 验证Token
curl "https://api.cloudflare.com/client/v4/accounts/b07604df05305dcc85b482a4d2f9bad4/tokens/verify" \
  -H "Authorization: Bearer 5I-zpBk87eNsbSWI9El-MrwqjEXGFRTtqBsX23EV"
```

---

## 🎯 常用筛选条件

### 涨停基因筛选

```python
# 优质股票筛选条件
limits > 5          # 历史涨停次数 > 5
fb_rate > 70%       # 反包率 > 70%
red_rate > 80%      # 红盘率 > 80%
排除: 8开头(北交所)
```

### 市值筛选

```python
floating_market < 60亿  # 流通市值 < 60亿
```

### 板块筛选

```python
# 排除板块
排除: 688开头(科创板)
保留: 3开头(创业板) - 特殊处理
```

---

## 📦 数据库表速查

| 表名             | 用途         |
| ---------------- | ------------ |
| stock_zh_ah_name | 东财股票数据 |
| stock_zt_name    | 涨停数据     |
| stock_info       | 股票基因     |
| stock_buy        | 买入记录     |
| stock_industry   | 股票行业     |
| stock_config     | 配置         |
| trade_config     | 交易配置     |
| market_temp      | 市场情绪     |
| kaipanla_volumn  | 成交量       |
| kaipanla_zhaban  | 炸板         |
| kaipanla_index   | 指数         |

---

## 🚀 快速开始

### 1. 获取涨停股流程

```python
# Step 1: 从问财获取涨停股
query = f'{date} 涨停股 涨停原因'
df = pywencai.get(query=query, loop=True)

# Step 2: 存入数据库
# (自动处理)

# Step 3: 通过API查询
curl -X POST http://localhost:8000/stock/stock_zt \
  -d '{"Sort":"limit_times","SortType":0}'
```

### 2. 题材选股流程

```python
# Step 1: 通过API选股
curl -X POST http://localhost:8000/stock/select \
  -d '{
    "industry": "新能源|芯片",
    "Sort": "px_change_rate",
    "SortType": 0
  }'

# Step 2: 添加买入
curl -X POST http://localhost:8000/stock/add_buy \
  -d '{"Code": "000001", "Date": "now", "Value": 1}'
```

### 3. 市场数据获取流程

```python
# Step 1: 获取市场成交量
res = RequestVolumnDataByDates(['2023-04-27'], db)

# Step 2: 获取涨跌停家数
res = RequestZhangDieTingJiashu(['2023-04-27'], db)

# Step 3: 获取每日完整数据
curl http://localhost:8000/stock/daily?date=now
```

---

## ⚡ 性能优化建议

### 问财 API

- ✅ 请求间隔: 1-3 秒
- ✅ 使用分页: `perpage=100`
- ✅ 添加重试: `retry=10`

### 开盘啦 API

- ✅ 使用分页类: `CKaiPanLaMultiPageDataMgr`
- ✅ 每页数量: `st=50-100`
- ✅ 设置超时: `timeout=30`

### Django API

- ✅ 数据库索引: code, date
- ✅ 查询缓存: 使用 Redis
- ✅ 分页返回: Limit ≤ 100

---

## 🐛 常见问题

### 问题 1: Hexin-V token 失效

```python
# 解决方案: 重新生成token
from pywencai.headers import get_token
token = get_token()
```

### 问题 2: 开盘啦请求失败

```python
# 解决方案: 检查User-Agent和Host
headers = {
    'User-Agent': 'lhb/5.9.3 (com.kaipanla.www; build:0; iOS 15.4.0) Alamofire/5.9.3',
    'Host': 'apphq.longhuvip.com'
}
```

### 问题 3: Django 查询超时

```python
# 解决方案: 添加索引和优化SQL
# 在models.py添加:
class Meta:
    indexes = [
        models.Index(fields=['code', 'date']),
    ]
```

---

## 📚 相关文档

- 详细文档: [API 调用整理文档.md](./API调用整理文档.md)
- 项目代码:
  - Webstock: `/Users/jasperl./Downloads/webstock-main/`
  - Bull: `/Users/jasperl./Downloads/Bull-main/`

---

**最后更新**: 2025-10-21
