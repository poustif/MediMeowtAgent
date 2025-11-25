<template>
  <div class="questionnaire-import">
    <div class="header">
      <h2>导入问卷</h2>
      <button @click="goBack" class="back-btn">返回医生主页</button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">导入中...</div>

    <!-- 表单区域 -->
    <div v-else class="import-container">
      <!-- 错误提示 -->
      <div v-if="errorMsg" class="error">{{ errorMsg }}</div>

      <div class="form-item">
        <label class="form-label">选择问卷文件（仅支持.xlsx格式）：</label>
        <!-- 美化文件选择区域 -->
        <div class="file-upload-area">
          <input
            type="file"
            accept=".xlsx"
            class="file-input"
            @change="handleFileChange"
          >
          <div class="upload-hint">
            <span class="upload-icon">📤</span>
            <p>点击或拖拽文件至此处上传</p>
            <p class="upload-tip">支持.xlsx格式，单个文件不超过10MB</p>
          </div>
        </div>
        <div v-if="selectedFile" class="file-info">
          <span class="file-name">{{ selectedFile.name }}</span>
          <span class="file-size">({{ formatFileSize(selectedFile.size) }})</span>
          <button @click="clearFile" class="clear-file-btn">×</button>
        </div>
      </div>

      <div class="form-actions">
        <button 
          @click="handleImport" 
          class="import-btn" 
          :disabled="!selectedFile || submitting"
        >
          {{ submitting ? '导入中...' : '开始导入' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { importQuestionnaire } from '../api/questionnaire';
import type { ImportQuestionnaireResponse } from '../api/questionnaire';

const router = useRouter();
const selectedFile = ref<File | null>(null); // 存储选中的文件
const loading = ref(false); // 整体加载状态
const submitting = ref(false); // 提交按钮加载状态
const errorMsg = ref(''); // 错误提示信息

/** 返回医生主页 */
const goBack = () => {
  router.push('/doctor');
};

/** 处理文件选择变化 */
const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0];
    errorMsg.value = ''; // 清除之前的错误提示
  }
};

/** 清除已选择的文件 */
const clearFile = () => {
  selectedFile.value = null;
  // 重置文件输入框
  const fileInput = document.querySelector('.file-input') as HTMLInputElement;
  if (fileInput) fileInput.value = '';
};

/** 格式化文件大小（B → KB/MB） */
const formatFileSize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

/** 触发问卷导入逻辑 */
const handleImport = async () => {
  if (!selectedFile.value) {
    errorMsg.value = '请选择要导入的问卷文件';
    return;
  }

  try {
    submitting.value = true;
    errorMsg.value = '';

    // 调用API导入问卷（响应为嵌套结构：base + ...）
    const res = await importQuestionnaire(selectedFile.value);

    // 处理接口返回结果：适配嵌套结构的base层级
    if (res.base.code === '10000') {
      alert(`问卷导入成功！${res.base.msg}`);
      router.push('/doctor'); // 导入成功后返回医生主页
    } else {
      errorMsg.value = res.base.msg || '问卷导入失败，请重试';
    }
  } catch (error: any) {
    // 捕获网络异常或接口错误，优先读取error中的base.msg
    errorMsg.value = error.base?.msg || '网络异常，请稍后重试';
    console.error('问卷导入失败：', error);
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
/* 统一背景渐变，与其他页面风格保持一致 */
.questionnaire-import {
  padding: 40px 24px;
  max-width: 800px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #f5fafe 0%, #eaf6fa 100%);
  min-height: calc(100vh - 80px);
}

/* 头部样式优化 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.header h2 {
  font-size: 24px;
  color: #1e293b;
  font-weight: 600;
  position: relative;
  margin: 0;
}

/* 标题下划线装饰 */
.header h2::after {
  content: '';
  display: block;
  width: 60px;
  height: 3px;
  background-color: #3b82f6;
  margin-top: 8px;
  border-radius: 2px;
}

/* 返回按钮样式优化 */
.back-btn {
  padding: 8px 16px;
  background-color: #67c23a;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
}

.back-btn:hover {
  background-color: #5daf34;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.3);
}

/* 加载状态样式优化 */
.loading {
  text-align: center;
  padding: 80px;
  color: #64748b;
  font-size: 16px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

/* 表单容器样式升级 */
.import-container {
  background-color: #fff;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f5ff;
}

/* 错误提示样式优化 */
.error {
  text-align: center;
  padding: 16px;
  color: #ef4444;
  font-size: 14px;
  margin-bottom: 24px;
  background-color: #fff1f0;
  border-radius: 8px;
  border: 1px solid #fecdd3;
}

/* 表单项样式 */
.form-item {
  margin-bottom: 32px;
}

.form-label {
  display: block;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  font-size: 15px;
}

/* 美化文件上传区域 */
.file-upload-area {
  position: relative;
  border: 2px dashed #dbeafe;
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  background-color: #f8fafc;
  transition: all 0.3s ease;
  cursor: pointer;
}

.file-upload-area:hover {
  border-color: #93c5fd;
  background-color: #f0f9ff;
}

/* 隐藏原生文件输入框 */
.file-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 1;
}

.upload-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon {
  font-size: 36px;
  color: #3b82f6;
  margin-bottom: 8px;
}

.upload-hint p {
  margin: 0;
  color: #64748b;
  font-size: 15px;
}

.upload-tip {
  font-size: 13px;
  color: #94a3b8;
}

/* 已选择文件信息样式 */
.file-info {
  margin-top: 16px;
  padding: 12px 16px;
  background-color: #f8fafc;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #e2e8f0;
}

.file-name {
  font-size: 14px;
  color: #1e293b;
  font-weight: 500;
}

.file-size {
  font-size: 13px;
  color: #94a3b8;
  margin-left: 8px;
}

.clear-file-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.clear-file-btn:hover {
  background-color: #f1f5f9;
  color: #ef4444;
}

/* 按钮区域样式 */
.form-actions {
  text-align: right;
  margin-top: 16px;
}

/* 导入按钮样式优化 */
.import-btn {
  padding: 12px 28px;
  background-color: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.import-btn:hover:not(:disabled) {
  background-color: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.import-btn:disabled {
  background-color: #93c5fd;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .questionnaire-import {
    padding: 20px 16px;
  }

  .import-container {
    padding: 24px 16px;
  }

  .file-upload-area {
    padding: 32px 16px;
  }

  .header h2 {
    font-size: 20px;
  }

  .import-btn {
    padding: 10px 20px;
    font-size: 14px;
    width: 100%;
  }
}
</style>