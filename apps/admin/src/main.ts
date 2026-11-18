import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import { ElInfiniteScroll, ElLoading } from 'element-plus'
import '@/icons'
import '@/styles/element/manual'
import '@/styles/index.scss'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const auth = useAuthStore(pinia)
watch(() => auth.isLoggedIn, loggedIn => {
    if (!loggedIn && router.currentRoute.value.meta.requiresAuth) {
        void router.replace({ name: 'admin-login' })
    }
})

// 这两个是指令 / 服务式插件，不在模板组件扫描范围内，需要单独注册。
app.use(ElLoading)
app.directive('infinite-scroll', ElInfiniteScroll)

app.mount('#app')
