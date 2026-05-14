type EmployeeRefRow = {
  id: string;
  user_id: string;
  code: string;
  status: string;
  mark: string | null;
  metadata: Record<string, unknown> | null;
  profile?: {
    user_id: string;
    full_name: string | null;
    display_name: string | null;
  } | null;
};

type PayProfileRow = {
  id: string;
  profile_number: string | null;
  user_id: string;
  pay_type: string;
  payment_frequency: string;
  base_salary: number | string | null;
  hourly_rate: number | string | null;
  default_hours: number | string | null;
  currency_code: string;
  active: boolean;
  status: string;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
};

type CompanyRow = {
  id: string;
  company_name: string | null;
  legal_name: string | null;
  display_name: string | null;
  registration_number: string | null;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_region: string | null;
  postal_code: string | null;
  country: string | null;
  status: string;
};

type Props = {
  company: CompanyRow | null;
  employee: EmployeeRefRow | null;
  payProfile: PayProfileRow | null;
  joinDate: string;
  periodStart: string;
  periodEnd: string;
  requestedPayDate: string;
  requestedCurrencyCode: string;
  grossAmount: number;
  bonusAmount: number;
  deductionAmount: number;
  reimbursementAmount: number;
  netAmount: number;
  socialInsuranceContributionType: "by_employee" | "by_employer";
  socialInsuranceContributionDetails: string;
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number | string | null | undefined, currencyCode: string) {
  return `${currencyCode} ${toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMonthYear(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildEmployeeLabel(row: EmployeeRefRow | null | undefined) {
  if (!row) return "—";

  const profileName =
    row.profile?.full_name?.trim() || row.profile?.display_name?.trim();

  if (profileName) return profileName;

  return `Employee ${row.code}`;
}

function buildCompanyName(row: CompanyRow | null | undefined) {
  if (!row) return "—";
  return row.legal_name || row.company_name || row.display_name || "—";
}

function buildCompanyAddress(row: CompanyRow | null | undefined) {
  if (!row) return "";

  return [
    row.address_line1,
    row.address_line2,
    [row.city, row.state_region, row.postal_code].filter(Boolean).join(", "),
    row.country,
  ]
    .filter(Boolean)
    .join(" • ");
}

function buildPosition(row: EmployeeRefRow | null | undefined) {
  if (!row) return "—";
  return row.mark ? formatLabel(row.mark) : "—";
}

function buildPayPeriodLabel(payProfile: PayProfileRow | null | undefined) {
  if (!payProfile) return "—";
  return formatLabel(payProfile.payment_frequency);
}

function buildDateCovered(periodStart: string, periodEnd: string) {
  if (!periodStart && !periodEnd) return "—";
  if (!periodStart) return `— to ${formatDate(periodEnd)}`;
  if (!periodEnd) return `${formatDate(periodStart)} to —`;
  return `${formatDate(periodStart)} to ${formatDate(periodEnd)}`;
}

function buildSocialInsuranceLabel(
  type: "by_employee" | "by_employer",
  details: string
) {
  if (type === "by_employer") {
    return details.trim() ? `By Employer — ${details.trim()}` : "By Employer";
  }

  return "By Employee";
}

export default function PaycheckRequestPrintDocument({
  company,
  employee,
  payProfile,
  joinDate,
  periodStart,
  periodEnd,
  requestedPayDate,
  requestedCurrencyCode,
  grossAmount,
  bonusAmount,
  deductionAmount,
  reimbursementAmount,
  netAmount,
  socialInsuranceContributionType,
  socialInsuranceContributionDetails,
}: Props) {
  const companyName = buildCompanyName(company);
  const companyAddress = buildCompanyAddress(company);
  const employeeName = buildEmployeeLabel(employee);
  const employeeCode = employee?.code || "—";
  const position = buildPosition(employee);
  const payPeriod = buildPayPeriodLabel(payProfile);
  const basicSalary = formatMoney(grossAmount, requestedCurrencyCode || "USD");
  const netPay = formatMoney(netAmount, requestedCurrencyCode || "USD");
  const coveredDates = buildDateCovered(periodStart, periodEnd);
  const contributionLabel = buildSocialInsuranceLabel(
    socialInsuranceContributionType,
    socialInsuranceContributionDetails
  );

  return (
    <div className="paycheck-print-sheet">
      <div className="aixia-paycheck-print-document">
        <div className="aixia-paycheck-print-gradient" />
        <div className="aixia-paycheck-print-orb aixia-paycheck-print-orb-left" />
        <div className="aixia-paycheck-print-orb aixia-paycheck-print-orb-right" />

        <div className="aixia-paycheck-print-content">
          <header className="aixia-paycheck-print-header">
            <div>
              <div className="aixia-paycheck-print-company">{companyName}</div>

              {companyAddress ? (
                <div className="aixia-paycheck-print-company-address">
                  {companyAddress}
                </div>
              ) : null}

              <div className="aixia-paycheck-print-pill">
                Payroll Request Form
              </div>
            </div>

            <div className="aixia-paycheck-print-document-card">
              <div className="aixia-paycheck-print-overline">Document</div>
              <div className="aixia-paycheck-print-document-title">
                PRC Pay Slip
              </div>
              <div className="aixia-paycheck-print-document-date">
                Generated Date
                <br />
                <strong>{formatDate(requestedPayDate || new Date().toISOString())}</strong>
              </div>
            </div>
          </header>

          <section className="aixia-paycheck-print-info-grid">
            <InfoCard label="Employee" value={employeeName} detail={`Code ${employeeCode}`} />
            <InfoCard label="Position" value={position} detail="Employee reference mark" />
            <InfoCard label="Join Date" value={formatDate(joinDate)} detail="Employee declared join date" />
            <InfoCard
              label="Pay Period"
              value={payPeriod || formatMonthYear(periodStart)}
              detail={coveredDates}
            />
          </section>

          <section className="aixia-paycheck-print-pay-card">
            <div className="aixia-paycheck-print-pay-header">
              <div>Pay Details</div>
              <div>Currency: {requestedCurrencyCode || "USD"}</div>
            </div>

            <div className="aixia-paycheck-print-pay-grid">
              <AmountRow label="Basic Salary" value={basicSalary} highlight />
              <AmountRow
                label="Bonus"
                value={formatMoney(bonusAmount, requestedCurrencyCode || "USD")}
              />
              <AmountRow
                label="Deduction"
                value={formatMoney(deductionAmount, requestedCurrencyCode || "USD")}
              />
              <AmountRow
                label="Reimbursement"
                value={formatMoney(reimbursementAmount, requestedCurrencyCode || "USD")}
              />
            </div>

            <div className="aixia-paycheck-print-net-card">
              <div>
                <div className="aixia-paycheck-print-net-label">Net Pay</div>
                <div className="aixia-paycheck-print-net-detail">
                  Gross + bonus + reimbursement − deduction
                </div>
              </div>

              <div className="aixia-paycheck-print-net-value">{netPay}</div>
            </div>
          </section>

          <section className="aixia-paycheck-print-social-card">
            <div className="aixia-paycheck-print-social-grid">
              <div>
                <div className="aixia-paycheck-print-overline">Social Insurance</div>
                <div className="aixia-paycheck-print-social-title">Contribution</div>
              </div>

              <div>
                <div
                  className={
                    socialInsuranceContributionType === "by_employer"
                      ? "aixia-paycheck-print-social-badge aixia-paycheck-print-social-badge-employer"
                      : "aixia-paycheck-print-social-badge aixia-paycheck-print-social-badge-employee"
                  }
                >
                  {contributionLabel}
                </div>

                <div className="aixia-paycheck-print-checkbox-grid">
                  <CheckBoxLine
                    label="By Employer"
                    checked={socialInsuranceContributionType === "by_employer"}
                  />
                  <CheckBoxLine
                    label="By Employee"
                    checked={socialInsuranceContributionType === "by_employee"}
                  />
                </div>

                {socialInsuranceContributionType === "by_employer" &&
                socialInsuranceContributionDetails.trim() ? (
                  <div className="aixia-paycheck-print-employer-details">
                    <strong>Employer Details: </strong>
                    {socialInsuranceContributionDetails.trim()}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="aixia-paycheck-print-mini-grid">
            <MiniSummary label="Employee Code" value={employeeCode} />
            <MiniSummary
              label="Pay Profile"
              value={
                payProfile
                  ? [
                      payProfile.profile_number || "Pay Profile",
                      formatLabel(payProfile.pay_type),
                      formatLabel(payProfile.payment_frequency),
                    ]
                      .filter(Boolean)
                      .join(" • ")
                  : "—"
              }
            />
          </section>

          <section className="aixia-paycheck-print-signature-grid">
            <SignatureBox label="Employee Signature" />
            <SignatureBox label="Manager Signature" />
          </section>

          <section className="aixia-paycheck-print-signature-grid aixia-paycheck-print-date-signature-grid">
            <SignatureBox label="Employee Signature Date" compact />
            <SignatureBox label="Manager Signature Date" compact />
          </section>

          <footer className="aixia-paycheck-print-footer">
            <div>
              Generated from AiXia Finance. Print or save as PDF, sign, then upload
              the signed document before submitting to Finance review.
            </div>
            <div className="aixia-paycheck-print-footer-brand">AiXia Payroll</div>
          </footer>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="aixia-paycheck-print-info-card">
      <div className="aixia-paycheck-print-overline">{label}</div>
      <div className="aixia-paycheck-print-info-value">{value || "—"}</div>
      <div className="aixia-paycheck-print-info-detail">{detail || "—"}</div>
    </div>
  );
}

function AmountRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="aixia-paycheck-print-amount-row">
      <div className="aixia-paycheck-print-overline">{label}</div>
      <div
        className={
          highlight
            ? "aixia-paycheck-print-amount-value aixia-paycheck-print-amount-value-highlight"
            : "aixia-paycheck-print-amount-value"
        }
      >
        {value || "—"}
      </div>
    </div>
  );
}

function CheckBoxLine({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div
      className={
        checked
          ? "aixia-paycheck-print-checkbox-line aixia-paycheck-print-checkbox-line-checked"
          : "aixia-paycheck-print-checkbox-line"
      }
    >
      <div className="aixia-paycheck-print-checkbox">{checked ? "✓" : ""}</div>
      <div>{label}</div>
    </div>
  );
}

function MiniSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="aixia-paycheck-print-mini-summary">
      <div className="aixia-paycheck-print-overline">{label}</div>
      <div className="aixia-paycheck-print-mini-value">{value || "—"}</div>
    </div>
  );
}

function SignatureBox({
  label,
  compact = false,
}: {
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "aixia-paycheck-print-signature-box aixia-paycheck-print-signature-box-compact"
          : "aixia-paycheck-print-signature-box"
      }
    >
      <div className="aixia-paycheck-print-overline">{label}</div>
      <div className="aixia-paycheck-print-signature-line" />
    </div>
  );
}
