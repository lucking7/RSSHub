# 新浪财经 & 开盘啦 RSS 订阅接口文档

## 📚 目录

- [新浪财经接口](#新浪财经接口)
  - [7×24财经直播](#724财经直播)
  - [API字段使用分析](#api字段使用分析)
  - [股票行情API](#股票行情api)
- [开盘啦接口](#开盘啦接口)
  - [大盘直播](#大盘直播)
  - [财经要闻](#财经要闻)
  - [盘面点评](#盘面点评)
  - [涨停表现](#涨停表现)
- [使用示例](#使用示例)

---

## 新浪财经接口

### 7×24财经直播

#### 路由地址
```
/sina/finance/zhibo/:zhibo_id?
/sina/zhibo/:zhibo_id?
```

#### 参数说明

| 参数 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `zhibo_id` | 直播频道ID | 152 | 152（财经）、151（政经）、153（综合）、155（市场）、164（国际）、242（行业） |
| `limit` | 返回条数 | 20 | 50 |
| `pagesize` | 单页条数（1-10） | 10 | 10 |
| `tag` | 标签过滤 | - | 市场、公司、A股、美股 |
| `dire` | 方向 | f | f（向前）、b（向后） |
| `dpc` | 客户端标记 | 1 | 1 |

#### 使用示例

```
# 基础用法
/sina/finance/zhibo

# 指定频道
/sina/finance/zhibo/155

# 标签过滤
/sina/finance/zhibo?tag=A股

# 自定义条数
/sina/finance/zhibo?limit=50
```

#### RSS输出格式

每条RSS项包含：

- **标题**: 提取自【】内的文本或正文前80字
- **正文**: 去除【】标题后的完整内容 + 图片
- **分类**:
  - 新闻标签（如：市场、公司、国际）
  - 相关股票含涨跌幅（如：苹果 (AAPL) +0.44%）
- **发布时间**: create_time
- **链接**: 详情页链接（ext.docurl）
- **图片**:
  - 从 multimedia 字段提取
  - 从 rich_text 中提取
  - 兜底抓取详情页图片（og:image、twitter:image、文章图片）

---

### API字段使用分析

新浪财经API提供了33个字段，当前实现使用情况：

#### ✅ 已使用字段（9个）

| 字段 | 用途 | 说明 |
|------|------|------|
| `id` | 唯一标识 | 用于生成RSS item的guid |
| `rich_text` | 富文本内容 | 提取标题和正文 |
| `ext` | 扩展信息JSON | 解析stocks（股票）、docurl（链接）、docid |
| `docurl` | 详情链接 | RSS item的link，兜底使用 |
| `multimedia` | 多媒体内容 | 解析图片 |
| `tag` | 标签列表 | RSS category |
| `create_time` | 创建时间 | RSS pubDate |
| `update_time` | 更新时间 | 用于排序 |
| `commentid` | 评论ID | 已定义但未实际使用 |

#### 💡 可添加字段（5个）

| 字段 | 类型 | 建议用途 |
|------|------|----------|
| `like_nums` | int | 显示点赞数，标识热门新闻 |
| `comment_list.total` | int | 显示评论数，标识讨论热度 |
| `is_focus` | int | 焦点新闻标记（值为1时在标题添加🔥） |
| `anchor` | str | 主播/作者名称，显示在author字段 |
| `compere_info` | str | 主持人信息，补充author字段 |

#### 🚫 无需使用字段（19个）

内部管理字段，对RSS用户无价值：
- creator, mender, check_status, check_time, check_user
- is_need_check, is_delete, is_repeat
- zhibo_id, type, compere_id
- source_content_id, anchor_image_url, old_live_cid, tab, top_value
- rich_text_nick_to_url, rich_text_nick_to_routeUri

#### 📊 API利用率统计

- **已使用**: 9个字段 (27%)
- **可添加**: 5个字段 (15%)
- **无价值**: 19个字段 (58%)
- **总体利用率**: 有价值字段已使用 64% (9/14)

#### 💡 优化建议

建议添加以下字段到RSS输出：

1. **点赞数和评论数**: 在description末尾显示
   ```html
   <br><small>👍 123 · 💬 45</small>
   ```

2. **焦点新闻标记**: 在标题前添加
   ```
   🔥 【重磅】央行宣布降息
   ```

3. **作者信息**: 使用anchor或compere_info填充author字段
   ```xml
   <author>财经编辑部</author>
   ```

---

### 股票行情API

#### API地址
```
https://hq.sinajs.cn/list={symbols}
```

#### 支持市场

| 市场 | 代码格式 | 示例 | 涨跌幅字段 |
|------|----------|------|------------|
| **A股** | sh{code} 或 sz{code} | sz300785 | 需计算：(现价-昨收)/昨收*100 |
| **美股** | gb_{symbol} | gb_aapl | 字段2（直接） |
| **港股** | hk{code} | hk00700 | 字段8（直接） |
| **外汇** | fx_s{code} | fx_susdcny | 字段11*100（需乘100） |
| **期货** | nf_{code} 或 hf_{code} | nf_al0, hf_cl | 需计算：(字段7-字段2)/字段2*100 |
| **指数** | si{code} 或 znb_{code} | si931230, znb_dax | 需计算：(字段1-字段2)/字段2*100 |

#### 批量查询

支持用逗号分隔一次查询多只股票：

```bash
curl -H "Referer: https://finance.sina.com.cn/" \
  "https://hq.sinajs.cn/list=sz300785,gb_aapl,hk00700,fx_susdcny,si931230"
```

#### 数据格式

**A股示例（sz300785）**:
```
var hq_str_sz300785="值得买,32.920,32.890,32.890,33.490,32.810,..."
字段0: 股票名称
字段2: 昨收价
字段3: 现价
涨跌幅 = (字段3 - 字段2) / 字段2 * 100
```

**美股示例（gb_aapl）**:
```
var hq_str_gb_aapl="苹果,259.5800,0.44,2025-10-24 17:11:19,..."
字段0: 股票名称
字段1: 最新价格
字段2: 涨跌幅百分比 ← 直接可用
字段3: 更新时间
```

**港股示例（hk00700）**:
```
var hq_str_hk00700="TENCENT,腾讯控股,639.000,633.000,641.500,633.500,637.500,4.500,0.711,..."
字段0: 英文名称
字段1: 中文名称
字段8: 涨跌幅百分比 ← 直接可用
```

**外汇示例（fx_susdcny）**:
```
var hq_str_fx_susdcny="23:52:01,7.1204,...,在岸人民币,-0.0337,-0.0024,..."
字段0: 更新时间
字段9: 货币名称
字段11: 涨跌幅（小数） ← 需乘100
涨跌幅 = 字段11 * 100
```

**期货示例（nf_al0）**:
```
var hq_str_nf_al0="铝连续,233223,21150.000,21235.000,...,21225.000,..."
字段0: 品种名称
字段2: 昨收价
字段7: 现价
涨跌幅 = (字段7 - 字段2) / 字段2 * 100
```

**指数示例（si931230）**:
```
var hq_str_si931230="汽车零部件,1204.5356,1201.6696,..."
字段0: 指数名称
字段1: 当前值
字段2: 昨收值
涨跌幅 = (字段1 - 字段2) / 字段2 * 100
```

#### 实现细节

代码自动处理多种市场类型：

```typescript
// 根据市场类型转换代码格式
if (s.market === 'us' || s.market === 'USA') {
    apiSymbol = `gb_${s.symbol.toLowerCase()}`;
} else if (s.market === 'hk' || s.market === 'HK') {
    apiSymbol = `hk${s.symbol.toLowerCase().replace(/^hk/, '')}`;
} else if (s.symbol.toLowerCase().startsWith('fx_')) {
    // 外汇：保持小写的 fx_ 前缀格式
    apiSymbol = s.symbol.toLowerCase();
} else if (s.symbol.toLowerCase().startsWith('nf_') || s.symbol.toLowerCase().startsWith('hf_')) {
    // 期货：保持小写的 nf_ 或 hf_ 前缀格式
    apiSymbol = s.symbol.toLowerCase();
} else if (s.symbol.toLowerCase().startsWith('si') || s.symbol.toLowerCase().startsWith('znb_')) {
    // 指数：si 开头（国内指数）或 znb_ 开头（国际指数）
    apiSymbol = s.symbol.toLowerCase();
} else {
    // A股保持原样（sh/sz前缀）
    apiSymbol = s.symbol.toLowerCase();
}
```

#### 缓存策略

- 缓存时间：5分钟
- 缓存键：`sina:stock:quotes:v2:{symbols}`
- 批量查询：一次API调用获取所有股票行情

---

## 开盘啦接口

### 大盘直播

#### 路由地址
```
/kaipanla/dapanzhibo
/kaipanla/zhibo
```

#### 输出示例

```xml
<category>板块名称</category>
<category>股票名称 (代码) ±涨跌幅%</category>
```

### 财经要闻

#### 路由地址
```
/kaipanla/news
/kaipanla/news/commodity  # 商品期货
```

### 盘面点评

#### 路由地址
```
/kaipanla/review
```

#### 输出字段

- 时间点数据（09:30, 11:00, 14:00等）
- 市场强弱评分
- 涨停、跌停数量
- 龙虎榜数据

### 涨停表现

#### 路由地址
```
/kaipanla/zt
```

#### 输出字段

- 涨停股票列表
- 板块表现
- 封板率、炸板率
- 首板、连板统计

---

## 使用示例

### 新浪财经

```bash
# 财经频道最新20条
https://rsshub.app/sina/finance/zhibo

# 市场频道最新50条
https://rsshub.app/sina/finance/zhibo/155?limit=50

# 仅看A股相关
https://rsshub.app/sina/finance/zhibo?tag=A股

# 仅看美股相关
https://rsshub.app/sina/finance/zhibo?tag=美股
```

### 开盘啦

```bash
# 大盘直播
https://rsshub.app/kaipanla/dapanzhibo

# 财经要闻
https://rsshub.app/kaipanla/news

# 盘面点评
https://rsshub.app/kaipanla/review

# 涨停表现
https://rsshub.app/kaipanla/zt
```

---

## 技术说明

### 编码处理

新浪股票行情API返回GBK编码，需要使用`iconv-lite`转换：

```typescript
import iconv from 'iconv-lite';

const response = await got(url, { responseType: 'buffer' });
const utf8Data = iconv.decode(response.data, 'gbk');
```

### 错误处理

开盘啦API对Node.js HTTP客户端返回错误数据，必须使用curl：

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const curlCmd = `curl -s "${url}" -H "User-Agent: ..." -H "Accept: */*"`;
const { stdout } = await execAsync(curlCmd);
return JSON.parse(stdout);
```

### 图片处理

三级图片获取策略：

1. 从`multimedia`字段提取
2. 从`rich_text`中提取
3. 兜底抓取详情页图片（og:image、twitter:image、文章图片）

---

## 更新日志

### 2025-10-24

- ✅ **新增期货、外汇、指数涨跌幅支持**
  - 支持外汇查询（fx_*格式，字段[11]*100）
  - 支持期货查询（nf_*/hf_*格式）
  - 支持指数查询（si*/znb_*格式）
- ✅ 扩展支持美股和港股涨跌幅显示
- ✅ 优化股票代码自动转换（A股/美股/港股/外汇/期货/指数）
- ✅ 添加批量股票行情查询
- ✅ 更新缓存策略为v2，5分钟缓存

### 2025-10-23

- ✅ 修复开盘啦API curl调用问题
- ✅ 优化标题提取逻辑
- ✅ 添加A股涨跌幅支持

### 2025-10-21

- ✅ 初始版本发布
- ✅ 新浪财经7×24直播
- ✅ 开盘啦各接口实现

---

## 常见问题

### Q: 为什么有些股票没有涨跌幅？

A: 可能原因：
1. 非交易时间
2. 股票停牌
3. 新股未开盘
4. API查询失败（自动降级为仅显示代码）

### Q: 股票行情数据延迟多少？

A:
- 行情API：实时（有5分钟缓存）
- 新浪直播：秒级更新
- 开盘啦：分钟级更新

### Q: 如何只看某个板块的新闻？

A: 使用`tag`参数过滤，例如：
```
/sina/finance/zhibo?tag=新能源
/sina/finance/zhibo?tag=芯片
```

---

## 贡献指南

欢迎提交Issue和Pull Request！

改进方向：
1. 添加更多有价值的API字段（点赞数、评论数等）
2. 优化图片获取策略
3. 添加更多标签过滤选项
4. 支持更多市场（期货、债券等）

---

## 许可证

本项目遵循RSSHub的MIT许可证。
