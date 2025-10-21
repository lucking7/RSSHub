# 股票项目 API 调用整理文档

## 目录结构

- [1. 问财 (iWenCai) API](#1-问财-iwencai-api)
- [2. 开盘啦 (KaiPanLa) API](#2-开盘啦-kaipanla-api)
- [3. Django REST API (Webstock)](#3-django-rest-api-webstock)

---

## 1. 问财 (iWenCai) API

### 1.1 基础信息

- **项目路径**:
  - `/Users/jasperl./Downloads/webstock-main/stock/pywencai`
  - `/Users/jasperl./Downloads/Bull-main/src/iWenCai`
- **API 基础 URL**: `http://www.iwencai.com`
- **认证方式**: Cookie + Hexin-V Token

### 1.2 核心 API 端点

#### 1.2.1 获取机器人数据 (get-robot-data)

```
POST http://www.iwencai.com/customized/chart/get-robot-data
```

**请求参数**:

```python
{
    'add_info': '{"urp":{"scene":1,"company":1,"business":1},"contentType":"json","searchInfo":true}',
    'perpage': '10',
    'page': 1,
    'source': 'Ths_iwencai_Xuangu',
    'log_info': '{"input_type":"click"}',
    'version': '2.0',
    'secondary_intent': 'stock',  # 或 'zhishu'
    'question': '查询问题',
    'iwcpro': 1  # 可选，专业版
}
```

**请求头**:

```python
{
    'hexin-v': get_token(),  # 动态生成的token
    'User-Agent': 'Mozilla/5.0...',
    'Cookie': cookie_string,
    'Content-Type': 'application/json'
}
```

#### 1.2.2 获取数据列表 (getDataList)

```
POST http://www.iwencai.com/gateway/urp/v7/landing/getDataList
```

**请求参数**:

```python
{
    'perpage': 100,
    'page': 1,
    'source': 'Ths_iwencai_Xuangu',
    'query': '查询条件',
    'condition': '从get-robot-data获取',
    # ... 其他参数
}
```

#### 1.2.3 查找股票 (find)

```
POST http://www.iwencai.com/unifiedwap/unified-wap/v2/stock-pick/find
```

**请求参数**:

```python
{
    'perpage': 100,
    'page': 1,
    'source': 'Ths_iwencai_Xuangu',
    'query_type': 'stock',
    'question': '股票代码或名称',
    # ... 其他参数
}
```

### 1.3 主要功能模块

#### 1.3.1 获取股票日行情数据 (FetchStockDailyData)

```python
payload = {
    "source": "Ths_iwencai_Xuangu",
    "version": "2.0",
    "question": f"日期{today} 前复权开盘价，前复权收盘价，前复权最高价，前复权最低价，前复权涨跌幅, {today}成交量，{today}成交额，上市天数,所属概念",
    "perpage": "100",
    "page": 1,
    "secondary_intent": "stock",
}
```

**返回字段**:

- 股票代码
- 开盘价 (前复权)
- 收盘价 (前复权)
- 最高价 (前复权)
- 最低价 (前复权)
- 成交量
- 成交额
- 涨跌幅 (前复权)
- 上市天数
- 所属概念

#### 1.3.2 获取板块指数数据 (FetchBanKuaiData)

```python
payload = {
    "source": "Ths_iwencai_Xuangu",
    "version": "2.0",
    "question": f"{today} 板块指数代码 指数简称 开盘价 收盘价 最高价 最低价 成交量 成交额 涨跌幅 量比 换手率 上涨家数 下跌家数 流通市值 总市值",
    "perpage": 100,
    "page": 1,
    "secondary_intent": "zhishu",
}
```

**返回字段**:

- 板块代码
- 板块名称
- 开盘价(点)
- 收盘价(点)
- 最高价(点)
- 最低价(点)
- 成交量(股)
- 成交额(元)
- 涨跌幅(%)
- 量比
- 换手率(%)
- 上涨家数(家)
- 下跌家数(家)
- 流通市值(元)
- 总市值(元)

#### 1.3.3 其他查询功能

- **FetchBanKuaiStockMatch**: 板块股票匹配
- **FetchIndex**: 指数数据
- **FetchKeZhuanZaiDailyData**: 可转债日数据
- **FetchVMAData**: VMA 数据
- **FetchYeWu**: 业务数据
- **FetchZhaBanData**: 炸板数据

### 1.4 Hexin-V Token 生成

**方式 1** (pywencai):

```python
# 通过Node.js执行hexin-v.bundle.js
subprocess.run(['node', 'hexin-v.bundle.js'])
```

**方式 2** (Bull):

```python
# 通过get_hexin_v()函数获取
from iWenCai.getHexinV import get_hexin_v
v = get_hexin_v()
```

---

## 2. 开盘啦 (KaiPanLa) API

### 2.1 基础信息

- **项目路径**: `/Users/jasperl./Downloads/Bull-main/src/kaipanla`
- **主要域名**:
  - 实时数据: `apphq.longhuvip.com`
  - 历史数据: `apphis.longhuvip.com`
- **请求方式**: POST
- **Content-Type**: `application/x-www-form-urlencoded; charset=utf-8`

### 2.2 核心 API 端点

#### 2.2.1 涨跌幅详情 (ZhangFuDetail)

**实时数据**:

```
POST https://apphq.longhuvip.com/w1/api/index.php

参数:
PhoneOSNew=2
VerSion=5.12.0.1
a=ZhangFuDetail
apiv=w34
c=HomeDingPan
```

**历史数据**:

```
POST https://apphis.longhuvip.com/w1/api/index.php

参数:
Day=2023-04-27
PhoneOSNew=2
VerSion=5.12.0.1
a=HisZhangFuDetail
apiv=w34
c=HisHomeDingPan
```

**返回数据**:

```json
{
  "date": "2023-04-27",
  "info": {
    "qscln": 1234567890, // 全市场成交量
    "SJZT": 100, // 实际涨停数
    "SJDT": 10 // 实际跌停数
  }
}
```

#### 2.2.2 市场量能 (MarketCapacity)

**实时数据**:

```
POST https://apphq.longhuvip.com/w1/api/index.php

参数:
PhoneOSNew=2
Type=0
VerSion=5.11.0.3
a=MarketCapacity
apiv=w33
c=HomeDingPan
```

**历史数据**:

```
POST https://apphis.longhuvip.com/w1/api/index.php

参数:
Date=2023-04-27
PhoneOSNew=2
Type=0
VerSion=5.12.0.1
a=MarketCapacity
apiv=w34
c=HisHomeDingPan
```

**返回数据**:

```json
{
  "info": {
    "last": 1234567890, // 当日成交量
    "s_zrcs": 1234567890, // 昨日成交量
    "trends": "..." // 趋势数据
  }
}
```

#### 2.2.3 打板列表 (DaBanList)

**涨停板 (PidType=1)**:

```
POST https://apphq.longhuvip.com/w1/api/index.php

参数:
Filter=0
FilterGem=0
FilterMotherboard=0
FilterTIB=0
Index=0
Is_st=1
Order=0
PhoneOSNew=2
PidType=1        # 1=涨停
Type=4
VerSion=5.11.0.3
a=DaBanList
apiv=w33
c=HomeDingPan
st=100           # 每页数量
```

**炸板 (PidType=2)**:

```
参数同上，PidType=2
```

**跌停 (PidType=3)**:

```
参数同上，PidType=3
```

**自然涨停 (PidType=4)**:

```
参数同上，PidType=4, Type=6
```

**历史数据**:

```
POST https://apphis.longhuvip.com/w1/api/index.php

参数:
Day=2023-04-27
a=HisDaBanList
c=HisHomeDingPan
... (其他参数同实时)
```

**返回数据数组字段** (按索引):

- [0]: 股票代码
- [1]: 股票名称
- [4]: 涨幅
- [6]: 首次涨停时间
- [7]: 炸板时间
- [8]: 封单额
- [9]: 状态
- [11]: 板块
- [12]: 金额
- [13]: 成交量
- [14]: 换手率
- [15]: 流通市值
- [16]: 涨停原因
- [23]: 最大封单
- [25]: 最后涨停时间

#### 2.2.4 指数数据 (RefreshStockList)

**实时数据**:

```
POST https://apphq.longhuvip.com/w1/api/index.php

参数:
DeviceID=72697ee95ed4399fac9914eba97c8ede3bfddb7c
PhoneOSNew=2
StockIDList=SH000001,SZ399001,SZ399006,SH000688
Token=919d7846d93da295c163371c85cfd81c
UserID=1585460
VerSion=5.11.0.3
a=RefreshStockList
apiv=w33
c=UserSelectStock
```

**历史数据**:

```
POST https://apphis.longhuvip.com/w1/api/index.php

参数:
Day=2023-04-27
PhoneOSNew=2
VerSion=5.11.0.3
a=GetZsReal
apiv=w33
c=StockL2History
```

**返回数据**:

```json
{
  "StockList": [
    {
      "StockID": "SH000001",
      "prod_name": "上证指数",
      "increase_amount": 12.34,
      "increase_rate": 0.56,
      "last_px": 3234.56,
      "turnover": 1234567890
    }
  ]
}
```

### 2.3 请求头配置

```python
headers = {
    'Host': 'apphq.longhuvip.com',  # 或 apphis.longhuvip.com
    'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    'Connection': 'close',
    'Accept': '*/*',
    'User-Agent': 'lhb/5.9.3 (com.kaipanla.www; build:0; iOS 15.4.0) Alamofire/5.9.3',
    'Accept-Language': 'zh-Hans-CN;q=1.0, en-CN;q=0.9',
    'Content-Length': str(len(queryString)),
    'Accept-Encoding': 'gzip;q=1.0, compress;q=0.5',
}
```

### 2.4 数据管理类

#### CKaiPanLaDataMgr

- **RequestDataToday**: 获取当天数据
- **RequestHistoryData**: 获取历史数据
- **RequestData**: 自动判断获取当天或历史数据

#### CKaiPanLaMultiPageDataMgr

- 支持分页获取大量数据
- 参数:
  - `st`: 每页数量 (默认 50)
  - `Index`: 起始索引

### 2.5 主要功能函数

#### RequestVolumnDataByDates

- 获取两市成交量数据
- 返回: 成交量、昨日成交、增量、增幅

#### RequestZhangDieTingJiashu

- 获取涨跌停家数
- 返回: (涨停数, 跌停数)

#### RequestZhaBanDataByDates

- 获取炸板数据
- 写入数据库表: `kaipanla_zhaban`

#### RequestIndexData

- 获取大盘指数数据
- 支持指数: SH000001, SZ399001, SZ399006, SH000688
- 写入数据库表: `kaipanla_index`

---

## 3. Django REST API (Webstock)

### 3.1 基础信息

- **项目路径**: `/Users/jasperl./Downloads/webstock-main/stock/stock-api`
- **框架**: Django REST Framework
- **基础 URL**: `/stock/*`

### 3.2 API 端点列表

#### 3.2.1 股票基础数据

##### 东财基础数据

```
POST /stock/stock_ah
```

**请求参数**:

```json
{
  "Filter": [
    {
      "Name": "字段名",
      "Values": ["值"],
      "Op": "="
    }
  ],
  "Sort": "字段名",
  "SortType": 1, // 1=升序, 0=降序
  "Offset": 0,
  "Limit": 20
}
```

##### 涨停股查询

```
POST /stock/stock_zt
```

**请求参数**: 同上
**返回字段**:

- 涨停基本信息
- 融资融券标记 (rzrq_flag)
- 转债标记 (zz_flag)
- 沪深港通标记 (hsgt_flag)
- 买入标记 (buy)

##### 基础查询

```
POST /stock/query
```

**请求参数**:

```json
{
  "Type": "AllBuy" | "TradeConfig"
}
```

##### 基础更新

```
POST /stock/update
```

**请求参数**:

```json
{
  "Op": "AddConfig" | "DelConfig",
  "Data": {
    "key": "配置键",
    "value": "配置值",
    "desc": "描述",
    "data_type": 0
  }
}
```

#### 3.2.2 龙虎榜数据

##### 新浪龙虎榜个股上榜

```
POST /stock/sina_lhb_ggtj
```

##### 大宗交易

```
POST /stock/block_trade
```

#### 3.2.3 可转债数据

##### 查询可转债

```
POST /stock/query_stock_cb
```

##### 更新可转债

```
POST /stock/update_stock_cb
```

#### 3.2.4 市场数据

##### 市场情绪

```
POST /stock/query_market_temp
```

**请求参数**:

```json
{
  "Date": "2023-04-27"
}
```

##### 每日数据

```
GET /stock/daily?date=now&type=stock
```

**参数**:

- `date`: 日期 (默认'now')
- `type`: 'stock' | 'zt' | 'buy' | 空(完整数据)

**返回数据** (type 为空时):

- 日期、红盘数、总数、红盘率
- 成交额、热度、涨停数
- 涨幅>5%数量、创业板涨停数
- 跌停数、跌幅>5%数量
- 炸板率、连板率、连板数、最大连板
- 高板列表、3 板列表、4 板+列表

#### 3.2.5 交易配置

##### 配置查询/更新

```
GET/POST /stock/config
```

**GET 返回**:

```json
{
  "pos": 25000, // 仓位
  "enable": 1, // 启用状态
  "num": 2, // 数量
  "pos300": 10000, // 创业板仓位
  "enable300": 1, // 创业板启用
  "num300": 2 // 创业板数量
}
```

**POST 请求**:

```json
{
  "pos": 25000,
  "enable": 1,
  "num": 2,
  "pos300": 10000,
  "enable300": 1,
  "num300": 2
}
```

#### 3.2.6 买入管理

##### 添加买入

```
POST /stock/add_buy
```

**请求参数**:

```json
{
  "Code": "000001",
  "Date": "2023-04-27",
  "Value": 1
}
```

##### 查询买入

```
GET /stock/buy?date=now&mode=
```

**参数**:

- `date`: 日期 (默认'now')
- `mode`: 模式 ('0'-'4', '100'=题材筛选, 空=根据配置)

#### 3.2.7 题材选股

##### 按题材查询

```
POST /stock/select
```

**请求参数**:

```json
{
  "industry": "题材1|题材2", // 用|分隔
  "name": "股票名称",
  "code": "股票代码",
  "area": "地区",
  "Sort": "排序字段",
  "SortType": 1,
  "Offset": 0,
  "Limit": 20
}
```

**返回字段**:

- 基本信息: code, name, industry
- 涨停基因: limits_num, yj, red_rate, fb_limit_rate, fb_break_rate, c_limit
- 实时数据: latest_price, quote_change, quantity_ratio, turnover_rate
- 市值: total, float
- 估值: pe_dynamic, px_change_rate
- 地区: area

#### 3.2.8 手动任务

##### 更新股票基础数据

```
POST /stock/update_stock_basic
```

##### 测试每日任务

```
POST /stock/test_daily
```

#### 3.2.9 猜想指标

##### 买入猜想

```
POST /guess_indicators/buy
```

##### 卖出猜想

```
POST /guess_indicators/sell
```

#### 3.2.10 系统功能

##### 查询日志

```
POST /sys/query_logs
```

##### 用户登录

```
POST /user/login
```

##### A 股市场数据

```
POST /ele/a_share_market
```

#### 3.2.11 资金流向

##### 板块资金流向

```
POST /capital_flow/plate_capital_flow
```

### 3.3 数据模型

#### StockAhModel (东财基础数据)

- 股票代码、名称
- 价格相关: latest_price, quote_change, ups_downs
- 成交相关: volume, turnover, turnover_rate
- 市值: total_market, floating_market
- 涨跌幅相关: growth_rate, growth_rate5, days_quote_change60, year_quote_change

#### StockZTModel (涨停数据)

- 基本信息: code, name, date
- 涨停信息: limit_times, first_limit, last_limit, break_times
- 原因: kpl_reason, thx_reason
- 行业: industry, industry_limits_num
- 标记: flag (0=正常涨停)

#### StockBuyModel (买入数据)

- code, date
- buy: 买入标记 (0/1)
- buy_mode: 买入模式 (0-4, 100)
- ret: 收益

#### ConfigModel (配置)

- pos, enable, num
- pos300, enable300, num300

#### TradeConfiModel (交易配置)

- key, value, desc, data_type

#### StockModel (股票基因)

- limits: 历史涨停次数
- red_rate: 红盘率
- fb_rate: 反包率
- limit_red_rate: 涨停后红盘率
- lb_rate: 连板率

#### StockCBModel (可转债)

- 转债基本信息
- double_low: 双低值

#### MARKETModel (市场数据)

- 日期相关情绪指标
- 涨跌停统计
- 连板统计

### 3.4 Service 层核心方法

#### StockBasicService

##### filter_stocks

- 根据涨停基因筛选股票
- 条件: limits>5, fb_rate>70%, red_rate>80%
- 排除: 北交所(8 开头)

##### select_by_ticai

- 按题材选股
- 支持多题材组合筛选
- 实时获取行情数据
- 可选基因过滤

##### query_stock_zt_by_condition

- 查询涨停股
- 关联股票基础信息(融资融券、转债、沪深港通标记)
- 关联买入标记

##### query_market_qx

- 查询市场情绪
- 计算连板周期
- 返回 100 天历史数据

##### query_daily

- 调用开盘啦 API 获取实时市场数据
- 统计涨跌停、红绿盘比例
- 分析连板情况

---

## 4. 数据流转关系

### 4.1 数据采集流程

```
问财API → 获取股票日行情/板块数据
    ↓
  存储到数据库
    ↓
Django Service层处理
    ↓
REST API提供查询接口
```

### 4.2 实时数据流程

```
开盘啦API → 获取实时市场数据
    ↓
Django query_daily处理
    ↓
计算市场情绪指标
    ↓
返回给前端
```

### 4.3 选股流程

```
用户输入题材条件
    ↓
查询股票行业数据
    ↓
调用东财API获取实时行情
    ↓
根据涨停基因过滤
    ↓
返回筛选结果
```

---

## 5. 关键技术点

### 5.1 认证机制

#### 问财 API

- 使用动态生成的 Hexin-V token
- Cookie 认证
- Token 有效期较短，需要动态获取

#### 开盘啦 API

- 模拟移动端请求
- User-Agent 固定为 iOS 客户端
- 无需 token 认证

### 5.2 数据处理

#### 分页处理

```python
# 问财API分页
def loop_page(loop, row_count, **kwargs):
    perpage = 100
    max_page = math.ceil(row_count / perpage)
    # 循环获取所有页
```

```python
# 开盘啦API分页
class CKaiPanLaMultiPageDataMgr:
    def RequestData(self, date, params):
        # 递归获取所有页
        self.index = self.page * self.st - 1
```

#### 重试机制

```python
def while_do(do, retry=10, sleep=0, log=False):
    count = 0
    while count < retry:
        time.sleep(sleep)
        try:
            return do()
        except:
            count += 1
    return None
```

### 5.3 数据库操作

#### Django ORM

```python
# 查询
stock_list = StockZTModel.objects.raw(sql, None)

# 插入/更新
model = StockBuyModel()
model.save()
```

#### 原生 SQL

```python
# 批量插入或替换
sql = '''REPLACE INTO `{0}` (`{1}`) VALUES ("{2}");'''
```

---

## 6. 常见查询示例

### 6.1 问财查询示例

#### 查询涨停股

```python
query = '20240109日 涨停股 涨停原因'
res = pywencai.get(query=query, loop=True)
```

#### 查询量比排名

```python
query = '量比从大到小排名前50'
res = pywencai.get(query=query)
```

#### 查询技术指标

```python
query = '均线多头排列'
res = pywencai.get(query=query)
```

#### 查询炸板股

```python
query = '20231019 炸板股池'
res = pywencai.get(query=query)
```

### 6.2 开盘啦查询示例

#### 查询当日涨停

```python
mgr = CKaiPanLaMultiPageDataMgr()
params = {
    "urlOfToday": "https://apphq.longhuvip.com/w1/api/index.php",
    "queryStringOfToday": "...PidType=1...a=DaBanList...",
    "hostOfToday": "apphq.longhuvip.com"
}
df = mgr.RequestData('2023-04-27', params)
```

#### 查询市场成交量

```python
res = RequestVolumnDataByDates(['2023-04-27'], dbConnection)
```

### 6.3 Django API 查询示例

#### 查询涨停股

```bash
curl -X POST http://localhost:8000/stock/stock_zt \
  -H "Content-Type: application/json" \
  -d '{
    "Filter": [{"Name": "date", "Values": ["20230427"]}],
    "Sort": "limit_times",
    "SortType": 0,
    "Offset": 0,
    "Limit": 100
  }'
```

#### 按题材选股

```bash
curl -X POST http://localhost:8000/stock/select \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "新能源|芯片",
    "Sort": "px_change_rate",
    "SortType": 0,
    "Offset": 0,
    "Limit": 20
  }'
```

#### 添加买入

```bash
curl -X POST http://localhost:8000/stock/add_buy \
  -H "Content-Type: application/json" \
  -d '{
    "Code": "000001",
    "Date": "2023-04-27",
    "Value": 1
  }'
```

---

## 7. 数据库表结构

### 7.1 主要表

#### stock_zh_ah_name (东财股票数据)

- 股票基本信息
- 实时行情
- 市值数据

#### stock_zt_name (涨停数据)

- date, code, name
- limit_times, first_limit, last_limit, break_times
- industry, kpl_reason, thx_reason
- flag

#### stock_info (股票基因)

- code, name, area
- limits, red_rate, fb_rate, limit_red_rate
- rzrq_flag, zz_flag, hsgt_flag

#### stock_buy (买入记录)

- date, code
- buy, buy_mode, ret

#### stock_industry (股票行业)

- code, name, industry_name

#### stock_config (配置)

- pos, enable, num
- pos300, enable300, num300

#### trade_config (交易配置)

- key, value, desc, data_type

#### market_temp (市场情绪)

- date
- 涨跌停统计
- 连板统计
- 成交额

#### kaipanla\_\* (开盘啦数据表)

- kaipanla_volumn: 成交量
- kaipanla_zhaban: 炸板
- kaipanla_index: 指数

---

## 8. 注意事项

### 8.1 API 限制

- 问财 API 有请求频率限制，需要控制请求间隔
- Hexin-V token 需要动态生成，有效期较短
- 建议添加请求失败重试机制

### 8.2 数据质量

- 问财 API 返回数据需要清洗和格式化
- 开盘啦 API 返回的数组数据需要按索引映射
- 注意处理空值和异常数据

### 8.3 性能优化

- 使用分页获取大量数据
- 合理设置数据库索引
- 避免频繁的全表查询

### 8.4 安全建议

- Cookie 和 Token 不要硬编码
- 使用环境变量或配置文件管理敏感信息
- 添加 API 请求日志

---

## 9. 依赖库

### Python 依赖

```
requests        # HTTP请求
pandas          # 数据处理
pydash          # 工具函数
Django          # Web框架
akshare         # 金融数据
fake_useragent  # 随机UA
pytz            # 时区处理
```

### Node.js 依赖

```
# hexin-v token生成需要Node.js环境
```

---

## 附录

### A. 完整的 API 调用代码示例

详见项目文件:

- `/Users/jasperl./Downloads/webstock-main/stock/pywencai/wencai.py`
- `/Users/jasperl./Downloads/Bull-main/src/iWenCai/iWenCaiApi.py`
- `/Users/jasperl./Downloads/Bull-main/src/kaipanla/kaipanlaAPI.py`
- `/Users/jasperl./Downloads/webstock-main/stock/stock-api/stock_basic_app/views.py`

### B. 数据库连接配置

详见:

- `/Users/jasperl./Downloads/webstock-main/stock/stock-api/stock/settings.py`

---

**文档版本**: 1.0  
**生成时间**: 2025-10-21  
**维护**: AI Assistant
