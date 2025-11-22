<template>
  <!-- 
    这个组件现在只做一个事情：
    作为路由的出口，显示当前 URL 匹配到的组件。
    所有共享的布局和导航都已移除。
  -->
  <router-view />
</template>

<script setup>
// 这里不再需要任何逻辑
</script>

<style>
/* 
  所有跟 app-header 相关的样式都已被移除。
  全局样式在 main.js 中引入。
  每个页面（PatientView, DoctorView）负责自己的样式。
*/
</style>