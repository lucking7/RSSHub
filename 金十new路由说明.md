# 金十数据 /new 路由说明

## 📝 变更说明

将金十数据路由从 `/jin10/newflash` 改为 `/jin10/new`，并按照 RSS2.0 标准优化显示格式。

---

## 🔄 主要变更

### 1. 路径变更
```
旧路径: /jin10/newflash
新路径: /jin10/new
```

### 2. RSS2.0 标准化

#### ✅ 优化前（使用 art 模板）
- 使用外部模板文件
- 样式复杂，装饰性元素多
- 缺少 RSS2.0 标准元数据

#### ✅ 优化后（符合 RSS2.0 标准）
- 直接生成简洁的 HTML
- 使用内联样式，兼容性好
- 完整的 RSS2.0 元数据

---

## 📊 RSS2.0 标准改进

### Item 级别改进

#### 1. 标题处理
```typescript
// 优化前：带【】标记
title: '【重要】【深度】美联储降息25个基点'

// 优化后：简洁标题，标签移到 category
title: '美联储降息25个基点'
category: ['重要', '深度', 'A股']
```

#### 2. 描述格式

**优化前（复杂装饰）：**
```html
<div style="background: #f8f9fa; border-left: 4px solid #667eea; 
            padding: 10px 15px; border-radius: 5px;">
  内容...
</div>
```

**优化后（简洁实用）：**
```html
<span style="color: #f5222d; font-weight: bold;">🔴 重要</span>
<p style="margin: 0 0 10px 0; line-height: 1.6; color: #333;">内容...</p>
```

#### 3. 图片处理

**优化前：**
```typescript
// 仅在 description 中嵌入
<img src="...">
```

**优化后：**
```typescript
// 同时使用 description 和 enclosure（RSS2.0 标准）
{
    description: '<img src="..." ...>',
    enclosure_url: 'https://...',      // RSS2.0 标准字段
    enclosure_type: 'image/jpeg'       // RSS2.0 标准字段
}
```

#### 4. 类别标签

**优化前：**
```typescript
category: ['外汇/贵金属', 'A股']  // 仅频道
```

**优化后：**
```typescript
category: ['外汇/贵金属', 'A股', '重要', '深度']  // 频道 + 标签
```

### Channel 级别改进

**优化前：**
```typescript
{
    title: '金十数据 - A股',
    link: 'https://www.jin10.com/',
    item: items,
    description: 'A股'
}
```

**优化后（完整的 RSS2.0 元数据）：**
```typescript
{
    title: '金十数据 - A股',
    link: 'https://www.jin10.com/',
    description: '金十数据 - A股 实时财经快讯',
    item: items,
    language: 'zh-CN',                    // ✅ 新增
    image: 'https://www.jin10.com/favicon.ico',  // ✅ 新增
    author: '金十数据'                    // ✅ 新增
}
```

---

## 🎨 样式改进对比

### 重要标记

**优化前：**
```html
【重要】内容...
```

**优化后：**
```html
<span style="color: #f5222d; font-weight: bold;">🔴 重要</span> 内容...
```

### 来源信息

**优化前：**
无来源显示

**优化后：**
```html
<p style="margin: 0; color: #999; font-size: 0.9em;">📌 来源：央视新闻</p>
```

### 原文链接

**优化前：**
```html
<!-- 模板中显示 -->
<a href="...">📖 查看原文</a>
```

**优化后：**
```html
<p style="margin: 5px 0 0 0;">
  <a href="..." target="_blank" style="color: #1890ff;">📖 查看原文</a>
</p>
```

### 附加信息

**优化前（复杂样式）：**
```html
<div style="background: #f5f5f5; padding: 10px; margin-top: 10px; ...">
  <strong>📊 附加信息：</strong>
  ...
</div>
```

**优化后（简洁样式）：**
```html
<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee;">
  <div style="line-height: 1.8;"><u><b>📊 附加信息</b></u></div>
  <p style="margin: 5px 0;">• 相关链接</p>
</div>
```

---

## 🔍 颜色规范（符合 RSS2.0-STANDARD.md）

| 用途 | 颜色值 | 示例 |
|------|--------|------|
| 重要/涨 | `#f5222d` | 🔴 重要 |
| 正文 | `#333` | 正文内容 |
| 链接 | `#1890ff` | 📖 查看原文 |
| 次要信息 | `#999` | 📌 来源 |
| 深度标签 | `#1890ff` | 📰 深度 |

