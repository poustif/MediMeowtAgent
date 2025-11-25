<template>
  <div class="queue-container">
    <h3>待诊列表</h3>
    <router-link to="/doctor" class="back-btn">返回医生主页</router-link>
    
    <div class="loading" v-if="loading">加载中...</div>
    <div class="error" v-if="errorMsg">{{ errorMsg }}</div>
    <ul class="queue-list" v-else>
      <li v-for="recordId in recordIds" :key="recordId">
        待诊患者 ID：{{ recordId }}
        <router-link :to="`/doctor/summary/${recordId}`" class="view-btn">
          查看病情摘要
        </router-link>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getDoctorQueue } from '../api/queue';
import type { DoctorQueueResponse } from '../api/queue';

const router = useRouter();
const loading = ref(false);
const errorMsg = ref('');
const recordIds = ref<string[]>([]);

onMounted(() => {
  fetchQueue();
});

const fetchQueue = async () => {
  loading.value = true;
  try {
    const doctorInfoStr = localStorage.getItem('doctorInfo');
    if (!doctorInfoStr) throw new Error('未登录或医生信息缺失');
    
    const doctorInfo = JSON.parse(doctorInfoStr);
    const userId = doctorInfo.id;
    if (!userId) throw new Error('医生 ID 不存在');

    const res = await getDoctorQueue(userId);

    if (res.base.code === '10000') {
      recordIds.value = res.data.record_ids;
    } else {
      errorMsg.value = res.base.msg || '获取待诊列表失败';
    }
  } catch (error: any) {
    errorMsg.value = error.message || error.base?.msg || '网络异常，请重试';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
/* 新增：与医生主页一致的背景渐变，增强页面风格统一性 */
.queue-container {
  max-width: 800px;
  margin: 30px auto;
  padding: 24px;
  background: linear-gradient(135deg, #f5fafe 0%, #eaf6fa 100%); /* 与医生主页背景一致 */
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 标题样式增强 */
.queue-container h3 {
  font-size: 22px;
  color: #333;
  margin: 0 0 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

/* 返回按钮样式优化 */
.back-btn {
  display: inline-block;
  margin-bottom: 20px;
  padding: 8px 16px;
  background-color: #67c23a;
  color: #fff;
  border-radius: 6px;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background-color: #5daf34;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.3);
}

/* 加载状态样式优化 */
.loading {
  text-align: center;
  padding: 60px;
  color: #666;
  font-size: 16px;
  background-color: #f9f9f9;
  border-radius: 8px;
}

/* 错误提示样式优化 */
.error {
  text-align: center;
  padding: 24px;
  color: #f56c6c;
  font-size: 16px;
  background-color: #fff1f0;
  border-radius: 8px;
  border: 1px solid #fde2e2;
}

/* 列表容器样式 */
.queue-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

/* 列表项卡片式设计 */
.queue-list li {
  padding: 20px;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 16px;
  font-size: 14px;
  color: #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
}

.queue-list li:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.queue-list li:last-child {
  margin-bottom: 0;
}

/* 查看按钮样式优化 */
.view-btn {
  padding: 8px 16px;
  background-color: #409eff;
  color: #fff;
  border-radius: 6px;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.3s ease;
}

.view-btn:hover {
  background-color: #3086d6;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}
</style>