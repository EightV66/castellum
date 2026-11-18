# 素材来源与许可

## 建筑与地形

城市、山翼、群山、道路、树木和废墟由项目参数化源码生成。石砖和屋瓦的纹理、窗花、王室旗帜、徽章、地志与地图由本项目绘制。建筑取形参考用户指定的哥特式教堂特征。用户提供的概念图用于构图、尺度和色彩参考。

## 生成纹理

以下两幅 JPEG 使用 OpenAI ImageGen 为本项目生成并随网页本地分发。天空纹理只包含云，岩石纹理只包含表面。直接打开两幅图均可查看素材本身。

- [冬季云幕](public/winter-sky.jpg) 用于天空穹顶，由实时着色器调整光色并叠加流动云雾。
- [冰蚀板岩](public/glacial-slate.jpg) 用于山体的三向投影采样和翼山的纵向岩纹。

<details>
<summary>生成提示词</summary>

**冬季云幕**

Use case: stylized-concept. Create an ORIGINAL sky texture only for a realtime ice-fantasy environment, a very wide seamless cylindrical panoramic cloudscape, 3:1 horizontal composition. There is no land, ocean, architecture or character anywhere. From left to right and at both edges immense painterly blue-slate, cobalt and muted teal storm cloud banks with deep shadow shapes, richly sculpted cloud volumes, atmospheric shafts and silver ridgelight. Near the horizontal middle, about 47% from the left and 46% from the top, clouds break to reveal concentrated radiant pale butter gold winter sunlight, half-veiled by pearl cloud wisps. An expansive glacial blue horizon haze fills the bottom quarter, the top edge is dark indigo storm cover. Both vertical side edges similarly dark blue. High dynamic-range feeling, majestic, broad calm gradients and carefully articulated billows, authentic high-end environment concept art with naturalistic silver light. Just the sky, no creatures, no mountains, no floating islands, no stars, no text, no borders. Wide panorama.

**冰蚀板岩**

Use case: photorealistic-natural. Deliver a single square seamless environment albedo texture tile, an orthographic full-frame close survey of weathered glacial slate and exposed alpine bedrock in an arctic cliff. Rich charcoal navy rock, irregular fractured overlapping plates, fine silver seams with sparse pale blue ice packed into deep fissures. Strong broad angular bedding in uneven oblique directions, thin striations and hairline cracks at several scales, rough mineral detail. Natural irregular fracturing rather than even stripes or repetitive bricks. Even overcast diffuse illumination suitable for a real-time PBR material, sharp, moderately varied values. Rock fills every edge. No horizon, no buildings, no text, no vegetation, no border. Avoid large white snow patches: snow is supplied separately by the game engine.

</details>

## 声音与字体

冰川低鸣、风、雨、雷、钟声与氛围音乐由 Web Audio 实时合成。页面使用本机已有的 Georgia、Times New Roman、Segoe UI、Microsoft YaHei 以及宋体等系统字体。

## 第三方代码

- Three.js 0.180.0 及同版本的 OrbitControls、后期处理和几何合并工具适用 MIT 许可。[本地许可证](licenses/THREE-MIT.txt) · [上游源码](https://github.com/mrdoob/three.js/tree/r180)
- 历史海岸版的 ReflectiveWater 模块源于 Three.js r180 的 Water.js。山地版运行入口使用冰川地形。[原始实现](https://github.com/mrdoob/three.js/blob/r180/examples/jsm/objects/Water.js)
- Vite 7.1.12 用于开发与构建，附有软件及所含组件的许可文本。[本地许可证](licenses/VITE-LICENSE.md)
