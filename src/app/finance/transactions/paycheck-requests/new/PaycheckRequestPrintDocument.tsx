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
            color: "#101827",
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
                "linear-gradient(180deg, #f8fafc 0%, #ffffff 33%, #ffffff 100%)",
              zIndex: 0,
            }}
          />

          <div
            style={{
              position: "absolute",
              left: "-32mm",
              top: "-48mm",
              width: "118mm",
              height: "118mm",
              borderRadius: "999px",
              background: "rgba(8, 145, 178, 0.10)",
              zIndex: 1,
            }}
          />

          <div
            style={{
              position: "absolute",
              right: "-42mm",
              top: "-34mm",
              width: "126mm",
              height: "126mm",
              borderRadius: "999px",
              background: "rgba(99, 102, 241, 0.08)",
              zIndex: 1,
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 2,
              padding: "14mm 17mm 13mm 17mm",
            }}
          >
            <header
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 54mm",
                gap: "10mm",
                alignItems: "start",
                borderBottom: "1pt solid #dbe3ef",
                paddingBottom: "8mm",
                marginBottom: "8mm",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "15pt",
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    color: "#0f172a",
                  }}
                >
                  {companyName}
                </div>

                {companyAddress ? (
                  <div
                    style={{
                      marginTop: "2mm",
                      maxWidth: "116mm",
                      fontSize: "8.3pt",
                      lineHeight: 1.45,
                      color: "#64748b",
                    }}
                  >
                    {companyAddress}
                  </div>
                ) : null}

                <div
                  style={{
                    marginTop: "6mm",
                    display: "inline-flex",
                    border: "0.6pt solid #bae6fd",
                    background: "#ecfeff",
                    color: "#155e75",
                    padding: "2.2mm 4mm",
                    borderRadius: "99px",
                    fontSize: "7.4pt",
                    fontWeight: 800,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                >
                  Payroll Request Form
                </div>
              </div>

              <div
                style={{
                  textAlign: "right",
                  border: "0.8pt solid #e2e8f0",
                  borderRadius: "4mm",
                  background: "#ffffff",
                  padding: "4mm",
                }}
              >
                <div
                  style={{
                    fontSize: "7.2pt",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    color: "#64748b",
                  }}
                >
                  Document
                </div>
                <div
                  style={{
                    marginTop: "2mm",
                    fontSize: "16pt",
                    lineHeight: 1,
                    fontWeight: 800,
                    color: "#0f172a",
                    letterSpacing: "-0.02em",
                  }}
                >
                  PRC Pay Slip
                </div>
                <div
                  style={{
                    marginTop: "3mm",
                    fontSize: "8pt",
                    color: "#64748b",
                    lineHeight: 1.5,
                  }}
                >
                  Generated Date
                  <br />
                  <strong style={{ color: "#0f172a" }}>
                    {formatDate(requestedPayDate || new Date().toISOString())}
                  </strong>
                </div>
              </div>
            </header>

            <section
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4mm",
                marginBottom: "6mm",
              }}
            >
              <InfoCard label="Employee" value={employeeName} detail={`Code ${employeeCode}`} />
              <InfoCard label="Position" value={position} detail="Employee reference mark" />
              <InfoCard label="Join Date" value={formatDate(joinDate)} detail="Employee declared join date" />
              <InfoCard
                label="Pay Period"
                value={payPeriod || formatMonthYear(periodStart)}
                detail={coveredDates}
              />
            </section>

            <section
              style={{
                border: "0.8pt solid #e2e8f0",
                borderRadius: "5mm",
                overflow: "hidden",
                background: "#ffffff",
                marginBottom: "6mm",
              }}
            >
              <div
                style={{
                  background: "#0f172a",
                  color: "#ffffff",
                  padding: "3.4mm 5mm",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "9pt",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Pay Details
                </div>
                <div
                  style={{
                    fontSize: "8pt",
                    color: "#cbd5e1",
                  }}
                >
                  Currency: {requestedCurrencyCode || "USD"}
                </div>
              </div>

              <div
                style={{
                  padding: "5mm",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "4mm 6mm",
                }}
              >
                <AmountRow label="Basic Salary" value={basicSalary} highlight />
                <AmountRow label="Bonus" value={formatMoney(bonusAmount, requestedCurrencyCode || "USD")} />
                <AmountRow label="Deduction" value={formatMoney(deductionAmount, requestedCurrencyCode || "USD")} />
                <AmountRow label="Reimbursement" value={formatMoney(reimbursementAmount, requestedCurrencyCode || "USD")} />
              </div>

              <div
                style={{
                  margin: "0 5mm 5mm 5mm",
                  borderRadius: "4mm",
                  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                  color: "#ffffff",
                  padding: "5mm",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  gap: "8mm",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "8pt",
                      fontWeight: 800,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "#93c5fd",
                    }}
                  >
                    Net Pay
                  </div>
                  <div
                    style={{
                      marginTop: "1mm",
                      fontSize: "8pt",
                      color: "#cbd5e1",
                    }}
                  >
                    Gross + bonus + reimbursement − deduction
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "18pt",
                    fontWeight: 900,
                    letterSpacing: "-0.02em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {netPay}
                </div>
              </div>
            </section>

            <section
              style={{
                border: "0.8pt solid #e2e8f0",
                borderRadius: "5mm",
                background: "#ffffff",
                padding: "5mm",
                marginBottom: "6mm",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "44mm minmax(0, 1fr)",
                  gap: "7mm",
                  alignItems: "start",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "8pt",
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "#64748b",
                    }}
                  >
                    Social Insurance
                  </div>
                  <div
                    style={{
                      marginTop: "1.5mm",
                      fontSize: "9.5pt",
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    Contribution
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      borderRadius: "3mm",
                      background: socialInsuranceContributionType === "by_employer"
                        ? "#ecfdf5"
                        : "#eff6ff",
                      border: socialInsuranceContributionType === "by_employer"
                        ? "0.7pt solid #bbf7d0"
                        : "0.7pt solid #bfdbfe",
                      color: socialInsuranceContributionType === "by_employer"
                        ? "#166534"
                        : "#1d4ed8",
                      padding: "3mm 4mm",
                      fontSize: "9.5pt",
                      fontWeight: 800,
                    }}
                  >
                    {contributionLabel}
                  </div>

                  <div
                    style={{
                      marginTop: "3mm",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "3mm",
                      fontSize: "8.5pt",
                    }}
                  >
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
                    <div
                      style={{
                        marginTop: "3mm",
                        borderTop: "0.6pt solid #e2e8f0",
                        paddingTop: "3mm",
                        fontSize: "8.5pt",
                        color: "#475569",
                        lineHeight: 1.55,
                      }}
                    >
                      <strong style={{ color: "#0f172a" }}>Employer Details: </strong>
                      {socialInsuranceContributionDetails.trim()}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4mm",
                marginBottom: "7mm",
              }}
            >
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

            <section
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "7mm",
                marginTop: "7mm",
              }}
            >
              <SignatureBox label="Employee Signature" />
              <SignatureBox label="Manager Signature" />
            </section>

            <section
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "7mm",
                marginTop: "7mm",
              }}
            >
              <SignatureBox label="Employee Signature Date" compact />
              <SignatureBox label="Manager Signature Date" compact />
            </section>

            <footer
              style={{
                position: "absolute",
                left: "17mm",
                right: "17mm",
                bottom: "12mm",
                borderTop: "0.6pt solid #e2e8f0",
                paddingTop: "3mm",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "8mm",
                alignItems: "center",
                fontSize: "7.2pt",
                color: "#64748b",
                lineHeight: 1.45,
              }}
            >
              <div>
                Generated from AiXia Finance. Print or save as PDF, sign, then upload
                the signed document before submitting to Finance review.
              </div>
              <div
                style={{
                  fontWeight: 800,
                  color: "#0f172a",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                AiXia Payroll
              </div>
            </footer>
          </div>
        </div>
      </div>
    </>
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
    <div
      style={{
        minHeight: "20mm",
        border: "0.8pt solid #e2e8f0",
        borderRadius: "4mm",
        background: "#ffffff",
        padding: "3.6mm 4mm",
      }}
    >
      <div
        style={{
          fontSize: "7.2pt",
          fontWeight: 800,
          letterSpacing: "0.13em",
          textTransform: "uppercase",
          color: "#64748b",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: "1.5mm",
          fontSize: "11pt",
          fontWeight: 800,
          color: "#0f172a",
          wordBreak: "break-word",
        }}
      >
        {value || "—"}
      </div>
      <div
        style={{
          marginTop: "1mm",
          fontSize: "7.8pt",
          color: "#64748b",
          lineHeight: 1.35,
          wordBreak: "break-word",
        }}
      >
        {detail || "—"}
      </div>
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
    <div
      style={{
        borderBottom: "0.6pt solid #e2e8f0",
        paddingBottom: "2.5mm",
      }}
    >
      <div
        style={{
          fontSize: "7.2pt",
          fontWeight: 800,
          letterSpacing: "0.13em",
          textTransform: "uppercase",
          color: "#64748b",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: "1mm",
          fontSize: highlight ? "13pt" : "11pt",
          fontWeight: highlight ? 900 : 800,
          color: "#0f172a",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function CheckBoxLine({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "2.5mm",
        alignItems: "center",
        border: "0.6pt solid #e2e8f0",
        borderRadius: "3mm",
        padding: "2.5mm 3mm",
        background: checked ? "#f8fafc" : "#ffffff",
        color: "#0f172a",
        fontWeight: checked ? 800 : 500,
      }}
    >
      <div
        style={{
          width: "4.2mm",
          height: "4.2mm",
          border: "0.8pt solid #0f172a",
          borderRadius: "1mm",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "8pt",
          lineHeight: 1,
        }}
      >
        {checked ? "✓" : ""}
      </div>
      <div>{label}</div>
    </div>
  );
}

function MiniSummary({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "0.8pt solid #e2e8f0",
        borderRadius: "4mm",
        background: "#f8fafc",
        padding: "3.5mm 4mm",
      }}
    >
      <div
        style={{
          fontSize: "7.2pt",
          fontWeight: 800,
          letterSpacing: "0.13em",
          textTransform: "uppercase",
          color: "#64748b",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: "1.2mm",
          fontSize: "9.5pt",
          fontWeight: 800,
          color: "#0f172a",
          lineHeight: 1.35,
          wordBreak: "break-word",
        }}
      >
        {value || "—"}
      </div>
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
      style={{
        border: "0.8pt solid #e2e8f0",
        borderRadius: "4mm",
        background: "#ffffff",
        padding: compact ? "3mm 4mm" : "4mm",
        minHeight: compact ? "16mm" : "25mm",
      }}
    >
      <div
        style={{
          fontSize: "7.2pt",
          fontWeight: 800,
          letterSpacing: "0.13em",
          textTransform: "uppercase",
          color: "#64748b",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: compact ? "5mm" : "12mm",
          borderBottom: "0.8pt solid #0f172a",
          height: "1mm",
        }}
      />
    </div>
  );
}
