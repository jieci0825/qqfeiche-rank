# 保持天数笔刷生成记录

- 工具：内置 `imagegen`，透明背景输出。
- 参考：用户提供的「保持 64 天」局部截图。
- 输出：`record-days-brush.png`，2170 × 725，保留生成素材的透明通道。
- 页面：独立渲染动态文字，背景使用 `110% auto` 补偿透明留白并保持笔刷比例。

## 最终提示词

```text
Use case: background-extraction. Asset type: transparent PNG brush-stroke background for a website's dynamic day counter. Edit target: the provided close-up screenshot. Extract/reconstruct ONLY the single warm gray beige painted brush stroke behind the Chinese characters and number. Remove ALL characters and digits (保持 64 天), seamlessly filling their areas with the same brush paint; remove the entire surrounding dark background. Match the reference silhouette closely: a long horizontal solid band roughly 5.2 times wider than its painted height, with mostly flat but subtly uneven parallel top and bottom edges; a steep slanted rounded rough left start near the top-left, widening toward the lower-left, with a few fine horizontal dry-brush tails at bottom-left; on the right a blunt oblique taper down and left, rough natural feathered bristles, with two very narrow horizontal dry-brush gaps near the upper-right tip. It is NOT a pointed swoosh, arrow, zigzag polygon, paper strip, or symmetric capsule. Keep the broad center solid and uninterrupted, the hand-painted irregularities small and concentrated at the ends, faithful to screenshot. Muted warm gray beige paint: solid middle around #c9c6bc and #d0cdc3, slightly darker edges #b9b6ac, restrained subtle natural paint grain. No black outlines, no shadow, no dark halo, no letters, no numbers, no symbols, no new objects. Real transparent alpha outside the stroke, including in the sparse dry brush gaps. Frame the complete horizontal brush with only a very small transparent margin, centered in a wide landscape canvas; no large empty margins. This is a reusable background asset; text will be rendered separately by the app.
```
