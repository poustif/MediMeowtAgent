import { createRouter, createWebHistory } from 'vue-router';  
import patientRoutes from './patientRoutes'; // 患者端路由  
import doctorRoutes from './doctorRoutes'; // 新增的医生端路由  
  
const routes = [  
  // ⭐️ 添加这一行：当用户访问根路径 '/' 时，自动重定向到 '/patient/login'
  { path: '/', redirect: '/patient/login' }, 
  
  // 然后再包含你的其他路由
  ...patientRoutes,  
  ...doctorRoutes,  
  // 可添加其他公共路由...  
];  
  
const router = createRouter({  
  history: createWebHistory(),  
  routes,  
});  
  
// 路由守卫：分别处理医生、患者的登录态  
router.beforeEach((to, from, next) => {  
  const isDoctorRoute = to.path.startsWith('/doctor');  
  const isPatientRoute = to.path.startsWith('/patient');  
  const doctorToken = localStorage.getItem('doctorToken');  
  const patientToken = localStorage.getItem('userToken');  
  
  if (isDoctorRoute) {  
    if (to.meta.requiresAuth && !doctorToken) {  
      next('/doctor/login'); // 医生未登录→跳医生登录页  
    } else {  
      next();  
    }  
  } else if (isPatientRoute) {  
    // 此外，为了避免在重定向发生时 patientToken 为空而导致无限重定向或多余跳转，
    // 这里可以稍作优化，判断一下如果目标已经是 /patient/login 或者根路径重定向到 /patient/login，
    // 就不需要再次 next('/patient/login')。
    // 不过，Vue Router 的 redirect 优先级通常高于 beforeEach，所以问题不大。
    // 这里保持原逻辑，因为 next('/') 已经被redirect处理了。
    if (to.meta.requiresAuth && !patientToken) {  
      next('/patient/login'); // 患者未登录→跳患者登录页  
    } else {  
      next();  
    }  
  } else {  
    next();  
  }  
});  
  
export default router;