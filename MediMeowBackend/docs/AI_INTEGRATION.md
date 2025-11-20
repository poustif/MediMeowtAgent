# 后端对接 AI 服务 - 接口文档

## 📄 文档说明

本文档面向 **AI 开发人员**，说明后端如何调用 AI 分析服务，以及 AI 服务需要提供的接口规范。

---

## 一、对接方式

### 1.1 通信协议

- **推荐方式**：HTTP REST API（JSON 格式）
- **备选方案**：gRPC（Protobuf 格式）
- **部署方式**：AI 服务独立部署，后端通过网络请求调用

### 1.2 服务地址配置

后端通过环境变量配置 AI 服务地址：

```env
# .env 文件
AI_SERVICE_URL=http://ai-service:8080
AI_SERVICE_TIMEOUT=30  # 超时时间（秒）
```

---

## 二、接口规范

### 2.1 问卷分析接口

**接口路径**：`POST /api/analyze/questionnaire`

**功能说明**：分析用户提交的问卷数据，识别症状、判断科室是否正确，生成病情摘要。

#### 请求参数

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `patient_text_data` | string | 是 | 问卷文本数据（JSON 字符串格式） |
| `image_base64` | array[string] | 否 | 医疗影像图片的 Base64 编码数组 |
| `department_id` | string | 是 | 用户选择的科室 ID |
| `stream` | boolean | 否 | 是否启用流式返回（默认 false） |

**请求示例（同步模式）**：

```json
{
  "patient_text_data": "{\"q1\": \"咳嗽\", \"q2\": [\"乏力\", \"头晕\"], \"q3\": \"持续咳嗽3天，伴有轻微发热\", \"q4\": \"37.5°C\", \"q5\": \"无\"}",
  "image_base64": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA...",
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."
  ],
  "department_id": "235d53df-c576-11f0-908d-e60600f07cad",
  "stream": false
}
```

#### 响应格式（同步模式）

**成功响应（HTTP 200）**：

```json
{
  "status": "SUCCESS",
  "is_department": true,
  "key_info": {
    "chief_complaint": "咳嗽伴轻微发热",
    "key_symptoms": "持续咳嗽3天，伴有乏力、头晕、体温37.5°C",
    "image_summary": "舌苔略厚，舌质红",
    "important_notes": "建议检查肺部，排除感染"
  },
  "structured_report": "# 病情摘要\n\n## 主诉\n咳嗽伴轻微发热...",
  "timestamp": "2025-11-21T10:30:00Z"
}
```

**失败响应（HTTP 500）**：

```json
{
  "status": "INTERNAL_ERROR",
  "error_message": "AI 模型加载失败",
  "timestamp": "2025-11-21T10:30:00Z"
}
```

#### 响应字段说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `status` | string | 是 | 状态码：`SUCCESS`、`SERVICE_UNAVAILABLE`、`INTERNAL_ERROR` |
| `is_department` | boolean | 否 | 判断用户选择的科室是否正确（仅 SUCCESS 时返回） |
| `key_info` | object | 否 | 关键信息结构化数据（仅 SUCCESS 时返回） |
| `key_info.chief_complaint` | string | 是 | 主诉概括（20字以内） |
| `key_info.key_symptoms` | string | 是 | 关键症状列表 |
| `key_info.image_summary` | string | 否 | 图片分析摘要（如果提供了图片） |
| `key_info.important_notes` | string | 是 | 医生需要注意的重要信息 |
| `structured_report` | string | 否 | 完整的结构化病历报告（Markdown 格式） |
| `error_message` | string | 否 | 错误信息（仅失败时返回） |
| `timestamp` | string | 是 | 响应时间戳（ISO 8601 格式） |

#### 响应格式（流式模式）

**请求示例（流式模式）**：

```json
{
  "patient_text_data": "{\"q1\": \"咳嗽\", ...}",
  "image_base64": ["data:image/jpeg;base64,..."],
  "department_id": "235d53df-c576-11f0-908d-e60600f07cad",
  "stream": true
}
```

**流式响应**：

```
# 病情摘要

## 主诉
咳嗽伴轻微发热

## 症状详情
[STREAM_END]
```

- 数据以文本块（chunk）形式连续返回
- 最后发送 `[STREAM_END]` 标记表示流结束
- Content-Type: `text/event-stream` 或 `application/x-ndjson`

---

### 2.2 图片分析接口（独立调用）

**接口路径**：`POST /api/analyze/image`

**功能说明**：独立分析医疗影像图片，返回图片内容描述。

#### 请求参数

```json
{
  "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA...",
  "image_type": "tongue"
}
```

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `image_base64` | string | 是 | 图片的 Base64 编码 |
| `image_type` | string | 否 | 图片类型：`tongue`（舌苔）、`skin`（皮肤）、`xray`（X光）等 |

#### 响应格式

```json
{
  "status": "SUCCESS",
  "image_summary": "舌苔略厚，舌质红，边缘有齿痕",
  "confidence": 0.92,
  "timestamp": "2025-11-21T10:30:00Z"
}
```

---

## 三、后端调用示例

### 3.1 同步调用（Python 示例）

```python
import httpx
import json
from typing import Optional, List

class AIServiceClient:
    def __init__(self, base_url: str, timeout: int = 30):
        self.base_url = base_url
        self.timeout = timeout
    
    async def analyze_questionnaire(
        self,
        patient_text_data: dict,
        image_base64_list: Optional[List[str]] = None,
        department_id: str = None,
        stream: bool = False
    ) -> dict:
        """
        调用 AI 服务分析问卷
        
        Args:
            patient_text_data: 问卷答案字典
            image_base64_list: 图片 Base64 列表
            department_id: 科室 ID
            stream: 是否流式返回
        
        Returns:
            AI 分析结果
        """
        url = f"{self.base_url}/api/analyze/questionnaire"
        
        payload = {
            "patient_text_data": json.dumps(patient_text_data, ensure_ascii=False),
            "image_base64": image_base64_list or [],
            "department_id": department_id,
            "stream": stream
        }
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, json=payload)
            
            if response.status_code != 200:
                raise Exception(f"AI 服务调用失败: HTTP {response.status_code}")
            
            result = response.json()
            
            if result.get("status") != "SUCCESS":
                raise Exception(f"AI 分析失败: {result.get('error_message', '未知错误')}")
            
            return result

# 使用示例
ai_client = AIServiceClient(base_url="http://ai-service:8080")

result = await ai_client.analyze_questionnaire(
    patient_text_data={
        "q1": "咳嗽",
        "q2": ["乏力", "头晕"],
        "q3": "持续咳嗽3天，伴有轻微发热"
    },
    image_base64_list=["data:image/jpeg;base64,..."],
    department_id="235d53df-c576-11f0-908d-e60600f07cad"
)

print(result["key_info"]["chief_complaint"])
```

