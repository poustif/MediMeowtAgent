<template>
<div class="submission-detail-container">
    <el-page-header @back="goBack" content="问诊单详情" class="mb-4" />
    
    <el-card class="box-card mb-4" v-loading="loadingSummary">
        <template #header>
            <div class="card-header">
                <span>问诊单概要信息</span>
            </div>
        </template>

        <div class="summary-content">
            <div class="summary-item">
                <strong>提交ID:</strong> {{ summaryData.submission_id }}
            </div>
            <div class="summary-item">
                <strong>当前状态:</strong> <el-tag size="small">{{ summaryData.status }}</el-tag>
            </div>
            <div class="summary-item">
                <strong>是否匹配科室:</strong> {{ summaryData.is_department ? '是' : '否' }}
            </div>

            <div v-if="parsedAIResult.chiefComplaint" class="summary-item">
                <strong>主诉:</strong>
                <p>{{ parsedAIResult.chiefComplaint }}</p>
            </div>
            <div v-if="parsedAIResult.objectiveFacts" class="summary-item">
                <strong>客观事实:</strong>
                <p>{{ parsedAIResult.objectiveFacts }}</p>
            </div>
            <div v-if="parsedAIResult.imaging" class="summary-item">
                <strong>影像学:</strong>
                <p>{{ parsedAIResult.imaging }}</p>
            </div>
            <div v-if="parsedAIResult.auxiliaryConcerns" class="summary-item">
                <strong>辅助关注点:</strong>
                <p>{{ parsedAIResult.auxiliaryConcerns }}</p>
            </div>
        </div>
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

    <!-- AI分析结果卡片 -->
    <el-card class="box-card" v-if="parsedAIResult.chiefComplaint || parsedAIResult.objectiveFacts || parsedAIResult.imaging || parsedAIResult.auxiliaryConcerns">
        <template #header>
            <div class="card-header">
                <span>AI分析结果</span>
            </div>
        </template>

        <div class="ai-result-content">
            <div v-if="parsedAIResult.chiefComplaint" class="result-section">
                <h5>主诉：</h5>
                <p>{{ parsedAIResult.chiefComplaint }}</p>
            </div>

            <div v-if="parsedAIResult.objectiveFacts" class="result-section">
                <h5>客观事实：</h5>
                <p>{{ parsedAIResult.objectiveFacts }}</p>
            </div>

            <div v-if="parsedAIResult.imaging" class="result-section">
                <h5>影像学：</h5>
                <p>{{ parsedAIResult.imaging }}</p>
            </div>

            <div v-if="parsedAIResult.auxiliaryConcerns" class="result-section">
                <h5>辅助关注点：</h5>
                <p>{{ parsedAIResult.auxiliaryConcerns }}</p>
            </div>
        </div>
    </el-card>

    <!-- 原始AI回复卡片 -->
    <el-card class="box-card" v-if="rawStructuredReport">
        <template #header>
            <div class="card-header">
                <span>原始AI回复</span>
            </div>
        </template>

        <div class="raw-ai-content">
            <pre>{{ rawStructuredReport }}</pre>
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

// 解析后的AI结果数据结构
const parsedAIResult = reactive({
    chiefComplaint: '',
    objectiveFacts: '',
    imaging: '',
    auxiliaryConcerns: ''
})

// 原始AI回复数据
const rawStructuredReport = ref('')

// 定义模拟答案数据，用于接口缺失时展示
const MOCK_ANSWERS = [
    { label: '1. 主要症状是什么?', user_answer: '鼻塞/流涕' },
    { label: '2. 症状持续时间?', user_answer: '>14天' },
    { label: '3. 症状对生活影响程度 (1-5, 5最严重)', user_answer: '3 (MOCK)' },
    { label: '4. 既往相关病史 (可选)', user_answer: '无，仅偶尔感冒。' },
];

const formatAnswer = (answer) => {
    if (Array.isArray(answer)) {
        return answer.map(item => typeof item === 'object' && item.text ? item.text : item).join(', ')
    }
    if (typeof answer === 'object' && answer.text) {
        return answer.text
    }
    return answer || '未作答'
}

const formatKeySymptoms = (text) => {
    if (!text) return []
    // 移除markdown标记
    text = text.replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体
    text = text.replace(/\*(.*?)\*/g, '$1') // 移除斜体
    text = text.replace(/`(.*?)`/g, '$1') // 移除代码
    text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // 移除链接，保留文本
    // 分割成完整的句子或逻辑段落
    const sentences = text.split(/[。！？]/).filter(s => s.trim()).map(s => s.trim() + '。')
    if (sentences.length === 0) {
        return [text]
    }
    return sentences
}

