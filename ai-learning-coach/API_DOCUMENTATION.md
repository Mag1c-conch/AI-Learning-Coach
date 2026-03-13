# AI Learning Coach - API 文档

## 概述

该项目已集成 **Flasgger**，可自动生成交互式 API 文档（Swagger UI）。

## 快速开始

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

Flasgger 已添加到 `requirements.txt` 中。

### 2. 运行后端服务

```bash
python wsgi.py
```

或使用 gunicorn：

```bash
gunicorn --bind 0.0.0.0:5001 --workers 4 wsgi:app
```

### 3. 访问 API 文档

打开浏览器访问：

**Swagger UI**: `http://localhost:5001/apidocs`

**API Spec (JSON)**: `http://localhost:5001/apispec_1.json`

## 功能

### 已文档化的 API 端点 (40+)

#### 认证 (Authentication)
- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录
- `GET /auth/me` - 获取当前用户信息

#### 课程 (Courses)
- `GET /courses` - 列表所有课程
- `POST /courses` - 创建课程 (仅管理员)
- `GET /courses/<course_id>` - 获取课程详情
- `POST /courses/<course_id>/enroll` - 学生注册课程
- `GET /courses/<course_id>/students` - 获取课程学生列表

#### 作业 (Assignments)
- `GET /assignments` - 列表作业
- `POST /assignments` - 创建作业
- `POST /assignments/<assignment_id>/grades` - 创建/更新评分
- `GET /assignments/<assignment_id>/grades` - 获取作业评分

#### AI 助手 (AI Assistant) ⭐
- `POST /assistant/chat` - 多轮对话
- `POST /assistant/grade_submission` - AI 自动评分学生作业
- `GET /assistant/conversations` - 列表对话
- `GET /assistant/conversations/<conversation_id>` - 获取对话详情
- `DELETE /assistant/conversations/<conversation_id>` - 删除对话

#### 材料 (Materials)
- `GET /materials` - 列表学习材料
- `POST /materials` - 上传材料 (仅管理员)
- `GET /materials/<material_id>/download` - 下载材料

#### 反馈 (Feedback)
- `POST /feedback` - 创建反馈
- `GET /feedback` - 列表反馈
- `PATCH /feedback/<feedback_id>/read` - 标记反馈已读
- `DELETE /feedback/<feedback_id>` - 删除反馈

#### 进度 (Progress)
- `GET /progress/study/<student_id>/<course_id>` - 获取学生学习进度

## Swagger UI 特性

### 在浏览器中测试 API

1. 打开 `http://localhost:5001/apidocs`
2. 选择一个端点，点击 **Try it out**
3. 填写参数
4. 点击 **Execute** 发送请求
5. 查看响应结果和 HTTP 状态码

### JWT 认证

对于需要 JWT 认证的端点：

1. 先调用 `POST /auth/login` 获取 token
2. 点击右上角的 **Authorize** 按钮
3. 输入: `Bearer <your_token_here>`
4. 点击 **Authorize** 确认

### 导出文档

- **OpenAPI 3.0 格式**: 直接通过 `/apispec_1.json` 访问
- **可用于**: Postman, Insomnia, ReDoc 等工具

## Docker 运行

### 构建并运行容器

```bash
docker-compose up -d
```

API 文档地址 (通过 Nginx 代理):
- `http://localhost:5001/apidocs` (直接访问后端)
- `http://localhost:3000/apidocs` (通过前端 Nginx)

## 文档规范

### 每个端点的文档包含：

- ✅ 清晰的端点描述
- ✅ 请求参数说明
- ✅ 响应 Schema
- ✅ HTTP 状态码
- ✅ 错误处理说明
- ✅ 安全/认证要求

### 示例

```python
@bp.route("/assignments", methods=["GET"])
def list_assignments():
    """
    List assignments (optionally filter by course)
    ---
    tags:
      - Assignments
    parameters:
      - name: course_id
        in: query
        type: integer
        description: Filter by course ID
    responses:
      200:
        description: List of assignments
      404:
        description: Course not found
    """
    # Implementation...
```

## 常见问题

### Q: 文档在哪里？
A: 访问 `http://localhost:5001/apidocs`

### Q: 如何获取 JWT token？
A: 调用 `POST /auth/login` 端点，获取 token

### Q: 如何测试需要认证的端点？
A: 在 Swagger UI 中点击 **Authorize** 输入 token

### Q: API 文档是实时生成的吗？
A: 是的，Flasgger 会自动扫描代码中的文档注释

## 相关文件

- `backend/app/__init__.py` - Flasgger 初始化
- `backend/app/routes/` - 所有带文档的路由文件
- `backend/requirements.txt` - 依赖配置

