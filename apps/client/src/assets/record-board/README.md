# 记录榜素材

按设计参考图新增的一组独立素材。原有 `assets` 文件保持不变。

| 文件 | 用途 | 复用方式 |
| --- | --- | --- |
| `ink-page-background.png` | 深色全屏水墨背景，包含右上角月亮楼阁和边缘山石 | 页面背景；已经包含月亮楼阁，不要再叠加旧 `moon_pavilion.png` |
| `qq-speed-logo-white.png` | 白色双行品牌字标，透明底 | 顶部导航和其他深色页面 |
| `seal-guofu.svg` | 朱红色国服印章，字形为路径，无字体依赖 | 栏目标题旁复用 |
| `title-brush-red.svg` | 主标题右下方的朱红笔刷 | 不同标题共用，可等比缩放 |
| `record-days-brush.png` | 参照局部截图生成的暖灰米色笔刷，透明底，不含文字 | 所有记录共用；天数与文字由页面独立渲染；背景使用 `110% auto` 补偿透明留白并保持轮廓比例 |
| `default-driver.svg` | 本地矢量绘制的赛车头盔头像 | 车手头像为空或加载失败时使用 |
| `default-team.svg` | 本地矢量绘制的盾牌闪电徽标 | 车队徽标为空或加载失败时使用 |
| `default-track.svg` | 本地矢量绘制的山路封面 | 赛道图片为空或加载失败时使用 |

PNG 由内置 imagegen 根据参考图生成；SVG 使用独立矢量路径绘制。它们是参考图的重建素材，不是原设计源文件的无损导出。品牌字标同样为根据参考图重建的版本。

保持天数笔刷的本次生成提示词和接入方式见 [record-days-brush.prompt.md](./record-days-brush.prompt.md)。

## Vue / Vite 引用

```ts
import backgroundUrl from '@/assets/record-board/ink-page-background.png'
import logoUrl from '@/assets/record-board/qq-speed-logo-white.png'
import daysBrushUrl from '@/assets/record-board/record-days-brush.png'
```

赛道图不再依赖水墨遮罩图片，改由 `RecordCard.vue` 内的 CSS 渐变遮罩实现。使用 `mask-mode: alpha`，左侧 30% 保持清晰，后 70% 通过多个透明度节点平缓淡出，右边缘完全透明并融入卡片背景。渐变随缩略图宽度缩放，桌面和移动端共用；调整 `--record-card-image-mask` 即可修改过渡范围和强度。

`url(...)` 内的地址必须加引号，Vite 可能将 SVG 转换为含有引号的内联 data URL；未加引号会导致浏览器忽略整条样式。

背景建议 `background-position: center top; background-size: cover; background-repeat: no-repeat; background-color: #111;`。月亮位于右上角，不建议平铺。

生成提示词保存在项目根目录 `output/record-board-assets/generation-prompts.md`，预览位于同目录 `preview.html`。
