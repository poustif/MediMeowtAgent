声音嘘哑+喉痛<template>
<div class="q-container">
    <el-page-header @back="goBack" content="填写问诊单" class="mb-4" />
    
    <el-form 
      v-if="questions.length > 0" 
      ref="formRef" 
      :model="formData" 
      label-position="top"
    >
      <div v-for="(q, index) in questions" :key="q.question_id" class="question-item">
        
        <div class="q-title">
          <span class="index">{{ index + 1 }}.</span>
          <span class="label">{{ q.label && q.label !== 'nan' ? q.label : `问题 ${index + 1}` }}</span>
          <span v-if="q.is_required === 'true' || q.is_required === '1' || q.is_required === true" class="required">*</span>
        </div>

        <el-form-item 
          v-if="isType(q.question_type, 'text')"
          :prop="q.question_id"
          :rules="getRules(q)"
        >
          <el-input 
            v-model="formData[q.question_id]" 
            :placeholder="q.placeholder || '请输入'" 
            type="textarea" 
            :rows="3"
          />
        </el-form-item>

        <el-form-item
          v-if="isType(q.question_type, 'radio') && !isType(q.question_type, 'checkbox')"
          :prop="q.question_id"
          :rules="getRules(q)"
        >
          <el-radio-group v-model="formData[q.question_id]">
            <el-radio
              v-for="(opt, index) in q.options"
              :key="opt.value || opt || index"
              :label="opt.value || opt || index"
            >
              {{ getOptionLabel(opt, index) }}
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item
          v-if="isType(q.question_type, 'checkbox')"
          :prop="q.question_id"
          :rules="getRules(q)"
        >
          <el-checkbox-group v-model="formData[q.question_id]">
            <el-checkbox
              v-for="opt in q.options"
              :key="opt.value || opt"
              :label="opt.value || opt"
            >
              {{ opt.text || opt }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item 
          v-if="isType(q.question_type, 'file')"
          :prop="q.question_id"
          :rules="getRules(q)"
        >
          <el-upload
            action="#"
            list-type="picture-card"
            :auto-upload="true"
            :limit="Number(q.max_files) || 3"
            :http-request="(opts) => customUpload(opts, q.question_id)"
            :on-preview="handlePreview"
            :on-remove="(file, files) => handleRemove(q.question_id, file, files)"
            :file-list="formData[q.question_id].map(id => ({ name: id, url: id }))"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
          <div style="display:none">{{ formData[q.question_id]?.join(',') }}</div>
        </el-form-item>
        
        <el-alert 
          v-else-if="!isType(q.question_type, 'text') && !isType(q.question_type, 'radio') && !isType(q.question_type, 'checkbox') && !isType(q.question_type, 'file')"
          :title="`不支持的题型: ${q.question_type}`" 
          type="warning" 
          :closable="false" 
          style="margin-bottom: 20px;"
        />

      </div>

      <div class="footer-btn">
        <el-button type="primary" size="large" @click="submitForm" :loading="submitting">
          提交问卷
        </el-button>
      </div>
    </el-form>

    <el-empty v-else description="问卷数据加载中..." />
    
    <el-dialog v-model="dialogVisible">
      <img w-full :src="dialogImageUrl" alt="Preview Image" style="width: 100%" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getQuestionnaire, submitQuestionnaire, uploadFile } from '../api/index.js'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const formRef = ref(null)
const submitting = ref(false)

const questions = ref([])
const formData = reactive({})
const deptId = route.params.deptId

const questionnaireId = ref('') // 用于存储问卷ID
const dialogImageUrl = ref('')
const dialogVisible = ref(false)

// --- 类型判断工具函数 (已修正 'multi' -> 'checkbox' 和 'scale' -> 'radio') ---
const isType = (serverType, localType) => {
  if (!serverType) return false
  const sType = serverType.toLowerCase()

  const typeMap = {
    'text': [
        'text', 'string', 'textarea', 'input', 'text_area', 'long_text',
        'culpa', 'laborum adipisicing eiusmod', 'veniam nisi in aliqua',
        'proident non ullamco cillum amet', 'eu', 'magna voluptate aute',
        'tempor deserunt', 'text_input', 'text_field', 'pariatur labore cillum ea ut'
    ],
    // 🚀 修复点：将 'scale' 归类到 'radio' 下
    'radio': ['radio', 'single', 'choice', 'single_select', 'scale', 'select'],
    'checkbox': ['checkbox', 'multiple', 'multi_select', 'multi'],
    'file': ['file', 'image', 'upload', 'picture']
  }
  return typeMap[localType]?.some(t => sType.includes(t))
}

// --- 选项标签处理函数 ---
const getOptionLabel = (opt, index) => {
  if (typeof opt === 'string') {
    // 字符串选项，直接显示
    return opt
  } else if (opt && typeof opt === 'object') {
    // 对象选项，支持 value 和 text
    return opt.text ? `${opt.value}. ${opt.text}` : (opt.value || opt.label || `选项${index + 1}`)
  } else {
    // 其他情况
    return `选项${index + 1}`
  }
}

