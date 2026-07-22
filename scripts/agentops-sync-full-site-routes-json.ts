import { writeFileSync } from "node:fs";
import { FULL_SITE_ROUTE_INVENTORY } from "../src/lib/agentops/runtime/fullSiteRouteInventory.ts";

const out = "qa-agent/agentops-agents/_shared/full-site-routes.json";
writeFileSync(out, `${JSON.stringify([...FULL_SITE_ROUTE_INVENTORY], null, 2)}\n`, "utf8");
const agentDetails = FULL_SITE_ROUTE_INVENTORY.filter((r) =>
  /\/system\/agent-ops\/agents\/[a-z0-9-]+-agent$/.test(r),
);
console.log(
  JSON.stringify(
    {
      out,
      count: FULL_SITE_ROUTE_INVENTORY.length,
      agentDetails: agentDetails.length,
      hasDesign: FULL_SITE_ROUTE_INVENTORY.includes("/system/agent-ops/agents/design-agent"),
    },
    null,
    2,
  ),
);
