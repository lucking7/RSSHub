# API 架构对比分析

## 🎯 三个项目的定位

### 📊 项目对比表

| 项目 | 目录 | 主要功能 | 技术栈 | 数据源 |
|------|------|----------|--------|--------|
| **webstock-pywencai** | `/webstock-main/stock/pywencai` | Python封装的问财API库 | Python, requests, pandas | 问财网 |
| **Bull-iWenCai** | `/Bull-main/src/iWenCai` | 股票数据采集系统 | Python, MySQL | 问财网 |
| **Bull-kaipanla** | `/Bull-main/src/kaipanla` | 涨停板数据采集 | Python, MySQL | 开盘啦App |
| **webstock-api** | `/webstock-main/stock/stock-api` | Django REST后端 | Django, MySQL | 综合数据 |

---

## 🔄 数据流转架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         外部数据源                                │
├─────────────────────────────────────────────────────────────────┤
│  问财网 API             开盘啦 API            东财 API           │
│  (iwencai.com)         (longhuvip.com)      (eastmoney.com)     │
└────────┬────────────────────┬──────────────────────┬────────────┘
         │                    │                       │
         ▼                    ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                        数据采集层                                │
├─────────────────────────────────────────────────────────────────┤
│  pywencai库            kaipanlaAPI           akshare库          │
│  iWenCaiApi类          kaipanlaDataMgr      (第三方库)           │
│  • 股票日行情           • 涨停/炸板数据        • 市场数据          │
│  • 板块数据             • 市场成交量          • 龙虎榜            │
│  • 财务数据             • 指数数据            • 大宗交易          │
└────────┬────────────────────┬──────────────────────┬────────────┘
         │                    │                       │
         ▼                    ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                        数据存储层                                │
├─────────────────────────────────────────────────────────────────┤
│                        MySQL 数据库                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ 股票基础表    │  │ 涨停数据表    │  │ 开盘啦数据表  │         │
│  │ stock_info   │  │ stock_zt_name│  │ kaipanla_*   │         │
│  │ stock_zh_ah  │  │ stock_buy    │  │              │         │
│  │ stock_industry│ │ stock_config │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      业务逻辑层 (Service)                         │
├─────────────────────────────────────────────────────────────────┤
│  StockBasicService                                              │
│  • filter_stocks() - 根据涨停基因筛选                            │
│  • select_by_ticai() - 按题材选股                                │
│  • query_stock_zt_by_condition() - 涨停股查询                    │
│  • query_market_qx() - 市场情绪分析                              │
│  • query_daily() - 每日市场数据                                  │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API 接口层 (Django)                         │
├─────────────────────────────────────────────────────────────────┤
│  REST API 端点:                                                  │
│  • /stock/stock_ah - 股票基础数据                                │
│  • /stock/stock_zt - 涨停股查询                                  │
│  • /stock/select - 题材选股                                      │
│  • /stock/buy - 买入管理                                         │
│  • /stock/daily - 市场数据                                       │
│  • /stock/config - 配置管理                                      │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                         前端应用                                 │
├─────────────────────────────────────────────────────────────────┤
│  Vue.js Admin (stock-admin)                                     │
│  • 数据展示                                                      │
│  • 选股工具                                                      │
│  • 策略配置                                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 两个问财实现的对比

### 1️⃣ pywencai (webstock)

**特点**:
- ✅ 通用Python库
- ✅ API封装完整
- ✅ 支持自然语言查询
- ✅ 自动分页
- ✅ 数据返回DataFrame格式

**代码结构**:
```
pywencai/
├── __init__.py          # 导出接口
├── wencai.py            # 核心API
├── headers.py           # 请求头生成
├── convert.py           # 数据转换
└── hexin-v.bundle.js    # Token生成
```

**核心API**:
```python
# 1. get_robot_data() - 获取查询条件
# 2. get_page() - 获取单页数据
# 3. loop_page() - 循环获取所有页
# 4. get() - 统一入口
```

