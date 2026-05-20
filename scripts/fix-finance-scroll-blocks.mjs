#!/usr/bin/env node
/**
 * Balance aixia-command-scroll wrappers inside each FinancePage block.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FINANCE_APP = path.join(ROOT, "src", "app", "finance");

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name === "page.tsx") out.push(full);
  }
  return out;
}

function findHeroEnd(inner) {
  const heroMatch = inner.match(/<AixiaHero[\s\S]*?\/>|<AixiaHero[\s\S]*?<\/AixiaHero>/);
  if (!heroMatch || heroMatch.index === undefined) return -1;
  return heroMatch.index + heroMatch[0].length;
}

function countDivDelta(fragment) {
  const opens = (fragment.match(/<div[\s/>]/g) || []).length;
  const closes = (fragment.match(/<\/div>/g) || []).length;
  return opens - closes;
}

function fixFinancePageInner(inner) {
  if (!/<AixiaHero/.test(inner)) return inner;

  const trimmed = inner.trimEnd();
  const scrollOpens = (inner.match(/<div className="aixia-command-scroll">/g) || []).length;

  if (scrollOpens > 0) {
    const delta = countDivDelta(inner);
    if (delta > 0) {
      return `${trimmed}\n      </div>\n    `;
    }
    return inner;
  }

  const heroEnd = findHeroEnd(inner);
  if (heroEnd === -1) return inner;

  const before = inner.slice(0, heroEnd);
  let body = inner.slice(heroEnd).trim();
  if (!body) return inner;

  const trailingClose = body.match(/\n(\s*)<\/div>\s*$/);
  if (trailingClose) {
    const bodyWithoutClose = body.replace(/\n\s*<\/div>\s*$/, "");
    if (countDivDelta(bodyWithoutClose) <= 0) {
      body = bodyWithoutClose;
    }
  }

  return `${before}\n\n      <div className="aixia-command-scroll">\n${body}\n      </div>`;
}

function fixFile(text) {
  text = text.replace(
    /<motion className="aixia-command-scroll">/g,
    '<div className="aixia-command-scroll">'
  );

  return text.replace(/<FinancePage>([\s\S]*?)<\/FinancePage>/g, (match, inner) => {
    const fixed = fixFinancePageInner(inner);
    if (fixed === inner) return match;
    return `<FinancePage>${fixed}</FinancePage>`;
  });
}

let changed = 0;
for (const filePath of walk(FINANCE_APP)) {
  const original = fs.readFileSync(filePath, "utf8");
  const fixed = fixFile(original);
  if (fixed !== original) {
    fs.writeFileSync(filePath, fixed, "utf8");
    changed++;
    console.log("fixed:", path.relative(ROOT, filePath));
  }
}
console.log(`Done. ${changed} files fixed.`);
