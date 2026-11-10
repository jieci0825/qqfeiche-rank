import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { ElInfiniteScroll, ElLoading } from 'element-plus'
import '@/styles/element/manual'
import '@/styles/index.scss'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 这两个是指令 / 服务式插件，不在模板组件扫描范围内，需要单独注册。
app.use(ElLoading)
app.directive('infinite-scroll', ElInfiniteScroll)

app.mount('#app')
