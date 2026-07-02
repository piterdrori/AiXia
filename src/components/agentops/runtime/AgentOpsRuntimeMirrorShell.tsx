import type { ReactNode } from "react";



import { AixiaCommandPageLayout } from "@/components/aixia";

import {

  AgentOpsConnectionDebugger,

  AgentOpsRuntimeSystemBlockState,

} from "@/components/agentops/runtime/AgentOpsConnectionDebugger";

import { AgentOpsRuntimeLoadingState } from "@/components/agentops/runtime/AgentOpsRuntimeMirrorStates";

import {

  AgentOpsRuntimeRefreshProvider,

  useAgentOpsRuntimeConnectionContext,

} from "@/components/agentops/runtime/AgentOpsRuntimeRefreshProvider";

import { isAgentOpsSchemaReady } from "@/lib/agentops/runtime/agentOpsSupabaseConnection";



import {

  AgentOpsRuntimeNav,

  type AgentOpsRuntimeMirrorSection,

} from "./AgentOpsRuntimeNav";



type AgentOpsRuntimeMirrorShellProps = {

  active: AgentOpsRuntimeMirrorSection;

  hero: ReactNode;

  scrollLead?: ReactNode;

  children: ReactNode;

  /** When false, hub layout renders without the runtime sidebar (diagnostics index only). */
  showNav?: boolean;

};



function AgentOpsRuntimeMirrorShellInner({

  active,

  hero,

  scrollLead,

  children,

  showNav = true,

}: AgentOpsRuntimeMirrorShellProps) {

  const { projectHealth, loading, refresh } = useAgentOpsRuntimeConnectionContext();

  const schemaReady = isAgentOpsSchemaReady(projectHealth);



  const blockedBody =

    loading && !projectHealth ? (

      <AgentOpsRuntimeLoadingState

        title="Verifying Supabase AgentOps schema"

        description="Probing agentops_* tables in the connected project…"

      />

    ) : !schemaReady && projectHealth ? (

      <AgentOpsRuntimeSystemBlockState

        projectHealth={projectHealth}

        onRecheck={() => void refresh(true)}

        rechecking={loading}

      />

    ) : null;



  if (blockedBody) {

    return (

      <AixiaCommandPageLayout

        hero={hero}

        moduleClassName="aixia-agentops-runtime-mirror-page"

      >

        <div className="flex min-h-0 flex-1 flex-col gap-6">{blockedBody}</div>

      </AixiaCommandPageLayout>

    );

  }



  return (

    <AixiaCommandPageLayout

      hero={hero}

      scrollLead={scrollLead}

      moduleClassName="aixia-agentops-runtime-mirror-page"

    >

      <div className={`flex min-h-0 flex-1 flex-col gap-4 ${showNav ? "lg:flex-row lg:items-start" : ""}`}>

        {showNav ? <AgentOpsRuntimeNav active={active} /> : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6">

          {import.meta.env.DEV ? (

            <AgentOpsConnectionDebugger projectHealth={projectHealth} />

          ) : null}

          {children}

        </div>

      </div>

    </AixiaCommandPageLayout>

  );

}



export function AgentOpsRuntimeMirrorShell(props: AgentOpsRuntimeMirrorShellProps) {

  return (

    <AgentOpsRuntimeRefreshProvider>

      <AgentOpsRuntimeMirrorShellInner {...props} />

    </AgentOpsRuntimeRefreshProvider>

  );

}