**优势**:
- 🎯 易于使用，一行代码即可查询
- 🎯 自动处理分页和重试
- 🎯 直接返回pandas DataFrame

**使用示例**:
```python
import pywencai

# 简单查询
df = pywencai.get(query='涨停股', loop=True)

# 带参数查询
df = pywencai.get(
    query='量比从大到小排名前50',
    retry=10,
    sleep=1,
    log=True
)
```

### 2️⃣ iWenCaiApi (Bull)

**特点**:
- ✅ 面向对象设计
- ✅ 数据库集成
- ✅ Cookie管理
- ✅ 专门的数据采集类

**代码结构**:
```
iWenCai/
├── __init__.py
├── iWenCaiApi.py            # 核心API类
├── getHexinV.py             # Token生成
├── FetchStockDailyData.py   # 股票日行情
├── FetchBanKuaiData.py      # 板块数据
├── FetchZhaBanData.py       # 炸板数据
├── FetchVMAData.py          # VMA数据
└── ... (其他采集模块)
```

**核心类**:
```python
# 1. CIWenCaiAPI - 问财API封装
#    - RequestFirstData()     # 首次请求
#    - RequestOnePage()       # 单页请求
#    - RequestAllPagesData()  # 所有页

# 2. CFetchStockDailyData - 股票日行情
# 3. CFetchBanKuaiData - 板块数据
# 4. CFetchZhaBanData - 炸板数据
```

**优势**:
- 🎯 专业化数据采集
- 🎯 直接存储到数据库
- 🎯 Cookie自动管理
- 🎯 数据格式化处理

**使用示例**:
```python
from iWenCai.FetchStockDailyData import CFetchStockDailyData

# 创建采集器
fetcher = CFetchStockDailyData(dbConnection, '2023-04-27')

# 采集并存储
df = fetcher.RequestAllPagesDataAndWriteToDB(perPage=100)
```

### 🔄 两者对比总结

| 特性 | pywencai | iWenCaiApi |
|------|----------|------------|
| **设计理念** | 通用库 | 专用系统 |
| **使用方式** | 函数调用 | 类实例化 |
| **数据存储** | 返回DataFrame | 直接写数据库 |
| **Cookie管理** | 手动传入 | 数据库存储 |
| **错误处理** | 重试机制 | 重试+日志 |
| **扩展性** | 一般 | 强 |
| **学习成本** | 低 | 中 |
| **适用场景** | 快速查询 | 系统集成 |

**推荐使用场景**:
- **pywencai**: 适合快速查询、数据分析、Jupyter Notebook
- **iWenCaiApi**: 适合定时任务、系统集成、数据采集系统

---

## 🎯 开盘啦 API 独特性

### 数据优势

开盘啦API提供的独特数据:

1. **涨停板细节**:
   - ✅ 首次涨停时间 (精确到秒)
   - ✅ 最后涨停时间
   - ✅ 炸板时间
   - ✅ 封单变化 (最大封单/当前封单)
   - ✅ 涨停原因 (开盘啦特有)

2. **市场量能**:
   - ✅ 实时成交量
   - ✅ 与昨日对比
   - ✅ 量能趋势图数据

3. **涨跌停统计**:
   - ✅ 实际涨停数 (vs 理论涨停)
   - ✅ 实际跌停数
   - ✅ 按板块分类

### 与问财的差异

| 数据类型 | 问财 | 开盘啦 | 推荐来源 |
|----------|------|--------|----------|
| 股票日行情 | ✅ | ❌ | 问财 |
| 板块数据 | ✅ | ❌ | 问财 |
| 财务数据 | ✅ | ❌ | 问财 |
| 涨停时间 | ❌ | ✅ | 开盘啦 |
| 封单数据 | ❌ | ✅ | 开盘啦 |
| 炸板时间 | ❌ | ✅ | 开盘啦 |
| 市场量能 | 部分 | ✅ | 开盘啦 |
| 涨停原因 | ✅ | ✅ | 两者结合 |

---

