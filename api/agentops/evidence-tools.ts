/**
 * Vercel serverless route — production rejects Evidence Tools execution.
 * Vite dev uses scripts/agentops-api-dev-plugin.ts instead.
 */

export default async function handler(request: Request): Promise<Response> {
  const { handleEvidenceToolsRequest } = await import(
    "../../scripts/agentops-evidence-tools-runner.mjs"
  );
  return handleEvidenceToolsRequest(request, process.env);
}
