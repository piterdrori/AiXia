export type FinanceEmployeeIdentity = {
  employee_ref_id?: string | null;
  id?: string | null;
  user_id?: string | null;
  employee_code?: string | null;
  code?: string | null;
  employee_status?: string | null;
  employee_mark?: string | null;
  employee_metadata?: Record<string, unknown> | null;
  profile_full_name?: string | null;
  profile_display_name?: string | null;
  profile_email?: string | null;
  profile_company?: string | null;
  profile_job_title?: string | null;
  profile_member_type?: string | null;
  profile_role?: string | null;
  profile_status?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  employee_name?: string | null;
  email?: string | null;
  job_title?: string | null;
  role?: string | null;
  department?: string | null;
  company?: string | null;
  company_name?: string | null;
  member_type?: string | null;
  status?: string | null;
  person_name?: string | null;
  position_label?: string | null;
  company_label?: string | null;
  secondary_label?: string | null;
  [key: string]: unknown;
};

function cleanText(value: unknown) {
  const cleaned = typeof value === "string" ? value.trim() : "";
  return cleaned.length > 0 ? cleaned : "";
}

function isBadReferenceText(value: string | null | undefined) {
  const cleaned = cleanText(value);
  return isEmployeeCodeDisplay(cleaned) || isBackendUuidDisplay(cleaned);
}

export function isEmployeeCodeDisplay(value: string | null | undefined) {
  return /^EMP-[0-9]+(?:\b|\s|$)/i.test(cleanText(value));
}

export function isBackendUuidDisplay(value: string | null | undefined) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    cleanText(value)
  );
}

export function isPollutedEmployeeDisplay(value: string | null | undefined) {
  const cleaned = cleanText(value);

  if (!cleaned) return false;

  return (
    isEmployeeCodeDisplay(cleaned) ||
    isBackendUuidDisplay(cleaned) ||
    /^operations?_manager$/i.test(cleaned) ||
    /^manager$/i.test(cleaned) ||
    /^admin(?:istrator)?$/i.test(cleaned) ||
    /^employee$/i.test(cleaned) ||
    /^staff$/i.test(cleaned) ||
    /^user$/i.test(cleaned) ||
    /^owner$/i.test(cleaned) ||
    /^finance(?:_|\s|-)?(?:admin|manager|viewer)$/i.test(cleaned)
  );
}

export function getFinanceEmployeePrimaryName(
  identity: FinanceEmployeeIdentity | null | undefined,
  fallback?: string | null
) {
  const candidates = [
    identity?.person_name,
    identity?.profile_full_name,
    identity?.profile_display_name,
    identity?.full_name,
    identity?.display_name,
    identity?.employee_name,
    identity?.profile_email,
    identity?.email,
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
  const position = cleanText(
    identity?.position_label ||
      identity?.profile_job_title ||
      identity?.job_title ||
      identity?.role ||
      identity?.profile_role ||
      identity?.employee_mark
  );
  const company = cleanText(
    identity?.company_label ||
      identity?.profile_company ||
      identity?.company_name ||
      identity?.company
  );

  if (secondaryLabel && !isBadReferenceText(secondaryLabel)) {
    return secondaryLabel;
  }

  return [position, company].filter(Boolean).join(" • ") || "No role/company saved";
}

export function getFinanceEmployeeReferenceLabel(
  identity: FinanceEmployeeIdentity | null | undefined
) {
  const employeeCode = cleanText(identity?.employee_code || identity?.code);
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
    identity?.email,
  ]
    .filter(Boolean)
    .join(" ");
}