### 3.2 流式调用（Python 示例）

```python
async def analyze_questionnaire_stream(
    self,
    patient_text_data: dict,
    image_base64_list: Optional[List[str]] = None,
    department_id: str = None
):
    """流式调用 AI 服务"""
    url = f"{self.base_url}/api/analyze/questionnaire"
    
    payload = {
        "patient_text_data": json.dumps(patient_text_data, ensure_ascii=False),
        "image_base64": image_base64_list or [],
        "department_id": department_id,
        "stream": True
    }
    
    async with httpx.AsyncClient(timeout=self.timeout) as client:
        async with client.stream("POST", url, json=payload) as response:
            async for chunk in response.aiter_text():
                if chunk == "[STREAM_END]":
                    break
                
                # 逐块处理返回数据
                yield chunk

# 使用示例
async for chunk in ai_client.analyze_questionnaire_stream(
    patient_text_data={"q1": "咳嗽", ...},
    image_base64_list=["data:image/jpeg;base64,..."],
    department_id="235d53df-c576-11f0-908d-e60600f07cad"
):
    print(chunk, end="", flush=True)
```

---

## 四、错误处理

### 4.1 状态码说明

| 状态码 | 说明 | 处理建议 |
|--------|------|----------|
| `SUCCESS` | 分析成功 | 正常处理返回数据 |
| `SERVICE_UNAVAILABLE` | AI 服务不可用 | 提示用户稍后重试，记录日志 |
| `INTERNAL_ERROR` | 内部错误 | 提示用户联系管理员，记录错误详情 |
| `INVALID_INPUT` | 输入参数错误 | 检查请求参数格式 |
| `TIMEOUT` | 请求超时 | 增加超时时间或提示用户重试 |

### 4.2 后端错误处理示例

```python
try:
    result = await ai_client.analyze_questionnaire(...)
    
    if result["status"] == "SUCCESS":
        # 保存分析结果到数据库
        submission.ai_result = result["key_info"]
        submission.structured_report = result["structured_report"]
        db.commit()
    else:
        # 记录错误但不阻塞提交
        logger.error(f"AI 分析失败: {result.get('error_message')}")
        submission.ai_result = None
        db.commit()

except httpx.TimeoutException:
    logger.error("AI 服务超时")
    submission.ai_result = None
    db.commit()

except Exception as e:
    logger.error(f"调用 AI 服务异常: {str(e)}")
    submission.ai_result = None
    db.commit()
```

---

## 五、性能要求

### 5.1 响应时间

| 场景 | 目标响应时间 | 最大响应时间 |
|------|--------------|--------------|
| 纯文本分析 | < 3秒 | < 10秒 |
| 文本 + 单张图片 | < 5秒 | < 15秒 |
| 文本 + 多张图片 | < 8秒 | < 20秒 |
| 流式返回（首包） | < 1秒 | < 3秒 |

### 5.2 并发能力

- 支持至少 **10 QPS**（每秒查询数）
- 支持至少 **50 并发连接**

### 5.3 可用性要求

- 服务可用性 > 99%
- 支持健康检查接口：`GET /health`

---

## 六、测试数据

### 6.1 测试用例 1：正常病例

**请求**：

```json
{
  "patient_text_data": "{\"q1\": \"咳嗽\", \"q2\": [\"乏力\"], \"q3\": \"持续3天\"}",
  "image_base64": [],
  "department_id": "内科",
  "stream": false
}
```

**期望响应**：

```json
{
  "status": "SUCCESS",
  "is_department": true,
  "key_info": {
    "chief_complaint": "咳嗽",
    "key_symptoms": "持续咳嗽3天，伴有乏力",
    "important_notes": "建议检查肺部"
  }
}
```

### 6.2 测试用例 2：科室不匹配

**请求**：

```json
{
  "patient_text_data": "{\"q1\": \"皮疹\", \"q2\": [\"瘙痒\"], \"q3\": \"全身红疹\"}",
  "department_id": "内科",
  "stream": false
}
```

**期望响应**：

```json
{
  "status": "SUCCESS",
  "is_department": false,
  "key_info": {
    "chief_complaint": "全身皮疹伴瘙痒",
    "key_symptoms": "全身红疹，瘙痒",
    "important_notes": "建议转诊至皮肤科"
  }
}
```

---

## 七、部署建议

### 7.1 Docker 部署

AI 服务建议使用 Docker 容器部署，并暴露 HTTP 端口：

```yaml
# docker-compose.yml
services:
  ai-service:
    image: medimoew/ai-service:latest
    ports:
      - "8080:8080"
    environment:
      - MODEL_PATH=/models
      - LOG_LEVEL=INFO
    volumes:
      - ./models:/models
    restart: unless-stopped
```

### 7.2 健康检查

AI 服务需要提供健康检查接口：

```
GET /health
```

**响应示例**：

```json
{
  "status": "healthy",
  "model_loaded": true,
  "version": "1.0.0",
  "uptime": 3600
}
```

---

## 八、联调流程

1. **AI 开发人员**：
   - 按照本文档实现 `/api/analyze/questionnaire` 接口
   - 提供测试环境地址和健康检查接口
   - 准备测试用例数据

2. **后端开发人员**：
   - 配置 AI 服务地址到 `.env` 文件
   - 实现 `AIServiceClient` 调用逻辑
   - 使用测试用例验证接口对接

