# @vimojs/version-checker

浏览器端版本更新检测 SDK：定时拉取 Vite `manifest.json`，计算稳定指纹并与基线对比；检测到更新后进入 `update_available` 并停止轮询，通过事件/回调触发更新提示或由业务接管更新流程。

## 特性

- 仅依赖浏览器能力（Web Crypto），无需额外 hash 依赖
- 首次检查只写入 baseline，不触发更新
- 检测到更新后进入 `update_available`，默认停止轮询
- 内置默认 UI（不可配置）；也支持完全禁用 UI 或业务自定义 UI
- 事件系统 `on/off` + options 回调双通道
- 页面 `focus` / `online` 默认触发补查

## 安装

```bash
npm i @vimojs/version-checker
```

## 前提条件

- 构建产物需要部署可访问的 `manifest.json`（本包当前只支持 Vite manifest 结构）
- 默认请求路径为 `/manifest.json`
- SDK 会在请求 URL 上追加 query 参数 `__vimo_vc_t=Date.now()` 以降低缓存命中风险

## 快速开始

默认启用内置 UI（右下角 toast，文案与样式不可配置）：

```ts
import { createVersionChecker } from '@vimojs/version-checker'

const checker = createVersionChecker()
checker.start()
```

仅做检测与回调，不展示 UI：

```ts
import { createVersionChecker } from '@vimojs/version-checker'

const checker = createVersionChecker({
  notify: false,
  onUpdateAvailable(ctx) {
    console.log('update available:', ctx.fingerprint)
  }
})

checker.start()
```

业务自定义 UI（与内置 UI 完全分离）：

```ts
import { createVersionChecker } from '@vimojs/version-checker'

const checker = createVersionChecker({
  notify(ctx) {
    const ok = window.confirm('检测到新版本，是否立即刷新？')
    if (ok) ctx.applyUpdate()
  }
})

checker.start()
```

## API

### createVersionChecker(options?)

返回一个 checker 实例：

- `checker.start()`：启动轮询（页面隐藏时暂停；可见后延迟恢复）
- `checker.stop()`：停止轮询并进入 `stopped`
- `checker.checkNow(): Promise<CheckResult>`：立刻检查一次（带并发保护：同一时刻只会有一个 in-flight 请求）
- `checker.getState(): 'idle' | 'running' | 'update_available' | 'stopped'`
- `checker.applyUpdate()`：默认 `location.reload()`
- `checker.on(event, handler)` / `checker.off(event, handler)`：事件订阅

### autoVersionCheck(options?)

等价于 `createVersionChecker(options)` 后立即 `start()`，返回 checker 实例。

## Options

### 调度

- `interval?: number`：轮询间隔，默认 `10000`
- `minInterval?: number`：最小间隔，默认 `3000`（运行时 clamp：`max(interval, minInterval)`）
- `resumeDelayMs?: number`：页面重新可见时的恢复延迟，默认 `1000`

### 触发（默认开启）

- `resumeOnFocus?: boolean`：`focus` 时触发补查，默认 `true`
- `resumeOnOnline?: boolean`：`online` 时触发补查，默认 `true`

### Manifest 请求

- `manifestUrl?: string | (() => string)`：默认 `/manifest.json`
- `headers?: Record<string, string>`：默认会包含 `Cache-Control: no-cache`、`Pragma: no-cache`
- `fetcher?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>`：自定义 fetch（用于测试或特殊环境）

### Baseline 存储

- `baselineStorage?: 'localStorage' | { get(): string | null; set(v: string): void }`
  - 默认 `localStorage`
  - 默认存储 key：`__vimojs_version_checker__baseline__`

### UI / 回调

- `notify?: 'default' | false | ((ctx) => void)`
  - `'default'`：使用内置 UI（不可配置）
  - `false`：禁用 UI
  - `function`：业务自定义 UI
- `onUpdateAvailable?: (ctx) => void`
- `onChecked?: (result) => void`
- `onError?: (err) => void`

## Events

事件名：

- `checked`：每次检查结束都会触发（包括错误）
- `update_available`：检测到更新
- `error`：发生错误
- `state_change`：状态变化

示例：

```ts
import { createVersionChecker } from '@vimojs/version-checker'

const checker = createVersionChecker({ notify: false })

checker.on('checked', (r) => console.log('checked:', r))
checker.on('update_available', (ctx) => console.log('update:', ctx))
checker.on('error', (err) => console.log('error:', err))
checker.on('state_change', (s) => console.log('state:', s))

checker.start()
```

## 行为说明

- 首次成功检查：写入 baseline，不触发更新
- 后续检查指纹变化：进入 `update_available`，停止轮询，并触发 `update_available` + `onUpdateAvailable` +（按配置决定是否展示 UI）
- 错误处理：错误也算一次 `checked`；不做自动重试

## SSR 与非浏览器环境

本包允许导入，但在非浏览器环境执行 `start()`/`checkNow()` 会返回 `kind: 'error'` 的结果（并触发 `error` / `onError`）。

## 安全提示

- `manifest.json` 不直接泄露源码，但会暴露资源结构与依赖关系
- 生产环境不要对公网暴露 sourcemap（常见源码泄露来源）

## License

MIT

