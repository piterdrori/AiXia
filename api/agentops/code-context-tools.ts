/**

 * Vercel serverless route — production rejects Code / Context Tools execution.

 * Vite dev uses scripts/agentops-api-dev-plugin.ts instead.

 */



export default async function handler(request: Request): Promise<Response> {

  const { handleCodeContextToolsRequest } = await import(

    "../../scripts/agentops-code-context-tools-runner.mjs"

  );

  return handleCodeContextToolsRequest(request, process.env);

}

