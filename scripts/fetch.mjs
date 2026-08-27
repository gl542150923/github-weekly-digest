// 抓取 GitHub 本周 Trending 仓库，按关键词筛选与"自媒体相关"赛道
// 输出：data/trending.json
import fs from "node:fs";
import path from "node:path";

const KEYWORDS = [
  // AI / 大模型 / Agent
  "ai", "llm", "gpt", "agent", "claude", "openai", "anthropic",
  "rag", "embedding", "transformer", "diffusion", "mcp",
  "prompt", "copilot", "cursor", "langchain", "llamaindex",
  // 编程 / 开发 / 开发者工具
  "devtool", "cli", "ide", "vscode", "editor", "compiler",
  "framework", "sdk", "library", "runtime", "wasm", "rust",
  "typescript", "golang", "python", "developer", "devops",
  "ci", "cd", "docker", "kubernetes", "serverless",
  // 科技数码 / 互联网产品
  "saas", "productivity", "notion", "open-source", "indie",
  "hacker", "startup", "app", "browser", "mobile",
];

// 语言分类标签
const LANGS = ["javascript", "typescript", "python", "go", "rust", "java", "cpp", "swift", "kotlin"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchTrending(since = "weekly") {
  const url = `https://github.com/trending/${since}?since=${since}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "github-weekly-digest",
      "Accept": "text/html",
    },
  });
  if (!res.ok) throw new Error(`fetch trending failed: ${res.status}`);
  return res.text();
}

// 从 HTML 解析 Trending 列表
// GitHub Trending 页面结构稳定，文本提取方式够用
function parseTrending(html) {
  const repos = [];
  const articleRe = /<article class="Box-row">([\s\S]*?)<\/article>/g;
  const linkRe = /<h2[^>]*>\s*<a[^>]*href="\/(.*?)"/;
  const descRe = /<p class="col-9[^"]*">([\s\S]*?)<\/p>/;
  const langRe = /<span itemprop="programmingLanguage">([\s\S]*?)<\/span>/;
  const starsRe = /href="\/.*?\/stargazers"[^>]*>\s*([\s\S]*?)\s*<\/a>/;
  const forksRe = /href="\/.*?\/forks"[^>]*>\s*([\s\S]*?)\s*<\/a>/;
  const todayStarsRe = /<span class="d-inline-block float-sm-right">([\s\S]*?)<\/span>/;

  let m;
  while ((m = articleRe.exec(html)) !== null) {
    const block = m[1];
    const link = linkRe.exec(block);
    const desc = descRe.exec(block);
    const lang = langRe.exec(block);
    const stars = starsRe.exec(block);
    const forks = forksRe.exec(block);
    const today = todayStarsRe.exec(block);

    if (!link) continue;
    const [owner, repo] = link[1].split("/");
    const strip = (s) => (s || "").replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ");
    repos.push({
      owner,
      repo,
      full_name: link[1],
      url: `https://github.com/${link[1]}`,
      description: strip(desc?.[1]) || "",
      language: strip(lang?.[1]) || "",
      stars: Number(strip(stars?.[1]).replace(/,/g, "")) || 0,
      forks: Number(strip(forks?.[1]).replace(/,/g, "")) || 0,
      today_stars: strip(today?.[1]) || "",
    });
  }
  return repos;
}

// 二次过滤：调用 GitHub Search API 找出本周新发布 + 高星仓库
// Trending 不一定是"本周新发布"，为了对齐用户期望"本周新发布高星"，再叠一层
async function searchNewHighStarRepos(token, days = 7, minStars = 100) {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  const q = `created:>${date} stars:>=${minStars}`;
  const items = [];

  for (const keyword of ["ai OR llm OR agent", "developer OR cli OR framework", "productivity OR saas OR app"]) {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q + " " + keyword)}&sort=stars&order=desc&per_page=10`;
    const res = await fetch(url, {
      headers: {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      console.warn(`search failed for "${keyword}": ${res.status}`);
      continue;
    }
    const data = await res.json();
    for (const r of data.items || []) {
      items.push({
        owner: r.owner.login,
        repo: r.name,
        full_name: r.full_name,
        url: r.html_url,
        description: r.description || "",
        language: r.language || "",
        stars: r.stargazers_count,
        forks: r.forks_count,
        today_stars: `${r.stargazers_count} stars total`,
        created_at: r.created_at,
      });
    }
    await sleep(1500); // 限速友好
  }

  // 去重
  const seen = new Set();
  return items.filter((r) => {
    if (seen.has(r.full_name)) return false;
    seen.add(r.full_name);
    return true;
  });
}

async function main() {
  const outDir = path.resolve("data");
  fs.mkdirSync(outDir, { recursive: true });

  console.log("→ Fetching trending page ...");
  const html = await fetchTrending("weekly");
  const trending = parseTrending(html);
  console.log(`  parsed ${trending.length} repos`);

  console.log("→ Filtering by keywords ...");
  const kwHit = (text) => {
    const t = (text || "").toLowerCase();
    return KEYWORDS.some((k) => t.includes(k));
  };
  const langHit = (lang) => LANGS.includes((lang || "").toLowerCase());
  const trendingFiltered = trending.filter(
    (r) => kwHit(r.full_name) || kwHit(r.description) || langHit(r.language)
  );

  console.log("→ Searching new high-star repos via API ...");
  const newHighStar = await searchNewHighStarRepos(process.env.GITHUB_TOKEN);

  // 合并去重
  const seen = new Set();
  const merged = [];
  for (const r of [...trendingFiltered, ...newHighStar]) {
    if (seen.has(r.full_name)) continue;
    seen.add(r.full_name);
    merged.push(r);
  }
  merged.sort((a, b) => (b.stars || 0) - (a.stars || 0));

  fs.writeFileSync(
    path.join(outDir, "trending.json"),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        trending_filtered: trendingFiltered,
        new_high_star: newHighStar,
        merged,
      },
      null,
      2,
    ),
  );

  console.log(`✓ saved ${merged.length} repos to data/trending.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});