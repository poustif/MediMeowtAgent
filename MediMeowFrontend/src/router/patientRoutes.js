// src/router/patientRoutes.js  

// 使用相对路径，并'确保'路径中包含了 'views' 文件夹  
import PatientLogin from '../apps/patient_app/views/PatientLogin.vue';  
import PatientIdentity from '../apps/patient_app/views/PatientIdentity.vue';  
import PatientMainPage from '../apps/patient_app/views/PatientMainPage.vue';  
import PatientMyPage from '../apps/patient_app/views/PatientMyPage.vue';  

// 这两个问卷相关的组件，请确认它们是否也在 views 文件夹里  
// 如果在，就保持下面这样。如果不在，就去掉路径中的 /views  
import DepartmentView from '../apps/patient_app/views/DepartmentView.vue';  
import QuestionnaireView from '../apps/patient_app/views/QuestionnaireView.vue';  

// ====================== 1. 新增：导入 SubmissionDetailView 组件 ======================
// 请确保这个新组件也放在了 'views' 文件夹下
import SubmissionDetailView from '../apps/patient_app/views/SubmissionDetailView.vue';

const patientRoutes = [  
  {  
    path: '/patient/login',  
    name: 'PatientLogin',  
    component: PatientLogin,  
  },  
  {  
    path: '/patient/main',  
    name: 'PatientMain',  
    component: PatientMainPage,  
    meta: { requiresAuth: true }  
  },  
  {  
    path: '/patient/identity',  
    name: 'PatientIdentity',  
    component: PatientIdentity,  
    meta: { requiresAuth: true }  
  },  
  {  
    path: '/patient/my',  
    name: 'PatientMyPage',  
    component: PatientMyPage,  
    meta: { requiresAuth: true }  
  },  
  {  
    path: '/patient/department-selection',  
    name: 'DepartmentSelection',   
    component: DepartmentView,  
    meta: { requiresAuth: true }  
  },  
  {  
    path: '/patient/questionnaire/:deptId',   
    name: 'PatientQuestionnaire',  
    component: QuestionnaireView,  
    meta: { requiresAuth: true }  
  },
  
  // ====================== 2. 新增：为问诊单详情页添加路由 ======================
  {
    // URL 路径，:submissionId 是一个动态参数，会接收问卷提交后的 ID
    path: '/patient/submission/:submissionId', 
    // 路由名称，必须和 QuestionnaireView.vue 中跳转时使用的 'SubmissionDetail' 完全一致
    name: 'SubmissionDetail',
    // 指定要渲染的组件
    component: SubmissionDetailView,
    // 这个页面也需要登录后才能访问
    meta: { requiresAuth: true }
  },
  // =========================================================================
];  

export default patientRoutes;