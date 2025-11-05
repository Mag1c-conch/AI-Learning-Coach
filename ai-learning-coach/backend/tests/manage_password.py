#!/usr/bin/env python3
"""
密码管理工具 - 查看和修改用户密码
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.models import User, UserRole
from app.extensions import db

def show_users():
    """显示所有用户"""
    print("\n" + "=" * 60)
    print("当前所有用户")
    print("=" * 60)
    
    users = User.query.all()
    if not users:
        print("数据库中没有用户")
        return
    
    print(f"\n找到 {len(users)} 个用户：\n")
    for user in users:
        print(f"ID: {user.id}")
        print(f"  用户名: {user.username}")
        print(f"  密码: {user.password}")
        print(f"  姓名: {user.first_name} {user.last_name}")
        print(f"  角色: {user.role.value}")
        print()

def reset_password(user_id, new_password):
    """重置指定用户的密码"""
    user = User.query.get(user_id)
    if not user:
        print(f"❌ 用户ID {user_id} 不存在")
        return False
    
    old_password = user.password
    user.password = new_password
    db.session.commit()
    
    print(f"\n✅ 密码修改成功!")
    print(f"   用户: {user.username} ({user.role.value})")
    print(f"   旧密码: {old_password}")
    print(f"   新密码: {new_password}")
    return True

def reset_all_passwords(new_password):
    """重置所有用户的密码为相同密码"""
    users = User.query.all()
    if not users:
        print("❌ 数据库中没有用户")
        return
    
    print(f"\n⚠️  即将修改 {len(users)} 个用户的密码为: {new_password}")
    confirm = input("确认吗? (yes/no): ").strip().lower()
    
    if confirm != 'yes':
        print("❌ 操作已取消")
        return
    
    for user in users:
        user.password = new_password
    
    db.session.commit()
    print(f"\n✅ 所有用户密码已修改为: {new_password}")
    show_users()

def interactive_mode():
    """交互式菜单"""
    while True:
        print("\n" + "=" * 60)
        print("密码管理工具")
        print("=" * 60)
        print("1. 查看所有用户")
        print("2. 修改指定用户密码")
        print("3. 修改所有用户密码为相同密码")
        print("4. 快速重置 - 所有用户密码改为 '123456'")
        print("5. 快速重置 - 所有用户密码改为 'bjn12345'")
        print("0. 退出")
        print("=" * 60)
        
        choice = input("\n请选择操作 (0-5): ").strip()
        
        if choice == '0':
            print("再见!")
            break
        elif choice == '1':
            show_users()
        elif choice == '2':
            show_users()
            try:
                user_id = int(input("\n请输入用户ID: ").strip())
                new_password = input("请输入新密码: ").strip()
                if new_password:
                    reset_password(user_id, new_password)
                else:
                    print("❌ 密码不能为空")
            except ValueError:
                print("❌ 无效的用户ID")
        elif choice == '3':
            show_users()
            new_password = input("\n请输入新密码: ").strip()
            if new_password:
                reset_all_passwords(new_password)
            else:
                print("❌ 密码不能为空")
        elif choice == '4':
            reset_all_passwords('123456')
        elif choice == '5':
            reset_all_passwords('bjn12345')
        else:
            print("❌ 无效的选择")

def main():
    app = create_app()
    with app.app_context():
        if len(sys.argv) > 1:
            # 命令行模式
            command = sys.argv[1]
            if command == 'show':
                show_users()
            elif command == 'reset' and len(sys.argv) >= 4:
                user_id = int(sys.argv[2])
                new_password = sys.argv[3]
                reset_password(user_id, new_password)
            elif command == 'reset-all' and len(sys.argv) >= 3:
                new_password = sys.argv[2]
                reset_all_passwords(new_password)
            else:
                print("用法:")
                print("  python manage_password.py show")
                print("  python manage_password.py reset <user_id> <new_password>")
                print("  python manage_password.py reset-all <new_password>")
        else:
            # 交互式模式
            interactive_mode()

if __name__ == "__main__":
    main()

