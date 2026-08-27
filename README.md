# GitHub Weekly Digest

每周日早上 8:00（Asia/Shanghai）自动抓取 GitHub Trending，
按 AI / 大模型、开发者工具、科技数码三个赛道整理成可分享的网页。

## 启用步骤

1. 把仓库推到 GitHub
2. 进 **Settings → Pages**，Source 选 `gh-pages` 分支
3. 等待首次运行（也可手动在 Actions 页面触发 `workflow_dispatch`）
4. 访问 `https://<your-name>.github.io/github-weekly-digest/` 看报告

## URL 规则

| 路径 | 含义 |
|---|---|
| `/` | 历史索引页（列出所有期次） |
| `/2026-08-27/` | 当期周报 |
| `/history.json` | 历史列表（机器可读） |

每期周报按日期独立归档，URL 永久有效。

## 自定义

编辑 [scripts/fetch.mjs](scripts/fetch.mjs) 顶部的 `KEYWORDS` 与 `LANGS`，
或调整 `searchNewHighStarRepos` 里的：

- `days`：回看天数（默认 7）
- `minStars`：最低星数（默认 100）

## 本地试跑

```bash
node scripts/fetch.mjs
node scripts/build.mjs
open dist/index.html
```

## 触发时间

`.github/workflows/weekly.yml` 用的是：

```
cron: "0 0 * * 0"
```

这是 UTC 0:00，对应 **北京时间 8:00**。

## 目录结构

```
.github/workflows/weekly.yml   # 定时任务
scripts/fetch.mjs              # 抓取 trending + 搜索 API
scripts/build.mjs              # 渲染 dist/<date>/ + dist/index.html
data/trending.json             # 抓取结果（自动生成）
dist/
  index.html                   # 历史索引（部署后访问 /）
  history.json                 # 历史索引（机器可读）
  2026-08-27/index.html        # 当期周报（部署后访问 /2026-08-27/）
  2026-08-20/index.html        # 上期周报
  ...
```

## 工作流

1. 拉取 `gh-pages` 分支的 `dist/` 历史归档
2. 抓取 trending + 新发布高星仓库
3. 生成当期 `dist/<date>/index.html` + 更新 `dist/history.json` + 重建 `dist/index.html`
4. 部署到 `gh-pages`（保留旧文件）
5. 历史索引页自动出现新一期入口

## 版本

当前 `v0.2.0` — 增加日期归档 + 历史索引