<template>
<div class="submission-detail-container">
    <el-page-header @back="goBack" content="问诊单详情" class="mb-4" />
    
    <el-card class="box-card mb-4" v-loading="loadingSummary">
        <template #header>
            <div class="card-header">
                <span>问诊单概要信息</span>
            </div>
        </template>
        
        <el-descriptions :column="3" border>
            <el-descriptions-item label="提交ID">{{ summaryData.submission_id }}</el-descriptions-item>
            <el-descriptions-item label="当前状态">
                <el-tag size="small">{{ summaryData.status }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="是否匹配科室">{{ summaryData.is_department ? '是' : '否' }}</el-descriptions-item>
            
            <el-descriptions-item label="主诉">{{ summaryData.key_info.chief_complaint || 'N/A' }}</el-descriptions-item>
            <el-descriptions-item label="关键症状">{{ summaryData.key_info.key_symptoms || 'N/A' }}</el-descriptions-item>
            <el-descriptions-item label="重要备注">{{ summaryData.key_info.important_notes || 'N/A' }}</el-descriptions-item>
            
            <el-descriptions-item label="图片总结" :span="3">{{ summaryData.key_info.image_summary || 'N/A' }}</el-descriptions-item>
            
        </el-descriptions>
    </el-card>

    <el-card class="box-card" v-loading="loadingDetail">
        <template #header>
            <div class="card-header">
                <span>完整提交内容 (患者回答详情)</span>
            </div>
        </template>
        
        <div class="detail-content">
            <h4>患者回答详情:</h4>
            
            <div v-for="(item, index) in questionnaireDetail" :key="item.question_id || index" class="answer-item">
                <p>
                    <strong>{{ index + 1 }}. {{ item.label || '问题' }}:</strong> 
                    {{ formatAnswer(item.user_answer || item.answer || item.value) }}
                </p>
            </div>

             <div v-if="isMockData && !loadingDetail">
                <el-alert 
                    title="⚠️ 答案为模拟数据" 
                    type="warning" 
                    description="后端接口未返回答案，此处为前端模拟数据，请联系后端开发人员提供正确接口。" 
                    :closable="false" 
                />
            </div>
        </div>
    </el-card>

</div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
// 导入名现在与 index.js 中的导出名一致，解决了 Uncaught SyntaxError
import { getQuestionnaireDetail } from '../api/index.js' 
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const recordId = route.params.submissionId 

const loadingSummary = ref(true) 
const loadingDetail = ref(true)  
const isMockData = ref(false) // 标记是否使用了模拟数据

// 确保概要数据结构与API返回的结构匹配
const summaryData = reactive({ 
    submission_id: '加载中...', 
    status: '...',
    is_department: false,
    key_info: {
        chief_complaint: null, 
        key_symptoms: null,
        image_summary: null,
        important_notes: null
    }
})

const questionnaireDetail = ref([]) 

// 定义模拟答案数据，用于接口缺失时展示
const MOCK_ANSWERS = [
    { label: '1. 主要症状是什么?', user_answer: '鼻塞/流涕' }, 
    { label: '2. 症状持续时间?', user_answer: '>14天' },
    { label: '3. 症状对生活影响程度 (1-5, 5最严重)', user_answer: '3 (MOCK)' },
    { label: '4. 既往相关病史 (可选)', user_answer: '无，仅偶尔感冒。' },
];

const formatAnswer = (answer) => {
    if (Array.isArray(answer)) {
        return answer.join(', ')
    }
    return answer || '未作答'
}

const loadDetail = async () => {
    loadingDetail.value = true
    loadingSummary.value = true
    
    if (!recordId) {
        ElMessage.error('缺少问诊记录ID。')
        loadingDetail.value = false
        loadingSummary.value = false
        return
    }

    try {
        // 1. 调用 GET /questionnaires/record/{record_id} 接口获取概要信息
        const res = await getQuestionnaireDetail(recordId) 
        
        if (res.base.code === '10000' && res.data) {
            
            // 更新顶部概要信息
            Object.assign(summaryData, res.data); 
            
            // 确保 key_info 字段存在
            if (!summaryData.key_info) {
                 summaryData.key_info = {};
            }

            // 2. 尝试解析完整的问答详情
            // ⚠️ 假设后端会返回 questions 数组，如果返回，则使用真实数据
            const questionsWithAnswers = res.data.questions || res.data.question_data || res.data.record_data
            
            if (questionsWithAnswers && Array.isArray(questionsWithAnswers) && questionsWithAnswers.length > 0) {
                // 使用真实数据
                questionnaireDetail.value = questionsWithAnswers
                isMockData.value = false;
            } else {
                // 接口不含答案，使用 Mock 数据填充
                console.warn('详情接口未返回答案数组，使用 Mock 数据填充。');
                questionnaireDetail.value = MOCK_ANSWERS;
                isMockData.value = true;
            }
        } else {
            ElMessage.error(`加载失败: ${res.base.msg || '未知错误'}`)
            questionnaireDetail.value = MOCK_ANSWERS; 
            isMockData.value = true;
        }
    } catch (error) {
        console.error('加载问卷详情失败:', error)
        ElMessage.error(`加载失败: ${error.message || '网络错误'}`)
        questionnaireDetail.value = MOCK_ANSWERS; 
        isMockData.value = true;
    } finally {
        loadingSummary.value = false
        loadingDetail.value = false
    }
}

onMounted(() => {
    loadDetail() 
})

const goBack = () => router.back()
</script>

<style scoped>
.submission-detail-container { max-width: 800px; margin: 20px auto; padding: 25px; background: #fff; box-shadow: 0 4px 16px rgba(0,0,0,0.05); border-radius: 8px;}
.mb-4 { margin-bottom: 20px; }
.box-card { margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05); }
.card-header { font-weight: bold; font-size: 16px; }
.detail-content h4 { margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 15px; }
.answer-item { margin-bottom: 10px; padding-left: 10px; border-left: 3px solid #409EFF; background-color: #f9f9f9; padding: 8px; border-radius: 4px; }
.answer-item strong { color: #303133; }
.el-tag.el-tag--small { height: 24px; line-height: 22px; }
</style>