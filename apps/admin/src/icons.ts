import { addCollection } from '@iconify/vue/offline'
import icons from '@iconify-json/ep/icons.json'

// 离线注册 ep 图标集：图标随构建产物内置，运行时不请求 Iconify API。
addCollection(icons)

addCollection({
    prefix: 'qqfeiche',
    width: 24,
    height: 24,
    icons: {
        'flag-outline': {
            body: '<path d="M5 21V3m0 1h14l-3 5 3 5H5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
        },
        'role-outline': {
            body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.75"/><path d="M5.5 15.5a3 3 0 0 1 6 0M14 10h4m-4 4h4"/></g>',
        },
        'menu-outline': {
            body: '<g fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="6.5" height="6.5" rx="1"/><rect x="14.5" y="3" width="6.5" height="6.5" rx="1"/><rect x="3" y="14.5" width="6.5" height="6.5" rx="1"/><rect x="14.5" y="14.5" width="6.5" height="6.5" rx="1"/></g>',
        },
    },
})

export { Icon } from '@iconify/vue/offline'
