# Tabbit 落地计划

## 1. 总体策略

以 1 名全栈开发者 + 1 名兼职视觉/动画设计师估算，6 周达到可提交 Chrome Web Store 的 beta。若由一人兼任设计，增加 1–2 周。

开发顺序遵循：

1. 先验证角色反馈是否有趣；
2. 再完善状态可靠性；
3. 再加入专注与成长；
4. 最后才做需要敏感权限的整理助手。

## 2. 里程碑

| 里程碑 | 时间 | 交付 | 退出条件 |
| --- | --- | --- | --- |
| M0 蓝图与骨架 | 第 0 周 | 文档、工程骨架、基础负载引擎 | 仓库可安装依赖、产品范围冻结 |
| M1 有生命的原型 | 第 1–2 周 | 领养、正式角色、实时状态、设置 | 5 人首次体验中 4 人能解释宠物状态 |
| M2 形成反馈闭环 | 第 3–4 周 | 专注、庆祝、XP、稳定性 | Service Worker 恢复与幂等测试通过 |
| M3 安全整理与 beta | 第 5 周 | 可选权限、整理、恢复、无障碍 | 无误关风险，全部 P0/P1 测试通过 |
| M4 发布候选 | 第 6 周 | 商店素材、隐私政策、beta 修复 | 10 人 beta 满足发布判断 |

## 3. 逐周计划

### 第 0 周：仓库与决策冻结（已开始）

- [x] 确定 Tabbit/标签兔产品定位；
- [x] 建立 WXT + React + TypeScript 骨架；
- [x] 定义最小权限和数据边界；
- [x] 写负载引擎 v1 与首批测试；
- [x] 建立 Side Panel 和 Options 占位界面；
- [x] 完成 PRD、设计、技术、测试、交付文档；
- [ ] 安装依赖并提交 lockfile；
- [ ] 完成一次本地 Chrome 加载验证；
- [ ] 创建私有 GitHub 仓库并推送 main。

### 第 1 周：真实可玩的角色

产品/设计：

- [ ] 低保真领养与主界面原型；
- [ ] 角色造型定稿；
- [ ] 平静、好奇、忙碌、被埋住四个状态资产；
- [ ] 第一批 30 条状态文案；
- [ ] 减少动画的静态关键帧。

工程：

- [ ] 实现 3 步领养流程；
- [ ] 引入 i18n 文案字典；
- [ ] 抽取 UI 组件与 Error Boundary；
- [ ] 加入状态原因输出；
- [ ] 实现事件防抖和状态升降级稳定；
- [ ] 校验与迁移 `storage` schema；
- [ ] CI：typecheck、test、build。

验收演示：连续打开 12 个标签时，兔子从平静经过好奇变忙；关闭后延时回归，不闪烁。

### 第 2 周：设置、细节与首轮试用

- [ ] 完整设置页：阈值、静默时段、减少动画；
- [ ] 角色状态切换动画；
- [ ] 状态解释卡和影响因素；
- [ ] 处理浏览器启动、休眠、API 失败；
- [ ] 本地诊断环形日志；
- [ ] 性能预算检查；
- [ ] 5 人 alpha，每人观察 15 分钟首次体验；
- [ ] 修复“看不懂状态”和“像监工”类问题。

M1 退出条件：基础功能无需 URL/标题权限；5 人中至少 4 人能说出角色为何改变。

### 第 3 周：专注系统

- [ ] 15/25/45 分钟计时；
- [ ] `endsAt` + alarm 恢复；
- [ ] 暂停、提前结束和完成状态；
- [ ] 专注动画与完成反馈；
- [ ] 通知可选权限/开关（若采用）；
- [ ] 跨午夜、时钟变化和 Service Worker 重启测试；
- [ ] 防重复完成事件。

### 第 4 周：成长与奖励

- [ ] Reward Ledger 与每日上限；
- [ ] 整理庆祝检测，排除整窗关闭；
- [ ] XP、等级与树叶；
- [ ] 6 个装饰占位及解锁；
- [ ] 收藏册简版；
- [ ] 数据导出和分层重置；
- [ ] 奖励/迁移单元测试覆盖率 ≥90%。

M2 退出条件：在重复事件、休眠和重启下不重复发奖，成长数据稳定。

### 第 5 周：安全整理助手

- [x] 权限教育页和 `optional_permissions`；
- [x] 长期未访问与重复 URL 候选算法；
- [x] 固定、发声、活动、近期标签保护；
- [x] 手动选择、操作预览、批量确认；
- [x] 24 小时恢复快照；
- [x] 部分失败处理；
- [x] 撤销权限后不再分析、页面内存结果随页面销毁；
- [ ] 整理 E2E 与安全 review；
- [ ] 若质量不达标，从 beta 移除而不是冒险上线。

### 第 6 周：Beta 与上架

- [ ] 10–20 名目标用户试用 7 天；
- [ ] 处理 P0/P1 缺陷；
- [ ] Windows/macOS 与 Chrome Stable/Beta 矩阵；
- [ ] 商店图标、截图、短描述、长描述；
- [ ] 隐私政策与权限用途；
- [ ] 支持/反馈页面；
- [ ] 从干净环境生成发布 zip；
- [ ] 创建 release tag 和保留回滚包；
- [ ] 提交商店审核。

## 4. GitHub 工作组织

### Milestones

- `M0-foundation`
- `M1-living-prototype`
- `M2-feedback-loop`
- `M3-safe-organizer`
- `M4-store-beta`

### Labels