// 解析structured_report的函数
const parseStructuredReport = (report) => {
    if (!report) return {}

    // 移除markdown标记
    let cleanReport = report.replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体
    cleanReport = cleanReport.replace(/\*(.*?)\*/g, '$1') // 移除斜体
    cleanReport = cleanReport.replace(/`(.*?)`/g, '$1') // 移除代码
    cleanReport = cleanReport.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // 移除链接，保留文本
    cleanReport = cleanReport.replace(/^#+\s*/gm, '') // 移除标题标记
    cleanReport = cleanReport.replace(/^-+\s*/gm, '') // 移除列表标记
    cleanReport = cleanReport.replace(/^\*+\s*/gm, '') // 移除列表标记

    const sections = {}
    const lines = cleanReport.split('\n')
    let currentSection = ''
    let currentContent = []

    for (const line of lines) {
        const trimmed = line.trim()
        // 匹配完整的section标题
        if (trimmed.includes('【患者主诉') || trimmed.includes('患者主诉')) {
            if (currentSection && currentContent.length > 0) {
                sections[currentSection] = currentContent.join('\n').trim()
            }
            currentSection = '主诉'
            currentContent = []
        } else if (trimmed.includes('【客观事实') || trimmed.includes('客观事实')) {
            if (currentSection && currentContent.length > 0) {
                sections[currentSection] = currentContent.join('\n').trim()
            }
            currentSection = '客观事实'
            currentContent = []
        } else if (trimmed.includes('【影像学') || trimmed.includes('影像观察') || trimmed.includes('影像学')) {
            if (currentSection && currentContent.length > 0) {
                sections[currentSection] = currentContent.join('\n').trim()
            }
            currentSection = '影像学'
            currentContent = []
        } else if (trimmed.includes('【辅助关注点') || trimmed.includes('辅助关注点')) {
            if (currentSection && currentContent.length > 0) {
                sections[currentSection] = currentContent.join('\n').trim()
            }
            currentSection = '辅助关注点'
            currentContent = []
        } else if (currentSection && trimmed && !trimmed.startsWith('###') && !trimmed.includes('【医疗建议') && !trimmed.includes('由医生填写')) {
            // 收集内容，但排除其他标题和医疗建议部分
            currentContent.push(trimmed)
        }
    }

    if (currentSection && currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n').trim()
    }

    return {
        chiefComplaint: sections['主诉'] || '',
        objectiveFacts: sections['客观事实'] || '',
        imaging: sections['影像学'] || '',
        auxiliaryConcerns: sections['辅助关注点'] || ''
    }
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

        if (res) {

            // 更新顶部概要信息
            Object.assign(summaryData, res);

            // 确保 key_info 字段存在
            if (!summaryData.key_info) {
                  summaryData.key_info = {};
            }

            // 设置原始AI回复
            rawStructuredReport.value = res.structured_report || ''

            // 从原始structured_report解析AI结果
            const parsed = parseStructuredReport(rawStructuredReport.value)
            Object.assign(parsedAIResult, parsed)

            // 2. 尝试解析完整的问答详情
            // ⚠️ 假设后端会返回 questions 数组，如果返回，则使用真实数据
            const questionsWithAnswers = res.questions || res.question_data || res.record_data
            
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
            ElMessage.error('加载失败: 数据格式错误')
            summaryData.submission_id = '';
            summaryData.status = '加载失败';
            summaryData.key_info = {
                chief_complaint: 'N/A',
                key_symptoms: 'N/A',
                image_summary: 'N/A',
                important_notes: 'N/A'
            };
            questionnaireDetail.value = MOCK_ANSWERS;
            isMockData.value = true;
        }
    } catch (error) {
        console.error('加载问卷详情失败:', error)
        ElMessage.error(`加载失败: ${error.message || '网络错误'}`)
        summaryData.submission_id = '';
        summaryData.status = '加载失败';
        summaryData.key_info = {
            chief_complaint: 'N/A',
            key_symptoms: 'N/A',
            image_summary: 'N/A',
            important_notes: 'N/A'
        };
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
.ai-result-content { padding: 10px 0; }
.result-section { margin-bottom: 20px; padding: 15px; background-color: #fafafa; border-radius: 6px; border-left: 4px solid #67C23A; }
.result-section h5 { margin: 0 0 10px 0; color: #303133; font-weight: bold; font-size: 14px; }
.result-section p { margin: 0; color: #606266; line-height: 1.6; white-space: pre-wrap; }
.raw-ai-content { padding: 10px 0; }
.raw-ai-content pre { margin: 0; color: #606266; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; }
.summary-content { padding: 10px 0; }
.summary-item { margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px; padding: 10px; background-color: #fafafa; }
.summary-item strong { color: #303133; }
.summary-item p { margin: 5px 0 0 0; color: #606266; line-height: 1.6; white-space: pre-wrap; }
</style>