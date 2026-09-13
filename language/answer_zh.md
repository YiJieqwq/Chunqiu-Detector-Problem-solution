# 春秋检测项解决方案（跟进最新版本）中文版
> 整理：铭鐏(mingzun09) | 仅供参考，具体结果因设备/环境而异。
> 解决方案尾巴带“?”符号的都为不确定
> 部分条目补充了「**检测方式**」（由社区实测与行为观察整理，可能与实现有偏差，仅供定位问题参考）
> 文档链接：[github](https://github.com/mingzun09/Chunqiu-Detector-Problem-solution)

## 目录
- [说明与反馈](#说明与反馈)
- [Root 权限与 SELinux 检测](#root-权限与-selinux-检测)
- [TEE 与密钥证明检测](#tee-与密钥证明检测)
- [挂载与命名空间检测](#挂载与命名空间检测)
- [环境、进程与文件检测](#环境进程与文件检测)
- [内核、属性与系统特征检测](#内核属性与系统特征检测)

---

## 说明与反馈

<details>
<summary>自行尝试但仍然无法通过的检测</summary>

请开 Issues 并提供你的模块列表信息 + 使用了哪些 Xposed 模块等详细修改，我有时间会回复/帮助。
</details>

<details>
<summary>通用排查方法（遇到“未知 / 未解决”条目时）</summary>

1. **记录现状**：`ls /data/adb/modules`、Xposed 模块列表、Zygisk 排除策略、伪装类属性（`getprop | grep -iE "spoof|pihooks|pixelprops|resetprop"`）。
2. **最小集复测**：只保留 root 管理器 + 必需的 Zygisk 提供者（如 ZygiskNext），重启后扫描，确认命中是否仍在。
3. **二分定位**：之后每次只启用一个模块 → 重启 → 复扫，逐步收敛到具体触发项（每次只改一个变量）。
4. **挂载类条目**优先动：元模块、Zygisk 排除策略（“仅还原挂载”）、SusFS / PathMask 类隐藏。
5. **密钥 / TEE 类条目**：修改 `keybox.xml`、`target.txt`、安全补丁同步等之后**必须重启**再复测。
6. 少数条目属**侧信道 / 不稳定检测**：同一环境多次扫描结果可能不一致，先排除偶发再定位。

> ⚠️ **安全提示**：任何“更换 keybox / 更换 RKP 密钥 / 改回锁状态 / 改安全补丁同步”的操作都会改变设备的密钥与认证（attestation）状态，**不一定可逆**；操作前请评估风险，必要时先备份相关目录。
</details>

---

## Root 权限与 SELinux 检测

<details>
<summary>存在模块修改春秋</summary>

> **检测方式**：对比本进程被修改的痕迹（策略 / 注入 / 挂载）与预期。
>
> 使用 IsolPolicy 模块后出现，关闭作用域或者卸载模块解决。
> 
> 并不是只有模块，比如旧版ksu启用了隐藏SELinux修改也算，请尝试跟进相关 root 管理器最新 CI 来解决此问题。
</details>

<details>
<summary>检测SELinux Policy时发现可疑问题 / 检测到ROOT权限</summary>

> **检测方式**：以本进程（预期位于 `app_zygote` 域）的 context 作为“载体”，用作者预置的**哨兵 context**（`…context_oracle_sentinel:s0` / `…_sentinel_file:s0`）建立正控制 / 负控制 / 文件控制三组对照；查询走 **raw selinuxfs 写**（直接操作 `/sys/fs/selinux/access`，不走 libselinux），并校验内核回填的 `avdSeqNo`；再用 `selinux_check_access` / `getfilecon` 做 raw↔lib 交叉比对、**加扰动后再比对一次**、并检查重复性（`Repeatability`）。此外会直接探测根相关规则是否仍被 live policy 接受（如 `shell -> su` 转换、`magisk` / `ksu` / `apatch` 域、`ksu_file` / `lsposed_file` / `magisk_file` 读取等），并检查 KSU context 的“位对 / 拆分”一致性。
>
> 检测方式参考：https://github.com/LSPosed/DirtySepolicy
>
> 新加入的 SELinux 特性检测（应用程序 zygote 拥有访问 `/sys/fs/selinux/access` 的权限）
>
> **KSU 使用者**：[更新KSU管理器](https://t.me/KernelSU_group/3234/482579)并重新修补镜像并刷入后重启，再开启 selinux_hide 功能解决。
>
> **APatch/FolkPatch 使用者**：[使用此kpm](https://github.com/Admirepowered/selinux_hook)
>
> **selinux_hook 模块使用说明**：
> 1. 内核版本 4.19-6.12 的设备，必须嵌入此模块才能生效，如果使用加载模式，则不会启用任何伪装方法。
>    *注意*：由于编译优化导致的机器指令与预期不符，6.12 内核设备请慎重嵌入此模块，会有很大概率导致 kernelpanic，此问题后续将会被解决。
> 2. 内核版本 4.14 的设备，建议嵌入模块，但由于模拟 context_struct_compute_av 存在风险，在嵌入模块前请备份原 boot.img，以便在出现 kernelpanic 后可救砖；加载模式同样可生效，但会使用基于关键词过滤的备选方法，效果相对较差，如果设备的 policy 中包含了模块没有收录的且能被证明异常的关键词，则会发生泄露。
> 3. 内核版本 4.9 的设备，建议嵌入模块，且无模拟 context_struct_compute_av 的风险，加载模式效果同 4.14。
>
> **Magisk**：尝试更换内核级管理器。在将来 Magisk 可能会合并保存 Clean policy blob 功能，如果合并此功能，Magisk 将有机会通过此检测。
</details>

<details>
<summary>Found ksu/免解设备</summary>

> **检测方式**：KSU 免解（越狱）模式特征，或发现 ksu 相关进程 / 设备。
>
> 发现 ksu 处于越狱模式，当前设备使用 ksu 越狱模式的 ROOT 方式或者发现 ksu 进程等其他因素。
> 
> 不推荐使用越狱模式，所以不提供解决方案。
</details>

<details>
<summary>SU binary detected</summary>

> **检测方式**：在常见路径下检测 su / 类似二进制文件。
>
> 检测到 SU 二进制文件（检测到 ROOT）
</details>

<details>
<summary>Abnormal Environment</summary>

> **检测方式**（与仓库内 [KSU/APatch 侧信道说明](/File/Doc/ksu_kp_sidechannel_zh.md) 一致）：
> - **APatch / KernelPatch**：①**“懒分配页”探测**——把一个“懒分配”（只占虚拟地址、尚未映射物理页）的页地址当作 superkey 所在地址发起鉴权请求，KernelPatch 解引用该地址时会把该页**实际映射/读入**，检测器随后检查该页是否被映射即可判定 KernelPatch 是否存在；②**鉴权时延探测**——提前拟定一个“范围内 cmd”和一个“范围外 cmd”，分别发起鉴权，多次测量取总和使比值稳定，两者耗时比值大于约 2 即判定存在。
>   界面上该条目的输出是**页级 kB 对照**（如 `No-read control: 0→0 kB, expected` / `Read control: 0→4 kB, expected` / `Target call: 0→4 kB, unexpected read`）与多轮一致性（`Consistency: n/n`），本质就是判断“该页是否被实际映射/读取”。
> - **KernelSU**：框架用 Kprobe hook `newfstatat` / `faccessat`，使两者耗时显著变长，而 `statx` 不受影响；多次调用取总耗时做比值，`newfstatat : statx > 1.2` 即判定存在 KernelSU。
> - 这也解释了为什么 nohello 一类 KPM 要“在 cmd 判断之前就拒绝鉴权”——不进入读取/校验 superkey 的路径，两种探测同时失效。
>
> 检测到 KSU/APatch（侧信道检测）
>
> 检测原理请参考[此文档](/File/Doc/ksu_kp_sidechannel_zh.md)
>
> **解决办法（KernelSU 系）**：更新你的 KernelSU 管理器并重新修补（LKM 工作模式）或重新集成（GKI 和 Non-GKI 工作模式）。
>
> **解决办法（APatch 系）**：
> 1. 嵌入/加载[nohello kpm](/File/Bin/Nohello-v1.8.2.9-83-b3e7d87-release.kpm)，并将检测器加入到排除列表，nohello 可以在 kernelpatch 判断 cmd 值之前判断发起鉴权请求的应用是否在排除列表内，如果是，则禁止鉴权。
> 2. 未来版本的 APatch 会引入基于签名的鉴权方法，对于不符合签名却发起了鉴权的应用直接拒绝鉴权请求。目前没有完全实现，需要再等一段时间。
>
> **解决办法（KPatch-Next）**：更新 KPatch-Next 驱动到 0.13.5-2。
>
> 原理：旧版 KPatch-Next 完全继承了 KernelPatch 的鉴权方式，所以在 APatch 上可行的侧信道检测方法在旧版 KPatch-Next 上也同样可行；但最新版 KPatch-Next 以判断用户态 kpatch-android 组件的 uid 实现鉴权，不再会被侧信道检测。
</details>

<details>
<summary>KernelSU loop device</summary>

> **检测方式**：检查是否存在 KernelSU 特征的 loop 设备挂载。
>
> 检测到 KSU
> 
> 更新你的管理器并重新修补
</details>

<details>
<summary>Suspicious Surroundings</summary>

> **检测方式**：环境类异常检查（`/data/local/tmp` 元数据、可疑进程 / 服务等）。
>
> 检测到 APatch
>
> 更新 APatch 并加载 KPM 隐藏模块解决（比如 Nohello.kpm）
</details>

<details>
<summary>ROOT进程</summary>

> **检测方式**：通过 AVC 审计日志（`logcat -b events` 中的 `auditd` 记录）与 `/proc/*/attr/current` 交叉，找出以 root 相关 context 运行的进程。
>
> 检测 Zygote 环境?
>
> 通过审计日志漏洞读取 (avc)
>
> 可使用 SusFS 的功能或者使用 ZN-AuditPatch 模块
>
> Android 安全更新 2025/09/01 已修复（不准确但结果是这样的）
</details>

<details>
<summary>异常进程0000（pid）</summary>

> **检测方式**：同上（审计日志泄露）；0000 为该进程 pid，可用 `ps -ef | grep <pid>` 反查。
>
> 0000 代表的是进程的 pid
>
> 你可以尝试使用 shell 指令以 root 执行 `ps -ef | grep 数字id` 来查找对应 pid 进程，通常是拥有 root 权限的守护进程（如 lspd 进程、Tricky-Store 进程）
>
> **解决办法**：此检测依赖安全漏洞，更新安全补丁到 2026/01/01 可显著降低检出率，但目前无法完全解决，此安全漏洞将在 Google 正式发布 Android 17 后完全修复。
>
> 安全补丁更新往往伴随系统更新，如果因为不想更新系统而无法更新安全补丁，可以忽略此条目。
>
> 双开应用有时可以使此检测方案失效，但不会实质上解决此安全漏洞，所以双开应用不应被视为可行的方法。
>
> 会有误报现象
</details>

---

## TEE 与密钥证明检测

<details>
<summary>TEE 伪造(2)</summary>

> **检测方式**：通过 Keystore2 反射创建同时具备 `SIGN + ATTEST_KEY` 用途的密钥：正常设备应拒绝这种混合用途（如 `-3`）；若密钥能正常签名，但“带 challenge / 不带 challenge”两组子证书签发都失败（如 `-49`），判为 TEE 伪造(2)。
>
> 先确认普通签名、纯 ATTEST_KEY 密钥签发子证书都正常。
> 通过 Keystore2 创建同时具有 SIGN + ATTEST_KEY 用途的密钥。
> 如果它能正常签名，但有、无挑战两组测试中，签发子证书都返回 -49，就报 “TEE 伪造(2)”。
创建时正常拒绝混合用途（如正常机的 -3），或两种能力都正常，都不会报。
> **解决办法**
> -解决办法特别简单，换一个模块就行

</details>

<details>
<summary>TEE环境不可信</summary>

> **检测方式**：检查 Tencent Soter 服务程序是否存在 + 其服务属性状态，两者交叉验证 Soter key 是否被屏蔽（四象限判定，见下）。
>
> 来自 Tencent 的 [SoterService](https://github.com/Tencent/soter)
> 作用: 微信的指纹支付等。
>
> 通过检查文件来判断是否存在 Soter 服务程序以及判断其服务点属性状态来交叉验证是否存在 Soter key 被屏蔽的情况。
> 1. 服务点属性状态异常 + Soter 服务程序存在 -> Soter 被屏蔽（异常）
> 2. 服务点属性状态异常 + Soter 服务程序不存在 -> 此设备原生不支持 Soter 服务（正常）
> 3. 服务点属性状态正常 + Soter 服务程序存在 -> 此设备支持 Soter（正常）
> 4. 服务点属性状态正常 + Soter 服务程序不存在 -> 不可能
>
> **解决方法**：
> - 等待模块更新（不太可能实现 SoterService 的修复）
> - 使用 SusFS 或 PathMask 隐藏相关服务路径，并使用 HMA-OSS 对检测器隐藏 Soter 系统服务应用程序尝试解决
>
> *注意*：PathMask 并不专注于环境隐藏，请慎用。
>
> *原理*：目前在技术上我们无法模拟 Soter 服务，但可以隐藏 Soter 相关文件来伪造第 2 种情况。
</details>

<details>
<summary>Tampered Attestation Key(X)</summary>

> **检测方式**：对密钥证明证书链做 20+ 类标签一致性校验，例如：叶证书 `KeyUsage` 与扩展 `KeyPurpose` 是否矛盾、叶证书签名算法与签发钥算法是否一致、证书内的安全补丁标签与系统属性是否一致、无 challenge 却带 `APPLICATION_ID`、`USER_ID` 出现在 `teeEnforced`、厂商占位 tag 仍成功签发等。
>
> 携带 20+ 类异常标签（多数是 OEM 特有标签）针对 TEE 处理异常标签反馈来对照预期值进行判断是否异常。
>
> 针对 TEE 的检测，若有，“请等待相关模块更新修复”，或者回锁。
>
> 即使是 efisp 的假锁或者自定义引导程序也“可能”会报。
>
> - 15: HanAttest 链不一致（与下面 TeeSim 常量不同源，但同在 mask 里）
> - 18: 厂商占位 KeyMint tag 仍成功输出密钥（tee2 §1）
> - 23: 叶证书 KeyUsage 与扩展内 KeyPurpose 矛盾
> - 24: Binder 超长 alias / 大事务探针异常
> - 25: 叶证书 SigAlg 与签发钥算法不符
> - 26: 证书 patch 标签与系统属性不一致（与安全补丁有关）（[执行此sh](https://github.com/mingzun09/Chunqiu-Detector-Problem-solution/blob/main/File/Tampered%20Attestation%20Key(26)Pass.sh)尝试解决）
> - 27: USER_ID 出现在 teeEnforced
> - 29: 无 challenge 却有 APPLICATION_ID（上表）
> - 30: 敏感设备标识类 attest 未被拒绝（如 SERIAL）
> - 31：安全补丁日期异常（如YYYY-MM-05,China手机厂商对安全补丁日期及推送都是统一，YYYY-MM-01,当然对国外设备pixel&Samsung做了排除，此检测安全补丁日期篡改，如pif，及TA插件的安全日期同步会篡改
国内的Lenovo与努比亚可以忽略此问题，确实会更新05日期）
</details>

<details>
<summary>TrickyStore Hook/2</summary>

> **检测方式**：对比 Keystore 返回的证书链 / 密钥属性与真机 TEE 特征差异（含侧信道方式，不稳定）。
>
> 侧信道（不稳定）重新打开或许消失
>
> 更换模块[TEESimulator](https://github.com/JingMatrix/TEESimulator)
</details>

<details>
<summary>发现TrickyStore/类似模块</summary>

> **检测方式**：证书链为模块生成（合成链），与真实 TEE 链特征不符。
>
> **尝试1**：更换模块比如 [TEESimulator](https://github.com/JingMatrix/TEESimulator)
>
> **尝试2**：把 `/data/adb/tricky_store/security_patch.txt` 文件删除
</details>

<details>
<summary>TEE 伪造</summary>

> **检测方式**：证书链 / 密钥属性显示 TEE 行为被模拟。
>
> 使用 TEESimulator(RS) 模块解决，使用证书链生成模式。
</details>

<details>
<summary>TEE 损坏</summary>

> **检测方式**：TEE 侧密钥 / 证书链不完整或不可用。
>
> 尝试使用 Tricky Store 或者 [TEESimulator-RS](https://github.com/Enginex0/TEESimulator-RS) 模块解决，搭配 [TS插件使用](https://github.com/KOWX712/Tricky-Addon-Update-Target-List/releases/tag/v5.0-beta.1)。
>
> 刷入后请重启，开机后打开模块的 webUI 进行配置。
>
> TEE 损坏的设备请使用生成证书链模式。
</details>

<details>
<summary>密钥证明未完成或链不一致</summary>

> **检测方式**：密钥证明证书链不完整或与预期链不一致。
>
> 使用 [TEESimulator-RS](https://github.com/Enginex0/TEESimulator-RS) 并配置后尝试解决
</details>

<details>
<summary>AOSP密钥</summary>

> **检测方式**：keybox 使用 AOSP 测试根（而非厂商 / Google 正式根）签发。
>
> 更换 `/data/adb/tricky_store/` 目录下的 `keybox.xml` 文件。
>
> 也可选择刷入 [TS插件](https://github.com/KOWX712/Tricky-Addon-Update-Target-List/releases/tag/v5.0-beta.1)，重启后打开模块的 webUI 界面进行密钥配置。
</details>

<details>
<summary>Boot Hash不匹配</summary>

> **检测方式**：比对 boot / vbmeta 的 hash（如 `ro.boot.vbmeta.digest`）与基线值。
>
> boot 镜像的 Hash 不匹配。
>
> 通常 BL 解锁后 hash 会变成 0000，使用 [Native detector](https://t.me/rootdetector/49) 获取正确的 hash 后使用 Tricky Store/[TEESimulator-RS](https://github.com/Enginex0/TEESimulator-RS) 模块并使用 [TS插件](https://github.com/KOWX712/Tricky-Addon-Update-Target-List/releases/tag/v5.0-beta.1) 配置 hash 解决。
</details>

<details>
<summary>Bootloader unlock</summary>

> **检测方式**：读取 bootloader 锁定状态相关属性 / 认证结果。
>
> BL 已解锁，使用 [TEESimulator-RS模块隐藏](https://github.com/Enginex0/TEESimulator-RS)。
>
> 需要配置 `/data/adb/tricky_store/` 目录下的 `target.txt` 文件，在其中添加软件包名（实时生效无需重启）。
>
> 也推荐使用 [TS插件](https://github.com/KOWX712/Tricky-Addon-Update-Target-List/releases/tag/v5.0-beta.1) 进行软件包名的可视化配置。
</details>

<details>
<summary>启动状态异常</summary>

> **检测方式**：读取 verified boot 状态（如 `ro.boot.verifiedbootstate`）与预期比对。
>
> BL 已解锁，使用 [TEESimulator-RS模块隐藏](https://github.com/Enginex0/TEESimulator-RS)。
>
> 需要配置 `/data/adb/tricky_store/` 目录下的 `target.txt` 文件，在其中添加软件包名（实时生效无需重启）。
</details>

<details>
<summary>密钥篡改(128)</summary>

> **检测方式**：密钥 / 证书链属性一致性判定未通过（分组 128）。
>
> Tricky Store 在一加高通设备上默认使用"密钥链生成模式"
>
> 尝试更换 [TEESimulator-RS模块](https://github.com/Enginex0/TEESimulator-RS)
</details>

<details>
<summary>密钥篡改（q）</summary>

> **检测方式**：密钥 / 证书链属性一致性判定未通过（分组 q）。
>
> 未知
</details>

<details>
<summary>密钥篡改（b）</summary>

> **检测方式**：密钥 / 证书链属性一致性判定未通过（分组 b）。
>
> 未知
</details>

<details>
<summary>证书已被吊销(CRL)</summary>

> **检测方式**：证书序列号命中吊销列表（本地静态库或在线查询）。
>
> 更换 `/data/adb/tricky_store/` 目录下的 `keybox.xml` 文件
</details>

<details>
<summary>密钥篡改</summary>

> **检测方式**：密钥 / 证书链属性一致性判定未通过。
>
> [使用TEESimulator-RS模块?](https://github.com/Enginex0/TEESimulator-RS)
</details>

<details>
<summary>TrustedCert 证书篡改</summary>

> **检测方式**：证书链与受信任根 / 预期链不一致。
>
> 未知
</details>

---

## 挂载与命名空间检测

<details>
<summary>mountinfo</summary>

> **检测方式**：在进程早期先拍一次 mountinfo 快照，之后与运行期视图对照，两者不一致即命中（`Mountinfo view drift`）。
>
> 通过两种手段获取出来的挂载视图不一样。可能存在隐瞒的问题,有时某服务处理不及时就会报（极早 mountinfo 快照 vs 后期对照）
> 
> 小米设备通常在开机后系统高占用时，打开检测器会出现此检测项。
</details>

<details>
<summary>zygote test (1)</summary>

> **检测方式**：app_zygote（应用 zygote）内的 fork 顺序探针：用 `/dev/socket/logdw` 打开日志 socket 取 identity / cookie，按 `prepare/parent/child`、父子存活与 fd 关闭顺序判断是否存在 **Zygisk 早于 app-zygote 注入** 的残留；属侧信道类，不稳定。
>
> 打开 ZygiskNext 的链接器功能与匿名内存功能尝试解决。
> 
> 排除列表策略-仅还原挂载。
> 
> 不稳定检测，侧信道。
</details>

<details>
<summary>Inconsistent mount</summary>

> **检测方式**：把 `/proc/self/exe` 解析出的挂载与 `statfs` 得到的文件系统类型做比对，类型不一致即命中。
>
> `/proc/self/exe/` 解析出其中部分的挂载，然后再去看文件系统类型是否一致。（挂载的类型不同）
> 
> 存在部分设备暂未修复的误报现象（3.4版本中已修复）。
</details>

<details>
<summary>Mount loophole</summary>

> **检测方式**：检查系统修改类模块的 magic mount 是否对系统分区生效。
>
> Magic Mount 对系统修改模块挂载生效
> 
> 但挂载需要其他模块来隐藏（可选择 SusFS/ZygiskNext）
> 
> 使用 ZygiskNext 的排除策略 > 仅还原挂载，并配置排除列表 / 开启默认卸载模块对其实施隐藏。
</details>

<details>
<summary>Magic Mount</summary>

> **检测方式**：检查 magic mount（模块对系统的挂载改写）痕迹。
>
> 检测到 Magic Mount
> 
> 请尝试排除某些针对系统修改的模块，使用某些模块隐藏这个问题（比如 ZygiskNext 中的排除策略）。
</details>

<details>
<summary>不一致的挂载/debug_ramdisk</summary>

> **检测方式**：检查 `/debug_ramdisk` 是否被卸载 / 挂载视图不一致。
>
> `umount /debug_ramdisk`
</details>

<details>
<summary>Futile hide 04</summary>

> **检测方式**：挂载命名空间 / 挂载异常相关。
>
> 原理-挂载命名空间?
> 
> 检测挂载异常
>
> 尝试更换"元模块"解决
</details>

<details>
<summary>挂载间隙</summary>

> **检测方式**：检查挂载组 ID / peer-group 表的连续性：组 ID 出现跳跃（如 1,2,3,6,7…）或 peer-group 表不一致（存在被隐藏的挂载点）即命中。
>
> 在此判断方法中，当挂载组 ID 增长不连续时（例如 1,2,3,6,7,8...）判定为存在隐藏 root 行为；反之，当挂载组 ID 增长连续（例如 1,2,3,4,5,6,7...）则正常。
> 
> 当 Magisk 系切换 namespace 时将出现此现象，而对于 KernelSU 系/APatch 系，如果使用了某些具有绑定挂载功能的模块也可能出现此现象。
> 
> **解决办法**：
> - **Magisk 系**：使用 Magisk Alpha 可解决，原理未知。
> - **Kernel 系/APatch 系**：尝试更换"元模块"解决或者更新 ROOT 管理器。
> 
> 如果问题仍存在，请检查具有绑定挂载功能的系统模块，以及系统是否原生存在此现象。
>
> *注意*：在少数 ROM 中原生存在此现象，如果属于这种情况请忽略此条目。
</details>

<details>
<summary>2222</summary>

> **检测方式**：挂载异常（组 ID / peer-group 相关）。
>
> 检测挂载异常
</details>

---

## 环境、进程与文件检测

<details>
<summary>Miscellaneous Check(12)</summary>

> **检测方式**：用 `smaps` 的页面驻留（`Referenced`）配合 `MADV_COLD` / `clear_refs` 做启发式扫描，探测隐藏映射或 Zygisk 类实现；当前实现存在问题，可能失效或误报。
>
> 通过扫描 smaps 启发式探测 Zygisk 实现（特别是 Zygisk-Next），但目前的实现方式存在问题，导致检测失效。
> 
> 在检测方法被修复或移除前请忽略此条目。
</details>

<details>
<summary>Looper fd图异常</summary>

> **检测方式**：读取本进程 fd 目标（`/proc/self/fd` + `readlink`），把 fd 图（打开的文件 / socket / 匿名 inode）与预期做对比。
>
> 暂时未知
</details>

<details>
<summary>HMA或许存在</summary>

> **检测方式**：检查是否存在 HMA（隐藏应用列表）相关服务 / 包特征，而检测器自身看不到对应应用。
>
> 疑似检测旧版使用 Scene_Hide-eBPF 模块行为（检测不到 scene 应用程序存在，但检测到相关服务）
> 
> [分支项目/拉取更新重新构建模块并刷入/从Releases中下载](https://github.com/Andrea-lyz/Scene-Port-Hider-by-eBPF)
</details>

<details>
<summary>fdinfo mnt 采样异常（c）</summary>

> **检测方式**：读取 `/proc/*/fdinfo` 中的 `mnt_id` 做抽样统计，与挂载视图交叉验证；USB 调试残留或临时挂载容易触发。
>
> 大概率为检测到 USB 调试痕迹，小概率误报。可使用脚本[调试痕迹消除](https://github.com/YiJieqwq/ADB-Trace-Cleaner/releases)尝试解决。
</details>

<details>
<summary>内存异常</summary>

> **检测方式**：页驻留 / 软脏位类探针（`clear_refs`、`smaps`、`MADV_COLD`），用于发现隐藏或异常映射。
>
> 清除检测器数据后若还存在，那么请开 Issues 并提供你的模块列表信息以及使用了哪些 xp 模块，我有时间会研究的。
</details>

<details>
<summary>Futile hide 1</summary>

> **检测方式**：`/data/local/tmp` 元数据（时间戳等）异常。
>
> 很少人出现，暂时未知原因，暂时没有可靠的解决方案。
</details>

<details>
<summary>风险应用</summary>

> **检测方式**：与风险包名名单比对（见附录 A）。
>
> 暂时未知的手段，自行尝试使用 HMA-OSS 对检测器隐藏某些可能是风险的应用程序。
</details>

<details>
<summary>Dirty Device(a)</summary>

> **检测方式**：与“替换密钥行为”相关的脏设备判定；部分版本会连带匹配 `/storage/emulated/0` 下的 `.sh` 特征文件。
>
> 检测到内核接口？外挂 sh?
> 
> 检测到 `/storage/emulated/0/` 目录有文件夹/文件名称有 sh？
> 
> 尝试重启手机或刷机，删除在 `/storage/emulated/0/` 带有 sh 字样的文件夹/文件。
</details>

<details>
<summary>环境存疑1（实验性检测）</summary>

> **检测方式**：实验性环境一致性判定（社区反馈：HMA-OSS 黑名单模式 + 勾选“输入法”预设时出现）。
>
> 在 HMA-OSS 中对检测器开启黑名单模式隐藏后，若勾选了设置预设中的“输入法”选项后，此检测项就会出现？
</details>

<details>
<summary>Evil Service</summary>

> **检测方式**：检查是否存在 LSPosed / Shizuku / 各类 Xposed 模块相关的服务或绑定。
>
> 关于 lsp, shizuku 还有一些 xp 模块的修改检测。
</details>

<details>
<summary>Miscellaneous Check（a）</summary>

> **检测方式**：检查 dex2oat 相关标志（如 `dalvik.vm.dex2oat-flags`）；LSP / Xposed 类模块往往会修改它们。
>
> 检测到 dex2oat（通常是 LSP 的问题，更换/更新 LSP 模块）。
</details>

<details>
<summary>[Hook] Suspicious library injection</summary>

> **检测方式**：检查库注入痕迹（zygisk / riru / xposed 常见特征）。
>
> (zygisk/riru/xposed)
> 
> 检测到 HOOK，自行排查原因，因素过多。
</details>

<details>
<summary>设备为模拟器</summary>

> **检测方式**：检查模拟器 / 虚拟化特征，如 `/dev/goldfish_pipe`、`/dev/qemu_pipe`、`/dev/socket/genyd`、`/sys/qemu_trace` 等，以及 `goldfish` / `ranchu` / `qemu` / `genymotion` / `bluestacks` / `ldplayer` / `nox` / `memu` / `ttvm` / `vbox` / `vmware` 等机型关键字。
>
> 当前是模拟器设备。
</details>

<details>
<summary>Found LSPHook Framework</summary>

> **检测方式**：检查 LSPosed / LSPatch 一类框架的运行痕迹。
>
> 检测到 LSPHook Framework
> 
> 某些 xp 模块修改导致，也可卸载更换 LSP 模块。
</details>

<details>
<summary>检测到Scene端口占用</summary>

> **检测方式**：检查 Scene 使用的本地端口 / 服务是否在监听。
>
> 请查看此[项目](https://github.com/Andrea-lyz/Scene-Port-Hider-by-eBPF)并尝试解决。
> 
> 无视此检测项，或者关闭 scene 的无障碍权限，或将 scene 更新到 9.3.1 以上。
</details>

<details>
<summary>Zygisk detected</summary>

> **检测方式**：检查 Zygisk 注入痕迹（匿名可执行映射、进程环境、模块入口等）。
>
> 检测到 Zygisk，通常是 magisk 自带的 zygisk 导致（关闭解决）或者其他原因。
> 
> 更新[ZygiskNext模块](http://github.com/Dr-TSNG/ZygiskNext)。
</details>

<details>
<summary>Suspicious Surroundings (a)</summary>

> **检测方式**：对 `/data/local/tmp` 做元数据检查：目录属组是否为 `shell`。
>
> `/data/local/tmp` 文件夹所有组异常。
>
> **解决方案**：所有组改为 shell。
</details>

<details>
<summary>Suspicious Surroundings（b）</summary>

> **检测方式**：检查 `/data/local/tmp` 的 inode 值是否偏高（异常增大往往是目录被替换 / 重建导致）。
>
> 路径 `/data/local/tmp` 文件夹的 inode 值高于 10000。
> 
> **解决方案**：将设备恢复出厂设置 / 使用 SusFS 对路径伪装 inode 值小于 1000 / 尝试使用 [Inode-Hijacker](https://github.com/YiJieqwq/Inode-Hijacker/releases) 脚本解决。
> 
> 如遇到有线投屏（如 Scrcpy）不可用，使用 `su -c restorecon -RF /data/local/tmp` 解决问题。
</details>

<details>
<summary>Suspicious Surroundings（c）</summary>

> **检测方式**：检查 `/data/local/tmp` 的权限是否为默认值（771）。
>
> `/data/local/tmp` 的权限被修改（默认 771）。
> 
> **解决方案**：重新设置权限。
</details>

<details>
<summary>Futile hide</summary>

> **检测方式**：`/data/local/tmp` 目录时间戳被修改等元数据异常。
>
> 以下方案可能过时：
> 
> `/data/local/tmp` 文件夹 tmp 的时间被修改。
> 
> 格式化系统或者把 tmp 文件夹删除重启后变上方 abc，再使用 sukisu 中的 Kstat 配置（需要内核集成 SusFS）添加 `/data/local/tmp` 目录只修改 ino 值比如 7365（tmp 目录权限保持 771，所有者为 shell）。
</details>

<details>
<summary>/data/local/tmp denied</summary>

> **检测方式**：检查 `/data/local/tmp` 是否可访问（权限 / 是否存在）。
>
> 目录 `/data/local/tmp` 拒绝访问，文件夹权限设置问题? 文件夹不存在?
</details>

<details>
<summary>终端环境存疑</summary>

> **检测方式**：检查是否存在 pty（终端模拟）痕迹。
>
> 检测 Pty。
</details>

<details>
<summary>MT管理器（MT2文件夹）/异常文件</summary>

> **检测方式**：检查 `/storage/emulated/0/MT2/`、boot.img、`.xml` 等文件。
>
> 异常文件：检测到根目录下的“mt2”文件夹与 boot.img / “.xml”异常文件。
> 
> “mt2”可在 MT 管理器设置中对 MT2 路径自定义修改解决（记得删除旧文件夹）。
</details>

<details>
<summary>Risk apps‘软件包名’</summary>

> **检测方式**：读取 `/storage/emulated/0/Android/data/` 下的目录名以获取已安装包名（普通应用通常没有该权限），再与风险名单比对。
>
> 通过 Unicode 零宽字符漏洞检查 `/storage/emulated/0/Android/data/` 中的风险应用包名。
> 
> 安装 [Unicode零宽修复模块](https://github.com/5ec1cff/FuseFixer) 对 `/storage/emulated/0/Android/data/` 目录修复可被读取问题，并搭配 HMA-OSS 对风险应用隐藏。
</details>

<details>
<summary>Thanox service detected</summary>

> **检测方式**：检查 Thanox 相关服务。
>
> 检测到 Thanox 服务。
> 
> 可以使用这个 xp 模块来隐藏：[hideThanox](https://t.me/Suxiaomingpd/125)。
</details>

<details>
<summary>异常文件</summary>

> **检测方式**：在 `/dev`、`/data`、`/data/local/tmp`、`/storage/emulated/0` 等位置匹配高危文件名与外挂特征（清单见附录 B）。
>
> **检测路径**：`/dev` 和 `/data/local/tmp`
> 1. 重命名/删除相关目录文件。
> 2. 排查并删除以下高危路径：
>    ```text
>    /data/local/stryker
>    /data/system/appretention
>    /data/local/tmp/luckys
>    /data/local/tmp/input_devices
>    /data/local/tmp/hyperceiler
>    /data/local/tmp/simplehook
>    /data/local/tmp/disabledallgoogleservices
>    /data/local/mio
>    /data/dna
>    /data/local/tmp/cleaner_starter
>    /data/local/tmp/byyang
>    /data/local/tmp/mount_mask
>    /data/local/tmp/mount_mark
>    /data/local/tmp/scripttmp
>    /data/local/luckys
>    /data/local/tmp/horae_control.log
>    /data/gpu_freq_table.conf
>    /storage/emulated/0/download/advanced
>    /storage/emulated/0/documents/advanced
>    /data/system/noactive
>    /data/system/freezer
>    /storage/emulated/0/android/naki
>    /data/swap_config.conf
>    /data/local/tmp/resetprop
>    ```
</details>

---

## 内核、属性与系统特征检测

<details>
<summary>无效的伪造信息(1)</summary>

> **检测方式**：**触发条件**：Widevine（`MediaDrm`）报告 `securityLevel = L1`，但 `openSession()` 抛 `NotProvisionedException`，且 `getProvisionRequest().getData()` 返回长度 **0** 的数据。
>
> **现象**：设备显示 Widevine L1（DRM Info 与检测器“设备信息”都会显示 L1），但本条目仍判定“与 L1 不符”。该条目在界面上**没有展开详情**（属摘要型条目）。
>
> **第一步：先判断是不是误报**
> 1. 播放**必须 L1 才能解码**的内容（Netflix / Disney+ / Prime 等的 HD / 1080p+）：
>    - 能 HD / 1080p+ 正常播放 ⇒ L1 本体正常，本条**大概率是误报**（已知小米设备、含**未解锁**设备也会稳定命中），可先忽略并等待版本更新；
>    - 只能播放 SD ⇒ 继续第 2 步。
> 2. 排查“伪装 L1 状态”的模块：TrickyStore / TEESimulator(-RS) 的 target 列表、`keybox.xml`、安全补丁同步，以及各类 PIF / 属性伪装模块；逐项关闭后**重启**复测。
> 3. 只在最后才考虑“远程 RKP 密钥（RKPConfig）”：本机若已是 RKP（远程密钥下发）通常无效，目前小米机型普遍无效。
>
> ⚠️ **安全提示**：RKPConfig 类应用会让设备向 Google 请求 RKP 密钥下发，会**改变设备的密钥供应 / 认证状态**；安装前请确认来源可信与可撤销性。
</details>

<details>
<summary>Found property</summary>

> **检测方式**：检查 `persist.logd.size` / `persist.logd.size.crash` / `persist.logd.size.system` / `persist.logd.size.main` 是否被设置为**非空**（非空即命中；这几个属性是日志缓冲区设置，部分模块/脚本会写入）。
>
> 执行[此sh](https://github.com/mingzun09/Chunqiu-Detector-Problem-solution/blob/main/File/Found%20property.sh)尝试解决。
</details>

<details>
<summary>Property Modified（数字代表几处属性修改）</summary>

> **检测方式**：扫描属性区空洞：`/dev/__properties__/` 下属性文件的权限 / 属主 / 大小与对应 SELinux context，以及属性区是否存在未被使用的空洞（`prop_area` 重叠 / 空洞）——出现空洞说明属性被动态修改过。
>
> 隐藏被修改的属性可将 shamiko 模块中的 [shamiko_Plus.sh](https://github.com/mingzun09/Chunqiu-Detector-Problem-solution/blob/main/File/shamiko_Plus.sh) 文件添加并移动到 `/data/adb/service.d/` 目录下，确认该脚本有执行权限后重启，尝试解决。
</details>

<details>
<summary>avb校验异常 avb=2.0</summary>

> **检测方式**：读取 `ro.boot.vbmeta.avb_version` 等 vbmeta 属性并与预期比对。
>
> avb 版本异常。
> 
> 某些模块会造成此问题，比如改机型模块，自行排查模块尝试解决。
</details>

<details>
<summary>Tampered kernel</summary>

> **检测方式**：读取内核 uname（版本、构建时间）与预设名单 / 基线比对。
>
> 内核信息校验异常（内核字符版本，内核构建时间）。
> 
> 尝试使用 SusFS 隐藏或者还原未修改的 boot.img。
</details>

<details>
<summary>[hook]Resetprop modified</summary>

> **检测方式**：属性被 resetprop 类工具动态改写。
>
> resetprop 被修改。
> 
> 未知。
</details>

<details>
<summary>Miscellaneous Check(2)</summary>

> **检测方式**：设备 / 机型篡改检测（改机型模块常见触发）。
>
> 检测设备篡改/机型篡改。
> 
> 改机型模块导致? 自行排查。
</details>

<details>
<summary>Miscellaneous Check(3)</summary>

> **检测方式**：改机 / 隔离相关检测（如 Vold appdata 隔离的影响）。
>
> 改机检测？
>
> 以下方案可能过时：开启过“隐藏应用列表(HMA)”的 Vold appdata 隔离？
</details>

<details>
<summary>Netlink socket anomaly</summary>

> **检测方式**：以普通应用身份向 netlink `sock_diag` 发一次查询：正常策略下应被拒绝；若拿到响应，说明 netlink 策略被改写（常见于 root 隐藏方案对该接口的放行）。
>
> 暂时未知
</details>

<details>
<summary>伪装内核</summary>

> **检测方式**：内核信息被伪装（SusFS 等）后的一致性判定。
>
> 无效的使用 SusFS 伪装内核。
> 
> 伪装内核启动阶段选择 post-fs-data。
</details>

<details>
<summary>第三方内核</summary>

> **检测方式**：内核版本信息命中预设特征名单。
>
> 内核信息符合预设信息名单。
> 
> 伪装内核信息解决。
</details>

<details>
<summary>第三方rom/自编译内核</summary>

> **检测方式**：内核版本号后缀带 `-Dirty` 等自编译特征。
>
> 第三方 ROM 标记。
>
> 内核版本号后缀带有 `-Dirty`。
>
> 伪装内核信息解决。
</details>

<details>
<summary>第三方ROM（2）</summary>

> **检测方式**：第三方 ROM 特征（第二组）。
>
> 暂时未知
</details>

<details>
<summary>ROM detected</summary>

> **检测方式**：系统 / 机型特征命中第三方 ROM 名单。
>
> 检测到第三方 ROM。
>
> 部分三方 rom 特征符合。
>
> 可自行尝试伪装。
</details>

<details>
<summary>环境伪造</summary>

> **检测方式**：不同复现条件下触发面不同——① 刷入 ZN-Audit Patch 一类审计补丁后触发（见下）；② 也有反馈指向**属性伪装类模块**（`persist.sys.pihooks_*`、`persist.sys.pixelprops.*`、`persist.sys.spoof.gms` 等，待验证）；自查线索：本进程 maps 中是否出现 PIF / IntegrityFix / PixelProps 相关模块。
>
> 旧设备（4系内核）可能误报？
>
> **已知触发面：**
> - 刷入 ZN-Audit Patch 模块或类似行为后会触发 → 卸载该模块；
> - **属性伪装类模块**（PIF / pihooks / pixelprops / spoof 类）也可能触发（待验证）→ 用 `getprop | grep -iE "pihooks|pixelprops|spoof"` 检查是否存在属性伪装残留，定位到对应模块后处理，或对检测器隐藏相关属性；
> - 部分自定义 / 移植 ROM 自带的机型或属性伪装也可能触发。
</details>

<details>
<summary>检测失败</summary>

> **检测方式**：该条检测本身未成功完成（环境限制 / 超时等），**不是“命中”**；可重试或忽略。
>
> 2333333
</details>

<details>
<summary>Something wrong</summary>

> **检测方式**：内部异常 / 未分类命中。
>
> 未知
</details>

<details>
<summary>Miscellaneous Check(4/5/6/7/8/9)</summary>

> **检测方式**：模拟器 / 虚拟机、改机行为、三方与移植 ROM 等一组检测；部分机型（如国外设备的 Poco / 三星）存在误报。
>
> 一些有关模拟器虚拟机/模拟器的检测/改机行为检测/三方&移植 ROM。
>
> 在国外设备 Poco/三星误报情况（待修复）。
</details>

<details>
<summary>Vold隔离已开启</summary>

> **检测方式**：读取 `persist.sys.vold_app_data_isolation_enabled`（HMA / HMA-OSS 的 Vold appdata 隔离会写这个属性）。
>
> 关闭HMA/HMAOSS设置终端Vold app data隔离
> 
> 如果关闭重启后还存在 `persist.sys.vold_app_data_isolation_enabled=0`
> 
> su shell执行 `resetprop -p --delete persist.sys.vold_app_data_isolation_enabled` 然后重启即可
</details>

---

## 附录

<details>
<summary>附录 A：风险 / 黑名单包名（85 个）</summary>

> 由社区实测命中汇总整理，随版本变化。

- `cn.android.x`
- `cn.aodlyric.xiaowine`
- `cn.geektang.privacyspace`
- `cn.kwaiching.hook`
- `cn.myflv.monitor.noactive`
- `cn.myflv.noactive`
- `com.apocalua.run`
- `com.byyoung.setting`
- `com.coderstory.toolkit`
- `com.cshlolss.vipkill`
- `com.ddm.qute`
- `com.demo.serendipity`
- `com.didjdk.adbhelper`
- `com.dna.tools`
- `com.example.ourom`
- `com.fankes.enforcehighrefreshrate`
- `com.fankes.tsbattery`
- `com.fkzhang.wechatxposed`
- `com.fuck.android.rimet`
- `com.github.tianma8023.xposed.smscode`
- `com.hchen.appretention`
- `com.hchen.switchfreeform`
- `com.houvven.impad`
- `com.kooritea.fcmfix`
- `com.lerist.fakelocation`
- `com.luckyzyx.luckytool`
- `com.modify.installer`
- `com.nnnen.plusne`
- `com.omarea.vtools`
- `com.padi.hook.hookqq`
- `com.qq.qcxm`
- `com.rifsxd.ksunext`
- `com.rkg.IAMRKG`
- `com.sevtinge.hyperceiler`
- `com.shatyuka.zhiliao`
- `com.silverlab.app.deviceidchanger.free`
- `com.sukisu.ultra`
- `com.suqi8.oshin`
- `com.syyf.quickpay`
- `com.tencent.JYNB`
- `com.tencent.jingshi`
- `com.termux`
- `com.tsng.hidemyapplist`
- `com.tsng.pzyhrx.hma`
- `com.twifucker.hachidori`
- `com.wei.vip`
- `com.wn.app.np`
- `com.xayah.databackup.foss`
- `com.yuanwofei.cardemulator.pro`
- `com.yxer.packageinstalles`
- `com.zhufucdev.motion_emulator`
- `dialog.box`
- `dknb.con`
- `dknb.coo8`
- `github.tornaco.android.thanos`
- `have.fun`
- `io.github.Retmon403.oppotheme`
- `io.github.a13e300.ksuwebui`
- `io.github.qauxv`
- `io.github.vvb2060.magisk`
- `kk.dk.anqu`
- `lin.xposed`
- `me.bingyue.IceCore`
- `me.gm.cleaner`
- `me.plusne`
- `me.simpleHook`
- `me.teble.xposed.autodaily`
- `miko.client`
- `moe.fuqiuluo.portal`
- `name.monwf.customiuizer`
- `nep.timeline.freezer`
- `nep.timeline.re_telegram`
- `one.yufz.hmspush`
- `org.lsposed.lspatch`
- `org.lsposed.lspd`
- `org.lsposed.manager`
- `ru.maximoff.apktool`
- `top.bienvenido.saas.i18n`
- `top.hookvip.pro`
- `top.sacz.timtool`
- `tornaco.apps.shortx.ext`
- `vn.kwaiching.tao`
- `xzr.hkf`
- `xzr.konabess`
- `zako.zako.zako`
</details>

<details>
<summary>附录 B：高危文件 / 目录（167 条）</summary>

> `/dev`、`/data`、`/data/local/tmp`、`/storage/emulated/0` 等位置的异常文件与外挂特征。

- `/Android/obb/`
- `/data/`
- `/data/A内核.ini`
- `/data/BingHPJY/pz.cfg`
- `/data/BingPUBG`
- `/data/Dit驱动`
- `/data/HPX`
- `/data/HPY`
- `/data/adb`
- `/data/encore/custom_default_cpu_gov`
- `/data/encore/default_cpu_gov`
- `/data/gpu_freq_table.conf`
- `/data/js`
- `/data/js.sh`
- `/data/local/MIO`
- `/data/local/luckys`
- `/data/local/stryker/`
- `/data/local/tmp`
- `/data/local/tmp denied`
- `/data/local/tmp/A内核公益-和平精英0215x1`
- `/data/local/tmp/A内核公益-和平精英0215x1(1)`
- `/data/local/tmp/A内核公益-和平精英0215x1(2)`
- `/data/local/tmp/DisabledAllGoogleServices`
- `/data/local/tmp/HyperCeiler`
- `/data/local/tmp/Surfing_update`
- `/data/local/tmp/android_server`
- `/data/local/tmp/android_server64`
- `/data/local/tmp/cleaner_starter`
- `/data/local/tmp/encore_logo.png`
- `/data/local/tmp/gdbserver`
- `/data/local/tmp/horae_control.log`
- `/data/local/tmp/luckys`
- `/data/local/tmp/mount_mask`
- `/data/local/tmp/resetprop`
- `/data/local/tmp/scriptTMP`
- `/data/local/tmp/simpleHook`
- `/data/local/tmp/yshell`
- `/data/local/中野三玖`
- `/data/misc`
- `/data/nh.ko`
- `/data/nh2`
- `/data/nh3`
- `/data/nh4`
- `/data/nh5`
- `/data/swap_config.conf`
- `/data/system`
- `/data/system/AppRetention`
- `/data/system/Freezer/`
- `/data/system/HPX`
- `/data/system/HPY`
- `/data/system/NoActive/`
- `/data/system/junge/`
- `/data/system/liboxmem.so`
- `/data/system/xydriver.ko`
- `/data/南瓜三角洲公益最新版本.sh`
- `/data/物资.txt`
- `/debug_ramdisk`
- `/debug_ramdisk/`
- `/dev/Bing`
- `/dev/__properties__/`
- `/dev/binder`
- `/dev/binderfs`
- `/dev/binderfs/%s`
- `/dev/cpuset/AppOpt/`
- `/dev/hwbinder`
- `/dev/pts/`
- `/dev/socket/logdw`
- `/dev/vndbinder`
- `/dex_crc.dat`
- `/index`
- `/jit-cache`
- `/mnt/user/`
- `/my_product/etc/permissions/oplus_google_cn_gms_features.xml`
- `/odm/build.prop`
- `/perms/`
- `/proc/`
- `/proc/%d`
- `/proc/%d/attr/current`
- `/proc/%d/cmdline`
- `/proc/%d/comm`
- `/proc/%d/ns/mnt`
- `/proc/%d/status`
- `/proc/%s/comm`
- `/proc/%s/mountinfo`
- `/proc/%s/status`
- `/proc/1/mem`
- `/proc/1/mountinfo`
- `/proc/fs/ext4/`
- `/proc/fs/jbd2`
- `/proc/net/unix`
- `/proc/self`
- `/proc/self context match=`
- `/proc/self context match=unavailable`
- `/proc/self context mismatch`
- `/proc/self/attr/current`
- `/proc/self/clear_refs`
- `/proc/self/cmdline`
- `/proc/self/exe`
- `/proc/self/fd`
- `/proc/self/fd/%d`
- `/proc/self/fd/%s`
- `/proc/self/maps`
- `/proc/self/mem`
- `/proc/self/mountinfo`
- `/proc/self/mounts`
- `/proc/self/ns/mnt`
- `/proc/self/smaps`
- `/proc/self/status`
- `/proc/self/task/%s/mem`
- `/proc/sys/kernel/ns_last_pid`
- `/proc/sys/kernel/osrelease`
- `/proc/sys/kernel/pid_max`
- `/product/build.prop`
- `/sdcard/Download/com.niunaijun.blackdexa64_logcat.txt`
- `/sdcard/Download/dexdump/`
- `/sdcard/fart`
- `/storage/emulated/0/`
- `/storage/emulated/0/Android/Clash/`
- `/storage/emulated/0/Android/HChai/`
- `/storage/emulated/0/Android/Yume-Yunyun/`
- `/storage/emulated/0/Android/naki/`
- `/storage/emulated/0/Documents/advanced/`
- `/storage/emulated/0/Download/advanced/`
- `/storage/emulated/0/MT2/`
- `/storage/emulated/0/TpTestReport/screenOn/OK/0/`
- `/storage/emulated/0/rlgg/`
- `/storage/emulated/0/弱隐.sh`
- `/storage/emulated/0/落叶配置`
- `/storage/emulated/elgg/`
- `/sys/fs/cgroup`
- `/sys/fs/cgroup/apps/uid_%d`
- `/sys/fs/cgroup/apps/uid_%d/pid_%d/`
- `/sys/fs/cgroup/system`
- `/sys/fs/cgroup/system/uid_%d`
- `/sys/fs/cgroup/system/uid_%d/pid_%d/`
- `/sys/fs/cgroup/system/uid_0`
- `/sys/fs/cgroup/uid_%d`
- `/sys/fs/cgroup/uid_%d/pid_%d/`
- `/sys/fs/cgroup/uid_0`
- `/sys/fs/selinux`
- `/sys/fs/selinux/access`
- `/sys/fs/selinux/class/`
- `/sys/fs/selinux/context`
- `/sys/fs/selinux/enforce`
- `/sys/fs/selinux/policy`
- `/sys/fs/selinux/status`
- `/sys/kernel/debug/binder`
- `/sys/kernel/debug/binder/proc`
- `/system/`
- `/system/bin/adb`
- `/system/bin/app_process`
- `/system/bin/app_process64`
- `/system/bin/encore_profiler`
- `/system/bin/encore_utility`
- `/system/bin/gmsc`
- `/system/bin/imgbox`
- `/system/bin/logcat`
- `/system/bin/logcat -d`
- `/system/bin/run_write.sh`
- `/system/bin/scene_swap_module.sh`
- `/system/bin/sh`
- `/system/build.prop`
- `/system/framework`
- `/system/framework/framework.jar`
- `/vendor/`
- `/vendor/build.prop`
- `/vendor/etc/selinux/vendor_sepolicy.cil`
</details>

<details>
<summary>附录 C：被检查的系统属性（34 个）</summary>

- `dalvik.vm.dex2oat-flags`
- `persist.chunqiu.path_hide`
- `persist.chunqiu.path_hide=1`
- `persist.debug.dalvik.vm.core_platform_api_policy`
- `persist.logd.size`
- `persist.logd.size.crash`
- `persist.logd.size.main`
- `persist.logd.size.system`
- `persist.sys.pihooks.disable.gms`
- `persist.sys.pihooks_BRAND`
- `persist.sys.pihooks_DEVICE`
- `persist.sys.pihooks_DEVICE_INIT`
- `persist.sys.pihooks_MANUFACTURE`
- `persist.sys.pihooks_MODEL`
- `persist.sys.pihooks_PRODUCT`
- `persist.sys.pihooks_RELEASE`
- `persist.sys.pihooks_SDK_INT`
- `persist.sys.pixelprops.gapps`
- `persist.sys.pixelprops.gms`
- `persist.sys.pixelprops.google`
- `persist.sys.pixelprops.gphotos`
- `persist.sys.spoof.gms`
- `persist.sys.vold_app_data_isolation_enabled`
- `ro.boot.flash.locked`
- `ro.boot.selinux`
- `ro.boot.vbmeta.avb_version`
- `ro.boot.vbmeta.device_state`
- `ro.boot.vbmeta.digest`
- `ro.boot.verifiedbootstate`
- `ro.build.date.utc`
- `ro.build.type`
- `ro.build.version.sdk`
- `ro.product.brand`
- `ro.product.brand=`
</details>

<details>
<summary>附录 D：近期版本新增 / 加强的检测面（社区实测）</summary>

- 进程 / 命名空间：`/proc/self/cgroup`、`/proc/self/stat`、`/proc/self/task`、`/proc/thread-self/status`、`/sys/fs/cgroup/apps`（含 cgroup 路径格式校验 `0::/uid_N/pid_M`、`0::/apps/uid_N/pid_M`）
- SELinux：`SELinux fs stat anomaly`（对 selinuxfs 文件元数据做 stat 校验）、**加扰动后**的 `raw/lib` 一致性复检、`selinux_get_callback`
- 日志面扩大：`logcat -b all -d -t 768`（旧版是定向读取 events/auditd）
- 属性伪装新增：`persist.sys.pihooks_FINGERPRINT`、`persist.sys.pihooks_SDK_INT`、`ro.build.fingerprint`
- 新增黑名单 / 特征路径：`/storage/emulated/0/keybox.xml`、`/storage/emulated/0/sukisu一键隐藏环境v4.9.zip`、`/storage/emulated/0/BY物资`、`/data/BingPUBG/guns.cfg`、`/data/local/tmp/mount_mark`、`/data/local/tmp/单发枪配置.txt`、`/sdcard/Android/data/`、`/vendor/etc/selinux/vendor_file_contexts`

</details>
