#!/usr/bin/env node

/**
 * 测试金十数据的广告过滤功能
 * 用于验证过滤规则是否正确
 */

const https = require('https');

// 获取快讯数据
function fetchFlashList() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'flash-api.jin10.com',
            path: '/get_flash_list?channel=-8200&vip=1',
            method: 'GET',
            headers: {
                'x-app-id': 'bVBF4FyRTn5NJF5n',
                'x-version': '1.0.0',
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

// 过滤广告函数（与index.ts保持一致）
const filterAds = (item) => {
    // 1. 过滤VIP锁定内容（lock=true）
    if (item.data.lock === true) {
        return false;
    }

    // 2. 过滤推广文章（type=2）
    if (item.type === 2) {
        return false;
    }

    // 3. 过滤包含"点击查看..."的诱导内容
    const content = item.data.content || '';
    if (content.includes('点击查看...')) {
        return false;
    }

    // 4. 过滤VIP专享内容（通过remark判断）
    if (item.remark && item.remark.length > 0) {
        const hasVipRemark = item.remark.some((r) => r.lock === true || r.content?.includes('VIP用户'));
        if (hasVipRemark) {
            return false;
        }
    }

    return true;
};

// 测试过滤功能
async function testFilter() {
    console.log('🔍 正在获取快讯数据...\n');

    const data = await fetchFlashList();
    const filteredData = data.filter((item) => item.type !== 1).filter(filterAds);

    console.log('📊 统计信息:\n');
    console.log(`   - 原始数据总数: ${data.length}`);
    console.log(`   - 过滤后数据总数: ${filteredData.length}`);
    console.log(`   - 过滤掉的数量: ${data.length - filteredData.length}`);
    console.log('');

    // 统计过滤掉的内容类型
    const filtered = data.filter((item) => item.type !== 1 && !filterAds(item));

    console.log('🚫 被过滤的广告类型分析:\n');

    let lockCount = 0;
    let type2Count = 0;
    let dotsCount = 0;
    let remarkCount = 0;

    filtered.forEach((item) => {
        if (item.data.lock === true) {
            lockCount++;
        }
        if (item.type === 2) {
            type2Count++;
        }
        if ((item.data.content || '').includes('点击查看...')) {
            dotsCount++;
        }
        if (item.remark && item.remark.some((r) => r.lock === true || r.content?.includes('VIP用户'))) {
            remarkCount++;
        }
    });

    console.log(`   - VIP锁定内容 (lock=true): ${lockCount} 条`);
    console.log(`   - 推广文章 (type=2): ${type2Count} 条`);
    console.log(`   - 包含"点击查看...": ${dotsCount} 条`);
    console.log(`   - VIP备注标记: ${remarkCount} 条`);
    console.log('');

    // 显示被过滤的示例
    console.log('📝 被过滤的广告示例:\n');
    console.log('=' + '='.repeat(79));

    filtered.slice(0, 5).forEach((item, index) => {
        const title = item.data.vip_title || item.data.title || item.data.content?.substring(0, 50) || '无标题';
        const type = item.type;
        const lock = item.data.lock;
        const vipDesc = item.data.vip_desc;

        console.log(`\n【广告 ${index + 1}】`);
        console.log(`标题: ${title}`);
        console.log(`类型: type=${type}`);
        console.log(`锁定: lock=${lock}`);
        if (vipDesc) {
            console.log(`VIP描述: ${vipDesc}`);
        }
        console.log(`时间: ${item.time}`);
    });

    console.log('\n' + '=' + '='.repeat(79));

    // 显示保留的正常内容示例
    console.log('\n✅ 保留的正常内容示例:\n');
    console.log('=' + '='.repeat(79));

    filteredData.slice(0, 5).forEach((item, index) => {
        const content = item.data.content || '';
        const titleMatch = content.match(/^【(.*?)】/);
        const title = titleMatch ? titleMatch[1] : content.substring(0, 50);

        console.log(`\n【内容 ${index + 1}】`);
        console.log(`标题: ${title}`);
        console.log(`内容: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
        console.log(`时间: ${item.time}`);
        console.log(`重要: ${item.important ? '是' : '否'}`);
    });

    console.log('\n' + '=' + '='.repeat(79));

    // 过滤效率
    const filterRate = ((data.length - filteredData.length) / data.length * 100).toFixed(2);
    console.log(`\n📈 过滤效率: ${filterRate}%`);
    console.log(`\n✅ 过滤功能测试完成！\n`);
}

// 执行测试
testFilter().catch(console.error);

