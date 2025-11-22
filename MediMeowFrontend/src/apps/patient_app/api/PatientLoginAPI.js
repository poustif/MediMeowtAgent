// D:\code\ruangong\new\src\apps\patient_app\api\PatientLoginAPI.js
import axios from 'axios';

const APIFOX_AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJOYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwiaWF0IjoxNzE2NDI1NjY0LCJleHAiOjE3NDc5NjE2NjR9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

const service = axios.create({
  baseURL: '/api', // 通过 Vite 代理到后端真实地址
  timeout: 10000,
});

service.interceptors.request.use(
  (config) => {
    if (APIFOX_AUTH_TOKEN) {
      config.headers['Apifox-Auth'] = APIFOX_AUTH_TOKEN;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

service.interceptors.response.use(
  (response) => {
    console.log('后端原始响应:', response.data); 
    return response.data; 
  },
  (error) => {
    console.error('API 请求出错:', error.response || error.message);
    if (error.response && error.response.data) {
        return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
);

export const login = (data) => {
  return service.post('/user/login', data);
};
export const register = (data) => {
  return service.post('/user/register', data);
};

export { service }; // ⚡ 导出 service 实例，供其他模块复用