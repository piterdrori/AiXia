import type { LucideIcon } from "lucide-react";

import type { ReactNode } from "react";



import { AixiaReviewGrid, AixiaSection } from "@/components/aixia";



type Props = {

  title: string;

  description?: string;

  icon?: LucideIcon;

  children: ReactNode;

  actions?: ReactNode;

  /** Forwards to `AixiaReviewGrid` as `data-review-grid-layout` (e.g. overview-4). */

  gridLayout?: string;

};



export function AixiaContextSummarySection({

  title,

  description,

  icon,

  children,

  actions,

  gridLayout,

}: Props) {

  return (

    <AixiaSection title={title} description={description} icon={icon} actions={actions}>

      <AixiaReviewGrid variant="cards" data-review-grid-layout={gridLayout}>

        {children}

      </AixiaReviewGrid>

    </AixiaSection>

  );

}

