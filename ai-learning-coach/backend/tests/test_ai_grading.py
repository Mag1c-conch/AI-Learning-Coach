#!/usr/bin/env python3
"""
测试AI grading API
"""
import sys
import os
import requests

def test_grading():
    print("=" * 60)
    print("测试 AI Grading API")
    print("=" * 60)
    
    url = "http://localhost:5001/assistant/grade_submission"
    
    # 测试数据
    test_cases = [
        {
            "name": "Material ID 1 (admin uploaded)",
            "data": {
                "material_id": 1,
                "teacher_id": 1,
                "max_score": 100,
                "rubric": "Please grade the assignment based on its content."
            }
        },
        {
            "name": "Material ID 2 (student uploaded)",
            "data": {
                "material_id": 2,
                "teacher_id": 1,
                "max_score": 100,
                "rubric": "Please grade the assignment based on its content."
            }
        }
    ]
    
    for idx, test_case in enumerate(test_cases, 1):
        print(f"\n{'='*60}")
        print(f"测试 {idx}: {test_case['name']}")
        print(f"{'='*60}")
        print(f"请求数据: {test_case['data']}")
        
        try:
            print("\n发送请求...")
            response = requests.post(
                url,
                json=test_case['data'],
                headers={"Content-Type": "application/json"},
                timeout=120  # 2分钟超时
            )
            
            print(f"状态码: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ 请求成功!")
                data = response.json()
                
                if data.get('grading'):
                    print("\n批改结果:")
                    grading = data['grading']
                    if grading.get('score'):
                        print(f"  分数: {grading['score'].get('value')}/{grading['score'].get('max')}")
                        print(f"  说明: {grading['score'].get('explanation', 'N/A')}")
                    
                    if grading.get('strengths'):
                        print(f"\n  优点 ({len(grading['strengths'])}条):")
                        for strength in grading['strengths'][:2]:
                            print(f"    - {strength}")
                    
                    if grading.get('mistakes'):
                        print(f"\n  需改进 ({len(grading['mistakes'])}条):")
                        for mistake in grading['mistakes'][:2]:
                            print(f"    - {mistake.get('issue', 'N/A')}")
                else:
                    print("⚠️  没有批改结果")
                    if data.get('parse_error'):
                        print(f"  解析错误: {data['parse_error']}")
                
            else:
                print(f"❌ 请求失败: {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"错误信息: {error_data}")
                except:
                    print(f"响应文本: {response.text[:500]}")
                    
        except requests.exceptions.Timeout:
            print("❌ 请求超时（超过120秒）")
        except requests.exceptions.ConnectionError:
            print("❌ 连接失败 - 请确保后端正在运行 (http://localhost:5001)")
        except Exception as e:
            print(f"❌ 发生错误: {type(e).__name__}: {e}")
    
    print(f"\n{'='*60}")
    print("测试完成")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    test_grading()

