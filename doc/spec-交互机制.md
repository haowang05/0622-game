# 交互机制规格（代码基准）

## 1. 场景切换机制

- 统一调用：`QW.TransitionManager.goto(scene, targetKey)`
- 视觉：仅**跨场景**切换使用黑色淡出 125ms + 淡入 125ms
- 同场景 `scene.restart()` 或状态刷新：调用 `QW.TransitionManager.finishEnter(scene)`，**不使用**黑色 fade
- `MainMenu` / `Intro` 首次进入：子元素缓慢 alpha 淡入（非黑幕）
- 保护：`isTransitioning` 期间禁止重复切换

## 1.1 音频（`QW.AudioManager`）

- 集中加载：`code/assets/sound/*`
- BGM：`前bgm(1)`（至 `HouseExterior` 前）→ `后bgm2(1)`（自 `HouseExterior` 起）
- 点击：`playClick()`（独立更小音量）；若同帧已触发其它 SFX，则跳过点击音
- 专用 SFX：`playWatering()` / `playSaw()` / `playDoor()` / `playSigh()`

## 2. 通用交互类型

- 查看弹窗（书架照片、日记、相机照片）
- 道具获取（钥匙/水壶/木头/锯子/锤子/钉子）
- 道具门禁使用（选中 + 条件）
- 状态替换（花云鱼点亮、背景点亮、沙发修复图层）
- 连续点击推进（S16、结局覆盖链）

## 3. 道具激活门禁

由 `InteractionHelper.requireActivatedItem` 统一判定：

- `wateringCan` 必须：
  - 已拥有
  - 且 `wateringCanSelected=true`
- 其它道具门禁当前在具体场景中按 `inventoryDisplay.getSelected()` 判断

## 4. 弹窗机制（PopupScene）

- 开启：`QW.showPhotoPopup(scene, data)`
- 关闭：`QW.closePhotoPopup(scene)`
- 层级：
  1. dim 遮罩
  2. container
  3. content
  4. overlays（OS/木头等）
  5. close 按钮
- 关闭行为：
  - 支持点击 X
  - 支持点击遮罩
  - 支持 `onClose` 回调
- 打开时会禁用底层输入，关闭时恢复

## 5. 关键规则（当前生效）

### 5.1 S10 木头弹窗规则

- 木头在 overlay 层显示
- 点击木头后：
  - 入包（`woodAcquired=true`）
  - 立即从当前弹窗销毁
  - 弹窗不自动关闭（仍需 X）

### 5.2 卧室门禁规则

- `LivingRoomC` 卧室门点击仅在 `allGardenLit && pondLitUp` 为真时跳转
- 否则仅日志提示，保持当前场景

### 5.3 点亮替换规则

- S10 花/云：点击后直接替换亮态图
- S12 鱼：点击后直接替换亮态鱼图
- S12 拿锯子后背景/池塘直接切亮态纹理

### 5.4 S16 修沙发规则

顺序与状态位绑定：

1. 木头放置 -> `sofaWoodPlaced`
2. 锯子放置 -> `sofaSawPlaced`
3. 切开 -> `sofaWoodSplit`
4. 留下木料 -> `sofaWoodResidual`
5. 吸附木料 -> `sofaWoodMounted`
6. 钉子放置 -> `sofaNailPlaced`
7. 锤子放置 -> `sofaHammerPlaced`
8. 第一下敲击 -> `sofaNailHits=1`
9. 第二下敲击 -> `sofaNailHits=2` + `sofaRepaired=true`

### 5.5 修好沙发后的客厅内结局链

触发：
- S6 亮态 + 已修好沙发点击相机
- 关闭修好沙发照片弹窗后 `endingNotebookUnlocked=true`

链路（仍在 S6）：

1. 笔记图标切打开本子图标
2. 点击进入黑底覆盖链：内容 -> 盖章
3. 到盖章阶段即结束并置 `gameCompleted=true`（不再进入文本输入/总结）

### 5.6 密码开抽屉音效时机

- 输入 `2513` 后，等待 2 秒进入“可开抽屉”状态
- 需要额外点击一次抽屉区域才真正开抽屉
- `开门开抽屉声` 在这次“开抽屉点击”播放
- 日记弹窗弹出与后续领取道具不再触发该音效

## 6. 输入与光标

- 输入监听：`keydown`
- 支持：
  - 字符输入（长度限制）
  - Backspace 删除
  - Enter 提交
- 光标表现：通过定时器在文本后切换 `|` 显隐
- 结局输入字号：在 v0.3.27 基础上 ×2（当前 `88px`）

## 7. 已知并存实现（需知悉）

- `EndingScene` 仍存在并可运行；
- 但当前主链路的结局流程实际由 `LivingRoomAScene` 内覆盖机制承载。
