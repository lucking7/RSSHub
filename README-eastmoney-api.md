# 东方财富快讯 API 文档

## 概述

本文档整理了东方财富网（https://kuaixun.eastmoney.com）快讯相关的API接口信息。

## 主要API端点

### 1. 快讯列表API

**接口地址:**
```
https://np-listapi.eastmoney.com/comm/wap/getListInfo
```

**请求方式:** GET

**必需参数:**
| 参数 | 类型 | 说明 | 示例值 |
|------|------|------|--------|
| client | string | 客户端类型 | `wap` 或 `web` |
| mTypeAndCode | string | 分类代码 | 待确定 |
| type | string | 内容类型 | 待确定 |
| pageSize | integer | 每页数量 | `10`, `20`, `50` |
| pageIndex | integer | 页码（从1开始） | `1`, `2`, `3` |
| srcControlId | string | 源控制ID（可选） | `wap_home` |
| callback | string | JSONP回调函数名（可选） | `jQuery`, `callback` |

**状态:** ⚠️ 端点已确认，但需要正确的参数组合

**响应格式:** JSON 或 JSONP

---

### 2. 快讯搜索API

**接口地址:**
```
https://search-api-web.eastmoney.com/search/jsonp
```

**请求方式:** GET

**参数:** 需要URL编码的JSON字符串

**JSON参数结构:**
```json
{
  "uid": "用户ID（可选）",
  "keyword": "搜索关键词",
  "type": ["cmsArticleWebFast"],
  "client": "web",
  "clientVersion": "1.0",
  "clientType": "kuaixun",
  "param": {
    "cmsArticleWebFast": {
      "column": "栏目代码",
      "cmsColumnList": "栏目列表（逗号分隔）",
      "pageIndex": 1,
      "pageSize": 50
    }
  }
}
```

**栏目代码列表:**
```
405,406,407,408,409,410,411,412,413,414,415,416,417,478,418,684,752,420,421,804,422,423,424,425,426,427,428,429,430,431,349,354,366,345,344
```

**调用示例:**
```bash
# 构建参数
PARAM=$(cat <<'EOF'
{
  "keyword": "",
  "type": ["cmsArticleWebFast"],
  "client": "web",
  "clientVersion": "1.0",
  "clientType": "kuaixun",
  "param": {
    "cmsArticleWebFast": {
      "column": "",
      "cmsColumnList": "405,406,407",
      "pageIndex": 1,
      "pageSize": 20
    }
  }
}
EOF
)

# URL编码并调用
curl "https://search-api-web.eastmoney.com/search/jsonp?param=$(echo $PARAM | jq -r @uri)&cb=callback"
```

**状态:** ✅ 已确认可用

---

### 3. 行情数据API

**接口地址:**
```
https://push2.eastmoney.com/api/qt/clist/get
```

**请求方式:** GET

**主要参数:**
| 参数 | 类型 | 说明 | 示例值 |
|------|------|------|--------|
| pn | integer | 页码 | `1` |
| pz | integer | 每页数量 | `21`, `50`, `100` |
| po | integer | 排序方式 | `1` |
| np | integer | 参数 | `1` |
| fltt | integer | 过滤类型 | `2` |
| invt | integer | 参数 | `2` |
| fs | string | 股票代码列表 | `i:1.000001,i:0.399001` |
| fields | string | 返回字段列表 | `f1,f2,f3,f4,f12,f13,f14` |
| ut | string | 认证令牌 | `13697a1cc677c8bfa9a496437bfef419` |
| cb | string | JSONP回调 | `callback` |

**字段说明:**
- `f1`: 小数位数
- `f2`: 最新价
- `f3`: 涨跌幅
- `f4`: 涨跌额
- `f7`: 成交额
- `f12`: 代码
- `f13`: 市场代码
- `f14`: 名称
- `f107`: 交易状态

**股票代码格式:**
- 上证: `i:1.000001` (上证指数)
- 深证: `i:0.399001` (深证成指)
- 港股: `i:100.HSI` (恒生指数)
- 美股: `i:100.DJIA` (道琼斯)

**调用示例:**
```bash
curl "https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=10&po=1&np=1&fltt=2&invt=2&fs=i:1.000001,i:0.399001&fields=f1,f2,f3,f4,f12,f13,f14&ut=13697a1cc677c8bfa9a496437bfef419&cb=callback"
```

**状态:** ✅ 已确认可用

