"use client";

import { useState } from "react";

import { AixiaButton } from "../AixiaButton";

export type AixiaProcessInfoProps = {
  title: string;
  text: string;
  label?: string;
};

export function AixiaProcessInfo({ title, text, label = "More information" }: AixiaProcessInfoProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="aixia-process-info">
      <button
        type="button"
        className="aixia-process-info__button"
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        i
      </button>

      {open ? (
        <span
          className="aixia-process-info__overlay"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={() => setOpen(false)}
        >
          <span
            className="aixia-process-info__modal"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <span className="aixia-process-info__title">{title}</span>
            <span className="aixia-process-info__text">{text}</span>
            <AixiaButton type="button" variant="secondary" onClick={() => setOpen(false)}>
              Close
            </AixiaButton>
          </span>
        </span>
      ) : null}
    </span>
  );
}
