import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import { ElInfiniteScroll, ElLoading } from 'element-plus'
import '@/icons'
import '@/styles/index.scss'
import App from './App.vue'
import router from './router'
import { setUpMenuRoutes } from './router/menu-routes'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

const auth = useAuthStore(pinia)
// 路由守卫在菜单请求完成后会立即重新匹配当前地址。
watch(() => auth.menus, (menus, previousMenus, onCleanup) => {
    if (!menus) return
    onCleanup(setUpMenuRoutes(router, menus))

    const { path, query, hash, meta } = router.currentRoute.value
    if (previousMenus && meta.requiresAuth) {
        void router.replace({ path, query, hash, force: true })
    }
}, { flush: 'sync' })
watch(() => auth.isLoggedIn, loggedIn => {
    if (!loggedIn && router.currentRoute.value.meta.requiresAuth) {
        void router.replace({ name: 'admin-login' })
    }
})
app.use(router)

// 这两个是指令 / 服务式插件，不在模板组件扫描范围内，需要单独注册。
app.use(ElLoading)
app.directive('infinite-scroll', ElInfiniteScroll)

app.mount('#app')