| Label | 含义 |
| --- | --- |
| `area:pet` | 宠物状态、动画、文案 |
| `area:extension` | Chrome API、manifest、Service Worker |
| `area:ui` | Side Panel、设置和可访问性 |
| `area:privacy` | 权限、数据、政策；必须重点 review |
| `area:organizer` | P1 标签整理 |
| `type:feature` | 新功能 |
| `type:bug` | 缺陷 |
| `type:chore` | 工程/依赖/构建 |
| `priority:p0` | 阻断 |
| `priority:p1` | 发布前必须完成 |
| `good-first-issue` | 边界清晰的新手任务 |

### 首批 Issues

1. `[M0] Install dependencies and commit lockfile`
2. `[M0] Verify unpacked extension on Chrome 114+`
3. `[M1] Implement three-step adoption flow`
4. `[M1] Return explainable reasons from load engine`
5. `[M1] Add debounced snapshot refresh and mood hysteresis`
6. `[M1] Add Zod validation and v1 storage migrations`
7. `[M1] Replace emoji with four-state sprite prototype`
8. `[M1] Move copy into zh-CN i18n catalog`
9. `[M2] Implement restart-safe focus timer`
10. `[M2] Add idempotent reward ledger`
11. `[M2] Detect cleanup celebration without window-close farming`
12. `[M3] Design optional tabs permission education screen`
13. `[M3] Implement organizer candidate protection rules`
14. `[M3] Add 24-hour close-and-restore snapshot`
15. `[M4] Draft and verify privacy policy`
16. `[M4] Produce Chrome Web Store assets and listing copy`
17. `[M2] Support locally uploaded pet photos and animated images`

## 5. PR 策略

- 每个 PR 只做一个可演示变化，建议 <500 行业务代码；
- 新功能必须带验收步骤或短 GIF；
- 修改负载/奖励规则必须附前后样例；
- manifest 权限变化单独 PR，禁止混入 UI 修改；
- P1 破坏性操作至少一名 reviewer；
- 合并使用 squash，提交标题采用 Conventional Commits；
- `main` 始终保持可构建、可加载。

## 6. 角色分工

### 全栈开发

- 扩展生命周期、Chrome API、状态与存储；
- Side Panel/Options UI；
- 测试、构建、商店提交；
- 隐私实现和安全整理。

### 视觉/动画

- 角色设定与 9 个状态；
- Side Panel 视觉规范、图标、商店素材；
- 动画压缩和 reduced-motion 替代；
- 文案语气共审。

### Beta 协作者

- 5 名重度多标签用户；
- 3 名普通办公/学习用户；
- 1–2 名对权限敏感的技术用户；
- Windows 与 macOS 至少各 3 名。

## 7. 预算估算

不含开发者本人时间：

| 项目 | 低配 | 较完整 |
| --- | ---: | ---: |
| 角色与 9 状态动画 | ¥3,000 | ¥15,000 |
| 商店图标与截图 | 自制 | ¥2,000 |
| 域名/落地页/隐私页 | ¥200/年 | ¥1,000/年 |
| Chrome 开发者注册 | 按商店当前费用 | 按商店当前费用 |
| Beta 激励 | ¥500 | ¥2,000 |
| 后端 | ¥0 | MVP 不建议引入 |

最大价值投入应放在角色动画和初次体验，不应先花在云后端。

## 8. 风险与处理

| 风险 | 概率 | 影响 | 处理 |
| --- | --- | --- | --- |
| 三天后新鲜感消失 | 高 | 高 | 先测 WMIU；加入轻收藏但不堆系统 |
| 宠物显得幼稚或像监工 | 中 | 高 | 文案禁区、可关闭建议、成熟视觉 |
| Side Panel 不被用户发现 | 中 | 高 | 安装页明确引导固定图标和首次打开 |
| Service Worker 休眠造成错时 | 中 | 高 | `endsAt`、alarms、幂等事件 |
| 额外 `tabs` 权限降低转化 | 高 | 中 | 整理为 P1 可选，基础功能不依赖 |
| 批量关闭造成数据损失 | 低 | 极高 | 默认不选、保护规则、预览、快照恢复 |
| 角色资产包过大/耗电 | 中 | 中 | 体积预算、暂停不可见动画、性能门槛 |
| 品牌名冲突 | 中 | 中 | 正式上架前做商标、域名、商店搜索 |
| 规则不适合重度用户 | 高 | 中 | 首次选择预设、可调阈值、解释原因 |

## 9. MVP 之后的决策门

只有数据满足条件才继续：

- 若有趣但不促成整理：强化互动与收藏，不急着加管理功能；
- 若整理有用但宠物被忽略：将角色反馈嵌入整理完成页，减少养成复杂度；
- 若权限成为主要阻碍：移除 URL 类整理，只保留聚合状态与专注；
- 若用户强烈需要跨设备：仅同步设置和装饰，敏感标签数据仍留本地；
- 若用户要求 AI：先验证具体场景，绝不做通用聊天侧边栏。

## 10. 今天即可执行的 8 步

1. 创建 GitHub 私有仓库 `tabbit`；
2. 推送当前骨架到 `main`；
3. 安装依赖、生成 lockfile，跑通 `typecheck/test/build`；
4. Chrome 开发者模式加载并修复首轮入口问题；
5. 创建上述 milestones、labels 和前 8 个 issues；
6. 用简单几何图形或占位 sprite 做四状态可玩原型；
7. 找 3 位多标签用户观察第一次使用；
8. 根据“是否觉得它活着”决定美术投入，而不是先扩功能。
