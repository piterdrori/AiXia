/**
 * Vercel serverless route — production rejects whitelisted local scan commands.
 * Vite dev uses scripts/agentops-api-dev-plugin.ts instead.
 */

export default async function handler(request: Request): Promise<Response> {
  const { handleGlobalMemoryRunCommandRequest } = await import(
    "../../../scripts/agentops-global-memory-command-runner.mjs"
  );
  return handleGlobalMemoryRunCommandRequest(request, process.env);
}
