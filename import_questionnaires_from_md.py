#!/usr/bin/env python3
"""
从 Markdown 文件导入问卷到数据库
支持多种题型：单选、多选、文本框
"""

import os
import re
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# 导入数据库和模型
sys.path.insert(0, str(project_root / "MediMeowBackend"))
from app.database import SessionLocal
from app.models.questionnaire import Questionnaire
from app.models.department import Department


def parse_questionnaire_from_md(md_file_path):
    """从 Markdown 文件解析问卷数据"""
    with open(md_file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 提取科室名称（从文件名）
    department_name = Path(md_file_path).stem

    questions = []

    # 查找问题设计部分
    ent_section_match = re.search(r'### 问题设计.*?(?=###|$)', content, re.DOTALL)
    if not ent_section_match:
        raise ValueError(f"未找到问题设计部分: {md_file_path}")

    section_content = ent_section_match.group(0)

    # 解析问题
    # 支持格式：
    # 1. **问题标题**：
    #    - A. 选项1
    #    - B. 选项2
    #
    # 2. **问题标题** [文本框]：
    #    - 请描述...
    #
    # 3. **问题标题** [多选]：
    #    - A. 选项1
    #    - B. 选项2

    question_pattern = r'(\d+)\. \*\*(.*?)\*\*(?:\s*\[([^\]]+)\])?[:：]?\s*\n((?:\s*- .*\n)+)'
    matches = re.findall(question_pattern, section_content, re.MULTILINE)

    if not matches:
        # 尝试另一种格式
        question_pattern = r'(\d+)\. \*\*(.*?)\*\*[:：]?\s*\n((?:\s*- .*\n)+)'
        matches = re.findall(question_pattern, section_content, re.MULTILINE)
        # 调整匹配结果格式
        matches = [(m[0], m[1], '', m[2]) for m in matches]

    for match in matches:
        question_num, question_title, question_type_hint, options_text = match

        # 清理问题标题
        question_title = question_title.strip()

        # 确定题型
        if question_type_hint:
            if '文本' in question_type_hint or 'text' in question_type_hint.lower():
                question_type = 'text'
                options = []
            elif '多选' in question_type_hint or 'multi' in question_type_hint.lower():
                question_type = 'multi'
                options = parse_options(options_text)
            else:
                question_type = 'single'
                options = parse_options(options_text)
        else:
            # 默认单选
            question_type = 'single'
            options = parse_options(options_text)

        # 创建问题对象
        question_obj = {
            "id": f"Q{question_num}",
            "question": question_title,
            "type": question_type,
            "required": True,
            "options": options
        }

        if question_type == 'text':
            question_obj["placeholder"] = options_text.strip() if options_text.strip() else "请输入"

        questions.append(question_obj)

    return department_name, questions


def parse_options(options_text):
    """解析选项文本"""
    options = []
    option_lines = options_text.strip().split('\n')

    for line in option_lines:
        line = line.strip()
        if line.startswith('- '):
            option_text = line[2:].strip()
            # 移除箭头部分（如 → 诊断）
            if ' → ' in option_text:
                option_text = option_text.split(' → ')[0].strip()
            # 移除序号前缀（如 A. ）
            if '. ' in option_text:
                option_text = option_text.split('. ', 1)[1].strip()
            options.append(option_text)

    return options


def import_questionnaire_from_md(md_file_path, db_session):
    """从单个 MD 文件导入问卷"""
    try:
        department_name, questions = parse_questionnaire_from_md(md_file_path)

        # 查找科室
        department = db_session.query(Department).filter(
            Department.department_name == department_name,
            Department.deleted_at.is_(None)
        ).first()

        if not department:
            print(f"科室不存在: {department_name}，跳过")
            return False

        # 检查是否已有问卷
        existing_questionnaire = db_session.query(Questionnaire).filter(
            Questionnaire.department_id == department.id,
            Questionnaire.deleted_at.is_(None)
        ).order_by(Questionnaire.version.desc()).first()

        # 确定版本号
        new_version = 1
        if existing_questionnaire:
            new_version = existing_questionnaire.version + 1
            # 将旧版本设为 inactive
            existing_questionnaire.status = 'inactive'

        # 创建新问卷
        new_questionnaire = Questionnaire(
            department_id=department.id,
            title=f"{department_name}问卷",
            description=f"从{department_name}.md导入的问卷",
            questions=questions,
            version=new_version,
            status='active'
        )

        db_session.add(new_questionnaire)
        db_session.commit()
        db_session.refresh(new_questionnaire)

        print(f"问卷导入成功 - {department_name} (ID: {new_questionnaire.id}, 版本: {new_version}, 问题数: {len(questions)})")

        return True

    except Exception as e:
        print(f"导入失败 {md_file_path}: {str(e)}")
        db_session.rollback()
        return False


def main():
    """主函数：导入所有问卷"""
    questionnaire_dir = project_root / "docs" / "questionnaire"

    if not questionnaire_dir.exists():
        print(f"问卷目录不存在: {questionnaire_dir}")
        return

    # 获取所有 .md 文件
    md_files = list(questionnaire_dir.glob("*.md"))
    if not md_files:
        print("未找到任何 .md 文件")
        return

    print(f"找到 {len(md_files)} 个问卷文件")

    db = SessionLocal()
    try:
        success_count = 0
        for md_file in md_files:
            if import_questionnaire_from_md(str(md_file), db):
                success_count += 1

        print(f"\n导入完成: {success_count}/{len(md_files)} 个问卷导入成功")

    except Exception as e:
        print(f"导入过程出错: {str(e)}")
    finally:
        db.close()


if __name__ == "__main__":
    main()