// --- 生成校验规则 (保持不变) ---
const getRules = (q) => {
  const required = q.is_required === true || q.is_required === 'true' || q.is_required === '1'
  if (!required) return []
  
  const label = q.label || '此项'
  
  // 数组类型的校验 (多选、文件)
  if (isType(q.question_type, 'checkbox') || isType(q.question_type, 'file')) {
    return [
      { required: true, message: `请选择 ${label}`, trigger: 'change' },
      { 
        validator: (rule, value, callback) => {
          if (value && value.length > 0) {
            callback()
          } else {
            callback(new Error(`请完成 ${label}`))
          }
        }, 
        trigger: 'change' 
      }
    ]
  }
  
  // 普通文本/单选/量表校验
  return [{ required: true, message: `${label} 不能为空`, trigger: 'blur' }]
}

// --- 页面加载 ---
onMounted(async () => {
  if (!deptId) {
    ElMessage.error('缺少科室ID，无法加载问卷。');
    return
  }
  try {
    const data = await getQuestionnaire(deptId)

    // 确保获取问卷 ID (无论是 questionnaires_id 还是 questionnaire_id)
    questionnaireId.value = data.data.questionnaire_id || data.data.id || ''

    if (!questionnaireId.value) {
        ElMessage.error('后端返回的问卷模板中缺少 ID 字段，无法提交。');
    }

    questions.value = data.data.questions || []
    
    // 初始化 formData
    questions.value.forEach(q => {
      if (isType(q.question_type, 'checkbox') || isType(q.question_type, 'file')) {
        // 多选/文件初始化为空数组
        formData[q.question_id] = [] 
      } else {
        // 文本/单选/量表初始化为空字符串
        formData[q.question_id] = '' 
      }
    })
  } catch (error) {
    console.error('加载问卷失败', error)
    ElMessage.error('问卷加载失败，请检查网络或权限。')
  }
})

// --- 文件上传 ---
const customUpload = async (options, qId) => {
  try {
    const res = await uploadFile(options.file)
    const fileId = res.file_id || res.id || res.data?.file_id || res.data?.id
    
    if (fileId) {
      if (Array.isArray(formData[qId])) {
        formData[qId].push(fileId)
      } else {
        formData[qId] = [fileId]
      }
      ElMessage.success('上传成功')
      formRef.value.validateField(qId) 
    } else {
      ElMessage.error('上传成功但未返回文件ID')
      options.onError()
    }
  } catch (error) {
    ElMessage.error('上传失败')
    options.onError()
  }
}

const handleRemove = (qId, file, files) => {
    // 移除上传列表中的 fileId
    const fileToRemove = file.name; // 我们用 name 字段存储 fileId
    if (Array.isArray(formData[qId])) {
        const index = formData[qId].indexOf(fileToRemove);
        if (index > -1) {
            formData[qId].splice(index, 1);
        }
    }
    formRef.value.validateField(qId);
}

const handlePreview = (uploadFile) => {
  dialogImageUrl.value = uploadFile.url || uploadFile.name
  dialogVisible.value = true
}

// --- 提交表单 (修复 Payload 结构和跳转逻辑) ---
const submitForm = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      if (!questionnaireId.value) {
          ElMessage.error('提交失败：缺少问卷ID (questionnaire_id)。');
          return
      }
      
      submitting.value = true
      try {
        // 1. 提取 answers 和 file_id
        const answers = {}
        const fileIds = []
        
        for (const qId in formData) {
            const q = questions.value.find(item => item.question_id === qId)
            
            if (q && isType(q.question_type, 'file')) {
                // 文件 ID 集中收集
                if (Array.isArray(formData[qId])) {
                    fileIds.push(...formData[qId])
                }
            } else if (q) {
                // 其他回答收集
                answers[qId] = formData[qId]
            }
        }
        
        // 2. 构造符合后端要求的 payload
        const payload = {
          questionnaire_id: questionnaireId.value, 
          department_id: deptId,
          answers: answers, 
          file_id: fileIds // 文件ID列表
        }
        
        const res = await submitQuestionnaire(payload)
        
        ElMessage.success('提交成功！')
        
        // 提交成功后，获取 record_id 并跳转到详情页
        const submissionId = res.record_id || res.data?.record_id || res.submission_id || res.data?.submission_id;
        
        if (submissionId) {
            // 跳转到详情页
            router.push({ name: 'SubmissionDetail', params: { submissionId: submissionId } });
        } else {
            // 如果后端未返回 ID，则跳转到主页/我的问卷列表
            router.push('/'); 
        }

      } catch (error) {
        console.error('提交问卷失败:', error)
        ElMessage.error(`提交失败: ${error.message || '服务器拒绝请求'}`)
      } finally {
        submitting.value = false
      }
    } else {
      ElMessage.warning('请检查是否有必填项未完成')
      return false
    }
  })
}

const goBack = () => router.back()
</script>

<style scoped>
.q-container { max-width: 600px; margin: 20px auto; padding: 25px; background: #fff; box-shadow: 0 4px 16px rgba(0,0,0,0.05); border-radius: 8px;}
.question-item { margin-bottom: 30px; border-bottom: 1px dashed #eee; padding-bottom: 20px; }
.question-item:last-child { border-bottom: none; }
.q-title { margin-bottom: 12px; font-weight: 600; font-size: 16px; display: flex; align-items: center; }
.index { margin-right: 8px; color: #409EFF; font-weight: bold; }
.required { color: #F56C6C; margin-left: 4px; font-size: 18px; line-height: 1; }
.footer-btn { margin-top: 40px; text-align: center; }
.footer-btn .el-button { width: 100%; height: 45px; font-size: 16px; border-radius: 25px;}
.mb-4 { margin-bottom: 20px; }
</style>