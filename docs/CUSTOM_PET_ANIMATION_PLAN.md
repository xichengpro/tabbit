# 自定义宠物动画语义修复计划

## 1. 背景与结论

当前版本已经能够导入 Codex v1/v2 精灵图，并在侧边栏和网页漫游层中渲染图片，但“导入成功”不等于“动画行为正确”。现有实现把浏览负载心情直接映射到精灵图前四行，网页移动方向没有参与动画选择；同时，网页漫游层又通过 CSS 镜像整个角色来表示向左。这会造成角色移动方向、动作语义和精灵图行彼此冲突。

本计划的目标是建立一个统一、可测试的动画状态模型：网页向右移动时始终播放 `running-right`，向左移动时始终播放 `running-left`；停止移动后再根据明确事件播放 idle、waving、jumping、failed、waiting、running 或 review。自定义宠物不再通过 CSS 镜像代替方向动画。

本轮只提交需求与实施计划，不修改产品代码。

## 2. 精灵图契约

Codex v1/v2 的前 9 行具有固定语义，不能按 UI 心情顺序解释：

| 行 | 动画 | 帧数 | Tabbit 使用场景 |
| ---: | --- | ---: | --- |
| 0 | `idle` | 6 | 静止、休息、减少动画时的默认帧 |
| 1 | `running-right` | 8 | 页面坐标向右移动，包括自动漫游和逃跑 |
| 2 | `running-left` | 8 | 页面坐标向左移动，包括自动漫游和逃跑 |
| 3 | `waving` | 4 | 到达、问候和主动打招呼 |
| 4 | `jumping` | 5 | 庆祝或明确的跳跃事件 |
| 5 | `failed` | 8 | 操作失败或真正的阻断状态 |
| 6 | `waiting` | 6 | 等待用户选择、确认或帮助 |
| 7 | `running` | 6 | 非位移的处理中、工作中状态 |
| 8 | `review` | 6 | 有结果可查看或正在检查结果 |

v2 的第 9–10 行包含 16 个朝向观察帧。第一阶段保留并正确裁切这些行；第二阶段可将其用于静止时面向目标、指针或菜单。它们不能替代第 1–2 行的左右移动循环。

## 3. 当前代码审查

### P0：移动方向没有驱动精灵图动画

`src/entrypoints/tabbit.content.tsx` 在计算下一个位置时只更新 `facingLeft` 和 DOM 位移，之后仍把 `snapshot.pet.mood` 转换成 `SpriteState` 传给 `TabbitSprite`。因此，位移和精灵图行是两套互不关联的状态。

直接后果：

- 向右移动时可能播放 `idle`、`running-left` 或 `waving`；
- 向左移动时同样可能播放任意心情对应行；
- 点击逃跑只改变位置和 CSS 动作，不保证使用第 1/2 行跑步动画；
- 动画可能在角色仍移动时提前恢复为 `idle`，因为动作计时器和移动过渡没有统一生命周期。

### P0：前四行被错误解释为四种心情

`src/components/TabbitSprite.tsx` 的 `customPetRow()` 当前映射为：

```text
calm -> 0
curious -> 1
busy -> 2
overwhelmed -> 3
```

实际含义分别是 `idle`、`running-right`、`running-left`、`waving`。这意味着侧边栏的“忙碌”会播放向左跑，“压力过高”会挥手；网页漫游同样继承这个错误映射。

### P0：CSS 镜像和真实方向行发生冲突

`src/styles/roaming.css` 使用 `.facingLeft .rabbitVisual { transform: scaleX(-1); }` 翻转整个宠物。这个做法可作为默认 SVG 兔子的兼容方案，但不适用于已有 `running-left` 行的自定义宠物：

- 可能把 `running-left` 再次镜像成向右；
- 会翻转不对称花纹、道具和光照；
- 无法证明实际播放了用户提供的左跑动画；
- CSS 动作变形会与精灵图自身动作叠加，出现摇摆、弹跳或尺度变化。

### P1：漫游动作名和 Codex 行语义没有统一模型

`src/domain/roaming.ts` 定义了 `idle/hop/wave/nap/alert/flee/selected`，但这些动作只驱动 CSS 类。Codex 精灵图使用另一组状态名。两者没有集中映射，也没有优先级规则，导致“正在移动”“心情反馈”“提醒”“菜单选中”可以互相覆盖。

### P1：侧边栏只在首次挂载时读取自定义素材

`src/entrypoints/sidepanel/App.tsx` 初次加载时读取设置与素材，之后只监听 `TABBIT_STATE_UPDATED` 的宠物状态消息。用户在设置页更换或恢复宠物时，已经打开的侧边栏可能不会立即切换，通常需要重新打开或刷新。

### P1：导入校验无法发现动作内容错误

`src/entrypoints/options/main.tsx` 只检查 MIME、文件大小和图片尺寸。尺寸正确但行为空、有效帧放错行、未使用格非透明或动作方向相反的文件仍会被接受。设置页预览也只显示 `calm` 的静态第一帧，用户无法在保存前检查左右跑和全部动作。

### P1：测试只覆盖格式，没有覆盖行为

