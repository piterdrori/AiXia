import { routeMonitoringRequest } from "./_lib/routes.js";

export default async function handler(request: Request): Promise<Response> {
  return routeMonitoringRequest(request);
}

export const GET = handler;
export const POST = handler;
