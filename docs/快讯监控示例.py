#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
开盘啦实时快讯监控脚本
作用: 实时监控并推送股市快讯
"""

import requests
import time
from datetime import datetime
import json


class KaiPanLaNewsMonitor:
    """开盘啦快讯监控器"""
    
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
            'Accept': '*/*',
        }
        self.last_id = None
        self.all_news = []
    
    def get_news(self):
        """获取最新快讯"""
        try:
            response = requests.get(
                self.url, 
                params=self.params,
                headers=self.headers,
                timeout=10
            )
            return response.json()
        except Exception as e:
            print(f"❌ 获取快讯失败: {e}")
            return None
    
    def format_news(self, item):
        """格式化快讯内容"""
        time_str = datetime.fromtimestamp(item['Time']).strftime('%Y-%m-%d %H:%M:%S')
        comment = item['Comment']
        user = item.get('UserName', '系统')
        stocks = item.get('Stock', [])
        
        output = []
        output.append("=" * 80)
        output.append(f"📢 [{time_str}] 来源: {user}")
        output.append("-" * 80)
        output.append(f"📝 {comment}")
        
        if stocks:
            output.append("-" * 80)
            output.append("📊 相关个股:")
            for stock in stocks[:10]:  # 最多显示10只
                code, name, change = stock[0], stock[1], stock[2]
                emoji = "🔴" if change > 0 else "🟢" if change < 0 else "⚪"
                output.append(f"   {emoji} {name}({code}) {change:+.2f}%")
        
        output.append("=" * 80)
        return "\n".join(output)
    
    def monitor_once(self):
        """单次检查快讯"""
        data = self.get_news()
        
        if not data or 'List' not in data:
            return None
        
        news_list = data['List']
        
        if not news_list:
            return None
        
        latest = news_list[0]  # 第一条是最新的
        
        # 检查是否是新消息
        if self.last_id != latest['ID']:
            self.last_id = latest['ID']
            self.all_news.insert(0, latest)
            return latest
        
        return None
    
    def monitor_realtime(self, interval=30, show_all=False):
        """实时监控快讯"""
        print("🔔 开始监控开盘啦实时快讯...")
        print(f"⏱️  检查间隔: {interval}秒")
        print(f"📅 启动时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)
        
        # 首次获取，显示最新的几条
        if show_all:
            data = self.get_news()
            if data and 'List' in data:
                print(f"\n📰 最新 5 条快讯:\n")
                for i, item in enumerate(data['List'][:5], 1):
                    print(self.format_news(item))
                    print()
                
                if data['List']:
                    self.last_id = data['List'][0]['ID']
        
        # 开始监控
        while True:
            try:
                new_item = self.monitor_once()
                
                if new_item:
                    print(f"\n🆕 新快讯 #{len(self.all_news)}")
                    print(self.format_news(new_item))
                    print()
                
                time.sleep(interval)
                
            except KeyboardInterrupt:
                print("\n\n⛔ 用户中断监控")
                self.print_summary()
                break
            except Exception as e:
                print(f"❌ 错误: {e}")
                time.sleep(5)
    
    def print_summary(self):
        """打印监控摘要"""
        print("\n" + "=" * 80)
        print("📊 监控摘要")
        print("=" * 80)
        print(f"✅ 共收到 {len(self.all_news)} 条新快讯")
        
        if self.all_news:
            print(f"⏰ 最新快讯时间: {datetime.fromtimestamp(self.all_news[0]['Time']).strftime('%H:%M:%S')}")
            print(f"⏰ 最早快讯时间: {datetime.fromtimestamp(self.all_news[-1]['Time']).strftime('%H:%M:%S')}")
        
        print("=" * 80)
    
    def get_news_by_keyword(self, keyword):
        """按关键词筛选快讯"""
        data = self.get_news()
        
        if not data or 'List' not in data:
            return []
        
        filtered = []
        for item in data['List']:
            if keyword in item['Comment']:
                filtered.append(item)
        
        return filtered
    
    def get_news_by_stock(self, stock_code):
        """按股票代码筛选快讯"""
        data = self.get_news()
        
        if not data or 'List' not in data:
            return []
        
        filtered = []
        for item in data['List']:
            stocks = item.get('Stock', [])
            for stock in stocks:
                if stock[0] == stock_code:
                    filtered.append(item)
                    break
        
        return filtered


def main():
    """主函数"""
    print("""
    ╔══════════════════════════════════════════════════════════════╗
    ║          开盘啦实时快讯监控系统 v1.0                          ║
    ╚══════════════════════════════════════════════════════════════╝
    """)
    
    monitor = KaiPanLaNewsMonitor()
    
    # 选择模式
    print("请选择模式:")
    print("  1. 实时监控 (默认30秒)")
    print("  2. 单次查看最新快讯")
    print("  3. 按关键词搜索")
    print("  4. 按股票代码搜索")
    
    choice = input("\n请输入选项 (1-4, 默认1): ").strip() or "1"
    
    if choice == "1":
        # 实时监控
        interval = input("请输入检查间隔秒数 (默认30): ").strip()
        interval = int(interval) if interval.isdigit() else 30
        monitor.monitor_realtime(interval=interval, show_all=True)
    
    elif choice == "2":
        # 单次查看
        data = monitor.get_news()
        if data and 'List' in data:
            print(f"\n📰 最新 10 条快讯:\n")
            for i, item in enumerate(data['List'][:10], 1):
                print(monitor.format_news(item))
                print()
    
    elif choice == "3":
        # 关键词搜索
        keyword = input("请输入关键词: ").strip()
        results = monitor.get_news_by_keyword(keyword)
        
        if results:
            print(f"\n🔍 找到 {len(results)} 条包含 '{keyword}' 的快讯:\n")
            for item in results:
                print(monitor.format_news(item))
                print()
        else:
            print(f"\n❌ 未找到包含 '{keyword}' 的快讯")
    
    elif choice == "4":
        # 股票代码搜索
        code = input("请输入股票代码 (如 600745): ").strip()
        results = monitor.get_news_by_stock(code)
        
        if results:
            print(f"\n🔍 找到 {len(results)} 条关于 {code} 的快讯:\n")
            for item in results:
                print(monitor.format_news(item))
                print()
        else:
            print(f"\n❌ 未找到关于 {code} 的快讯")


if __name__ == "__main__":
    main()

