// /src/apps/patient_app/api/index.js 完整代码

import axios from 'axios'
import { ElMessage } from 'element-plus'

// 1. 创建 axios 实例
const request = axios.create({
  baseURL: '/api', // 使用代理路径，由 vite.config.js 转发
  timeout: 120000
})

// 2. 请求拦截器：自动附加 Token
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. 响应拦截器
request.interceptors.response.use(
  (res) => {
    if (!res.data) {
      return Promise.reject(new Error('Invalid response format'));
    }
    const { base, data } = res.data

    // 智能区分API需求
    // 对于只需要数据的API（如DepartmentView），返回data字段
    // 对于需要完整响应的API（如SubmissionDetailView），返回{base, data}
    // 对于问诊详情API，返回data字段以匹配前端期望
    if (res.config.url.includes('/departments')) {
      // DepartmentView只需要数据
      if (data) {
        return data
      }
      // 如果没有data，返回空数组或其他默认值
      return []
    }

    if (res.config.url.includes('/questionnaires/record/')) {
      // SubmissionDetailView需要data字段
      if (data) {
        return data
      }
      return {}
    }

    // 其他API返回完整响应
    // 如果 data 存在，返回完整响应
    if (data) {
      return res.data
    }

    // 统一处理后端错误码
    if (base && base.code !== '200' && base.code !== '0' && base.code !== '10000') {
      ElMessage.error(base.msg || '请求出错')
      return Promise.reject(new Error(base.msg))
    }

    return res.data
  },
  (err) => {
    console.error('API Error:', err)
    
    // 增强错误处理
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        ElMessage.error('权限验证失败，请重新登录。');
    } else if (err.response && err.response.status === 404) {
         ElMessage.error('请求地址未找到 (404)，请检查 API 路径是否正确。'); 
    } else {
        ElMessage.error(err.message || '网络请求失败');
    }
    
    return Promise.reject(err)
  }
)

// --- 4. 接口定义 ---

// 获取所有科室
export const getDepartments = () => {
  return request.get('/departments')
}

// 获取问卷模板详情 (GET /questionnaires/{deptId})
export const getQuestionnaire = (deptId) => {
  return request.get(`/questionnaires/${deptId}`)
}

// 提交问卷 (POST /questionnaires/submit)
export const submitQuestionnaire = (data) => {
  return request.post('/questionnaires/submit', data, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// 文件上传 (POST /questionnaires/upload)
export const uploadFile = (file) => {
  const formData = new FormData()
  formData.append('file', file) 
  
  return request.post('/questionnaires/upload', formData, {
    headers: { 
      'Content-Type': 'multipart/form-data' 
    }
  })
}

// 🌟 核心修正：将 getQuestionnaireInfo 重命名为 getQuestionnaireDetail
// 获取问诊详情/概要信息 (GET /questionnaires/record/{record_id})
export const getQuestionnaireDetail = (recordId) => {
    return request.get(`/questionnaires/record/${recordId}`);
}

// 获取已提交问卷列表 (GET /questionnaires/submit)
export const getSubmittedQuestionnaire = () => {
    return request.get(`/questionnaires/submit`);
}