3. **联调测试**：
   - 测试正常病例分析
   - 测试科室判断逻辑
   - 测试图片分析功能
   - 测试错误处理和超时场景
   - 测试流式返回功能

4. **性能测试**：
   - 压测接口响应时间
   - 验证并发能力
   - 监控资源使用情况

---

## 九、常见问题

### Q1: 如果 AI 服务不可用，后端如何处理？

**A**: 后端应该允许问卷提交成功，将 `ai_result` 设置为 `null`，记录错误日志。AI 服务恢复后可以异步重新分析。

### Q2: 图片 Base64 编码有大小限制吗？

**A**: 建议单张图片不超过 **5MB**，总大小不超过 **10MB**。超过限制应返回 `INVALID_INPUT` 错误。

### Q3: 流式返回如何判断结束？

**A**: 流式返回以 `[STREAM_END]` 字符串作为结束标记。接收方应该监听此标记并关闭连接。

### Q4: AI 服务超时如何处理？

**A**: 后端设置合理的超时时间（推荐 30 秒），超时后捕获异常，允许问卷提交但不保存 AI 结果。

---

## 十、变更记录

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| 1.0.0 | 2025-11-21 | 初始版本 | 后端团队 |

---

## 十一、新手教程：从零开始对接 AI 服务

### 📌 教程目标

教会完全不懂后端对接的开发人员，一步步完成 AI 服务集成。

---

### 步骤 1：理解整体架构

```
用户提交问卷
    ↓
后端接收数据 (FastAPI)
    ↓
调用 AI 服务 (HTTP 请求)
    ↓
AI 返回分析结果
    ↓
保存到数据库
    ↓
返回给用户
```

**你需要做的**：实现"调用 AI 服务"这一步。

---

### 步骤 2：确认需要修改的文件

只需要修改 **3 个文件**：

1. `.env` - 配置 AI 服务地址
2. `config.py` - 读取配置
3. `app/services/ai_service.py` - 实现 AI 调用逻辑

---

### 步骤 3：修改 `.env` 文件（配置 AI 服务地址）

**位置**：项目根目录下的 `.env` 文件

**操作**：打开 `.env` 文件，在最后添加以下两行：

```env
# AI 服务配置（新增这两行）
AI_SERVICE_URL=http://localhost:8080
AI_SERVICE_TIMEOUT=30
```

**说明**：
- `AI_SERVICE_URL`：AI 服务的地址
  - 本地开发：`http://localhost:8080`
  - Docker 内部：`http://ai-service:8080`
  - 远程服务器：`http://192.168.1.100:8080`（替换为实际 IP）
- `AI_SERVICE_TIMEOUT`：超时时间（秒），超过这个时间没响应就放弃

---

### 步骤 4：修改 `config.py`（让代码能读取配置）

**位置**：项目根目录下的 `config.py` 文件

**操作**：找到 `Settings` 类，在里面添加两个配置项：

```python
class Settings(BaseSettings):
    # ...existing code...（已有的配置，不要动）
    
    # ====== 新增：AI 服务配置 ======
    AI_SERVICE_URL: str = "http://localhost:8080"  # AI 服务地址
    AI_SERVICE_TIMEOUT: int = 30  # 超时时间（秒）
    
    class Config:
        env_file = ".env"
```

**完整示例**（如果不确定在哪里加，参考这个）：

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # 数据库配置
    DATABASE_URL: str
    
    # JWT 配置
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # 文件上传配置
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 10485760
    
    # CORS 配置
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    
    # ====== 新增：AI 服务配置 ======
    AI_SERVICE_URL: str = "http://localhost:8080"
    AI_SERVICE_TIMEOUT: int = 30
    
    class Config:
        env_file = ".env"

settings = Settings()
```

---

### 步骤 5：安装 HTTP 客户端库

**操作**：在终端运行以下命令：

```bash
pip install httpx
```

**说明**：`httpx` 是一个 HTTP 客户端库，用于发送网络请求（类似浏览器访问网页）。

**更新 requirements.txt**：

打开 `requirements.txt` 文件，添加一行：

```
httpx==0.25.0
```

---

### 步骤 6：完整替换 `ai_service.py` 文件

**位置**：`app/services/ai_service.py`

**操作**：用以下完整代码替换整个文件内容：

```python
"""
AI 服务模块

此模块用于与 AI 服务进行交互，分析问卷数据并返回分析结果。

主要功能：
1. 调用 AI 服务分析问卷
2. 处理图片上传和 Base64 编码
3. 错误处理和超时处理
"""

from typing import Dict, Any, List, Optional
import json
import httpx
import os
import base64
from sqlalchemy.orm import Session
from config import settings


