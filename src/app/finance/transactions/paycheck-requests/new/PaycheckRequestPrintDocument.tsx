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
    month: "long",
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
  const employeeName = buildEmployeeLabel(employee);
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
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          html,
          body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body * {
            visibility: hidden !important;
          }

          .paycheck-print-sheet,
          .paycheck-print-sheet * {
            visibility: visible !important;
          }

          .paycheck-print-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
        }

        @media screen {
          .paycheck-print-sheet {
            display: none !important;
          }
        }
      `}</style>

      <div className="paycheck-print-sheet">
        <div
          style={{
            width: "210mm",
            minHeight: "297mm",
            background: "#ffffff",
            color: "#111827",
            fontFamily:
              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(255,255,255,1) 38%, rgba(255,255,255,1) 100%)",
              zIndex: 0,
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 2,
              padding: "18mm 20mm 18mm 20mm",
            }}
          >
            <div
              style={{
                borderBottom: "1.2pt solid #111827",
                paddingBottom: "9mm",
                marginBottom: "11mm",
              }}
            >
              <div
                style={{
                  fontSize: "15pt",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textAlign: "left",
                  color: "#111827",
                }}
              >
                {companyName}
              </div>

              <div
                style={{
                  marginTop: "10mm",
                  textAlign: "center",
                  fontSize: "22pt",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "#111827",
                }}
              >
                PRC Pay Slip
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: "7mm",
                fontSize: "11.5pt",
                lineHeight: 1.45,
              }}
            >
              <FieldRow label="Name of The Employee" value={employeeName} />
              <FieldRow label="Join Date" value={formatDate(joinDate)} />
              <FieldRow label="Position" value={position} />
              <FieldRow label="Pay Period (Month/Year)" value={payPeriod || formatMonthYear(periodStart)} />
              <FieldRow label="Basic Salary" value={basicSalary} />
              <FieldRow label="From / To Date Covered" value={coveredDates} />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "54mm minmax(0, 1fr)",
                  gap: "7mm",
                  alignItems: "start",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: "#111827",
                    paddingTop: "1mm",
                  }}
                >
                  Social Insurance Contribution:
                </div>

                <div>
                  <div
                    style={{
                      borderBottom: "0.8pt solid #111827",
                      minHeight: "9mm",
                      padding: "1mm 2mm 1.5mm 2mm",
                      fontWeight: 500,
                    }}
                  >
                    {contributionLabel}
                  </div>

                  <div
                    style={{
                      marginTop: "2.5mm",
                      display: "grid",
                      gridTemplateColumns: "34mm minmax(0, 1fr)",
                      gap: "4mm",
                      fontSize: "10.5pt",
                      color: "#374151",
                    }}
                  >
                    <div>By Employer</div>
                    <div
                      style={{
                        borderBottom: "0.6pt solid #9ca3af",
                        minHeight: "6mm",
                      }}
                    >
                      {socialInsuranceContributionType === "by_employer"
                        ? socialInsuranceContributionDetails
                        : ""}
                    </div>

                    <div>By Employee</div>
                    <div
                      style={{
                        borderBottom: "0.6pt solid #9ca3af",
                        minHeight: "6mm",
                      }}
                    >
                      {socialInsuranceContributionType === "by_employee"
                        ? "Selected"
                        : ""}
                    </div>
                  </div>
                </div>
              </div>

              <FieldRow label="Net Pay" value={netPay} />
              <FieldRow label="Today’s Date" value={formatDate(requestedPayDate || new Date().toISOString())} />
            </div>

            <div
              style={{
                marginTop: "14mm",
                border: "0.8pt solid #d1d5db",
                padding: "6mm",
                background: "#f9fafb",
              }}
            >
              <div
                style={{
                  fontSize: "10pt",
                  fontWeight: 700,
                  marginBottom: "3mm",
                  color: "#111827",
                }}
              >
                Paycheck Request Summary
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "3mm 8mm",
                  fontSize: "9.3pt",
                  color: "#374151",
                  lineHeight: 1.45,
                }}
              >
                <SummaryLine
                  label="Employee Code"
                  value={employee?.code || "—"}
                />
                <SummaryLine
                  label="Currency"
                  value={requestedCurrencyCode || "USD"}
                />
                <SummaryLine
                  label="Bonus"
                  value={formatMoney(bonusAmount, requestedCurrencyCode || "USD")}
                />
                <SummaryLine
                  label="Deduction"
                  value={formatMoney(deductionAmount, requestedCurrencyCode || "USD")}
                />
                <SummaryLine
                  label="Reimbursement"
                  value={formatMoney(reimbursementAmount, requestedCurrencyCode || "USD")}
                />
                <SummaryLine
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
              </div>
            </div>

            <div
              style={{
                marginTop: "17mm",
                display: "grid",
                gap: "13mm",
                fontSize: "11pt",
              }}
            >
              <SignatureLine label="Employee Signature" />
              <SignatureLine label="Manager’s Approval" />
            </div>

            <div
              style={{
                position: "absolute",
                left: "20mm",
                right: "20mm",
                bottom: "14mm",
                borderTop: "0.6pt solid #d1d5db",
                paddingTop: "4mm",
                fontSize: "8pt",
                color: "#6b7280",
                lineHeight: 1.45,
                textAlign: "center",
              }}
            >
              This form is generated from AiXia Finance. Please print, sign, and
              upload the signed document to the paycheck request before submitting
              to Finance review.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "54mm minmax(0, 1fr)",
        gap: "7mm",
        alignItems: "end",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          color: "#111827",
        }}
      >
        {label}:
      </div>

      <div
        style={{
          borderBottom: "0.8pt solid #111827",
          minHeight: "9mm",
          padding: "1mm 2mm 1.5mm 2mm",
          fontWeight: 500,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ color: "#6b7280" }}>{label}: </span>
      <span style={{ color: "#111827", fontWeight: 600 }}>{value || "—"}</span>
    </div>
  );
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "54mm minmax(0, 1fr)",
        gap: "7mm",
        alignItems: "end",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          color: "#111827",
        }}
      >
        {label}:
      </div>

      <div
        style={{
          borderBottom: "0.8pt solid #111827",
          minHeight: "13mm",
        }}
      />
    </div>
  );
}
