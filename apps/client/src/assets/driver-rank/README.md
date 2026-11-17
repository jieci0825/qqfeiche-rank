# 车手排行素材

依据本次车手排行设计截图整理的独立素材，供后续页面实现使用。PNG 使用内置 imagegen 提取、去除文字和头像，并补绘被遮挡的部分；它们是依据截图重建的素材，并非原始分层稿的无损导出。细线、菱形装饰使用 SVG 重建。

## 素材清单

| 文件 | 用途 |
| --- | --- |
| `podium-gold.png` | 冠军空白底板：金色边框、山水与底部流光 |
| `podium-silver.png` | 亚军空白底板：银色边框、山水与底部流光 |
| `podium-bronze.png` | 季军空白底板：铜色边框、山水与底部流光 |
| `badge-gold.png` | 冠军菱形麦穗徽章，不含数字 |
| `badge-silver.png` | 亚军菱形麦穗徽章，不含数字 |
| `badge-bronze.png` | 季军菱形麦穗徽章，不含数字 |
| `list-card.png` | 第 4 名起复用的横向空白卡片 |
| `rank-ring.png` | 普通排名的金色笔刷圆环，不含数字 |
| `section-divider.png` | 前三名与普通列表之间的交叉赛车旗及左右横线 |
| `title-brush.png` | 页面标题下方的金色笔刷流光，不含文字 |
| `score-laurels.png` | 冠军国服数量两侧的独立麦穗装饰 |
| `stat-divider-gold.svg` | 冠军数量标题两侧的细线与菱形，中央留空 |
| `stat-divider-silver.svg` | 亚军数量标题两侧的细线与菱形，中央留空 |
| `stat-divider-bronze.svg` | 季军数量标题两侧的细线与菱形，中央留空 |
| `count-underline.svg` | 右上角车手总数下方的金色细线与菱形 |

## 接入约定

- 头像和车队标识沿用 `../record-board/default-driver.svg`、`../record-board/default-team.svg`，不重复制作；字体沿用全局设置。
- 姓名、车队名、排名、数量和总人数均由页面动态渲染。普通卡片的分数竖分隔线及头像框由 CSS 实现。
- 卡片内部保留深色底纹，外部透明；普通排名圆环和麦穗中间留空。保留 PNG 原有透明通道，避免铺白色底。
- PNG 包含透明留白，各文件尺寸与可见内容范围记录在 `manifest.json`。布局应按可见内容定位，不能把整张 PNG 的中心直接当作徽章数字中心。
- `manifest.json` 中 `contentBounds` 为 alpha > 8 的可见区域，格式为左、上、右、下，右和下不包含在区域内；`contentBoundsRatio` 为对应的 0–1 坐标，可用于补偿透明留白。边缘极淡的光晕可能在此区域之外，原图仍保留它们。
- 卡片底板与徽章独立叠放；冠军底板不包含国服数量旁的麦穗，也不包含数量标题分隔线。
- PNG 等比缩放。适配不同比例时优先调整内容布局，避免把边框、山水和徽章整体横向拉伸。
- SVG 可直接通过 Vite 默认资源导入引用，中央留空供文字叠加；若调整文字宽度，也可以拆成左右两侧渲染。

```ts
import goldCardUrl from '@/assets/driver-rank/podium-gold.png'
import goldBadgeUrl from '@/assets/driver-rank/badge-gold.png'
import rankRingUrl from '@/assets/driver-rank/rank-ring.png'
```

生成提示词：[generation-prompts.md](./generation-prompts.md)。独立预览：[preview.html](./preview.html)。预览仅展示素材，不接入业务页面。
