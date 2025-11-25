<template>
  <div class="dept-container">
    
    <el-page-header @back="goBack" content="请选择就诊科室" class="page-header" />

    <div v-if="loading" class="loading-box">
        <el-skeleton :rows="5" animated />
    </div>

    <div v-else-if="deptList.length > 0" class="card-list">
      <el-card 
        v-for="item in deptList" 
        :key="item.department_id" 
        class="box-card"
        shadow="hover"
        @click="handleSelect(item.department_id)"
      >
        <div class="card-content">
          <h3>{{ item.department_name }}</h3>
          <el-icon><ArrowRight /></el-icon>
        </div>
      </el-card>
    </div>
    
    <el-empty v-else description="未能加载科室数据或暂无科室" />
    
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getDepartments } from '../api/index.js'
import { ArrowRight } from '@element-plus/icons-vue' 
import { ElMessage } from 'element-plus'; // 用于错误提示

const router = useRouter()
const deptList = ref([])
const loading = ref(true) // 🚀 添加 loading 状态

// 🚀 核心修改 2: 定义 goBack 函数，导航回主界面
const goBack = () => {
    // 假设主界面的路由名称是 'PatientMain'
    router.push({ name: 'PatientMain' }); 
};

onMounted(async () => {
  loading.value = true;
  try {
    const data = await getDepartments()
    // 拦截器已经处理了 res.data，这里直接拿 data 即可
    // 此时 data 应该就是那个数组: [{ department_name: "...", ... }]
    if (Array.isArray(data)) {
        deptList.value = data;
    } else {
        // 如果后端返回的不是数组，但接口成功，打印警告
        deptList.value = [];
        console.warn('Departments API did not return an array as expected:', data);
    }
  } catch (error) {
    console.error('加载科室失败:', error);
    ElMessage.error(`加载科室失败: ${error.message || '网络请求失败'}`);
  } finally {
    loading.value = false;
  }
})

const handleSelect = (id) => {
  router.push({ name: 'PatientQuestionnaire', params: { deptId: id } });
};
</script>

<style scoped>
.dept-container { 
    padding: 20px; 
    max-width: 900px; 
    margin: 20px auto; /* 居中并增加顶部边距 */
    background: #fff;
    box-shadow: 0 4px 16px rgba(0,0,0,0.05);
    border-radius: 8px;
    min-height: 400px;
}
.page-header {
    margin-bottom: 30px; /* 为头部留出空间 */
    border-bottom: 1px solid #eee;
    padding-bottom: 15px;
}
.loading-box {
    padding: 50px 20px;
}
.card-list { 
    display: grid; 
    /* 适配大屏幕 */
    grid-template-columns: repeat(3, 1fr); 
    gap: 20px; 
}
/* 响应式调整 */
@media (max-width: 768px) {
    .card-list {
        grid-template-columns: repeat(2, 1fr);
    }
}
.box-card { 
    cursor: pointer; 
    transition: all 0.3s; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    height: 100px; 
}
.box-card:hover { 
    transform: translateY(-5px); 
    border-color: #409EFF; 
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
}
.card-content { 
    display: flex; 
    align-items: center; 
    justify-content: space-between; 
    width: 100%; 
    padding: 0 10px; 
}
h3 { margin: 0; font-size: 18px; }
</style>