`tests/custom-pet.test.ts` 仅测试宽高、帧数常量和存储 schema；`tests/roaming.test.ts` 测试移动目标与心情到 CSS 动作的映射。当前没有测试能够回答以下关键问题：

- 向右移动是否选择第 1 行；
- 向左移动是否选择第 2 行；
- 自定义宠物是否避免 CSS 镜像；
- 移动结束后是否切回正确的静止动作；
- 侧边栏的 busy/overwhelmed 是否使用正确语义行；
- v1 与 v2 是否使用一致的前 9 行契约。

### P2：文档把尺寸兼容描述成完整能力

README 当前写明自定义宠物“已经可用”，技术设计则说“按心情映射到支持的精灵图行”。这没有定义方向动画、动作优先级和运行时验收，因此现有实现即使语义错误也能满足文档字面要求。完成修复时应同步收紧 PRD、技术设计和 README 的表述。

## 4. 修订后的产品需求

### 4.1 核心行为

1. 宠物开始位移时，动画由本次位移向量决定，而不是由心情决定。
2. `target.x > current.x` 播放 `running-right`；`target.x < current.x` 播放 `running-left`。
3. 自动漫游和点击逃跑遵守同一规则。
4. 自定义宠物播放第 1/2 行时不做水平镜像。
5. 位移结束后切换到静止动作；不能在位移尚未完成时被心情计时器切走。
6. 菜单打开、页面隐藏、减少动画开启时停止位移，并显示当前状态对应的稳定关键帧。
7. 默认 SVG 兔子允许保留自身的简化 CSS 朝向，但该分支不能影响自定义精灵图。

### 4.2 动作优先级

由高到低：

1. `reduced-motion/hidden/menu-open`：冻结并显示安全静态帧；
2. `moving/fleeing`：按位移方向播放 `running-left/right`；
3. 明确的临时事件：`failed`、`waiting`、`review`、`jumping`、`waving`；
4. 非位移工作状态：`running`；
5. `idle`。

低优先级动作不能覆盖正在进行的高优先级动作。临时动作结束后重新计算当前状态，而不是盲目恢复旧值。

### 4.3 侧边栏心情映射

侧边栏没有位移，因此使用静止语义：

| 心情 | 精灵动画 |
| --- | --- |
| `sleeping` | `idle`，并在减少动画时固定第一帧 |
| `calm` | `idle` |
| `curious` | `waiting` |
| `busy` | `running` |
| `overwhelmed` | `failed` |
| `celebrating` | `jumping` |

若产品希望 curious 或 celebrating 使用其他动作，应只修改这一张集中映射表，不改精灵裁切组件。

### 4.4 导入与预览

- 保留 PNG/WebP、精确尺寸和 6 MB 限制；
- 导入时验证 9 个标准行的必需格非空、未使用格透明；
- 设置页增加动作预览选择器，至少能连续查看 idle、左跑、右跑以及其余 6 行；
- 左跑/右跑预览并排显示方向标签，帮助用户在启用前发现素材方向错误；
- 导入成功后，侧边栏和已打开网页在 storage 变化后立即更新；
- 校验失败时显示具体行和格，不只显示“文件无效”。

## 5. 技术实施方案

### 阶段 A：建立统一动画领域模型

在 `src/domain/custom-pet.ts` 中新增显式的 `CodexAnimation` 联合类型和行配置，配置包含 `row`、`frameCount`、`frameDurationMs` 与是否允许循环。删除用数组下标兜底到最后一行的行为，未知动画或行应返回安全的 `idle`，避免错误状态被静默播放。

新增纯函数：

- `animationForMovement(from, to, lastDirection)`；
- `animationForMood(mood)`；
- `resolvePetAnimation({ moving, movementDirection, action, mood, reducedMotion, menuOpen })`。

这些函数不依赖 React、DOM、时间或浏览器 API，作为所有入口的唯一规则来源。

### 阶段 B：让渲染组件接收动画，而不是心情

重构 `TabbitSprite`：

- 输入从 `state: calm/curious/busy/overwhelmed` 调整为明确的 `animation: CodexAnimation`；
- 自定义宠物根据动画配置计算行、有效帧和播放速度；
- 动画变化时从第 0 帧重新开始；
- `reducedMotion`、页面不可见或不在视口时固定稳定帧；
- 将默认 SVG 的心情表现封装为单独分支，避免把 SVG 的 CSS 规则应用到自定义精灵图；
- 为自定义宠物根节点增加可识别类名或 data 属性，CSS 仅对默认 SVG 执行方向镜像。

### 阶段 C：重构网页漫游状态机

在 `RoamingTabbit` 中保存明确的运动状态：`phase`、`direction`、`startedAt`、`duration` 和可选临时动作。

开始自动漫游或逃跑时：

1. 根据起点和终点计算 `left/right`；
2. 同一更新中设置位置、持续时间和运动状态；
3. 把解析后的 `running-left/right` 传给精灵组件；
4. 使用 `transitionend` 作为移动完成信号，并保留按持续时间计算的超时兜底；
5. 完成后再触发一次静止心情动作或回到 idle。

