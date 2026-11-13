import { addCollection } from '@iconify/vue/offline'
import icons from '@iconify-json/ep/icons.json'

// 离线注册 ep 图标集：图标随构建产物内置，运行时不请求 Iconify API。
addCollection(icons)

export { Icon } from '@iconify/vue/offline'
