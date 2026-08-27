# GitHub Weekly Digest

每周日早上 8:00（Asia/Shanghai）自动抓取 GitHub Trending，
按 AI / 大模型、开发者工具、科技数码三个赛道整理成可分享的网页。

## 启用步骤

1. 把仓库推到 GitHub
2. 进 **Settings → Pages**，Source 选 `gh-pages` 分支
3. 等待首次运行（也可手动在 Actions 页面触发 `workflow_dispatch`）
4. 访问 `https://<your-name>.github.io/github-weekly-digest/` 看报告

## 自定义

编辑 [scripts/fetch.mjs](scripts/fetch.mjs) 顶部的 `KEYWORDS` 与 `LANGS`，
或调整 `searchNewHighStarRepos` 里的：

- `days`：回看天数（默认 7）
- `minStars`：最低星数（默认 100）

## 本地试跑

```bash
npm i -g node   # 或装 node 22
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
scripts/build.mjs              # 渲染 dist/index.html
data/trending.json             # 抓取结果（自动生成）
dist/index.html                # 部署产物
```