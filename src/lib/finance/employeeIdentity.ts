export type FinanceEmployeeIdentity = {
  employee_ref_id: string;
  user_id: string | null;
  employee_code: string | null;
  employee_status: string | null;
  employee_mark: string | null;
  employee_metadata: Record<string, unknown> | null;
  profile_full_name: string | null;
  profile_display_name: string | null;
  profile_email: string | null;
  profile_company: string | null;
  profile_job_title: string | null;
  profile_member_type: string | null;
  profile_role?: string | null;
  profile_status?: string | null;
  person_name: string | null;
  position_label: string | null;
  company_label: string | null;
  secondary_label: string | null;
};

function cleanText(value: string | null | undefined) {
  const cleaned = String(value || "").trim();
  return cleaned.length > 0 ? cleaned : "";
}

export function isEmployeeCodeDisplay(value: string | null | undefined) {
  return /^EMP-[0-9]+/i.test(cleanText(value));
}

export function isBackendUuidDisplay(value: string | null | undefined) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    cleanText(value)
  );
}

export function isPollutedEmployeeDisplay(value: string | null | undefined) {
  const cleaned = cleanText(value);
  return isEmployeeCodeDisplay(cleaned) || isBackendUuidDisplay(cleaned);
}

export function getFinanceEmployeePrimaryName(
  identity: FinanceEmployeeIdentity | null | undefined,
  fallback?: string | null
) {
  const candidates = [
    identity?.person_name,
    identity?.profile_full_name,
    identity?.profile_display_name,
    identity?.profile_email,
    fallback,
  ];

  for (const candidate of candidates) {
    const cleaned = cleanText(candidate);
    if (cleaned && !isPollutedEmployeeDisplay(cleaned)) {
      return cleaned;
    }
  }

  return "Unresolved employee";
}

export function getFinanceEmployeeSecondaryLabel(
  identity: FinanceEmployeeIdentity | null | undefined
) {
  const secondaryLabel = cleanText(identity?.secondary_label);
  const position = cleanText(identity?.position_label || identity?.profile_job_title);
  const company = cleanText(identity?.company_label || identity?.profile_company);

  if (secondaryLabel && !isBackendUuidDisplay(secondaryLabel)) return secondaryLabel;

  return [position, company].filter(Boolean).join(" • ") || "No role/company saved";
}

export function getFinanceEmployeeReferenceLabel(
  identity: FinanceEmployeeIdentity | null | undefined
) {
  const employeeCode = cleanText(identity?.employee_code);
  return isEmployeeCodeDisplay(employeeCode) ? employeeCode : "";
}

export function getFinanceEmployeeSearchText(
  identity: FinanceEmployeeIdentity | null | undefined
) {
  return [
    getFinanceEmployeePrimaryName(identity),
    getFinanceEmployeeSecondaryLabel(identity),
    getFinanceEmployeeReferenceLabel(identity),
    identity?.profile_email,
  ]
    .filter(Boolean)
    .join(" ");
}
