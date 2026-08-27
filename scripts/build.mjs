// 把 trending.json 渲染成：
//   dist/index.html           —— 历史索引页
//   dist/<date>/index.html    —— 当期周报
//   dist/history.json         —— 历史列表（机器可读）
import fs from "node:fs";
import path from "node:path";

const data = JSON.parse(fs.readFileSync(path.resolve("data/trending.json"), "utf-8"));

const fmtDate = (iso) => {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const repos = data.merged || [];

function bucket(repo) {
  const text = `${repo.full_name} ${repo.description}`.toLowerCase();
  if (/(ai|llm|gpt|agent|claude|openai|anthropic|rag|embedding|transformer|diffusion|mcp|prompt|copilot|cursor|langchain|llamaindex)/.test(text))
    return "AI / 大模型 / Agent";
  if (/(devtool|cli|ide|vscode|editor|compiler|framework|sdk|library|runtime|wasm|rust|typescript|golang|python|developer|devops|docker|kubernetes|serverless)/.test(text))
    return "编程 / 开发 / 开发者工具";
  if (/(saas|productivity|notion|open-source|indie|hacker|startup|app|browser|mobile)/.test(text))
    return "科技数码 / 互联网产品";
  return "其他";
}

const groups = repos.reduce((acc, r) => {
  const k = bucket(r);
  (acc[k] ||= []).push(r);
  return acc;
}, {});

const ORDER = ["AI / 大模型 / Agent", "编程 / 开发 / 开发者工具", "科技数码 / 互联网产品", "其他"];

const repoHTML = (r) => `
  <article class="repo">
    <header>
      <a href="${esc(r.url)}" target="_blank" rel="noopener">
        <h3>${esc(r.full_name)}</h3>
      </a>
      <span class="lang">${esc(r.language || "—")}</span>
    </header>
    <p class="desc">${esc(r.description || "（无描述）")}</p>
    <footer>
      <span>⭐ ${(r.stars || 0).toLocaleString()}</span>
      <span>🍴 ${(r.forks || 0).toLocaleString()}</span>
      ${r.today_stars ? `<span class="today">🔥 ${esc(r.today_stars)}</span>` : ""}
    </footer>
  </article>
`;

const reportCSS = `
  :root {
    --bg: #0d1117; --panel: #161b22; --text: #e6edf3;
    --muted: #8b949e; --accent: #2f81f7; --border: #30363d;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; line-height: 1.6;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
      "PingFang SC", "Helvetica Neue", Arial, sans-serif;
    background: var(--bg); color: var(--text);
  }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 40px 24px; }
  header.top h1 { font-size: 28px; margin: 0 0 8px; }
  header.top .meta { color: var(--muted); font-size: 14px; }
  section.group { margin: 40px 0; }
  section.group h2 {
    font-size: 20px; margin: 0 0 16px;
    padding-bottom: 8px; border-bottom: 1px solid var(--border);
  }
  section.group h2 small { color: var(--muted); font-weight: normal; font-size: 14px; }
  .grid {
    display: grid; gap: 16px;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
  .repo {
    background: var(--panel); border: 1px solid var(--border);
    border-radius: 10px; padding: 16px;
    display: flex; flex-direction: column; gap: 10px;
    transition: transform .15s ease, border-color .15s ease;
  }
  .repo:hover { transform: translateY(-2px); border-color: var(--accent); }
  .repo header { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .repo h3 { margin: 0; font-size: 15px; }
  .repo a { color: var(--accent); text-decoration: none; }
  .repo a:hover { text-decoration: underline; }
  .lang {
    font-size: 12px; color: var(--muted);
    border: 1px solid var(--border); border-radius: 999px;
    padding: 2px 8px; white-space: nowrap;
  }
  .desc { margin: 0; color: #c9d1d9; font-size: 14px; min-height: 38px; }
  .repo footer { display: flex; gap: 14px; font-size: 13px; color: var(--muted); }
  .today { color: #f0883e; }
  footer.bottom {
    margin-top: 64px; padding-top: 16px;
    border-top: 1px solid var(--border);
    color: var(--muted); font-size: 13px; text-align: center;
  }
  footer.bottom a { color: var(--accent); text-decoration: none; }
  .back { display: inline-block; color: var(--muted); font-size: 14px; margin-bottom: 16px; }
  .back:hover { color: var(--accent); }
`;

const reportHTML = ({ title, groupsHTML, generated, total }) => `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(title)}</title>
  <style>${reportCSS}</style>
</head>
<body>
  <div class="wrap">
    <a class="back" href="../">← 返回历史</a>
    <header class="top">
      <h1>📦 GitHub Weekly Digest</h1>
      <div class="meta">生成于 ${fmtDate(generated)} · 共 ${total} 个项目</div>
    </header>
    ${groupsHTML || `<p style="color:var(--muted)">本周无数据。</p>`}
    <footer class="bottom">
      由 <a href="https://github.com/features/actions" target="_blank" rel="noopener">GitHub Actions</a> 自动生成 ·
      数据源：<a href="https://github.com/trending" target="_blank" rel="noopener">GitHub Trending</a>
    </footer>
  </div>
</body>
</html>
`;

const distDir = path.resolve("dist");
fs.mkdirSync(distDir, { recursive: true });

// 1) 当期周报 -> dist/<date>/index.html
const today = fmtDate(data.generated_at);
const groupsHTML = ORDER
  .filter((k) => groups[k]?.length)
  .map(
    (k) => `
    <section class="group">
      <h2>${esc(k)} <small>(${groups[k].length})</small></h2>
      <div class="grid">
        ${groups[k].map(repoHTML).join("")}
      </div>
    </section>
  `,
  )
  .join("");

const reportPath = path.join(distDir, today, "index.html");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(
  reportPath,
  reportHTML({
    title: `GitHub Weekly Digest · ${today}`,
    groupsHTML,
    generated: data.generated_at,
    total: repos.length,
  }),
);
console.log(`✓ rendered current report to ${reportPath}`);

// 2) 更新 history.json
const historyPath = path.join(distDir, "history.json");
let history = [];
if (fs.existsSync(historyPath)) {
  try {
    history = JSON.parse(fs.readFileSync(historyPath, "utf-8"));
  } catch {
    history = [];
  }
}
const entry = {
  date: today,
  generated_at: data.generated_at,
  url: `./${today}/`,
  total: repos.length,
  repos: repos.slice(0, 12).map((r) => ({
    full_name: r.full_name,
    url: r.url,
    description: r.description,
    stars: r.stars,
    bucket: bucket(r),
  })),
};

// 替换同一天的旧条目，避免重复
history = history.filter((h) => h.date !== today);
history.unshift(entry); // 最新在前
fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
console.log(`✓ updated history.json (${history.length} entries)`);

// 3) 渲染首页 -> dist/index.html（历史索引）
const indexHTML = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>GitHub Weekly Digest</title>
  <style>${reportCSS}
  .list { display: grid; gap: 16px; }
  .entry {
    background: var(--panel); border: 1px solid var(--border);
    border-radius: 10px; padding: 20px;
    transition: transform .15s ease, border-color .15s ease;
  }
  .entry:hover { transform: translateY(-2px); border-color: var(--accent); }
  .entry header {
    display: flex; justify-content: space-between; align-items: baseline;
    margin-bottom: 12px;
  }
  .entry h2 { margin: 0; font-size: 18px; }
  .entry h2 a { color: var(--accent); text-decoration: none; }
  .entry h2 a:hover { text-decoration: underline; }
  .entry .meta { color: var(--muted); font-size: 13px; }
  .entry .top3 {
    display: grid; gap: 10px;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    margin-top: 12px;
  }
  .entry .item {
    border-left: 2px solid var(--border);
    padding: 4px 12px;
  }
  .entry .item a { color: var(--text); text-decoration: none; font-weight: 500; }
  .entry .item a:hover { color: var(--accent); }
  .entry .item p { margin: 4px 0 0; font-size: 13px; color: var(--muted); }
  .badge {
    display: inline-block; font-size: 11px;
    color: var(--muted); border: 1px solid var(--border);
    border-radius: 999px; padding: 2px 8px; margin-left: 6px;
  }
  .empty { color: var(--muted); }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="top">
      <h1>📦 GitHub Weekly Digest</h1>
      <div class="meta">每周日北京时间 8:00 自动更新 · 共 ${history.length} 期</div>
    </header>

    ${
      history.length
        ? `<div class="list">
            ${history
              .map(
                (h) => `
              <article class="entry">
                <header>
                  <h2><a href="${esc(h.url)}">${esc(h.date)} 周报</a></h2>
                  <div class="meta">${h.total} 个项目 · 生成于 ${esc(fmtDate(h.generated_at))}</div>
                </header>
                <div class="top3">
                  ${h.repos
                    .slice(0, 6)
                    .map(
                      (r) => `
                    <div class="item">
                      <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.full_name)}</a>
                      <span class="badge">${esc(r.bucket)}</span>
                      <p>${esc(r.description || "（无描述）").slice(0, 80)}</p>
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              </article>
            `,
              )
              .join("")}
          </div>`
        : `<p class="empty">暂无历史记录。</p>`
    }

    <footer class="bottom">
      由 <a href="https://github.com/features/actions" target="_blank" rel="noopener">GitHub Actions</a> 自动生成 ·
      数据源：<a href="https://github.com/trending" target="_blank" rel="noopener">GitHub Trending</a>
    </footer>
  </div>
</body>
</html>
`;

fs.writeFileSync(path.join(distDir, "index.html"), indexHTML);
console.log(`✓ rendered history index to ${path.join(distDir, "index.html")}`);