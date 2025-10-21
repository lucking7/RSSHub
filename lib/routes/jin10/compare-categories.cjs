#!/usr/bin/env node

/**
 * 对比金十数据的动态分类列表和硬编码分类列表
 * 用于发现新增、删除或变更的分类
 */

const https = require('https');

// 硬编码的分类列表（从category.ts提取）
const hardcodedCategories = {
    1: '贵金属',
    2: '黄金',
    3: '白银',
    4: '钯金',
    5: '铂金',
    6: '石油',
    7: 'WTI原油',
    8: '布伦特原油',
    9: '欧佩克',
    10: '页岩气',
    11: '原油市场报告',
    12: '外汇',
    13: '欧元',
    14: '英镑',
    15: '日元',
    16: '美元',
    17: '瑞郎',
    18: '人民币',
    36: '期货',
    145: '油脂油料',
    146: '钢矿',
    147: '煤炭',
    148: '化工',
    149: '有色',
    150: '谷物',
    151: '糖棉果蛋',
    152: '生猪',
    154: '碳排放',
    19: '数字货币',
    107: '数字人民币',
    22: '科技',
    23: '手机',
    39: '电动汽车',
    40: '芯片',
    41: '中国突破',
    42: '5G',
    43: '量子计算',
    158: '航空航天',
    165: '元宇宙',
    168: '人工智能',
    24: '地缘局势',
    44: '缅甸局势',
    45: '印巴纷争',
    46: '中东风云',
    155: '阿富汗局势',
    167: '俄乌冲突',
    25: '人物',
    47: '鲍威尔',
    48: '马斯克',
    49: '拉加德',
    50: '特朗普',
    51: '拜登',
    157: '巴菲特',
    26: '央行',
    53: '美联储',
    54: '中国央行',
    55: '欧洲央行',
    56: '日本央行',
    137: '货币政策调整',
    141: '英国央行',
    159: '澳洲联储',
    160: '新西兰联储',
    161: '加拿大央行',
    27: '美股',
    59: '财报',
    60: 'Reddit散户动态',
    108: '个股动态',
    28: '港股',
    61: '美股回港',
    62: '交易所动态',
    63: '指数动态',
    109: '个股动态',
    29: 'A股',
    64: '美股回A',
    65: '券商分析',
    66: '板块异动',
    67: '大盘动态',
    68: '南北资金',
    69: '亚盘动态',
    70: 'IPO信息',
    110: '个股动态',
    166: '北交所',
    30: '基金',
    31: '投行机构',
    71: '标普、惠誉、穆迪',
    72: '美银',
    112: '高盛',
    32: '疫情',
    73: '疫苗动态',
    74: '确诊数据',
    113: '新冠药物',
    33: '债券',
    34: '政策',
    75: '中国',
    76: '美国',
    77: '欧盟',
    78: '日本',
    79: '贸易、关税',
    80: '碳中和',
    81: '中国香港',
    120: '英国',
    156: '房地产动态',
    35: '经济数据',
    82: '中国',
    83: '美国',
    84: '欧盟',
    85: '日本',
    37: '公司',
    86: '特斯拉',
    90: '苹果',
    91: '独角兽',
    92: '谷歌',
    93: '华为',
    94: '阿里巴巴',
    95: '小米',
    116: '字节跳动',
    117: '腾讯',
    118: '微软',
    119: '百度',
    162: '美团',
    163: '滴滴',
    164: '中国恒大',
    38: '灾害事故',
    96: '地震',
    97: '爆炸',
    98: '海啸',
    99: '寒潮',
    100: '洪涝',
    101: '火灾',
    102: '矿难',
    103: '枪击案',
};

