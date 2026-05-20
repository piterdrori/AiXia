#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const LIST_HUBS = [
  "src/app/finance/transactions/proforma-invoices/page.tsx",
  "src/app/finance/transactions/purchase-orders/page.tsx",
  "src/app/finance/transactions/quotations/page.tsx",
  "src/app/finance/transactions/vendor-quotations/page.tsx",
];

const brokenMetricBlock = `      </AixiaHero>
<AixiaMetricGrid>
        {metricCards.map((metric) => (
          <AixiaMetricCard
            key={metric.key}
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
            tone={metric.tone}
          />

      <div className="aixia-command-scroll">
))}
      </AixiaMetricGrid>`;

const fixedMetricBlock = `        <AixiaMetricGrid>
        {metricCards.map((metric) => (
          <AixiaMetricCard
            key={metric.key}
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
            tone={metric.tone}
          />
        ))}
      </AixiaMetricGrid>
      </AixiaHero>

      <div className="aixia-command-scroll">`;

for (const rel of LIST_HUBS) {
  const filePath = path.join(ROOT, rel);
  let text = fs.readFileSync(filePath, "utf8");
  if (!text.includes(brokenMetricBlock)) {
    console.log("skip (pattern missing):", rel);
    continue;
  }
  text = text.replace(brokenMetricBlock, fixedMetricBlock);
  text = text.replace(/\n\s*<\/div><\/FinancePage>/g, "\n      </div>\n    </FinancePage>");
  fs.writeFileSync(filePath, text, "utf8");
  console.log("fixed:", rel);
}

const vendorNewPath = path.join(
  ROOT,
  "src/app/finance/transactions/vendor-quotations/new/page.tsx"
);
let vendorNew = fs.readFileSync(vendorNewPath, "utf8");
const vendorBroken = `      </AixiaHero>
<AixiaMetricGrid>
        <AixiaMetricCard
          label="Lines"
          value={lines.length.toLocaleString()}
          icon={FileText}
          tone="cyan"
        />

      <div className="aixia-command-scroll">
<AixiaMetricCard`;
const vendorFixed = `        <AixiaMetricGrid>
        <AixiaMetricCard
          label="Lines"
          value={lines.length.toLocaleString()}
          icon={FileText}
          tone="cyan"
        />
        <AixiaMetricCard`;
if (vendorNew.includes(vendorBroken)) {
  vendorNew = vendorNew.replace(vendorBroken, vendorFixed);
  vendorNew = vendorNew.replace(
    /(\s*<\/AixiaMetricGrid>\s*\n\s*)(\{errorMessage)/,
    "$1</AixiaHero>\n\n      <div className=\"aixia-command-scroll\">\n      $2"
  );
  vendorNew = vendorNew.replace(/\n\s*<\/div><\/FinancePage>/g, "\n      </div>\n    </FinancePage>");
  fs.writeFileSync(vendorNewPath, vendorNew, "utf8");
  console.log("fixed: vendor-quotations/new");
}

console.log("Done.");
