import type { ReactNode } from "react";

export type AixiaProcessStageProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function AixiaProcessStage({ eyebrow, title, description, children }: AixiaProcessStageProps) {
  return (
    <article className="aixia-process-stage">
      <header className="aixia-process-stage__header">
        {eyebrow ? <p className="aixia-process-stage__eyebrow">{eyebrow}</p> : null}
        <h2 className="aixia-process-stage__title">{title}</h2>
        {description ? <p className="aixia-process-stage__description">{description}</p> : null}
      </header>
      <div className="aixia-process-stage__content">{children}</div>
    </article>
  );
}
