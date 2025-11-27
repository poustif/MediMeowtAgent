# MediMeowtAgent 项目更新日志

## 修复的问题

### 前端问卷显示bug
- **问题描述**：问卷中题型判断错误，导致某些单选题无法正确显示。
- **修复内容**：
  - 在 `QuestionnaireView.vue` 中修复类型判断逻辑，将 'scale' 题型正确归类到 'radio' 类型。
  - 确保单选、多选、文本框、文件上传题型正确渲染。
- **影响**：提升问卷填写体验，避免用户无法提交某些题型。

### 前端问卷提交bug
- **问题描述**：提交问卷时payload结构不完整，后端无法正确处理数据。
- **修复内容**：
  - 在 `QuestionnaireView.vue` 中修复提交逻辑，确保payload包含必需字段：`questionnaire_id`、`department_id`、`answers`、`file_id`。
  - 优化文件ID收集逻辑，支持多文件上传。
- **影响**：确保问卷提交成功，避免数据丢失。

### 前端跳转逻辑bug
- **问题描述**：提交问卷后，未正确跳转到提交详情页。
- **修复内容**：
  - 在 `QuestionnaireView.vue` 中修复跳转逻辑，使用 `router.push` 跳转到 `SubmissionDetail` 页面。
  - 添加错误处理，当后端未返回记录ID时，提供备用跳转。
- **影响**：提升用户体验，确保提交后能查看结果。

### 后端AI服务科室限制
- **问题描述**：AI分析服务未限制支持的科室，导致对不支持科室的问卷进行无效分析。
- **修复内容**：
  - 在 `ai_service.py` 中添加科室限制逻辑，目前支持耳鼻喉科和呼吸科的智能分析。
  - 对于不支持的科室，提供降级策略，返回预定义结果。
- **影响**：提高AI分析准确性，避免无效分析消耗资源。

## 新添加的文件及其功能

### import_questionnaires_from_md.py
- **功能**：从Markdown文件导入问卷到数据库的脚本。
- **支持题型**：单选、多选、文本框。
- **工作流程**：
  - 解析MD文件中的问题设计部分。
  - 提取科室名称、问题列表和选项。
  - 检查科室是否存在，创建或更新问卷版本。
  - 导入成功后输出统计信息。
- **使用方法**：运行 `python import_questionnaires_from_md.py` 自动导入 `docs/questionnaire/` 目录下的所有MD文件。

### alembic/versions/cfff159a1f9e_extend_questionnaire_id_length_to_64.py
- **功能**：数据库迁移脚本，扩展 `questionnaire_id` 字段长度。
- **变更**：将 `questionnaire_submissions` 表的 `questionnaire_id` 字段从 VARCHAR(36) 扩展到 VARCHAR(64)。
- **原因**：适应更长的问卷ID格式，确保数据完整性。

## 所有修改的详细说明

### MediMeowFrontend/src/apps/patient_app/views/QuestionnaireView.vue
- **修改内容**：
  - 修复 `isType` 函数，将 'scale' 归类到 'radio'。
  - 优化校验规则，支持多选和文件题型的必填校验。
  - 重构提交逻辑，正确构造payload结构。
  - 修复跳转逻辑，支持提交后跳转到详情页。
- **影响**：提升问卷页面的稳定性和用户体验。

### MediMeowBackend/app/services/ai_service.py
- **修改内容**：
  - 添加完整的AI分析功能，支持gRPC调用MediMeowAI服务。
  - 实现患者数据构造，包括基本信息、问卷答案和主诉提取。
  - 支持图片上传和Base64编码传递。
  - 添加降级策略，当AI服务不可用时返回模拟结果。
  - 限制支持的科室，避免无效分析。
- **影响**：启用AI智能分析功能，提升医疗诊断辅助能力。

### MediMeowBackend/UPDATE.md
- **修改内容**：
  - 添加AI服务对接实现的详细说明。
  - 描述AI分析流程和错误处理机制。
  - 提供测试流程和注意事项。
- **影响**：为后端AI集成提供文档支持。

## 总结
本次更新主要聚焦于修复前端问卷显示和提交的bug，提升用户体验；完善后端AI服务，添加科室限制和降级策略；新增工具脚本，便于问卷管理和数据迁移；扩展数据库字段，确保系统扩展性。所有修改均经过测试，确保系统稳定性。