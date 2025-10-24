# 东方财富路由实现说明

## 新增功能

### 1. 全球股市行情路由 (quotes.ts)

**路径:** `/eastmoney/quotes/:market?`

**功能:** 获取全球股市、期货、外汇的实时行情数据

**API来源:** `https://push2.eastmoney.com/api/qt/clist/get`

#### 支持的市场分类

| 市场代码 | 市场名称 | 包含指数 |
|---------|---------|---------|
| `asia` | 亚洲股市 | 上证、深证、恒指、日经225、韩国综指等 |
| `us` | 美洲股市 | 道指、标普500、纳指、多伦多、巴西等 |
| `europe` | 欧洲股市 | 富时100、德国DAX、法国CAC40等 |
| `futures` | 全球期货指数 | 中美期货主力指数 |
| `commodity` | 国内商品期货 | 螺纹钢、焦煤、白银、铝、铜等 |
| `forex` | 主要外汇 | EUR/USD, USD/JPY, GBP/USD等 |
| `forex_cny` | 人民币汇率 | 人民币对主要货币汇率 |

#### 数据字段

- **f1**: 小数位数
- **f2**: 最新价
- **f3**: 涨跌幅(%)
- **f4**: 涨跌额
- **f5**: 成交量
- **f6**: 成交额
- **f7**: 换手率
- **f12**: 股票代码
- **f13**: 市场代码
- **f14**: 股票名称
- **f15**: 最高价
- **f16**: 最低价
- **f17**: 开盘价
- **f18**: 昨收价
- **f107**: 交易状态 (1=交易中, 3=休市, 5=已收盘)
- **f152**: 精度

#### 特色功能

1. **彩色涨跌标识**
   - 📈 上涨显示红色
   - 📉 下跌显示绿色
   - ➡️ 平盘显示灰色

2. **详细的数据表格**
   - 最新价、涨跌幅、涨跌额
   - 开盘价、最高价、最低价
   - 成交量、成交额、换手率

3. **交易状态显示**
   - 🟢 交易中
   - 🟡 休市
   - 🔴 已收盘

4. **智能金额格式化**
   - 万亿级: 显示为"X.XX万亿"
   - 亿级: 显示为"X.XX亿"
   - 万级: 显示为"X.XX万"

#### 使用示例

```bash
# 查看亚洲股市
/eastmoney/quotes/asia

# 查看美国股市
/eastmoney/quotes/us

# 查看期货指数
/eastmoney/quotes/futures

# 查看外汇汇率
/eastmoney/quotes/forex
```

## API测试结果

### 快讯API (现有)

**端点:** `https://np-weblist.eastmoney.com/comm/web/getFastNewsList`

**状态:** ✅ 正常工作

**测试结果:**
```
获取到最新快讯数据
- 支持分类筛选
- 支持重要快讯过滤
- 支持分页
```

### 行情API (新增)

**端点:** `https://push2.eastmoney.com/api/qt/clist/get`

**状态:** ✅ 正常工作

**测试结果:**
```
亚洲市场: ✅ 获取到 3 条数据
  - 上证指数(000001): 3990.58 -0.16%
  - 深证成指(399001): 13454.14 -0.26%

美国市场: ✅ 获取到 3 条数据
  - 道琼斯(DJIA): 47544.59 - 已收盘
  - 标普500(SPX): 6875.16 - 已收盘
  - 纳斯达克(NDX): 23637.46 - 已收盘
```

## 技术实现

### 代码结构

```typescript
// 路由定义
export const route: Route = {
    path: '/quotes/:market?',
    categories: ['finance'],
    view: ViewType.Articles,
    name: '全球股市行情',
    handler,
    // ...
};

// 市场配置
const MARKET_CONFIGS = {
    asia: { name: '亚洲股市', codes: '...' },
    us: { name: '美洲股市', codes: '...' },
    // ...
};

// 处理函数
async function handler(ctx) {
    // 1. 获取参数
    // 2. 调用API
    // 3. 解析JSONP
    // 4. 格式化数据
    // 5. 返回RSS
}
```

### 关键技术点

1. **JSONP解析**
   ```typescript
   const match = data.match(/callback\((.*)\)/);
   if (match) {
       data = JSON.parse(match[1]);
   }
   ```

2. **数字格式化**
   ```typescript
   const formatNum = (num, precision = 2) => {
       return Number(num).toFixed(precision);
   };
   ```

3. **金额格式化**
   ```typescript
   const formatAmount = (amt) => {
       if (num >= 1e12) return `${(num / 1e12).toFixed(2)}万亿`;
       if (num >= 1e8) return `${(num / 1e8).toFixed(2)}亿`;
       // ...
   };
   ```

4. **HTML表格生成**
   - 使用内联CSS样式
   - 响应式表格设计
   - 颜色区分涨跌

## 文件清单

### 新增文件

- ✅ `lib/routes/eastmoney/quotes.ts` - 行情路由实现
- ✅ `README-eastmoney-api.md` - API文档

### 修改文件

- ✅ `lib/routes/eastmoney/README.md` - 添加quotes路由说明

### 现有文件 (未修改)

- `lib/routes/eastmoney/kuaixun.ts` - 快讯路由 (已验证正常)
- `lib/routes/eastmoney/namespace.ts` - 命名空间定义
- `lib/routes/eastmoney/utils.ts` - 工具函数

## 注意事项

1. **请求频率限制**
   - 建议添加合理的缓存时间
   - 避免过于频繁的请求

2. **反爬虫措施**
   - 必须设置正确的Referer头
   - User-Agent应模拟真实浏览器

3. **时区处理**
   - 所有时间已转换为北京时间 (UTC+8)

4. **数据更新频率**
   - 快讯: 实时更新
   - 行情: 建议60秒刷新一次

## 后续优化建议

1. **添加更多市场**
   - 澳洲市场
   - 新兴市场
   - 加密货币

2. **增强功能**
   - 支持自定义股票代码
   - 添加技术指标
   - 支持历史数据

3. **性能优化**
   - 实现数据缓存
   - 批量请求优化
   - 错误重试机制

## 维护日志

- **2025-10-28**: 初始版本
  - 创建quotes.ts路由
  - 支持7种市场分类
  - 完整的行情数据展示
  - API测试通过

---

**维护者:** AI Assistant
**最后更新:** 2025-10-28
