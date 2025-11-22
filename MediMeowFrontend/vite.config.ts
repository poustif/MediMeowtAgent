// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 从 c.html 中提取的后端服务器地址
const backendServerUrl = 'http://124.221.70.136:11391';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // 配置开发服务器代理，用于解决跨域问题
    proxy: {
      // 当请求路径以 '/api' 开头时，触发代理
      '/api': {
        target: backendServerUrl, // 目标后端服务器地址
        changeOrigin: true,       // 允许跨域
        // 重写请求路径，去掉 '/api' 前缀
        // 例如：/api/user/login -> /user/login
        rewrite: (path) => path.replace(/^\/api/, ''), 
      },
    },
  },
})