// 获取动态分类列表
function fetchDynamicCategories() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: '4a735ea38f8146198dc205d2e2d1bd28.z3c.jin10.com',
            path: '/classify',
            method: 'GET',
            headers: {
                'x-app-id': 'bVBF4FyRTn5NJF5n',
                'x-version': '1.0',
                'handleerror': 'true',
                'User-Agent': 'Mozilla/5.0',
            },
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.data);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// 对比分类列表
async function compareCategories() {
    console.log('🔍 正在获取动态分类列表...\n');

    const dynamicData = await fetchDynamicCategories();

    // 将动态数据转换为平铺的ID-Name映射
    const dynamicCategories = {};
    for (const category of dynamicData) {
        dynamicCategories[category.id] = category.name;
        if (category.child) {
            for (const child of category.child) {
                dynamicCategories[child.id] = child.name;
            }
        }
    }

    console.log('📊 对比结果:\n');

    // 1. 检查动态API中新增的分类
    const newCategories = [];
    for (const [id, name] of Object.entries(dynamicCategories)) {
        if (!hardcodedCategories[id]) {
            newCategories.push({ id, name });
        }
    }

    // 2. 检查硬编码中已删除的分类
    const removedCategories = [];
    for (const [id, name] of Object.entries(hardcodedCategories)) {
        if (!dynamicCategories[id]) {
            removedCategories.push({ id, name });
        }
    }

    // 3. 检查名称变更的分类
    const changedCategories = [];
    for (const [id, name] of Object.entries(hardcodedCategories)) {
        if (dynamicCategories[id] && dynamicCategories[id] !== name) {
            changedCategories.push({
                id,
                oldName: name,
                newName: dynamicCategories[id],
            });
        }
    }

    // 输出结果
    if (newCategories.length > 0) {
        console.log('🆕 新增分类 (' + newCategories.length + ' 个):');
        newCategories.forEach(({ id, name }) => {
            console.log(`   - ID: ${id.toString().padEnd(4)} | 名称: ${name}`);
        });
        console.log('');
    } else {
        console.log('✅ 没有新增分类\n');
    }

    if (removedCategories.length > 0) {
        console.log('❌ 已删除分类 (' + removedCategories.length + ' 个):');
        removedCategories.forEach(({ id, name }) => {
            console.log(`   - ID: ${id.toString().padEnd(4)} | 名称: ${name}`);
        });
        console.log('');
    } else {
        console.log('✅ 没有删除的分类\n');
    }

    if (changedCategories.length > 0) {
        console.log('🔄 名称变更 (' + changedCategories.length + ' 个):');
        changedCategories.forEach(({ id, oldName, newName }) => {
            console.log(`   - ID: ${id.toString().padEnd(4)} | 旧: ${oldName} → 新: ${newName}`);
        });
        console.log('');
    } else {
        console.log('✅ 没有名称变更\n');
    }

    // 统计信息
    console.log('📈 统计信息:');
    console.log(`   - 硬编码分类总数: ${Object.keys(hardcodedCategories).length}`);
    console.log(`   - 动态API分类总数: ${Object.keys(dynamicCategories).length}`);
    console.log(`   - 差异数量: ${Math.abs(Object.keys(hardcodedCategories).length - Object.keys(dynamicCategories).length)}\n`);

    // 建议
    if (newCategories.length > 0 || removedCategories.length > 0 || changedCategories.length > 0) {
        console.log('💡 建议:');
        console.log('   ❗️ 检测到分类差异，建议更新 category.ts 中的 description 字段');
        console.log('   📝 或者建议用户直接查看 /jin10/categories 路由获取最新分类列表\n');

        // 生成更新后的Markdown表格
        console.log('📝 更新后的Markdown表格:\n');
        console.log('| Name           | ID   |');
        console.log('|----------------|------|');

        // 按分类层级排序
        for (const category of dynamicData) {
            console.log(`| ${category.name.padEnd(14)} | ${category.id.toString().padEnd(4)} |`);
            if (category.child) {
                for (const child of category.child) {
                    console.log(`| ${child.name.padEnd(14)} | ${child.id.toString().padEnd(4)} |`);
                }
            }
        }
    } else {
        console.log('✅ 结论: 分类列表完全一致，无需更新！');
    }
}

// 执行对比
compareCategories().catch(console.error);

