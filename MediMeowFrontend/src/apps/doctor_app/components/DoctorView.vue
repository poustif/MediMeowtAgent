<template>
  <div class="doctor-view">
    <h1>医生工作平台</h1>
    <div class="function-cards">
      <router-link to="/doctor/queue" class="card">
        <h3>待诊列表</h3>
        <p>查看并处理患者的待诊请求</p>
      </router-link>
      <router-link to="/doctor/questionnaire/import" class="card">
        <h3>导入问卷</h3>
        <p>上传.xlsx格式问卷，用于患者评估</p>
      </router-link>
    </div>
  </div>
</template>

<script setup>
// 无额外逻辑，仅作为路由跳转入口
</script>

<style scoped>
/* 页面整体样式优化：简化渐变背景（避免解析报错），保留色彩层次 */
.doctor-view {
  padding: 40px 24px;
  max-width: 1200px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  /* 简化为单一线性渐变，兼容所有环境，色彩柔和不刺眼 */
  background: linear-gradient(135deg, #f5fafe 0%, #eaf6fa 100%);
  min-height: calc(100vh - 40px); /* 占满屏幕高度，布局更饱满 */
}

/* 标题样式优化：专业配色+间距调整 */
.doctor-view h1 {
  color: #1e293b; /* 深灰蓝，专业稳重 */
  font-size: 28px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 48px;
  position: relative;
}

/* 标题下方小横线，增强视觉焦点 */
.doctor-view h1::after {
  content: '';
  display: block;
  width: 80px;
  height: 3px;
  background-color: #3b82f6; /* 医疗蓝，突出专业属性 */
  margin: 12px auto 0;
  border-radius: 2px;
}

/* 卡片容器布局优化：响应式+均匀分布 */
.function-cards {
  display: flex;
  gap: 32px;
  margin-top: 32px;
  flex-wrap: wrap;
  justify-content: center; /* 水平居中，适配小屏幕 */
}

/* 功能卡片样式升级：立体+交互感（去掉backdrop-filter避免解析报错） */
.card {
  flex: 1 1 calc(40% - 16px); /* 响应式宽度，最小宽度适配 */
  min-width: 280px; /* 小屏幕下最小宽度，避免变形 */
  padding: 32px 24px;
  background-color: #ffffff; /* 纯色背景，确保兼容性 */
  border-radius: 12px; /* 大圆角，现代感 */
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); /* 柔和阴影，立体感 */
  text-decoration: none;
  color: #1e293b;
  transition: all 0.3s ease; /* 平滑过渡，提升交互体验 */
  border: 1px solid #f0f0f0; /* 细边框，增强轮廓感 */
  position: relative;
  overflow: hidden;
}

/* 卡片hover效果：阴影加深+轻微上浮 */
.card:hover {
  transform: translateY(-5px); /* 上浮5px，动态感 */
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  border-color: #3b82f6; /*  hover时边框变蓝，突出选中状态 */
}

/* 卡片标题样式优化：醒目+间距 */
.card h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #3b82f6; /* 主题蓝，突出标题 */
  display: flex;
  align-items: center;
}

/* 标题前小图标（纯CSS实现，无需额外导入） */
.card h3::before {
  content: '📋'; /* 图标字符，适配医疗场景 */
  margin-right: 8px;
  font-size: 24px;
}

/* 第二个卡片图标区分 */
.card:nth-child(2) h3::before {
  content: '📤'; /* 导入相关图标 */
}

/* 卡片描述文字优化：可读性提升 */
.card p {
  font-size: 14px;
  color: #64748b; /* 浅灰色，不抢标题风头 */
  line-height: 1.6;
  margin: 0;
}

/* 底部渐变装饰，增强细节感 */
.card::after {
  content: '';
  display: block;
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, #3b82f6, #60a5fa); /* 渐变蓝，现代感 */
}

/* 响应式适配：小屏幕下垂直排列 */
@media (max-width: 768px) {
  .function-cards {
    gap: 24px;
  }

  .card {
    flex: 1 1 100%; /* 小屏幕下占满宽度 */
    padding: 28px 20px;
  }

  .doctor-view h1 {
    font-size: 24px;
    margin-bottom: 36px;
  }
}
</style>