<template>
  <div class="diagnosis-report">
    <div class="header">
      <h2>提交诊断结果</h2>
      <button @click="goBack" class="back-btn">
        <span class="btn-icon">←</span> 返回病情摘要
      </button>
    </div>

    <!-- 加载状态（含错误提示） -->
    <div v-if="loading" class="loading">
      <div class="loading-icon">🔄</div>
      <div v-if="errorMsg" class="error">{{ errorMsg }}</div>
      <div v-else>提交中...</div>
    </div>

    <!-- 表单区域（加载状态隐藏） -->
    <div v-else class="form-container">
      <!-- 错误提示 -->
      <div v-if="errorMsg" class="error-alert">
        <div class="error-alert-icon">⚠️</div>
        <p>{{ errorMsg }}</p>
      </div>

      <!-- 诊断内容表单 -->
      <form @submit.prevent="handleSubmit" class="report-form">
        <div class="form-item">
          <label class="form-label">待诊记录ID：</label>
          <span class="record-id">
            <span class="id-icon">🆔</span>
            {{ recordId || '暂无' }}
          </span> <!-- 展示当前记录ID，不可编辑 -->
        </div>
        <div class="form-item required-item">
          <label class="form-label">
            诊断内容
            <span class="required-mark">*</span>
          </label>
          <textarea
            v-model="diagnosisText"
            class="form-textarea"
            placeholder="请输入详细诊断结果（如：1. 诊断结论：上呼吸道感染；2. 治疗建议：居家休息，口服阿莫西林胶囊，每日3次，每次1粒；3. 复诊提醒：3天后复诊，如症状加重请及时就医）"
            rows="8"
            :disabled="submitting"
            @input="clearFormError"
          ></textarea>
          <div v-if="formError.text" class="form-error">
            <span class="error-icon">❌</span>
            {{ formError.text }}
          </div>
          <div class="textarea-hint">
            提示：请包含诊断结论、治疗建议、复诊要求等关键信息，至少5个字符
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="submit-btn" :disabled="submitting">
            <span class="btn-icon" v-if="submitting">🔄</span>
            {{ submitting ? '提交中...' : '提交诊断结果' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { submitDiagnosisReport } from '../api/report';
import type { SubmitReportParams, SubmitReportResponse } from '../api/report'; // 导入嵌套响应类型

// 路由实例（获取参数+跳转）
const route = useRoute();
const router = useRouter();

// 响应式变量：调整loading初始值为true，确保页面加载时先进入加载状态
const loading = ref(true); // 整体加载状态（含无record_id的初始检查）
const submitting = ref(false); // 提交按钮加载状态
const errorMsg = ref(''); // 全局错误提示（如无record_id、登录失效）
const formError = ref({ text: '' }); // 表单字段校验错误

// 表单数据：与SubmitReportParams参数类型对齐
const recordId = ref(''); // 待诊记录ID（从路由参数获取，必填）
const diagnosisText = ref(''); // 诊断内容（必填）

/**
 * 返回上一页（病情摘要页面）
 */
const goBack = () => {
  router.push(`/doctor/summary/${recordId.value}`);
};

/**
 * 清除表单校验错误
 */
const clearFormError = () => {
  formError.value.text = '';
};

/**
 * 表单校验：验证诊断内容必填且长度合规
 */
const validateForm = (): boolean => {
  formError.value = { text: '' };
  let isValid = true;

  // 校验诊断内容不为空
  if (!diagnosisText.value.trim()) {
    formError.value.text = '请输入诊断内容';
    isValid = false;
  }
  // 校验诊断内容长度（至少5个字符，避免无效内容）
  else if (diagnosisText.value.trim().length < 5) {
    formError.value.text = '诊断内容至少5个字符';
    isValid = false;
  }

  return isValid;
};

/**
 * 提交诊断结果：校验→调用API→处理结果
 */
const handleSubmit = async () => {
  // 1. 先做表单前端校验
  if (!validateForm()) return;

  // 2. 组装提交参数（严格匹配SubmitReportParams类型）
  const submitParams: SubmitReportParams = {
    record_id: recordId.value,
    text: diagnosisText.value.trim()
  };

  try {
    submitting.value = true;
    errorMsg.value = '';

    // 3. 调用API提交（响应为嵌套结构：base + ...）
    const res = await submitDiagnosisReport(submitParams);

    // 4. 处理接口返回结果：适配嵌套结构的base层级
    if (res.base.code === '10000') {
      alert('诊断结果提交成功！' + res.base.msg);
      // 提交成功后跳转回待诊列表
      router.push('/doctor/queue');
    } else {
      // 接口返回失败（如参数错误、后端异常）
      errorMsg.value = res.base.msg || '提交诊断结果失败，请重试';
    }
  } catch (error: any) {
    // 捕获网络异常（如后端未启动、跨域问题）
    errorMsg.value = error.base?.msg || '网络异常，请稍后重试';
    console.error('提交诊断结果失败：', error);
  } finally {
    submitting.value = false;
  }
};

/**
 * 页面挂载时：获取路由参数+验证登录状态
 */
onMounted(() => {
  try {
    // 1. 从路由参数中获取record_id（必填）
    const id = route.params.record_id as string;
    if (!id) {
      errorMsg.value = '缺少待诊记录ID，无法提交诊断结果';
      // 1.5秒后自动跳转回待诊列表，并终止加载状态以显示错误提示
      setTimeout(() => {
        router.push('/doctor/queue');
        loading.value = false;
      }, 1500);
      return;
    }
    recordId.value = id;

    // 2. 验证登录状态（未登录则跳回登录页）
    const token = localStorage.getItem('doctorToken');
    if (!token) {
      errorMsg.value = '未登录，请重新登录';
      setTimeout(() => {
        router.push('/doctor/login');
        loading.value = false;
      }, 1500);
      return;
    }

    // 3. 加载完成，显示表单
    loading.value = false;
  } catch (error) {
    errorMsg.value = '页面加载失败，请稍后重试';
    setTimeout(() => {
      router.push('/doctor/queue');
      loading.value = false;
    }, 1500);
  }
});
</script>

<style scoped>
/* 统一背景渐变，与其他页面风格保持一致 */
.diagnosis-report {
  padding: 40px 24px;
  max-width: 1200px;
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
  font-size: 26px;
  color: #1e293b;
  font-weight: 600;
  margin: 0;
  position: relative;
}

/* 标题下划线装饰 */
.header h2::after {
  content: '';
  display: block;
  width: 70px;
  height: 3px;
  background-color: #3b82f6;
  margin-top: 8px;
  border-radius: 2px;
}

/* 返回按钮样式优化（与其他页面统一绿色系） */
.back-btn {
  padding: 9px 18px;
  background-color: #67c23a;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-btn:hover {
  background-color: #5daf34;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.3);
}

.btn-icon {
  font-size: 16px;
}

/* 加载状态样式优化 */
.loading {
  text-align: center;
  padding: 80px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-icon {
  font-size: 48px;
  color: #3b82f6;
  animation: spin 1.5s linear infinite;
}

.loading .error {
  color: #ef4444;
  font-size: 16px;
  max-width: 500px;
  line-height: 1.6;
}

/* 错误提示样式优化 */
.error-alert {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  color: #ef4444;
  font-size: 14px;
  background-color: #fff1f0;
  border-radius: 8px;
  border: 1px solid #fecdd3;
  margin-bottom: 24px;
}

.error-alert-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.error-alert p {
  margin: 0;
  line-height: 1.6;
}

/* 表单容器样式升级 */
.form-container {
  background-color: #fff;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f5ff;
}

/* 表单样式优化 */
.report-form {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.required-item .form-label {
  display: flex;
  align-items: center;
  gap: 4px;
}

.required-mark {
  color: #ef4444;
  font-size: 16px;
}

.form-label {
  font-weight: 600;
  color: #333;
  font-size: 15px;
}

/* 记录ID样式优化 */
.record-id {
  color: #64748b;
  font-size: 16px;
  padding: 12px 16px;
  background-color: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
}

.id-icon {
  color: #3b82f6;
  font-size: 18px;
}

/* 文本域样式优化 */
.form-textarea {
  width: 100%;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 16px;
  color: #1e293b;
  resize: vertical;
  transition: all 0.3s ease;
  background-color: #f8fafc;
  min-height: 200px;
  line-height: 1.8;
}

.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  background-color: #fff;
}

.form-textarea:disabled {
  background-color: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
  border-color: #cbd5e1;
}

.form-textarea::placeholder {
  color: #94a3b8;
  font-size: 15px;
}

/* 表单校验错误提示样式 */
.form-error {
  color: #ef4444;
  font-size: 13px;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.form-error .error-icon {
  font-size: 14px;
}

/* 文本域提示样式 */
.textarea-hint {
  color: #94a3b8;
  font-size: 13px;
  margin-top: 6px;
  line-height: 1.5;
}

/* 按钮区域样式 */
.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* 提交按钮样式优化 */
.submit-btn {
  padding: 14px 32px;
  background-color: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.submit-btn:hover:not(:disabled) {
  background-color: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.submit-btn:disabled {
  background-color: #93c5fd;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .diagnosis-report {
    padding: 20px 16px;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .form-container {
    padding: 24px 16px;
  }

  .record-id {
    width: 100%;
    box-sizing: border-box;
  }

  .submit-btn {
    width: 100%;
    justify-content: center;
    padding: 14px;
  }

  .loading {
    padding: 40px 16px;
  }
}

/* 加载动画 */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>