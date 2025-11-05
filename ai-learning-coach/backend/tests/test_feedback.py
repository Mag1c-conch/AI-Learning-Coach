#!/usr/bin/env python3
"""
测试反馈功能 - 发送和接收
"""
import sys
import os
import requests

def test_feedback():
    print("=" * 60)
    print("测试反馈功能")
    print("=" * 60)
    
    base_url = "http://localhost:5001"
    
    # 测试1: 发送反馈
    print("\n【测试1】教师发送反馈给学生")
    print("-" * 60)
    
    feedback_data = {
        "teacher_id": 1,
        "student_id": 2,
        "course_id": 1,
        "content": """📊 Grade: 85/100

✅ Strengths:
1. Good understanding of basic concepts
2. Clear explanation of the methodology

⚠️ Areas for Improvement:
1. Need more detailed analysis
2. Missing some edge cases

💡 Hint: Try to consider what happens when input is null or undefined.

📚 Next Steps: Review the course material on error handling."""
    }
    
    try:
        response = requests.post(
            f"{base_url}/feedback",
            json=feedback_data,
            timeout=10
        )
        
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 201:
            print("✅ 反馈发送成功!")
            data = response.json()
            print(f"反馈ID: {data.get('id')}")
            print(f"教师ID: {data.get('teacher_id')}")
            print(f"学生ID: {data.get('student_id')}")
            print(f"课程ID: {data.get('course_id')}")
            print(f"内容预览: {data.get('content')[:100]}...")
            feedback_id = data.get('id')
        else:
            print(f"❌ 发送失败: {response.status_code}")
            print(f"错误: {response.text}")
            return
            
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return
    
    # 测试2: 学生查看反馈
    print("\n【测试2】学生查看收到的反馈")
    print("-" * 60)
    
    try:
        response = requests.get(
            f"{base_url}/feedback",
            params={
                "student_id": 2,
                "include_related": "true"
            },
            timeout=10
        )
        
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            feedbacks = response.json()
            print(f"✅ 找到 {len(feedbacks)} 条反馈")
            
            for idx, fb in enumerate(feedbacks[:3], 1):  # 只显示前3条
                print(f"\n反馈 {idx}:")
                print(f"  ID: {fb.get('id')}")
                print(f"  教师: {fb.get('teacher', {}).get('first_name')} {fb.get('teacher', {}).get('last_name')}")
                print(f"  课程: {fb.get('course', {}).get('name')} ({fb.get('course', {}).get('code')})")
                print(f"  时间: {fb.get('created_at')}")
                print(f"  内容预览: {fb.get('content')[:80]}...")
                
            if len(feedbacks) > 3:
                print(f"\n  ... 还有 {len(feedbacks) - 3} 条反馈")
        else:
            print(f"❌ 获取失败: {response.status_code}")
            print(f"错误: {response.text}")
            
    except Exception as e:
        print(f"❌ 请求失败: {e}")
    
    # 测试3: 教师查看自己发送的反馈
    print("\n【测试3】教师查看发送的反馈")
    print("-" * 60)
    
    try:
        response = requests.get(
            f"{base_url}/feedback",
            params={
                "teacher_id": 1,
                "include_related": "true",
                "limit": 5
            },
            timeout=10
        )
        
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            feedbacks = response.json()
            print(f"✅ 找到 {len(feedbacks)} 条发送的反馈")
            
            for idx, fb in enumerate(feedbacks, 1):
                print(f"\n反馈 {idx}:")
                print(f"  发送给: {fb.get('student', {}).get('first_name')} {fb.get('student', {}).get('last_name')}")
                print(f"  课程: {fb.get('course', {}).get('name', 'N/A')}")
                print(f"  时间: {fb.get('created_at')}")
        else:
            print(f"❌ 获取失败: {response.status_code}")
            
    except Exception as e:
        print(f"❌ 请求失败: {e}")
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)
    print("\n💡 提示:")
    print("  - 教师在 Grading 页面点击 'Send to Student' 发送反馈")
    print("  - 学生在 Dashboard 点击顶部铃铛图标查看反馈")
    print()

if __name__ == "__main__":
    test_feedback()

