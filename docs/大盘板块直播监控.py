#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
开盘啦 - 大盘和板块直播监控
专注于提取大盘指数和板块题材的实时评价
"""

import requests
import time
from datetime import datetime
import re


class MarketPlateMonitor:
    """大盘和板块直播监控器"""
    
    def __init__(self):
        self.url = "https://apphq.longhuvip.com/w1/api/index.php"
        self.params = {
            "a": "ZhiBoContent",
            "apiv": "w21",
            "c": "ConceptionPoint",
            "PhoneOSNew": "1"
        }
        self.headers = {
            'User-Agent': 'lhb/5.9.3 (com.kaipanla.www; build:0; iOS 15.4.0) Alamofire/5.9.3',
        }
        
        # 关键词库
        self.index_keywords = ['指数', '大盘', '上证', '创业板', '深证', '两市', '三大指数', '沪指']
        self.plate_keywords = ['板块', '题材', '概念', '行业', '异动', '拉升', '走强']
    
    def get_news(self):
        """获取快讯数据"""
        try:
            response = requests.get(
                self.url,
                params=self.params,
                headers=self.headers,
                timeout=10
            )
            return response.json()
        except Exception as e:
            print(f"❌ 获取数据失败: {e}")
            return None
    
    def is_index_news(self, item):
        """判断是否是大盘指数相关快讯"""
        comment = item['Comment']
        return any(keyword in comment for keyword in self.index_keywords)
    
    def is_plate_news(self, item):
        """判断是否是板块题材相关快讯"""
        comment = item['Comment']
        # 有PlateName字段
        if item.get('PlateName'):
            return True
        # 包含板块关键词
        return any(keyword in comment for keyword in self.plate_keywords)
    
    def extract_plate_name(self, item):
        """提取板块名称"""
        # 优先使用PlateName字段
        if item.get('PlateName'):
            return item['PlateName']
        
        # 从评论中提取
        comment = item['Comment']
        
        # 常见模式："XX板块"、"XX概念"、"XX题材"
        patterns = [
            r'([\u4e00-\u9fa5]+)板块',
            r'([\u4e00-\u9fa5]+)概念',
            r'([\u4e00-\u9fa5]+)题材',
            r'([\u4e00-\u9fa5]+)行业',
            r'([\u4e00-\u9fa5]+)异动',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, comment)
            if match:
                return match.group(1)
        
        return None
    
    def format_index_news(self, item):
        """格式化大盘指数快讯"""
        time_str = datetime.fromtimestamp(item['Time']).strftime('%Y-%m-%d %H:%M:%S')
        comment = item['Comment']
        user = item.get('UserName', '系统')
        
        output = []
        output.append("=" * 80)
        output.append(f"📈 大盘指数快讯 [{time_str}]")
        output.append(f"👤 来源: {user}")
        output.append("-" * 80)
        output.append(comment)
        
        # 提取相关股票
        if item.get('Stock'):
            output.append("-" * 80)
            output.append("📊 相关个股:")
            for stock in item['Stock'][:5]:
                code, name, change = stock[0], stock[1], stock[2]
                emoji = "🔴" if change > 0 else "🟢" if change < 0 else "⚪"
                output.append(f"   {emoji} {name}({code}) {change:+.2f}%")
        
        output.append("=" * 80)
        return "\n".join(output)
    
    def format_plate_news(self, item):
        """格式化板块题材快讯"""
        time_str = datetime.fromtimestamp(item['Time']).strftime('%Y-%m-%d %H:%M:%S')
        comment = item['Comment']
        user = item.get('UserName', '系统')
        plate_name = self.extract_plate_name(item)
        
        output = []
        output.append("=" * 80)
        if plate_name:
            output.append(f"📊 【{plate_name}】板块快讯 [{time_str}]")
        else:
            output.append(f"📊 板块快讯 [{time_str}]")
        output.append(f"👤 来源: {user}")
        output.append("-" * 80)
        output.append(comment)
        
        # 显示相关股票
        if item.get('Stock'):
            output.append("-" * 80)
            output.append("🔥 相关个股:")
            for stock in item['Stock'][:8]:
                code, name, change = stock[0], stock[1], stock[2]
                emoji = "🔴" if change > 0 else "🟢" if change < 0 else "⚪"
                output.append(f"   {emoji} {name}({code}) {change:+.2f}%")
        
        output.append("=" * 80)
        return "\n".join(output)
    
    def get_index_news_list(self):
        """获取大盘指数快讯列表"""
        data = self.get_news()
        if not data or 'List' not in data:
            return []
        
        return [item for item in data['List'] if self.is_index_news(item)]
    
    def get_plate_news_list(self):
        """获取板块题材快讯列表"""
        data = self.get_news()
        if not data or 'List' not in data:
            return []
        
        return [item for item in data['List'] if self.is_plate_news(item)]
    
    def show_latest_market_status(self):
        """显示最新市场状态"""
        print("\n" + "="*80)
        print("📊 最新市场状态")
        print("="*80)
        
        # 获取大盘快讯
        index_news = self.get_index_news_list()
        if index_news:
            print(f"\n📈 大盘指数快讯 (共 {len(index_news)} 条):\n")
            for item in index_news[:3]:  # 显示最新3条
                print(self.format_index_news(item))
                print()
        
        # 获取板块快讯
        plate_news = self.get_plate_news_list()
        if plate_news:
            print(f"\n📊 板块题材快讯 (共 {len(plate_news)} 条):\n")
            for item in plate_news[:5]:  # 显示最新5条
                print(self.format_plate_news(item))
                print()
    
    def monitor_market(self, interval=60):
        """持续监控市场"""
        print("🔔 开始监控大盘和板块...")
        print(f"⏱️  检查间隔: {interval}秒\n")
        
        last_index_id = None
        last_plate_id = None
        
        while True:
            try:
                # 获取大盘快讯
                index_news = self.get_index_news_list()
                if index_news and index_news[0]['ID'] != last_index_id:
                    print("\n🆕 大盘新快讯:")
                    print(self.format_index_news(index_news[0]))
                    last_index_id = index_news[0]['ID']
                
                # 获取板块快讯
                plate_news = self.get_plate_news_list()
                if plate_news and plate_news[0]['ID'] != last_plate_id:
                    print("\n🆕 板块新快讯:")
                    print(self.format_plate_news(plate_news[0]))
                    last_plate_id = plate_news[0]['ID']
                
                time.sleep(interval)
                
            except KeyboardInterrupt:
                print("\n\n⛔ 停止监控")
                break
            except Exception as e:
                print(f"❌ 错误: {e}")
                time.sleep(5)
    
    def get_hot_plates(self):
        """获取当前热门板块"""
        plate_news = self.get_plate_news_list()
        
        # 统计板块出现次数
        plate_count = {}
        for item in plate_news:
            plate_name = self.extract_plate_name(item)
            if plate_name:
                plate_count[plate_name] = plate_count.get(plate_name, 0) + 1
        
        # 排序
        sorted_plates = sorted(plate_count.items(), key=lambda x: x[1], reverse=True)
        
        print("\n" + "="*80)
        print("🔥 热门板块排行")
        print("="*80)
        
        for i, (plate, count) in enumerate(sorted_plates[:10], 1):
            print(f"{i:2d}. {plate:<20s} ({count} 条快讯)")
        
        return sorted_plates


def main():
    """主函数"""
    print("""
    ╔══════════════════════════════════════════════════════════════╗
    ║          开盘啦 - 大盘和板块直播监控系统 v1.0                ║
    ╚══════════════════════════════════════════════════════════════╝
    """)
    
    monitor = MarketPlateMonitor()
    
    print("请选择功能:")
    print("  1. 查看最新市场状态（大盘+板块）")
    print("  2. 只看大盘指数快讯")
    print("  3. 只看板块题材快讯")
    print("  4. 热门板块排行")
    print("  5. 实时监控模式")
    
    choice = input("\n请输入选项 (1-5, 默认1): ").strip() or "1"
    
    if choice == "1":
        # 查看最新状态
        monitor.show_latest_market_status()
    
    elif choice == "2":
        # 只看大盘
        index_news = monitor.get_index_news_list()
        print(f"\n📈 大盘指数快讯 (共 {len(index_news)} 条):\n")
        for item in index_news[:10]:
            print(monitor.format_index_news(item))
            print()
    
    elif choice == "3":
        # 只看板块
        plate_news = monitor.get_plate_news_list()
        print(f"\n📊 板块题材快讯 (共 {len(plate_news)} 条):\n")
        for item in plate_news[:10]:
            print(monitor.format_plate_news(item))
            print()
    
    elif choice == "4":
        # 热门板块
        monitor.get_hot_plates()
    
    elif choice == "5":
        # 实时监控
        interval = input("请输入检查间隔秒数 (默认60): ").strip()
        interval = int(interval) if interval.isdigit() else 60
        monitor.monitor_market(interval=interval)


if __name__ == "__main__":
    main()