## 🏗️ Django REST API 架构

### 分层设计

```
┌─────────────────────────────────────────────────┐
│                   urls.py                        │
│              (路由配置层)                          │
│  /stock/stock_ah    → stock_ah()                │
│  /stock/stock_zt    → stock_zt()                │
│  /stock/select      → query_by_ticai()          │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│                   views.py                       │
│             (控制器层 - 请求处理)                  │
│  • 参数验证 (@request_verify)                    │
│  • 调用Service层                                 │
│  • 返回HttpResponseVo                            │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│                  service.py                      │
│              (业务逻辑层)                          │
│  StockBasicService:                             │
│    • filter_stocks()      - 股票筛选            │
│    • select_by_ticai()    - 题材选股            │
│    • query_stock_zt_*()   - 涨停查询            │
│    • query_market_qx()    - 市场分析            │
│    • query_daily()        - 每日数据            │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│                  models.py                       │
│               (数据模型层)                         │
│  • StockAhModel      - 东财股票                  │
│  • StockZTModel      - 涨停数据                  │
│  • StockBuyModel     - 买入记录                  │
│  • StockModel        - 股票基因                  │
│  • ConfigModel       - 配置                      │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│                MySQL 数据库                       │
└─────────────────────────────────────────────────┘
```

### 核心设计模式

#### 1. 请求验证装饰器
```python
@request_verify("post", cls=CheckRequestParam,
    configs=[
        CheckConfig(name="Filter", is_null=True, p_type=list),
        CheckConfig(name="Sort", is_null=True, p_type=str),
        CheckConfig(name="Offset", p_type=int, default=0),
        CheckConfig(name="Limit", p_type=int, default=20)
    ])
def stock_ah(request):
    # 自动验证参数
    data_list, total = service.query_stock_ah_by_condition(request.params)
    return HttpResponseVo(response, status=200)
```

#### 2. 统一响应格式
```python
class HttpResponseVo:
    def __init__(self, data=None, status=200):
        self.data = data
        self.status = status
```

#### 3. Service层复用
```python
class ServiceBase:
    def create_query_by_condition_sql(self, params, columns, table):
        # 通用SQL构建
        pass
    
    def query_count_by_sql(self, sql):
        # 通用计数查询
        pass
```

---

## 🔧 技术实现对比

### Token生成机制

#### pywencai方式
```python
# headers.py
def get_token():
    result = subprocess.run(
        ['node', 'hexin-v.bundle.js'], 
        stdout=subprocess.PIPE
    )
    return result.stdout.decode().strip()
```

#### Bull方式
```python
# getHexinV.py
from iWenCai.getHexinV import get_hexin_v
v = get_hexin_v()  # 调用hexin_v.js
```

**对比**:
- pywencai: 使用打包后的bundle.js
- Bull: 使用原始js文件
- 本质: 都是通过Node.js执行JS代码

### 数据转换处理

#### pywencai方式
```python
# convert.py
def convert(res):
    result = json.loads(res.text)
    components = content['components']
    
    # 自动识别返回类型
    if show_type == 'xuangu_tableV1':
        # 选股表格
    elif show_type == 'dragon_tiger_stock':
        # 龙虎榜
    # ... 其他类型
```

#### Bull方式
```python
# iWenCaiApi.py
def RequestOnePage(self, perPage, page):
    response = requests.request("POST", url, ...)
    js = json.loads(response.text)
    datas = js["answer"]["components"][0]["data"]["datas"]
    return datas  # 直接返回数据数组
```

**对比**:
- pywencai: 智能解析，支持多种返回格式
- Bull: 简单直接，只处理标准格式

### 分页实现

#### pywencai方式
```python
def loop_page(loop, row_count, **kwargs):
    perpage = kwargs.pop('perpage', 100)
    max_page = math.ceil(row_count / perpage)
    
    while can_loop(loop_count, count):
        kwargs['page'] = initPage + count
        resultPage = get_page(**kwargs)
        result = pd.concat([result, resultPage])
    
    return result
```

