# 记录榜素材

按设计参考图新增的一组独立素材。原有 `assets` 文件保持不变。

| 文件 | 用途 | 复用方式 |
| --- | --- | --- |
| `ink-page-background.png` | 深色全屏水墨背景，包含右上角月亮楼阁和边缘山石 | 页面背景；已经包含月亮楼阁，不要再叠加旧 `moon_pavilion.png` |
| `qq-speed-logo-white.png` | 白色双行品牌字标，透明底 | 顶部导航和其他深色页面 |
| `seal-guofu.svg` | 朱红色国服印章，字形为路径，无字体依赖 | 栏目标题旁复用 |
| `title-brush-red.svg` | 主标题右下方的朱红笔刷 | 不同标题共用，可等比缩放 |
| `track-ink-mask.svg` | 缩略图右侧水墨边缘，白色区域显示图片，透明区域隐藏 | 所有赛道图片共用；作为 CSS mask 使用 |
| `record-days-brush.svg` | 保持天数背后的米白笔刷，不含文字 | 所有记录共用；天数与文字由页面独立渲染 |

PNG 由内置 imagegen 根据参考图生成；SVG 使用独立矢量路径绘制。它们是参考图的重建素材，不是原设计源文件的无损导出。品牌字标同样为根据参考图重建的版本。

## Vue / Vite 引用

```ts
import backgroundUrl from '@/assets/record-board/ink-page-background.png'
import logoUrl from '@/assets/record-board/qq-speed-logo-white.png'
import maskUrl from '@/assets/record-board/track-ink-mask.svg?url'
import daysBrushUrl from '@/assets/record-board/record-days-brush.svg?url'
```

赛道图的 mask 必须使用透明度模式。不要把遮罩作为普通图片覆盖在赛道图上。

```vue
<img
  :src="track.imageUrl"
  :style="{
    maskImage: `url(${maskUrl})`,
    WebkitMaskImage: `url(${maskUrl})`,
    maskMode: 'alpha',
    maskSize: '100% 100%',
    WebkitMaskSize: '100% 100%',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    objectFit: 'cover',
  }"
  alt=""
/>
```

背景建议 `background-position: center top; background-size: cover; background-repeat: no-repeat; background-color: #111;`。月亮位于右上角，不建议平铺。

生成提示词保存在项目根目录 `output/record-board-assets/generation-prompts.md`，预览位于同目录 `preview.html`。