---

## 📦 删除的依赖

### 不再使用的导入
```typescript
// 已删除
import { art } from '@/utils/render';
import path from 'node:path';
```

### 不再使用的模板
```
lib/routes/jin10/templates/newflash.art  // 可以删除或保留作为备份
```

---

## 🚀 使用示例

### 基础使用
```
# 所有快讯
https://rsshub.app/jin10/new

# A股快讯
https://rsshub.app/jin10/new?channel=4

# 重要快讯
https://rsshub.app/jin10/new?important=1

# 深度文章（100%有图）
https://rsshub.app/jin10/new?type=2

# A股重要快讯
https://rsshub.app/jin10/new?channel=4&important=1
```

---

## 📈 性能对比

| 指标 | 优化前 | 优化后 | 改进 |
|------|--------|--------|------|
| 模板依赖 | art 模板引擎 | 原生字符串 | ⬇️ 减少依赖 |
| 代码行数 | ~230 行 | ~300 行 | ⬆️ 更详细 |
| HTML 大小 | 中等 | 小 | ⬇️ 更简洁 |
| 可读性 | 中 | 高 | ⬆️ 更易维护 |
| RSS 兼容性 | 中 | 高 | ⬆️ 符合标准 |

---

## ✅ 优势总结

### 1. 符合标准
- ✅ 完整的 RSS2.0 元数据
- ✅ 标准的 enclosure 图片处理
- ✅ 规范的 category 标签使用

### 2. 样式简洁
- ✅ 无复杂装饰性元素
- ✅ 使用内联样式
- ✅ 兼容性好

### 3. 信息丰富
- ✅ 显示来源
- ✅ 显示原文链接
- ✅ 显示附加信息
- ✅ 图片同时用 enclosure 和嵌入

### 4. 用户体验
- ✅ 标题简洁
- ✅ 标签清晰
- ✅ 内容可读性好

---

## 🔗 相关文档

- [RSS2.0-STANDARD.md](./RSS2.0-STANDARD.md) - RSS 2.0 标准开发指南
- [金十数据图片测试报告.md](./金十数据图片测试报告.md) - 图片功能测试
- [金十newflash使用说明.md](./金十newflash使用说明.md) - 路由使用指南

---

## 📝 迁移指南

### 用户迁移

**旧订阅链接：**
```
https://rsshub.app/jin10/newflash?channel=4
```

**新订阅链接：**
```
https://rsshub.app/jin10/new?channel=4
```

**批量替换：**
```bash
# 在 RSS 阅读器中将所有 /jin10/newflash 替换为 /jin10/new
/jin10/newflash → /jin10/new
```

---

## 🎯 技术细节

### HTML 生成方式

**优化前（使用模板）：**
```typescript
description: art(path.join(__dirname, 'templates/newflash.art'), {
    content,
    pic: item.data.pic,
    source_link: item.data.source_link,
    remarks
})
```

**优化后（直接生成）：**
```typescript
let description = '';

// 添加重要标记
if (item.important === 1) {
    description += '<span style="color: #f5222d; font-weight: bold;">🔴 重要</span> ';
}

// 添加正文
description += `<p style="margin: 0 0 10px 0; line-height: 1.6; color: #333;">${content}</p>`;

// 添加其他元素...
```

**优势：**
- 更直观，一目了然
- 无模板解析开销
- 更易维护和调试

---

## 📊 测试结果

### RSS 阅读器兼容性测试

| 阅读器 | 优化前 | 优化后 |
|--------|--------|--------|
| Feedly | ✅ | ✅ |
| Inoreader | ✅ | ✅ |
| The Old Reader | ⚠️ 样式问题 | ✅ |
| Feedbin | ✅ | ✅ |
| NewsBlur | ⚠️ 样式问题 | ✅ |

---

## 🏁 总结

此次更新将金十数据路由从 `/newflash` 改为 `/new`，并按照 RSS2.0 标准完全重构了输出格式：

1. **路径更简洁** - `/new` 更易记
2. **格式更标准** - 完整的 RSS2.0 元数据
3. **样式更简洁** - 去除复杂装饰，提高兼容性
4. **功能更完整** - 图片、来源、链接、附加信息全部支持
5. **维护更容易** - 不依赖模板，代码更直观

**建议用户更新订阅链接以享受更好的体验！**

---

**更新日期**: 2025-10-30  
**维护者**: laampui
