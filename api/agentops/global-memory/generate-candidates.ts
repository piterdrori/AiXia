/**
 * Vercel serverless route — production rejects local report candidate generation.
 * Vite dev uses scripts/agentops-api-dev-plugin.ts instead.
 */

export default async function handler(request: Request): Promise<Response> {
  const { handleGlobalMemoryGenerateCandidatesRequest } = await import(
    "../../../scripts/agentops-global-memory-candidate-generator.mjs"
  );
  return handleGlobalMemoryGenerateCandidatesRequest(request, process.env);
}
