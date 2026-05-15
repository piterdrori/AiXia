import type { ReactNode } from "react";

export type AixiaFinancePrintMetaRow = {
  label: string;
  value?: ReactNode;
};

export type AixiaFinancePrintParty = {
  label?: string;
  name?: ReactNode;
  contact?: ReactNode;
  email?: ReactNode;
  phone?: ReactNode;
  address?: ReactNode;
};

export type AixiaFinancePrintLineItem = {
  id?: string | number | null;
  description?: ReactNode;
  unitPrice?: ReactNode;
  quantity?: ReactNode;
  value?: ReactNode;
};

export type AixiaFinancePrintTermRow = {
  label: string;
  value?: ReactNode;
  detail?: ReactNode;
};

export type AixiaFinancePrintBankRow = {
  label: string;
  value?: ReactNode;
  monospace?: boolean;
};

export type AixiaFinancePrintTotalRow = {
  label: string;
  value?: ReactNode;
  highlight?: boolean;
};

type AixiaFinancePrintSheetProps = {
  children: ReactNode;
  className?: string;
};

type AixiaFinancePrintHeaderProps = {
  documentTitle: string;
  companyName?: ReactNode;
  companyContact?: ReactNode;
  companyPhone?: ReactNode;
  companyEmail?: ReactNode;
  companyAddress?: ReactNode;
  metaRows: AixiaFinancePrintMetaRow[];
  logoSrc?: string;
};

type AixiaFinancePrintPartyBlockProps = {
  party: AixiaFinancePrintParty;
};

type AixiaFinancePrintLineTableProps = {
  items: AixiaFinancePrintLineItem[];
  emptyLabel?: string;
  minRows?: number;
  maxRows?: number;
};

type AixiaFinancePrintBottomGridProps = {
  left: ReactNode;
  right: ReactNode;
};

type AixiaFinancePrintTermsBlockProps = {
  title?: string;
  rows: AixiaFinancePrintTermRow[];
  children?: ReactNode;
};

type AixiaFinancePrintBankBlockProps = {
  title?: string;
  rows: AixiaFinancePrintBankRow[];
  emptyText?: string;
};

type AixiaFinancePrintTotalsBlockProps = {
  rows: AixiaFinancePrintTotalRow[];
  signatureLabel?: string;
};

type AixiaFinancePrintFooterProps = {
  title?: string;
  terms?: ReactNode;
  history?: ReactNode;
  thankYou?: ReactNode;
};

type AixiaFinancePrintSectionProps = {
  title?: string;
  children: ReactNode;
};

const DEFAULT_LOGO_SRC =
  "https://leoilrrnwlquunsbulok.supabase.co/storage/v1/object/public/Branding/aixia-logo.png";

function hasRenderableValue(value: ReactNode) {
  if (value === null || value === undefined || value === false) return false;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (!normalized) return false;
    if (normalized === "undefined") return false;
    if (normalized === "null") return false;
  }

  return true;
}

function compactValues(values: ReactNode[]) {
  return values.filter(hasRenderableValue);
}

export function aixiaPrintHasValue(value: ReactNode) {
  return hasRenderableValue(value);
}

export function aixiaPrintJoin(values: ReactNode[], separator = " • ") {
  const visibleValues = compactValues(values);

  if (visibleValues.length === 0) return null;

  return visibleValues.map((value, index) => (
    <span key={index}>
      {index > 0 ? separator : null}
      {value}
    </span>
  ));
}

export function AixiaFinancePrintSheet({
  children,
  className = "",
}: AixiaFinancePrintSheetProps) {
  return (
    <div className={`aixia-finance-print-sheet ${className}`.trim()}>
      <div className="aixia-finance-print-page">
        <div className="aixia-finance-print-hero-band" />
        <div className="aixia-finance-print-content">{children}</div>
      </div>
    </div>
  );
}

