/**
 * Element Plus 按需引入的样式补充。
 *
 * unplugin-vue-components 只会处理模板里出现的 <el-*> 组件和指令，
 * 下面这些通过 JS API 调用的服务式组件不会被模板扫描到，样式需要手动引入。
 *
 * 对应组件：
 * - ElMessage
 * - ElMessageBox
 * - ElNotification
 * - ElLoading（服务式调用与 v-loading 指令）
 * - ElInfiniteScroll（v-infinite-scroll 指令，main.ts 中手动注册）
 *
 * 后续新增上述组件的调用时，不需要再单独引入样式。
 */
import 'element-plus/es/components/message/style/index'
import 'element-plus/es/components/message-box/style/index'
import 'element-plus/es/components/notification/style/index'
import 'element-plus/es/components/loading/style/index'
import 'element-plus/es/components/infinite-scroll/style/index'
