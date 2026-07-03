import { routeMonitoringRequest } from "./_lib/monitoringRoutes.js";

export default async function handler(request: Request): Promise<Response> {
  return routeMonitoringRequest(request);
}

export const GET = handler;
export const POST = handler;