移除自定义宠物对 `.facingLeft` 镜像的依赖。`flee` 是移动原因，不再是一套独立的视觉动画；它仍可以改变移动速度和提示文案。

### 阶段 D：修复侧边栏和实时更新

- 使用统一的 `animationForMood()` 替换侧边栏本地 `spriteState` 映射；
- 监听 `settingsV1` 和 `customPetAssetV1` 的 storage 变化；
- 更换、禁用或删除自定义宠物后，已打开的侧边栏立即更新；
- 确保导入失败时不会出现“素材已写入但启用设置未写入”的半成功状态，可通过单次 storage 写入或补偿回滚解决。

### 阶段 E：增强导入校验和动作预览

- 使用 Canvas 在本地检查各标准行有效格的 alpha 占用；
- 检查未使用格是否透明；
- 输出结构化诊断，如“running-left 第 3 帧为空”；
- 在设置页加入 9 个动作预览和左右移动对照；
- 导入确认区明确显示 v1/v2、文件大小、尺寸及校验结果；
- 对 v2 保留 16 方向数据，并为后续静止朝向功能增加单独任务，不在左右移动修复中混入整套方向交互。

## 6. 测试计划

### 单元测试

- `dx > 0` 必须得到 `running-right`；
- `dx < 0` 必须得到 `running-left`；
- 自动漫游与逃跑使用相同方向规则；
- 移动状态覆盖 mood 和低优先级临时动作；
- `menuOpen/reducedMotion` 返回稳定帧策略；
- 六种 mood 按侧边栏映射表得到正确动画；
- 每个动画得到固定行、帧数和播放速度；
- v1/v2 前 9 行行为一致；
- 未知值安全回退到 idle，不映射到任意有效动作。

### 组件测试

- 使用假计时器验证自定义宠物的 `background-position-y`：右跑为第 1 行，左跑为第 2 行；
- 验证有效帧序列只在该行帧数内循环；
- 动画变化后从第 0 帧开始；
- 自定义宠物左跑时不存在 `scaleX(-1)`；
- 默认 SVG 分支仍可正确渲染；
- 页面不可见、离开视口和减少动画时不继续递增帧。

### 漫游集成测试

- 固定随机数生成向右目标，断言移动全程播放 `running-right`；
- 固定随机数生成向左目标，断言移动全程播放 `running-left`；
- 点击宠物逃向左右两个方向时验证对应行；
- `transitionend` 后切换到预期静止动作；
- 移动中出现提醒时不覆盖跑步行，移动结束后提醒动作才生效；
- 设置页更换宠物后，内容脚本和侧边栏无需刷新即可更新。

### 真实浏览器验收

使用本地 `zhaolao-si/spritesheet-forward.webp` 作为验收素材，但不把该私人测试文件提交进仓库：

1. 在 Chrome 加载开发构建并导入素材；
2. 录制一次向右自动漫游，确认角色位置向右且逐帧来自 row 1；
3. 录制一次向左自动漫游，确认角色位置向左且逐帧来自 row 2；
4. 分别触发点击逃跑、挥手、跳跃、等待、失败、处理中和 review；
5. 检查侧边栏 calm/curious/busy/overwhelmed/celebrating；
6. 开启减少动画并切换标签页，确认计时器暂停且画面稳定；
7. 恢复默认兔子，确认自定义素材从本地存储删除且所有页面回退正常。

每次验收必须保留左右移动的短 GIF 或连续截图，并记录所用 commit SHA。仅通过 `typecheck/test/build` 不能视为视觉验收通过。

## 7. 建议的提交拆分

1. `refactor: centralize custom pet animation semantics`
   - 动画类型、行配置、解析纯函数与单元测试。
2. `fix: drive roaming sprites from movement direction`
   - 漫游状态机、左右跑、逃跑、CSS 分支和集成测试。
3. `fix: map side panel moods to Codex animation rows`
   - 侧边栏映射及 storage 实时更新。
4. `feat: preview and validate custom pet animation rows`
   - alpha/占用校验、9 行预览和具体错误反馈。
5. `docs: define custom pet animation acceptance criteria`
   - PRD、技术设计、README 和真实浏览器验收证据。

每个提交都应保持 `npm run typecheck`、`npm test` 和 `npm run build` 通过；第 2、4 个提交还必须附真实浏览器截图或 GIF。

## 8. 完成标准

- 页面向左移动时，100% 使用 row 2，角色视觉朝左；
- 页面向右移动时，100% 使用 row 1，角色视觉朝右；
- 自定义宠物的左右跑不依赖 CSS 镜像；
- 移动、临时动作、心情与菜单状态具有唯一且可测试的优先级；
- 9 个标准动作都能在设置页单独预览；
- 侧边栏的 busy 不再播放左跑，overwhelmed 不再播放挥手；
- v1/v2 共用前 9 行契约，v2 数据不会被破坏；
- 本地素材更换可实时同步到已打开页面；
- 自动化测试覆盖方向选择、动作解析和裁切位置；
- 使用 `zhaolao-si` 在真实 Chrome 中完成左右移动与主要动作的可见验收；
- README 不再把仅通过尺寸校验描述为完整动画兼容。
