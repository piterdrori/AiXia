#!/usr/bin/env node
/**
 * Finance pages → command shell standard (safe migration).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FINANCE_APP = path.join(ROOT, "src", "app", "finance");
const SKIP = new Set([
  path.join(FINANCE_APP, "page.tsx"),
  path.join(FINANCE_APP, "transactions", "page.tsx"),
  path.join(FINANCE_APP, "settings", "page.tsx"),
]);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name === "page.tsx") out.push(full);
  }
  return out;
}

function stripHeroProp(text, propName) {
  const heroRe = /<AixiaHero[\s\S]*?\/>|<AixiaHero[\s\S]*?<\/AixiaHero>/g;
  return text.replace(heroRe, (heroBlock) => {
    const marker = `${propName}=`;
    let block = heroBlock;
    let idx = 0;
    while ((idx = block.indexOf(marker, idx)) !== -1) {
      const start = idx;
      let i = idx + marker.length;
      if (block[i] === "{") {
        let depth = 1;
        i++;
        while (i < block.length && depth > 0) {
          if (block[i] === "{") depth++;
          else if (block[i] === "}") depth--;
          i++;
        }
      } else if (block[i] === '"') {
        i++;
        while (i < block.length && block[i] !== '"') i++;
        i++;
      }
      while (i < block.length && /[\s\n]/.test(block[i])) i++;
      block = block.slice(0, start) + block.slice(i);
      idx = start;
    }
    return block;
  });
}

function fixHeroTitle(heroBlock) {
  if (!/title="Studio"/.test(heroBlock) && !/studioName/.test(heroBlock)) {
    return heroBlock;
  }
  const grad = heroBlock.match(/gradientTitle=\{([^}]+)\}|gradientTitle="([^"]+)"/);
  if (!grad) return heroBlock;
  const val = grad[1] ?? `"${grad[2]}"`;
  return heroBlock
    .replace(/title="Studio"/, `title={${val}}`)
    .replace(/title=\{t\([^)]*studioName[^)]*\)\}/, `title={${val}}`);
}

function patchHeroBlocks(text) {
  return text.replace(/<AixiaHero[\s\S]*?\/>|<AixiaHero[\s\S]*?<\/AixiaHero>/g, (heroBlock) => {
    let block = heroBlock;
    block = stripHeroProp(block, "badges");
    block = stripHeroProp(block, "statusCards");
    block = stripHeroProp(block, "description");
    block = fixHeroTitle(block);
    if (!/surface="command"/.test(block)) {
      block = block.replace("<AixiaHero", '<AixiaHero\n        surface="command"');
    }
    if (!/className="shrink-0 space-y-4"/.test(block)) {
      block = block.replace("<AixiaHero", '<AixiaHero\n        className="shrink-0 space-y-4"');
    }
    return block;
  });
}

function fixImports(text) {
  if (text.includes("<AixiaPage") || text.includes("<FinancePage")) {
    if (!text.includes("FinancePage")) {
      text = text.replace(/\bAixiaPage\b/, "FinancePage");
    }
  }
  text = text.replace(/<AixiaPage(\s|>|\/)/g, "<FinancePage$1");
  text = text.replace(/<\/AixiaPage>/g, "</FinancePage>");
  return text;
}

function findHeroEnd(inner) {
  const heroMatch = inner.match(/<AixiaHero[\s\S]*?\/>|<AixiaHero[\s\S]*?<\/AixiaHero>/);
  if (!heroMatch || heroMatch.index === undefined) return -1;
  return heroMatch.index + heroMatch[0].length;
}

function wrapFinancePageBlock(inner) {
  if (inner.includes("aixia-command-scroll") || !/<AixiaHero/.test(inner)) {
    return inner;
  }

  const heroEnd = findHeroEnd(inner);
  if (heroEnd === -1) return inner;

  const body = inner.slice(heroEnd).trim();
  if (!body) return inner;

  return (
    inner.slice(0, heroEnd) +
    `\n\n      <div className="aixia-command-scroll">\n${body}\n      </div>`
  );
}

function wrapCommandScroll(text) {
  return text.replace(/<FinancePage>([\s\S]*?)<\/FinancePage>/g, (match, inner) => {
    const wrapped = wrapFinancePageBlock(inner);
    if (wrapped === inner) return match;
    return `<FinancePage>${wrapped}</FinancePage>`;
  });
}

let changed = 0;
for (const filePath of walk(FINANCE_APP)) {
  if (SKIP.has(filePath)) continue;
  let text = fs.readFileSync(filePath, "utf8");
  if (!text.includes("<AixiaHero")) continue;
  const original = text;
  text = fixImports(text);
  text = patchHeroBlocks(text);
  text = wrapCommandScroll(text);
  if (text !== original) {
    fs.writeFileSync(filePath, text, "utf8");
    changed++;
    console.log("updated:", path.relative(ROOT, filePath));
  }
}
console.log(`Done. ${changed} files updated.`);
