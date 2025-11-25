<template>
  <div class="disease-summary">
    <div class="header">
      <h2>病情摘要</h2>
      <button @click="goBack" class="back-btn">返回待诊列表</button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <div class="loading-icon">🔍</div>
      <p>加载病情摘要中...</p>
    </div>

    <!-- 错误提示 -->
    <div v-else-if="errorMsg" class="error">
      <div class="error-icon">❌</div>
      <p>{{ errorMsg }}</p>
      <button @click="goBack" class="error-btn">返回待诊列表</button>
    </div>

    <!-- 病情摘要内容 -->
    <div v-else class="summary-container">
      <!-- 用户基本信息 -->
      <div class="user-info card">
        <h3 class="card-title">
          <span class="title-icon">👤</span> 患者信息
        </h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">姓名：</span>
            <span class="info-value">{{ userInfo.username || '暂无' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">手机号：</span>
            <span class="info-value">{{ userInfo.phone_number || '暂无' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">注册时间：</span>
            <span class="info-value">{{ formatTime(userInfo.created_at) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">更新时间：</span>
            <span class="info-value">{{ formatTime(userInfo.updated_at) }}</span>
          </div>
        </div>
      </div>

      <!-- AI病情摘要 -->
      <div class="ai-summary card">
        <h3 class="card-title">
          <span class="title-icon">🤖</span> AI辅助诊断摘要
        </h3>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">主诉概括：</span>
            <span class="summary-value">{{ aiResult.key_info.chief_complaint || '暂无' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">核心症状：</span>
            <span class="summary-value">{{ aiResult.key_info.key_symptoms || '暂无' }}</span>
          </div>
          <div class="summary-item" v-if="aiResult.key_info.image_summary">
            <span class="summary-label">图片概述：</span>
            <span class="summary-value">{{ aiResult.key_info.image_summary }}</span>
          </div>
          <div class="summary-item" v-else>
            <span class="summary-label">图片概述：</span>
            <span class="summary-value">无相关图片上传</span>
          </div>
          <div class="summary-item warning">
            <span class="summary-label">医生注意事项：</span>
            <span class="summary-value">{{ aiResult.key_info.important_notes || '暂无特别提示' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">科室匹配：</span>
            <span class="summary-value">
              <span class="match-tag" :class="aiResult.is_department ? 'match' : 'unmatch'">
                {{ aiResult.is_department ? '匹配' : '不匹配' }}
              </span>
            </span>
          </div>
        </div>
      </div>

      <!-- 提交诊断结果跳转按钮 -->
      <div class="summary-actions">
        <router-link :to="`/doctor/report/${route.params.record_id}`" class="report-btn">
          <span class="btn-icon">📝</span> 进入提交诊断结果
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getDiseaseSummary } from '../api/summary';
import type { SummaryResponse, AiResult, User } from '../api/summary'; // 导入修正后的嵌套类型

// 路由实例（获取参数+跳转）
const route = useRoute();
const router = useRouter();

// 响应式变量：初始值与类型定义严格对齐
const loading = ref(true);
const errorMsg = ref('');
const userInfo = ref<User>({
  id: '',
  phone_number: '',
  username: '',
  created_at: '',
  updated_at: ''
});
const aiResult = ref<AiResult>({
  submission_id: '',
  is_department: true,
  key_info: {
    chief_complaint: '',
    key_symptoms: '',
    image_summary: undefined,
    important_notes: ''
  }
});

// 格式化时间（优化显示格式，兼容空值）
const formatTime = (timeStr: string) => {
  if (!timeStr) return '暂无';
  // 优化时间显示：年-月-日 时:分:秒
  return new Date(timeStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// 返回待诊列表
const goBack = () => {
  router.push('/doctor/queue');
};

onMounted(async () => {
  try {
    // 1. 获取路由参数中的record_id（从待诊列表跳转携带）
    const recordId = route.params.record_id as string;
    if (!recordId) {
      errorMsg.value = '缺少待诊记录ID，无法获取病情摘要';
      return;
    }

    // 2. 验证登录状态（仅校验token存在，实际请求由service自动携带）
    const token = localStorage.getItem('doctorToken');
    if (!token) {
      errorMsg.value = '未登录，请重新登录';
      setTimeout(() => router.push('/doctor/login'), 1500);
      return;
    }

    // 3. 调用API获取病情摘要（响应为嵌套结构：base + data）
    const res = await getDiseaseSummary(recordId);
    
    // 4. 处理响应结果：适配嵌套结构的base和data层级
    if (res.base.code === '10000') {
      userInfo.value = res.data.user; // 从data层级读取user
      aiResult.value = res.data.ai_result; // 从data层级读取ai_result
    } else {
      errorMsg.value = res.base.msg || '获取病情摘要失败';
    }
  } catch (error) {
    errorMsg.value = '网络异常，请稍后重试';
    console.error('获取病情摘要失败：', error);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
/* 统一背景渐变，与其他页面风格保持一致 */
.disease-summary {
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
  gap: 6px;
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

.loading p {
  color: #64748b;
  font-size: 16px;
  margin: 0;
}

/* 错误提示样式优化 */
.error {
  text-align: center;
  padding: 60px 24px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.error-icon {
  font-size: 48px;
  color: #ef4444;
}

.error p {
  color: #ef4444;
  font-size: 16px;
  margin: 0;
  max-width: 500px;
  line-height: 1.6;
}

.error-btn {
  padding: 8px 16px;
  background-color: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
}

.error-btn:hover {
  background-color: #2563eb;
}

/* 内容容器样式 */
.summary-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 卡片通用样式升级 */
.card {
  padding: 30px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f5ff;
}

.card-title {
  margin: 0 0 24px 0;
  color: #1e293b;
  border-bottom: 1px solid #e0e7ff;
  padding-bottom: 12px;
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-icon {
  font-size: 20px;
  color: #3b82f6;
}

/* 患者信息网格布局 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.info-item {
  padding: 12px;
  background-color: #f8fafc;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  font-weight: 600;
  color: #333;
  min-width: 70px;
  font-size: 14px;
}

.info-value {
  color: #64748b;
  font-size: 14px;
  flex: 1;
}

/* AI摘要网格布局 */
.summary-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-item {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
  padding: 10px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.summary-item:hover {
  background-color: #f8fafc;
}

.summary-label {
  font-weight: 600;
  color: #333;
  min-width: 110px;
  font-size: 14px;
  background-color: #e0e7ff;
  color: #3b82f6;
  padding: 4px 8px;
  border-radius: 4px;
  align-self: center;
}

.summary-value {
  color: #64748b;
  font-size: 14px;
  flex: 1;
  line-height: 1.6;
}

/* 警告样式优化 */
.warning {
  background-color: #fff8f0;
  border-left: 4px solid #e6a23c;
  padding: 14px;
}

.warning .summary-label {
  background-color: #fee2cc;
  color: #d97706;
}

.warning .summary-value {
  color: #d97706;
  font-weight: 500;
}

/* 科室匹配标签 */
.match-tag {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
}

.match {
  background-color: #dcfce7;
  color: #16a34a;
}

.unmatch {
  background-color: #fee2e2;
  color: #dc2626;
}

/* 提交诊断按钮样式优化 */
.summary-actions {
  margin-top: 8px;
  text-align: right;
}

.report-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 32px;
  background-color: #3b82f6;
  color: #fff;
  text-decoration: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.report-btn:hover {
  background-color: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.btn-icon {
  font-size: 18px;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .disease-summary {
    padding: 20px 16px;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .card {
    padding: 20px 16px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .summary-label {
    min-width: 90px;
  }

  .report-btn {
    width: 100%;
    justify-content: center;
    padding: 12px;
  }

  .loading, .error {
    padding: 40px 16px;
  }
}

/* 加载动画 */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>