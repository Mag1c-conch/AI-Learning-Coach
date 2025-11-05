#!/usr/bin/env python3
"""
检查AI grading所需的数据是否存在
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.models import User, UserRole, Course, Assignment, Material
from app.extensions import db

def check_grading_data():
    app = create_app()
    with app.app_context():
        print("=" * 60)
        print("检查 AI Grading 所需数据")
        print("=" * 60)
        
        # 检查管理员/教师
        print("\n📋 管理员用户 (ADMIN):")
        admins = User.query.filter_by(role=UserRole.ADMIN).all()
        if not admins:
            print("  ❌ 没有找到管理员用户")
        else:
            for admin in admins:
                print(f"  ✓ ID: {admin.id}, 用户名: {admin.username}, "
                      f"姓名: {admin.first_name} {admin.last_name}")
        
        # 检查学生
        print("\n👨‍🎓 学生用户 (STUDENT):")
        students = User.query.filter_by(role=UserRole.STUDENT).all()
        if not students:
            print("  ❌ 没有找到学生用户")
        else:
            for student in students[:5]:  # 只显示前5个
                print(f"  ✓ ID: {student.id}, 用户名: {student.username}, "
                      f"姓名: {student.first_name} {student.last_name}")
            if len(students) > 5:
                print(f"  ... 还有 {len(students) - 5} 个学生")
        
        # 检查课程
        print("\n📚 课程:")
        courses = Course.query.all()
        if not courses:
            print("  ❌ 没有找到课程")
        else:
            for course in courses:
                teacher = User.query.get(course.created_by)
                teacher_name = f"{teacher.first_name} {teacher.last_name}" if teacher else "未知"
                print(f"  ✓ ID: {course.id}, 名称: {course.name}, "
                      f"代码: {course.code}, 教师: {teacher_name} (ID: {course.created_by})")
        
        # 检查作业
        print("\n📝 作业:")
        assignments = Assignment.query.all()
        if not assignments:
            print("  ❌ 没有找到作业")
        else:
            for assignment in assignments:
                course = Course.query.get(assignment.course_id)
                course_name = course.name if course else "未知课程"
                teacher = User.query.get(assignment.teacher_id)
                teacher_name = f"{teacher.first_name} {teacher.last_name}" if teacher else "未知"
                print(f"  ✓ ID: {assignment.id}, 标题: {assignment.title}, "
                      f"课程: {course_name}, 教师: {teacher_name} (ID: {assignment.teacher_id})")
        
        # 检查提交的作业材料
        print("\n📄 学生提交的作业:")
        submissions = Material.query.filter(Material.assignment_id.isnot(None)).all()
        if not submissions:
            print("  ❌ 没有找到学生提交的作业")
            print("\n  💡 提示: 学生需要先提交作业才能使用AI批改功能")
        else:
            for submission in submissions:
                assignment = Assignment.query.get(submission.assignment_id)
                student = User.query.get(submission.uploaded_by)
                assignment_title = assignment.title if assignment else "未知作业"
                student_name = f"{student.first_name} {student.last_name}" if student else "未知"
                print(f"  ✓ Material ID: {submission.id}, 文件名: {submission.original_name}")
                print(f"    作业: {assignment_title} (ID: {submission.assignment_id})")
                print(f"    学生: {student_name} (ID: {submission.uploaded_by})")
                print(f"    存储名: {submission.stored_name}")
                if assignment:
                    print(f"    作业教师ID: {assignment.teacher_id}")
                print()
        
        print("\n" + "=" * 60)
        print("数据检查完成")
        print("=" * 60)
        
        # 提供建议
        print("\n💡 使用AI批改的步骤:")
        if not admins:
            print("  1. ❌ 需要创建至少一个管理员账户")
        else:
            print(f"  1. ✓ 使用管理员账户登录 (如 ID: {admins[0].id})")
        
        if not assignments:
            print("  2. ❌ 需要创建至少一个作业")
        else:
            print(f"  2. ✓ 选择作业 (如 ID: {assignments[0].id})")
        
        if not submissions:
            print("  3. ❌ 需要学生提交作业")
            print("     学生需要上传作业文件(PDF/DOCX)并关联到作业")
        else:
            print(f"  3. ✓ 选择学生提交 (如 Material ID: {submissions[0].id})")
            print("  4. ✓ 点击 '🤖 AI Auto-Grade' 按钮")
        
        print()

if __name__ == "__main__":
    check_grading_data()