export function AixiaFinancePrintHeader({
  documentTitle,
  companyName,
  companyContact,
  companyPhone,
  companyEmail,
  companyAddress,
  metaRows,
  logoSrc = DEFAULT_LOGO_SRC,
}: AixiaFinancePrintHeaderProps) {
  const visibleMetaRows = metaRows.filter((row) => hasRenderableValue(row.value));

  return (
    <header className="aixia-finance-print-header">
      <div className="aixia-finance-print-company-block">
        <img
          src={logoSrc}
          alt="AiXia"
          className="aixia-finance-print-logo"
        />

        <div className="aixia-finance-print-company-details">
          {hasRenderableValue(companyName) ? (
            <div className="aixia-finance-print-company-name">{companyName}</div>
          ) : null}

          {hasRenderableValue(companyContact) ? <div>{companyContact}</div> : null}
          {hasRenderableValue(companyPhone) ? <div>{companyPhone}</div> : null}
          {hasRenderableValue(companyEmail) ? <div>{companyEmail}</div> : null}

          {hasRenderableValue(companyAddress) ? (
            <div className="aixia-finance-print-address">{companyAddress}</div>
          ) : null}
        </div>
      </div>

      <div className="aixia-finance-print-document-heading">
        <div className="aixia-finance-print-title">{documentTitle}</div>

        {visibleMetaRows.length > 0 ? (
          <div className="aixia-finance-print-document-meta">
            {visibleMetaRows.map((row) => (
              <div key={row.label} className="aixia-finance-print-meta-row">
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function AixiaFinancePrintPartyBlock({
  party,
}: AixiaFinancePrintPartyBlockProps) {
  const contactLine = aixiaPrintJoin([party.email, party.phone]);

  return (
    <section className="aixia-finance-print-card aixia-finance-print-party-card">
      {hasRenderableValue(party.label) ? (
        <div className="aixia-finance-print-label">{party.label}</div>
      ) : null}

      {hasRenderableValue(party.name) ? (
        <div className="aixia-finance-print-party-name">{party.name}</div>
      ) : null}

      {hasRenderableValue(party.contact) ? (
        <div className="aixia-finance-print-muted-line">{party.contact}</div>
      ) : null}

      {contactLine ? (
        <div className="aixia-finance-print-muted-line">{contactLine}</div>
      ) : null}

      {hasRenderableValue(party.address) ? (
        <div className="aixia-finance-print-address">{party.address}</div>
      ) : null}
    </section>
  );
}

export function AixiaFinancePrintLineTable({
  items,
  emptyLabel = "No line items available.",
  minRows = 3,
  maxRows = 8,
}: AixiaFinancePrintLineTableProps) {
  const safeItems = Array.isArray(items) ? items : [];
  const visibleItems = safeItems.slice(0, maxRows);
  const fillerRows = Math.max(0, minRows - visibleItems.length);

  return (
    <table className="aixia-finance-print-table">
      <thead>
        <tr>
          <th className="aixia-finance-print-col-number">No</th>
          <th>Item Description</th>
          <th>Unit Price</th>
          <th>Quantity</th>
          <th>Value</th>
        </tr>
      </thead>

      <tbody>
        {visibleItems.length > 0 ? (
          visibleItems.map((item, index) => (
            <tr key={item.id ?? index}>
              <td>{index + 1}</td>
              <td>
                <span className="aixia-finance-print-medium">
                  {hasRenderableValue(item.description) ? item.description : "—"}
                </span>
              </td>
              <td className="aixia-finance-print-money">{item.unitPrice}</td>
              <td className="aixia-finance-print-money">{item.quantity}</td>
              <td className="aixia-finance-print-money aixia-finance-print-strong">
                {item.value}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td>—</td>
            <td>{emptyLabel}</td>
            <td>—</td>
            <td>—</td>
            <td>—</td>
          </tr>
        )}

        {Array.from({ length: fillerRows }).map((_, index) => (
          <tr
            key={`filler-${index}`}
            className="aixia-finance-print-filler-row"
          >
            <td />
            <td />
            <td />
            <td />
            <td />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function AixiaFinancePrintBottomGrid({
  left,
  right,
}: AixiaFinancePrintBottomGridProps) {
  return (
    <div className="aixia-finance-print-bottom-grid">
      <div className="aixia-finance-print-bottom-left">{left}</div>
      <div className="aixia-finance-print-bottom-right">{right}</div>
    </div>
  );
}

export function AixiaFinancePrintTermsBlock({
  title = "Payment and Shipping Terms",
  rows,
  children,
}: AixiaFinancePrintTermsBlockProps) {
  const visibleRows = rows.filter(
    (row) => hasRenderableValue(row.value) || hasRenderableValue(row.detail)
  );

  if (visibleRows.length === 0 && !hasRenderableValue(children)) {
    return null;
  }

  return (
    <section className="aixia-finance-print-terms-block">
      {hasRenderableValue(title) ? (
        <div className="aixia-finance-print-section-title">{title}</div>
      ) : null}

      {visibleRows.map((row) => (
        <div key={row.label} className="aixia-finance-print-term-group">
          {hasRenderableValue(row.value) ? (
            <div className="aixia-finance-print-term-line">
              <span>{row.label}: </span>
              <strong>{row.value}</strong>
            </div>
          ) : null}

          {hasRenderableValue(row.detail) ? (
            <div className="aixia-finance-print-paragraph">{row.detail}</div>
          ) : null}
        </div>
      ))}

      {children}
    </section>
  );
}

export function AixiaFinancePrintBankBlock({
  title = "Bank Details",
  rows,
  emptyText,
}: AixiaFinancePrintBankBlockProps) {
  const visibleRows = rows.filter((row) => hasRenderableValue(row.value));

  if (visibleRows.length === 0 && !hasRenderableValue(emptyText)) {
    return null;
  }

  return (
    <section className="aixia-finance-print-bank-block">
      {hasRenderableValue(title) ? (
        <div className="aixia-finance-print-section-title">{title}</div>
      ) : null}

      {visibleRows.length > 0 ? (
        <div className="aixia-finance-print-bank-details">
          {visibleRows.map((row) => (
            <div key={row.label}>
              <span>{row.label}: </span>
              <strong
                className={
                  row.monospace
                    ? "aixia-finance-print-money aixia-finance-print-strong"
                    : "aixia-finance-print-strong"
                }
              >
                {row.value}
              </strong>
            </div>
          ))}
        </div>
      ) : (
        <div className="aixia-finance-print-muted-line">{emptyText}</div>
      )}
    </section>
  );
}

export function AixiaFinancePrintTotalsBlock({
  rows,
  signatureLabel = "Signature",
}: AixiaFinancePrintTotalsBlockProps) {
  const visibleRows = rows.filter((row) => hasRenderableValue(row.value));

  if (visibleRows.length === 0 && !hasRenderableValue(signatureLabel)) {
    return null;
  }

  return (
    <section className="aixia-finance-print-summary-block">
      {visibleRows.map((row) =>
        row.highlight ? (
          <div key={row.label} className="aixia-finance-print-grand-total-row">
            <span>{row.label}</span>
            <strong className="aixia-finance-print-money">{row.value}</strong>
          </div>
        ) : (
          <div key={row.label} className="aixia-finance-print-total-row">
            <span>{row.label}</span>
            <strong className="aixia-finance-print-money">{row.value}</strong>
          </div>
        )
      )}

      {hasRenderableValue(signatureLabel) ? (
        <div className="aixia-finance-print-signature-block">
          <div className="aixia-finance-print-signature-line" />
          <div>{signatureLabel}</div>
        </div>
      ) : null}
    </section>
  );
}

export function AixiaFinancePrintFooter({
  title = "Terms and Conditions",
  terms,
  history,
  thankYou = "Thank You For Your Business",
}: AixiaFinancePrintFooterProps) {
  if (
    !hasRenderableValue(title) &&
    !hasRenderableValue(terms) &&
    !hasRenderableValue(history) &&
    !hasRenderableValue(thankYou)
  ) {
    return null;
  }

  return (
    <footer className="aixia-finance-print-footer">
      {hasRenderableValue(title) && hasRenderableValue(terms) ? (
        <div className="aixia-finance-print-section-title">{title}</div>
      ) : null}

      {hasRenderableValue(terms) ? (
        <div className="aixia-finance-print-legal-text">{terms}</div>
      ) : null}

      {hasRenderableValue(history) ? (
        <div className="aixia-finance-print-history">{history}</div>
      ) : null}

      {hasRenderableValue(thankYou) ? (
        <div className="aixia-finance-print-thank-you">{thankYou}</div>
      ) : null}
    </footer>
  );
}

export function AixiaFinancePrintSection({
  title,
  children,
}: AixiaFinancePrintSectionProps) {
  if (!hasRenderableValue(children)) return null;

  return (
    <section className="aixia-finance-print-card">
      {hasRenderableValue(title) ? (
        <div className="aixia-finance-print-section-title">{title}</div>
      ) : null}
      {children}
    </section>
  );
}
