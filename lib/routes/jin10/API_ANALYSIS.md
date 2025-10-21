# 金十数据 API 分析报告
*测试日期: 2025-10-21*

## 📊 测试结果总结

### ✅ 现有API状态

两个主要的HTTP API **仍然可用**，但发现了一些新的数据结构变化。

---

## 🔍 详细API分析

### 1️⃣ 市场快讯 API（主页快讯）

**端点:** `https://flash-api.jin10.com/get_flash_list`

**请求方式:** GET

**请求参数:**
```javascript
{
  channel: '-8200',
  vip: '1'
}
```

**请求头:**
```javascript
{
  'x-app-id': 'bVBF4FyRTn5NJF5n',
  'x-version': '1.0.0'
}
```

**测试结果:** ✅ **正常工作**

**返回数据示例:**
```json
{
  "status": 200,
  "message": "OK",
  "data": [
    {
      "id": "20251021111228466800",
      "time": "2025-10-21 11:12:28",
      "type": 0,
      "data": {
        "pic": "",
        "title": "",
        "source": "",
        "content": "【黄金的创纪录涨势因投资者获利了结而暂停】...",
        "source_link": ""
      },
      "important": 0,
      "tags": [],
      "channel": [1, 2, 3],
      "remark": []
    }
  ]
}
```

**建议:** 
- ✅ 保持当前实现不变
- 当前参数和请求头仍然有效

---

### 2️⃣ 分类快讯 API

**端点:** `https://4a735ea38f8146198dc205d2e2d1bd28.z3c.jin10.com/flash`

**请求方式:** GET

**请求参数:**
```javascript
{
  channel: '-8200',
  vip: '1',
  classify: '[1]'  // 分类ID，如[1]表示贵金属
}
```

**请求头:**
```javascript
{
  'x-app-id': 'bVBF4FyRTn5NJF5n',
  'x-version': '1.0',
  'handleerror': 'true'  // ⚠️ 新增字段
}
```

**测试结果:** ✅ **正常工作**

**🆕 新增数据字段:**
```json
{
  "child_channel": {
    "1": [1],
    "2": [23]
  },
  "sources": [1, 3, 2],
  "extras": {
    "ad": false
  }
}
```

**建议:**
- ✅ 保持当前实现
- 📝 可以考虑添加 `handleerror: true` 请求头（可选）
- 📝 新增字段暂时无需处理，向后兼容

---

### 3️⃣ 🆕 发现：分类列表 API

**端点:** `https://4a735ea38f8146198dc205d2e2d1bd28.z3c.jin10.com/classify`

**请求方式:** GET

**请求头:**
```javascript
{
  'x-app-id': 'bVBF4FyRTn5NJF5n',
  'x-version': '1.0',
  'handleerror': 'true'
}
```

**功能:** 获取所有可用的分类和子分类列表

**返回数据结构:**
```json
{
  "status": 200,
  "data": [
    {
      "name": "贵金属",
      "id": 1,
      "isNew": false,
      "child": [
        {"id": 2, "name": "黄金", "isNew": false},
        {"id": 3, "name": "白银", "isNew": false}
      ]
    }
  ]
}
```

**建议:** 可以创建一个新路由来返回动态的分类列表

---

### 4️⃣ 🔴 WebSocket 实时推送

**发现:** 网站主要使用 **WebSocket** 进行实时快讯推送

**WebSocket 端点:**
- 快讯推送: `wss://wss-flash-2.jin10.com/`
- 价格推送: `wss://b-price.jin10.com/`

**连接状态:** ✅ 已连接并活跃

**说明:**
- 网页端主要通过 WebSocket 接收实时消息
- HTTP API 主要用于初始化数据加载
- WebSocket 提供更低延迟的实时推送

**建议:** 
- 暂时保持使用 HTTP API（轮询方式）
- 如需真正的实时推送，可以考虑支持 WebSocket

---

### 5️⃣ ❌ 其他发现的API端点

**端点:** `https://3318fc142ea545eab931e22a61ec6e5c.z3c.jin10.com/flash/hot`

**请求方式:** POST

**测试结果:** ❌ **502 错误**

**原因分析:**
- 可能需要特殊的认证token
- 可能仅限内部使用
- 可能需要特定的请求体格式

**建议:** ❌ 不推荐使用

---

## 📝 数据结构变化

### 🆕 新增字段（向后兼容）

1. **child_channel** - 子频道映射
2. **sources** - 数据源列表  
3. **extras.ad** - 广告标识
4. **extras** - 扩展信息对象

### ✅ 现有字段（保持不变）

- `id` - 消息ID
- `time` - 发布时间
- `type` - 消息类型
- `data.content` - 内容
- `data.pic` - 图片
- `data.title` - 标题
- `data.link` - 链接
- `important` - 重要性标记
- `channel` - 频道列表

---

## 🎯 代码更新建议

### Option 1: 最小更新（推荐）✅

**无需修改**，当前代码完全可用，新字段不影响现有功能。

### Option 2: 增强版更新

在 `category.ts` 中添加 `handleerror` 请求头：

```typescript
const { data: response } = await got('https://4a735ea38f8146198dc205d2e2d1bd28.z3c.jin10.com/flash', {
    headers: {
        'x-app-id': 'bVBF4FyRTn5NJF5n',
        'x-version': '1.0',
        'handleerror': 'true',  // 新增
    },
    searchParams: {
        channel: '-8200',
        vip: '1',
        classify: `[${id}]`,
    },
});
```

### Option 3: 新功能路由（可选）

创建新的路由获取分类列表：

```typescript
// lib/routes/jin10/categories.ts
export const route: Route = {
    path: '/categories',
    handler: async () => {
        const { data: response } = await got(
            'https://4a735ea38f8146198dc205d2e2d1bd28.z3c.jin10.com/classify',
            {
                headers: {
                    'x-app-id': 'bVBF4FyRTn5NJF5n',
                    'x-version': '1.0',
                    'handleerror': 'true',
                },
            }
        );
        return {
            title: '金十数据 - 分类列表',
            link: 'https://www.jin10.com/',
            item: response.data.map(cat => ({
                title: cat.name,
                description: `ID: ${cat.id}, 子分类: ${cat.child.length}个`,
            })),
        };
    },
};
```

---

## 🚀 性能优化建议

1. ✅ **继续使用缓存** - 当前的 `cache.tryGet` 策略有效
2. 💡 **考虑 WebSocket** - 如果需要真正的实时推送
3. 📊 **监控API变化** - 定期检查API是否有更新

---

## 📌 总结

| 项目 | 状态 | 建议 |
|------|------|------|
| 市场快讯API | ✅ 正常 | 保持不变 |
| 分类快讯API | ✅ 正常 | 保持不变 |
| 主题文章API | ✅ 正常 | 保持不变 |
| 数据结构 | 🆕 新增字段 | 向后兼容，无需修改 |
| WebSocket | 🔍 已发现 | 可选升级 |

**最终结论:** ✅ **当前代码无需更新，完全可用！**

新增的字段不影响现有功能，如果需要使用新字段（如 `child_channel`、`sources`、`extras.ad`），可以在未来进行扩展。