---

## 数据结构

### 快讯文章对象

```typescript
interface NewsItem {
  code: string;              // 文章唯一代码
  date: string;              // 发布时间 (格式: "YYYY-MM-DD HH:mm:ss")
  title: string;             // 文章标题
  docuReader: string;        // 内容摘要
  titleColor?: string;       // 标题颜色标识
  commentNum?: number;       // 评论数量
  relationStockTags?: string[]; // 相关股票代码数组
}
```

**文章详情URL格式:**
```
https://finance.eastmoney.com/a/{code}.html
```

### 行情数据对象

```typescript
interface QuoteData {
  f1: number;   // 小数位
  f2: number;   // 最新价
  f3: number;   // 涨跌幅
  f4: number;   // 涨跌额
  f7: number;   // 成交额
  f12: string;  // 代码
  f13: number;  // 市场代码
  f14: string;  // 名称
  f107: number; // 交易状态 (1=交易中, 3=休市, 5=收盘)
}
```

---

## 请求头建议

为避免被反爬虫机制拦截，建议添加以下请求头：

```http
Referer: https://kuaixun.eastmoney.com/
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36
Accept: application/json, text/javascript, */*; q=0.01
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
```

---

## 使用示例

### Node.js 示例

```javascript
const axios = require('axios');

// 获取行情数据
async function getQuotes() {
  const params = {
    pn: 1,
    pz: 10,
    po: 1,
    np: 1,
    fltt: 2,
    invt: 2,
    fs: 'i:1.000001,i:0.399001',
    fields: 'f1,f2,f3,f4,f12,f13,f14',
    ut: '13697a1cc677c8bfa9a496437bfef419',
    cb: 'callback'
  };

  const response = await axios.get('https://push2.eastmoney.com/api/qt/clist/get', {
    params,
    headers: {
      'Referer': 'https://kuaixun.eastmoney.com/'
    }
  });

  // 处理JSONP响应
  const jsonStr = response.data.replace(/^callback\(/, '').replace(/\)$/, '');
  const data = JSON.parse(jsonStr);

  return data;
}
```

### Python 示例

```python
import requests
import json
import re

def get_quotes():
    url = 'https://push2.eastmoney.com/api/qt/clist/get'
    params = {
        'pn': 1,
        'pz': 10,
        'po': 1,
        'np': 1,
        'fltt': 2,
        'invt': 2,
        'fs': 'i:1.000001,i:0.399001',
        'fields': 'f1,f2,f3,f4,f12,f13,f14',
        'ut': '13697a1cc677c8bfa9a496437bfef419',
        'cb': 'callback'
    }
    headers = {
        'Referer': 'https://kuaixun.eastmoney.com/'
    }

    response = requests.get(url, params=params, headers=headers)

    # 提取JSONP中的JSON数据
    json_str = re.sub(r'^callback\(|\)$', '', response.text)
    data = json.loads(json_str)

    return data
```

---

## 注意事项

1. **访问频率限制**: 建议添加请求间隔，避免频繁请求被封禁
2. **JSONP处理**: 部分接口返回JSONP格式，需要提取JSON部分
3. **参数验证**: `mTypeAndCode`等参数需要进一步研究确定有效值
4. **时区处理**: 时间数据为北京时间（UTC+8）
5. **反爬虫**: 必须设置正确的Referer和User-Agent
6. **数据更新**: 行情数据建议60秒刷新一次

---

## 替代方案

如果直接API调用遇到困难，可以考虑：

1. **使用浏览器自动化**: Puppeteer/Selenium 监听XHR请求
2. **WebSocket连接**: 检查是否有实时推送通道
3. **RSS订阅**: 检查是否提供RSS源

---

## 待研究问题

- [ ] 确定 `mTypeAndCode` 参数的有效值列表
- [ ] 研究 `type` 参数的完整枚举
- [ ] 分析是否存在WebSocket实时推送
- [ ] 测试不同栏目的快讯获取方法
- [ ] 确认请求频率限制的具体规则

---

## 参考资源

- 官网: https://kuaixun.eastmoney.com
- 主JS文件: https://kuaixun.eastmoney.com/emresource/main/js/kuaixun.js
- 搜索API: https://search-api-web.eastmoney.com
- 行情推送: https://push2.eastmoney.com

---

## 更新日志

- 2025-10-28: 初始版本，整理基础API端点和数据结构