#### Bull方式
```python
def RequestAllPagesData(self, payload, perPage=100):
    pages = math.ceil(self.allDataCount / perPage)
    
    for i in range(1, pages+1):
        datas = self.RequestOnePage(perPage, i)
        allDatas.extend(datas)
    
    return pd.DataFrame(allDatas)
```

**对比**:
- pywencai: 支持循环次数限制
- Bull: 全量获取所有页

---

## 💡 最佳实践建议

### 1. 数据采集

**推荐架构**:
```
定时任务
├── 问财数据采集 (使用iWenCaiApi)
│   ├── 股票日行情
│   ├── 板块数据
│   └── 财务数据
│
├── 开盘啦数据采集 (使用kaipanlaAPI)
│   ├── 涨停板数据
│   ├── 市场量能
│   └── 指数数据
│
└── 存储到MySQL
```

### 2. 数据查询

**推荐架构**:
```
快速查询 → 使用pywencai (Jupyter Notebook)
系统查询 → 使用Django REST API
实时数据 → 直接调用API + 缓存
```

### 3. 数据更新频率

| 数据类型 | 更新频率 | 数据源 |
|----------|----------|--------|
| 股票日行情 | 每日收盘后 | 问财 |
| 涨停板数据 | 每日收盘后 | 开盘啦 |
| 板块数据 | 每日收盘后 | 问财 |
| 市场量能 | 实时/每日 | 开盘啦 |
| 财务数据 | 每季度 | 问财 |

### 4. 性能优化

**缓存策略**:
```python
# 1. 数据库查询缓存
@cache_result(ttl=300)  # 5分钟缓存
def query_stock_zt_by_condition(params):
    pass

# 2. API调用缓存
@cache_result(ttl=60)  # 1分钟缓存
def get_market_data():
    pass

# 3. 配置缓存
@cache_result(ttl=3600)  # 1小时缓存
def get_config():
    pass
```

---

## 🎓 学习路径建议

### 初学者
1. 从pywencai开始，学习基本查询
2. 理解问财的自然语言查询
3. 掌握pandas数据处理

### 进阶开发者
1. 学习iWenCaiApi的面向对象设计
2. 理解kaipanlaAPI的分页机制
3. 掌握Django REST框架

### 系统架构师
1. 理解整体数据流转
2. 设计合理的缓存策略
3. 优化数据库查询性能

---

## 📊 功能矩阵

| 功能 | pywencai | iWenCaiApi | kaipanlaAPI | Django API |
|------|----------|------------|-------------|------------|
| 股票查询 | ✅ | ✅ | ❌ | ✅ |
| 板块数据 | ✅ | ✅ | ❌ | ✅ |
| 涨停数据 | ✅ | ✅ | ✅ | ✅ |
| 涨停时间 | ❌ | ❌ | ✅ | ✅ |
| 市场量能 | 部分 | 部分 | ✅ | ✅ |
| 数据存储 | ❌ | ✅ | ✅ | ✅ |
| REST API | ❌ | ❌ | ❌ | ✅ |
| 题材选股 | ❌ | ❌ | ❌ | ✅ |
| 策略配置 | ❌ | ❌ | ❌ | ✅ |

---

## 🔮 未来改进建议

### 1. 数据采集层
- [ ] 统一采集接口
- [ ] 增加更多数据源
- [ ] 实现增量更新
- [ ] 添加数据质量检查

### 2. 存储层
- [ ] 引入时序数据库 (InfluxDB)
- [ ] 实现读写分离
- [ ] 添加数据归档
- [ ] 优化索引策略

### 3. API层
- [ ] 添加GraphQL支持
- [ ] 实现WebSocket推送
- [ ] 增加API限流
- [ ] 完善API文档

### 4. 业务层
- [ ] 增加更多选股策略
- [ ] 实现回测功能
- [ ] 添加风险评估
- [ ] 优化算法性能

---

**文档版本**: 1.0  
**生成时间**: 2025-10-21