class AIService:
    """
    AI 服务类
    
    这个类负责与 AI 服务通信，发送问卷数据，接收分析结果。
    """
    
    @staticmethod
    async def analyze_questionnaire(
        questionnaire_data: Dict[str, Any],
        file_ids: Optional[List[str]] = None,
        department_id: Optional[str] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        分析问卷数据（调用真实 AI 服务）
        
        这是核心方法，负责：
        1. 准备数据（包括图片）
        2. 发送 HTTP 请求到 AI 服务
        3. 接收和解析 AI 返回的结果
        4. 处理错误和超时
        
        参数说明：
            questionnaire_data: 问卷答案，格式如 {"q1": "咳嗽", "q2": ["乏力"]}
            file_ids: 用户上传的图片 ID 列表，如 ["uuid-1", "uuid-2"]
            department_id: 用户选择的科室 ID
            db: 数据库会话（用于读取图片文件）
            
        返回值：
            AI 分析结果，格式如：
            {
                "status": "SUCCESS",
                "is_department": true,
                "key_info": {
                    "chief_complaint": "咳嗽",
                    "key_symptoms": "持续咳嗽3天，伴有乏力",
                    "image_summary": "舌苔略厚",
                    "important_notes": "建议检查肺部"
                }
            }
        """
        
        print(f"[AI 服务] 开始分析问卷，科室ID: {department_id}")
        
        # ===== 第 1 步：加载图片（如果有） =====
        image_base64_list = []
        if file_ids and db:
            print(f"[AI 服务] 需要加载 {len(file_ids)} 张图片")
            image_base64_list = await AIService._load_images_as_base64(file_ids, db)
            print(f"[AI 服务] 成功加载 {len(image_base64_list)} 张图片")
        else:
            print("[AI 服务] 无图片需要加载")
        
        # ===== 第 2 步：构造请求数据 =====
        # 将问卷数据转为 JSON 字符串
        patient_text = json.dumps(questionnaire_data, ensure_ascii=False)
        
        # 构造完整的请求体
        payload = {
            "patient_text_data": patient_text,  # 问卷文本数据
            "image_base64": image_base64_list,  # 图片数组（Base64 格式）
            "department_id": department_id,     # 科室 ID
            "stream": False                     # 不使用流式返回（简单模式）
        }
        
        print(f"[AI 服务] 请求数据准备完成，图片数量: {len(image_base64_list)}")
        
        # ===== 第 3 步：调用 AI 服务 =====
        try:
            # 创建 HTTP 客户端，设置超时时间
            timeout = httpx.Timeout(settings.AI_SERVICE_TIMEOUT)
            
            async with httpx.AsyncClient(timeout=timeout) as client:
                print(f"[AI 服务] 正在调用 AI 服务: {settings.AI_SERVICE_URL}")
                
                # 发送 POST 请求
                response = await client.post(
                    f"{settings.AI_SERVICE_URL}/api/analyze/questionnaire",
                    json=payload  # 自动将 dict 转为 JSON 并设置 Content-Type
                )
                
                # 检查 HTTP 状态码
                if response.status_code != 200:
                    error_msg = f"AI 服务返回错误状态码: {response.status_code}"
                    print(f"[AI 服务] ❌ {error_msg}")
                    print(f"[AI 服务] 响应内容: {response.text[:200]}")
                    raise Exception(error_msg)
                
                # 解析 JSON 响应
                result = response.json()
                print(f"[AI 服务] ✅ 收到响应，状态: {result.get('status')}")
                
                # 检查业务状态码
                if result.get("status") != "SUCCESS":
                    error_msg = result.get('error_message', '未知错误')
                    print(f"[AI 服务] ❌ AI 分析失败: {error_msg}")
                    raise Exception(f"AI 分析失败: {error_msg}")
                
                # 成功！返回结果
                print("[AI 服务] ✅ AI 分析成功")
                return result
        
        # ===== 第 4 步：错误处理 =====
        except httpx.TimeoutException:
            # 超时错误：AI 服务响应太慢
            print(f"[AI 服务] ⏱️ 超时（超过 {settings.AI_SERVICE_TIMEOUT} 秒）")
            return AIService._get_default_result("AI 服务响应超时，请稍后重试")
        
        except httpx.ConnectError:
            # 连接错误：AI 服务可能没启动
            print("[AI 服务] ❌ 连接失败，AI 服务可能未启动")
            return AIService._get_default_result("无法连接到 AI 服务，请联系管理员")
        
        except Exception as e:
            # 其他错误：打印详细信息
            print(f"[AI 服务] ❌ 调用失败: {str(e)}")
            import traceback
            traceback.print_exc()
            return AIService._get_default_result("AI 分析暂时不可用，请稍后重试")
    
    @staticmethod
    async def _load_images_as_base64(file_ids: List[str], db: Session) -> List[str]:
        """
        从数据库加载图片文件，并转换为 Base64 编码
        
        为什么需要 Base64？
        - 图片是二进制数据，不能直接放在 JSON 里传输
        - Base64 是一种编码方式，可以把二进制转成文本
        - AI 服务接收 Base64 字符串后，再解码回图片
        
        参数：
            file_ids: 图片 ID 列表，如 ["uuid-1", "uuid-2"]
            db: 数据库会话
        
        返回：
            Base64 字符串列表，格式如：
            ["data:image/jpeg;base64,/9j/4AAQ...", "data:image/png;base64,iVBOR..."]
        """
        from app.models.questionnaire import UploadedFile
        
        image_base64_list = []
        
        # 遍历每个文件 ID
        for file_id in file_ids:
            try:
                # 从数据库查询文件记录
                uploaded_file = db.query(UploadedFile).filter(
                    UploadedFile.id == file_id
                ).first()
                
                # 检查文件是否存在
                if not uploaded_file:
                    print(f"[图片加载] ⚠️ 文件记录不存在: {file_id}")
                    continue
                
                # 检查文件路径是否存在
                if not os.path.exists(uploaded_file.file_path):
                    print(f"[图片加载] ⚠️ 文件路径不存在: {uploaded_file.file_path}")
                    continue
                
                # 读取文件内容（二进制模式）
                with open(uploaded_file.file_path, "rb") as f:
                    image_data = f.read()
                
                # 转换为 Base64 字符串
                base64_str = base64.b64encode(image_data).decode('utf-8')
                
                # 获取文件类型（如 image/jpeg）
                mime_type = uploaded_file.content_type or "image/jpeg"
                
                # 拼接成 Data URI 格式（浏览器和 AI 都能识别的格式）
                # 格式：data:image/jpeg;base64,<base64字符串>
                data_uri = f"data:{mime_type};base64,{base64_str}"
                
                image_base64_list.append(data_uri)
                print(f"[图片加载] ✅ 成功加载图片: {file_id} ({len(base64_str)} 字符)")
            
            except Exception as e:
                # 单个图片加载失败，不影响其他图片
                print(f"[图片加载] ❌ 加载失败 {file_id}: {str(e)}")
                continue
        
        return image_base64_list
    
    @staticmethod
    def _get_default_result(message: str) -> Dict[str, Any]:
        """
        返回默认结果（当 AI 服务不可用时）
        
        为什么需要默认结果？
        - AI 服务可能会挂掉、超时、或者返回错误
        - 不能因为 AI 失败就让整个问卷提交失败
        - 返回一个安全的默认结果，让用户至少能提交成功
        
        参数：
            message: 错误提示信息
        
        返回：
            默认的分析结果
        """
        return {
            "status": "ERROR",           # 标记为错误状态
            "is_department": True,       # 假设科室正确（保守策略）
            "key_info": {
                "chief_complaint": message,        # 用错误信息作为主诉
                "key_symptoms": "暂无分析",         # 症状为空
                "image_summary": "",               # 图片分析为空
                "important_notes": "AI 服务暂时不可用，请稍后重试或联系管理员"
            }
        }
    
    @staticmethod
    async def analyze_medical_image(
        file_path: str,
        image_type: Optional[str] = None
    ) -> str:
        """
        独立分析医学图片（单独调用，不依赖问卷）
        
        用途：
        - 用户单独上传图片时使用
        - 不需要问卷数据，只分析图片
        
        参数：
            file_path: 图片文件路径
            image_type: 图片类型，如 "tongue"（舌苔）、"skin"（皮肤）
        
        返回：
            图片分析结果文本
        """
        try:
            # 读取图片文件
            with open(file_path, "rb") as f:
                image_data = f.read()
            
            # 转为 Base64
            base64_str = base64.b64encode(image_data).decode('utf-8')
            data_uri = f"data:image/jpeg;base64,{base64_str}"
            
            # 构造请求
            payload = {
                "image_base64": data_uri,
                "image_type": image_type or "unknown"
            }
            
            # 调用 AI 图片分析接口
            timeout = httpx.Timeout(settings.AI_SERVICE_TIMEOUT)
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    f"{settings.AI_SERVICE_URL}/api/analyze/image",
                    json=payload
                )
                
                if response.status_code != 200:
                    return "图片分析失败"
                
                result = response.json()
                return result.get("image_summary", "无法分析")
        
        except Exception as e:
            print(f"[图片分析] ❌ 失败: {str(e)}")
            return "图片分析失败"


# ===== 使用示例（仅供参考，不要加到代码里） =====
"""
# 示例 1：分析问卷（无图片）
result = await AIService.analyze_questionnaire(
    questionnaire_data={"q1": "咳嗽", "q2": ["乏力"]},
    department_id="dept-123"
)
print(result["key_info"]["chief_complaint"])

# 示例 2：分析问卷（带图片）
result = await AIService.analyze_questionnaire(
    questionnaire_data={"q1": "皮疹", "q2": ["瘙痒"]},
    file_ids=["file-uuid-1", "file-uuid-2"],
    department_id="dept-456",
    db=db_session
)

# 示例 3：单独分析图片
summary = await AIService.analyze_medical_image(
    file_path="/uploads/image.jpg",
    image_type="tongue"
)
"""
```

---

### 步骤 7：修改调用方代码（让问卷提交时调用 AI）

**位置**：`app/routers/questionnaire.py`

**操作**：找到 `submit_questionnaire` 函数中的 AI 调用部分，修改为：

```python
# 调用AI服务进行分析
try:
    print(f"[问卷提交] 开始调用 AI 分析，submission_id: {submission.id}")
    
    # 调用 AI 服务（新增了 department_id 和 db 参数）
    ai_result = await AIService.analyze_questionnaire(
        questionnaire_data=answers,          # 问卷答案
        file_ids=file_id,                    # 图片 ID 列表
        department_id=department_id,         # 科室 ID（新增）
        db=db                                # 数据库会话（新增）
    )
    
    print(f"[问卷提交] AI 分析完成，状态: {ai_result.get('status')}")
    
    # 更新问卷提交记录的AI结果
    submission.ai_result = ai_result.get("key_info", {})
    submission.status = "completed"
    db.commit()
    
    print(f"[问卷提交] ✅ 提交成功，record_id: {medical_record.id}")
    
except Exception as e:
    print(f"[问卷提交] ⚠️ AI 分析失败，但允许提交: {str(e)}")
    # 即使AI分析失败，也不影响提交
    submission.ai_result = None
    submission.status = "completed"
    db.commit()
```

---

### 步骤 8：测试 AI 服务对接

#### 测试 1：检查 AI 服务是否启动

```bash
curl http://localhost:8080/health
```

**期望结果**：

```json
{
  "status": "healthy",
  "model_loaded": true
}
```

**如果失败**：说明 AI 服务没启动，联系 AI 开发人员。

#### 测试 2：直接测试 AI 接口

```bash
curl -X POST http://localhost:8080/api/analyze/questionnaire \
  -H "Content-Type: application/json" \
  -d '{
    "patient_text_data": "{\"q1\": \"咳嗽\", \"q2\": [\"乏力\", \"头晕\"]}",
    "image_base64": [],
    "department_id": "test-dept-id",
    "stream": false
  }'
```

**期望结果**：

```json
{
  "status": "SUCCESS",
  "is_department": true,
  "key_info": {
    "chief_complaint": "咳嗽",
    "key_symptoms": "咳嗽，伴有乏力、头晕",
    "important_notes": "建议检查肺部"
  }
}
```

**如果失败**：检查 AI 服务是否正常工作。

#### 测试 3：通过后端提交问卷测试

1. 启动后端服务：`python run.py`
2. 使用 Postman 或 curl 提交问卷：

```bash
curl -X POST "http://localhost:8000/questionnaires/submit" \
  -H "Authorization: Bearer <你的token>" \
  -H "Content-Type: application/json" \
  -d '{
    "questionnaire_id": "问卷ID",
    "department_id": "科室ID",
    "answers": {
      "q1": "咳嗽",
      "q2": ["乏力", "头晕"]
    }
  }'
```

3. 查看后端日志，应该看到类似输出：

```
[AI 服务] 开始分析问卷，科室ID: xxx
[AI 服务] 无图片需要加载
[AI 服务] 请求数据准备完成，图片数量: 0
[AI 服务] 正在调用 AI 服务: http://localhost:8080
[AI 服务] ✅ 收到响应，状态: SUCCESS
[AI 服务] ✅ AI 分析成功
[问卷提交] AI 分析完成，状态: SUCCESS
[问卷提交] ✅ 提交成功，record_id: xxx
```

---

### 步骤 9：常见错误排查

#### 错误 1：`ModuleNotFoundError: No module named 'httpx'`

**原因**：没有安装 httpx 库

**解决**：

```bash
pip install httpx
```

#### 错误 2：`Connection refused` 或 `Connection error`

**原因**：AI 服务没有启动，或地址配置错误

**解决**：
1. 检查 AI 服务是否启动：`curl http://localhost:8080/health`
2. 检查 `.env` 中的 `AI_SERVICE_URL` 是否正确
3. 如果 AI 服务在另一台机器上，确认网络是否通畅

#### 错误 3：`Timeout` 超时

**原因**：AI 服务响应太慢

**解决**：
1. 检查 AI 服务的日志，看是否有错误
2. 增加超时时间：`.env` 中修改 `AI_SERVICE_TIMEOUT=60`
3. 联系 AI 开发人员优化性能

#### 错误 4：`AttributeError: 'Settings' object has no attribute 'AI_SERVICE_URL'`

**原因**：`config.py` 没有添加 AI 配置

**解决**：检查 `config.py` 的 `Settings` 类，确保添加了：

```python
AI_SERVICE_URL: str = "http://localhost:8080"
AI_SERVICE_TIMEOUT: int = 30
```

#### 错误 5：图片加载失败

**原因**：图片文件不存在，或权限不足

**解决**：
1. 检查 `uploads/` 目录是否存在
2. 检查文件权限：`ls -la uploads/`
3. 检查数据库中的 `file_path` 是否正确

---

### 步骤 10：验收清单

完成以下所有项，说明对接成功：

- [ ] `.env` 文件已添加 `AI_SERVICE_URL` 和 `AI_SERVICE_TIMEOUT`
- [ ] `config.py` 文件已添加 AI 配置项
- [ ] `requirements.txt` 已添加 `httpx`
- [ ] `ai_service.py` 已完全替换为新代码
- [ ] `questionnaire.py` 的调用处已添加 `department_id` 和 `db` 参数
- [ ] `pip install httpx` 已执行
- [ ] AI 服务健康检查成功（`curl http://localhost:8080/health`）
- [ ] 直接调用 AI 接口测试成功
- [ ] 通过后端提交问卷，日志显示 AI 调用成功
- [ ] 数据库中 `questionnaire_submissions` 表的 `ai_result` 字段有数据

---

### 步骤 11：进阶优化（可选）

#### 优化 1：添加重试机制

如果 AI 服务偶尔不稳定，可以添加重试：

```python
# 在 analyze_questionnaire() 方法中
max_retries = 3
for attempt in range(max_retries):
    try:
        response = await client.post(...)
        break  # 成功就跳出
    except Exception as e:
        if attempt == max_retries - 1:
            raise  # 最后一次还失败，就抛出异常
        print(f"[AI 服务] 重试 {attempt + 1}/{max_retries}")
        await asyncio.sleep(1)  # 等待 1 秒后重试
```

#### 优化 2：异步后台任务

如果 AI 分析很慢，可以改为后台执行：

```python
from fastapi import BackgroundTasks

@router.post("/submit")
async def submit_questionnaire(
    body: QuestionnaireSubmitRequest,
    background_tasks: BackgroundTasks,  # 新增
    ...
):
    # 先保存提交记录
    submission = QuestionnaireSubmission(...)
    db.add(submission)
    db.commit()
    
    # 后台执行 AI 分析
    background_tasks.add_task(
        analyze_in_background,
        submission_id=submission.id,
        questionnaire_data=body.answers,
        file_ids=body.file_id,
        department_id=body.department_id
    )
    
    # 立即返回
    return success_response(data={"record_id": medical_record.id})

async def analyze_in_background(submission_id, questionnaire_data, file_ids, department_id):
    """后台执行 AI 分析"""
    from app.database import SessionLocal
    db = SessionLocal()
    
    try:
        result = await AIService.analyze_questionnaire(
            questionnaire_data=questionnaire_data,
            file_ids=file_ids,
            department_id=department_id,
            db=db
        )
        
        # 更新数据库
        submission = db.query(QuestionnaireSubmission).filter(
            QuestionnaireSubmission.id == submission_id
        ).first()
        
        if submission:
            submission.ai_result = result.get("key_info", {})
            submission.status = "completed"
            db.commit()
    finally:
        db.close()
```

---

### 需要帮助？

如果遇到问题，按照以下步骤排查：

1. **检查日志**：查看后端输出，寻找 `[AI 服务]` 开头的日志
2. **测试 AI 服务**：`curl http://localhost:8080/health`
3. **检查配置**：确认 `.env` 和 `config.py` 的 AI 配置
4. **查看错误信息**：完整复制错误信息，方便定位问题
5. **联系 AI 团队**：如果是 AI 服务本身的问题

---

## 十二、常见问题（原 Q&A 部分）

### Q1: 我需要新写脚本还是在现有脚本里加内容？

**A**: **在现有脚本里加内容**，不需要新写脚本。

具体修改位置：`app/services/ai_service.py`

**现状**：
- 该文件已存在，包含 `AIService` 类
- 当前是 **mock 实现**（返回模拟数据）
- 有 `analyze_questionnaire()` 方法框架

**需要做的**：
1. 在 `analyze_questionnaire()` 方法中，**替换 mock 逻辑为真实的 HTTP 请求**
2. 添加 HTTP 客户端（如 `httpx`）
3. 构造符合 AI 接口规范的请求
4. 解析 AI 返回的真实数据

### Q2: 具体需要在哪些地方修改代码？

**A**: 修改 `app/services/ai_service.py` 文件中的以下部分：

#### 修改位置 1：导入依赖

```python
# 在文件开头添加
import httpx
import os
from config import settings  # 读取 AI 服务地址配置
```

#### 修改位置 2：添加配置

在 `.env` 文件中添加：

```env
AI_SERVICE_URL=http://localhost:8080
AI_SERVICE_TIMEOUT=30
```

在 `config.py` 中添加：

```python
AI_SERVICE_URL: str = "http://localhost:8080"
AI_SERVICE_TIMEOUT: int = 30
```

#### 修改位置 3：替换 `analyze_questionnaire()` 方法

**原代码（mock 实现）**：

```python
@staticmethod
async def analyze_questionnaire(
    questionnaire_data: Dict[str, Any],
    file_ids: List[str] = None
) -> Dict[str, Any]:
    """分析问卷数据 (模拟AI分析)"""
    
    # ... 模拟数据生成 ...
    
    result = {
        "is_department": True,
        "key_info": {
            "chief_complaint": chief_complaint,
            # ...
        }
    }
    return result
```

**新代码（真实 HTTP 调用）**：

```python
@staticmethod
async def analyze_questionnaire(
    questionnaire_data: Dict[str, Any],
    file_ids: List[str] = None,
    department_id: str = None
) -> Dict[str, Any]:
    """分析问卷数据（调用真实 AI 服务）"""
    
    # 构造请求数据
    payload = {
        "patient_text_data": json.dumps(questionnaire_data, ensure_ascii=False),
        "image_base64": [],  # 如果有图片，需要从 file_ids 读取并转 base64
        "department_id": department_id,
        "stream": False
    }
    
    # 调用 AI 服务
    try:
        async with httpx.AsyncClient(timeout=settings.AI_SERVICE_TIMEOUT) as client:
            response = await client.post(
                f"{settings.AI_SERVICE_URL}/api/analyze/questionnaire",
                json=payload
            )
            
            if response.status_code != 200:
                raise Exception(f"AI 服务返回错误: HTTP {response.status_code}")
            
            result = response.json()
            
            if result.get("status") != "SUCCESS":
                raise Exception(f"AI 分析失败: {result.get('error_message')}")
            
            return result
    
    except httpx.TimeoutException:
        # 超时处理：返回默认结果
        return {
            "status": "TIMEOUT",
            "is_department": True,
            "key_info": {
                "chief_complaint": "AI 服务超时，请稍后重试",
                "key_symptoms": "",
                "important_notes": "系统繁忙"
            }
        }
    except Exception as e:
        # 异常处理：记录日志并返回默认结果
        print(f"调用 AI 服务失败: {str(e)}")
        return {
            "status": "ERROR",
            "is_department": True,
            "key_info": {
                "chief_complaint": "AI 分析暂时不可用",
                "key_symptoms": "",
                "important_notes": "请稍后重试"
            }
        }
```

### Q3: 如果 AI 服务需要图片，如何处理 file_ids？

**A**: 需要在 `analyze_questionnaire()` 中添加图片读取和 Base64 编码逻辑：

```python
@staticmethod
async def _load_images_as_base64(file_ids: List[str], db: Session) -> List[str]:
    """从 file_ids 加载图片并转为 base64"""
    from app.models.questionnaire import UploadedFile
    import base64
    
    image_base64_list = []
    
    if not file_ids:
        return image_base64_list
    
    for file_id in file_ids:
        uploaded_file = db.query(UploadedFile).filter(
            UploadedFile.id == file_id
        ).first()
        
        if uploaded_file and os.path.exists(uploaded_file.file_path):
            with open(uploaded_file.file_path, "rb") as f:
                image_data = f.read()
                base64_str = base64.b64encode(image_data).decode('utf-8')
                # 添加 data URI 前缀
                mime_type = uploaded_file.content_type or "image/jpeg"
                image_base64_list.append(f"data:{mime_type};base64,{base64_str}")
    
    return image_base64_list
```

然后在 `analyze_questionnaire()` 中调用：

```python
# 如果有图片，需要数据库会话
async def analyze_questionnaire(
    questionnaire_data: Dict[str, Any],
    file_ids: List[str] = None,
    department_id: str = None,
    db: Session = None  # 添加 db 参数
) -> Dict[str, Any]:
    
    # 加载图片
    image_base64_list = await AIService._load_images_as_base64(file_ids, db) if file_ids and db else []
    
    payload = {
        "patient_text_data": json.dumps(questionnaire_data, ensure_ascii=False),
        "image_base64": image_base64_list,  # 使用真实图片数据
        "department_id": department_id,
        "stream": False
    }
    # ... 其余代码
```

### Q4: 调用方（questionnaire.py）需要修改吗？

**A**: 需要**微调**调用方式，添加 `department_id` 和 `db` 参数：

**修改位置**：`app/routers/questionnaire.py` 的 `submit_questionnaire()` 函数

**原代码**：

```python
ai_result = await AIService.analyze_questionnaire(
    questionnaire_data=answers,
    file_ids=file_id
)
```

**新代码**：

```python
ai_result = await AIService.analyze_questionnaire(
    questionnaire_data=answers,
    file_ids=file_id,
    department_id=department_id,  # 添加科室 ID
    db=db  # 传递数据库会话（用于读取图片）
)
```

### Q5: 如何测试 AI 服务对接是否成功？

**A**: 分步骤测试：

#### 步骤 1：测试 AI 服务健康检查

```bash
curl http://localhost:8080/health
```

期望返回：

```json
{
  "status": "healthy",
  "model_loaded": true
}
```

#### 步骤 2：测试问卷分析接口（使用 curl）

```bash
curl -X POST http://localhost:8080/api/analyze/questionnaire \
  -H "Content-Type: application/json" \
  -d '{
    "patient_text_data": "{\"q1\": \"咳嗽\", \"q2\": [\"乏力\"]}",
    "image_base64": [],
    "department_id": "235d53df-c576-11f0-908d-e60600f07cad",
    "stream": false
  }'
```

#### 步骤 3：测试后端集成

在后端添加测试路由：

```python
# 在 app/routers/questionnaire.py 或单独测试文件中
@router.get("/test-ai")
async def test_ai_integration():
    """测试 AI 服务集成"""
    from app.services.ai_service import AIService
    
    test_data = {
        "q1": "咳嗽",
        "q2": ["乏力", "头晕"],
        "q3": "持续3天"
    }
    
    result = await AIService.analyze_questionnaire(
        questionnaire_data=test_data,
        department_id="test-dept-id"
    )
    
    return {"status": "OK", "ai_result": result}
```

访问：`http://localhost:8000/questionnaires/test-ai`

### Q6: AI 服务如果部署在不同机器上，如何配置？

**A**: 修改 `.env` 文件中的 `AI_SERVICE_URL`：

```env
# 本地开发
AI_SERVICE_URL=http://localhost:8080

# Docker 内部通信
AI_SERVICE_URL=http://ai-service:8080

# 远程服务器
AI_SERVICE_URL=http://192.168.1.100:8080
```

### Q7: 需要安装额外的 Python 包吗？

**A**: 需要安装 `httpx`（异步 HTTP 客户端）：

```bash
pip install httpx
```

在 `requirements.txt` 中添加：

```
httpx==0.25.0
```

### Q8: 如果 AI 服务很慢，如何优化？

**A**: 可以使用异步调用 + 超时处理：

```python
# 设置合理的超时时间
AI_SERVICE_TIMEOUT=30  # 30秒超时

# 在代码中处理超时
try:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(...)
except httpx.TimeoutException:
    # 返回默认结果，允许问卷提交成功
    return default_result
```

或者改为**异步后台任务**：

```python
from fastapi import BackgroundTasks

@router.post("/submit")
async def submit_questionnaire(
    background_tasks: BackgroundTasks,
    ...
):
    # 先保存问卷提交记录
    submission = QuestionnaireSubmission(...)
    db.add(submission)
    db.commit()
    
    # 后台调用 AI 分析
    background_tasks.add_task(
        analyze_in_background,
        submission_id=submission.id,
        questionnaire_data=answers
    )
    
    return success_response(data={"record_id": medical_record.id})

async def analyze_in_background(submission_id: str, questionnaire_data: dict):
    """后台执行 AI 分析"""
    result = await AIService.analyze_questionnaire(questionnaire_data)
    # 更新数据库
    # ...
```

### Q9: 完整的修改步骤总结

1. **第一步**：在 `.env` 中添加 AI 服务配置
2. **第二步**：在 `config.py` 中添加配置项
3. **第三步**：在 `requirements.txt` 中添加 `httpx`
4. **第四步**：修改 `app/services/ai_service.py`，替换 mock 逻辑为 HTTP 调用
5. **第五步**：（可选）添加图片加载和 Base64 编码逻辑
6. **第六步**：在 `app/routers/questionnaire.py` 中调整调用方式
7. **第七步**：测试 AI 服务健康检查
8. **第八步**：测试完整的问卷提交流程

---

## 附录：完整的后端集成代码

详见：`app/services/ai_service.py`

### 完整的 `ai_service.py` 实现示例

```python
"""
AI 服务模块

此模块用于与AI服务进行交互，分析问卷数据并返回分析结果
"""
from typing import Dict, Any, List, Optional
import json
import httpx
import os
import base64
from sqlalchemy.orm import Session
from config import settings


class AIService:
    """AI服务类"""
    
    @staticmethod
    async def analyze_questionnaire(
        questionnaire_data: Dict[str, Any],
        file_ids: Optional[List[str]] = None,
        department_id: Optional[str] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        分析问卷数据（调用真实 AI 服务）
        
        Args:
            questionnaire_data: 问卷数据
            file_ids: 上传的文件ID列表
            department_id: 科室ID
            db: 数据库会话（用于读取图片）
            
        Returns:
            AI分析结果
        """
        
        # 加载图片（如果有）
        image_base64_list = []
        if file_ids and db:
            image_base64_list = await AIService._load_images_as_base64(file_ids, db)
        
        # 构造请求数据
        payload = {
            "patient_text_data": json.dumps(questionnaire_data, ensure_ascii=False),
            "image_base64": image_base64_list,
            "department_id": department_id,
            "stream": False
        }
        
        # 调用 AI 服务
        try:
            async with httpx.AsyncClient(timeout=settings.AI_SERVICE_TIMEOUT) as client:
                response = await client.post(
                    f"{settings.AI_SERVICE_URL}/api/analyze/questionnaire",
                    json=payload
                )
                
                if response.status_code != 200:
                    raise Exception(f"AI 服务返回错误: HTTP {response.status_code}")
                
                result = response.json()
                
                if result.get("status") != "SUCCESS":
                    raise Exception(f"AI 分析失败: {result.get('error_message', '未知错误')}")
                
                return result
        
        except httpx.TimeoutException:
            print("AI 服务超时")
            return AIService._get_default_result("AI 服务超时，请稍后重试")
        
        except Exception as e:
            print(f"调用 AI 服务失败: {str(e)}")
            return AIService._get_default_result("AI 分析暂时不可用")
    
    @staticmethod
    async def _load_images_as_base64(file_ids: List[str], db: Session) -> List[str]:
        """从 file_ids 加载图片并转为 base64"""
        from app.models.questionnaire import UploadedFile
        
        image_base64_list = []
        
        for file_id in file_ids:
            uploaded_file = db.query(UploadedFile).filter(
                UploadedFile.id == file_id
            ).first()
            
            if uploaded_file and os.path.exists(uploaded_file.file_path):
                try:
                    with open(uploaded_file.file_path, "rb") as f:
                        image_data = f.read()
                        base64_str = base64.b64encode(image_data).decode('utf-8')
                        mime_type = uploaded_file.content_type or "image/jpeg"
                        image_base64_list.append(f"data:{mime_type};base64,{base64_str}")
                except Exception as e:
                    print(f"读取图片失败 {file_id}: {str(e)}")
        
        return image_base64_list
    
    @staticmethod
    def _get_default_result(message: str) -> Dict[str, Any]:
        """返回默认结果（AI 服务不可用时）"""
        return {
            "status": "ERROR",
            "is_department": True,
            "key_info": {
                "chief_complaint": message,
                "key_symptoms": "",
                "important_notes": "请稍后重试或联系管理员"
            }
        }
    
    @staticmethod
    async def analyze_medical_image(file_path: str) -> str:
        """
        分析医学图片
        
        Args:
            file_path: 图片文件路径
            
        Returns:
            图片分析结果
        """
        # TODO: 实现独立的图片分析接口
        return "图片分析结果示例"
```
