import type { Permission } from "@/lib/permissions";

export type AccessApprovalGroupKey =
  | "masterData"
  | "transactions"
  | "reports"
  | "settings";

export type AccessApprovalSectionKey =
  | "masterData"
  | "incomingMoneyFlow"
  | "supplierProcurementFlow"
  | "expensesFundingPayment"
  | "payrollFundBasket"
  | "reports"
  | "accessApprovals";

export type AccessApprovalLevel =
  | "read"
  | "create"
  | "update"
  | "deleteArchive"
  | "approveExecute";

export type AccessLevelState = Record<AccessApprovalLevel, boolean>;

export type AccessApprovalEffectiveLabel =
  | "No Company Access"
  | "Can Read Section"
  | "Can Create Records"
  | "Can Update Records"
  | "Can Delete / Archive"
  | "Can Approve / Execute"
  | "Admin Only";

export type PermissionExplanation = {
  title: string;
  shortLabel: string;
  permits: string[];
  doesNotPermit: string[];
};

export type AccessApprovalSection = {
  key: AccessApprovalSectionKey;
  groupKey: AccessApprovalGroupKey;
  title: string;
  shortTitle: string;
  scope: string;
  controls: string[];
  adminOnly?: boolean;
  defaultRule?: string;
  tooltip: {
    title: string;
    description: string;
    permits: string[];
    doesNotPermit: string[];
  };
  levels: Record<AccessApprovalLevel, Permission[]>;
};

export type AccessApprovalGroup = {
  key: AccessApprovalGroupKey;
  title: string;
  shortTitle: string;
  description: string;
  sections: AccessApprovalSectionKey[];
};

export type ToggleSectionLevelInput = {
  section: AccessApprovalSection;
  level: AccessApprovalLevel;
  enabled: boolean;
  currentOverrides: Partial<Record<Permission, boolean>>;
  roleDefaultPermissions: Record<Permission, boolean>;
};

export const ACCESS_APPROVAL_LEVEL_ORDER: AccessApprovalLevel[] = [
  "read",
  "create",
  "update",
  "deleteArchive",
  "approveExecute",
];

export const ACCESS_APPROVAL_LEVEL_EXPLANATIONS: Record<
  AccessApprovalLevel,
  PermissionExplanation
> = {
  read: {
    title: "Read",
    shortLabel: "Open and view",
    permits: [
      "Open the section or page group.",
      "View records allowed by the user’s approved scope.",
      "For personal employee flows, normal users still only see their own records by default.",
    ],
    doesNotPermit: [
      "Creating company-side records.",
      "Editing or updating company-side records.",
      "Uploading documents to company-side records.",
      "Approving, paying, deleting, archiving, restoring, or finalizing workflow actions.",
    ],
  },
  create: {
    title: "Create",
    shortLabel: "Create records",
    permits: [
      "Create new records in the approved section.",
      "Start new drafts or new workflow requests where the section supports creation.",
      "Use section creation forms only inside the user’s approved scope.",
    ],
    doesNotPermit: [
      "Editing records after creation unless Update is enabled.",
      "Uploading company-side documents unless Update is enabled.",
      "Deleting, archiving, restoring, approving, paying, issuing, voiding, or finalizing workflow actions.",
    ],
  },
  update: {
    title: "Update",
    shortLabel: "Edit and upload",
    permits: [
      "Edit or update existing editable records.",
      "Upload documents and proof files.",
      "Add comments, notes, and internal review details.",
      "Modify drafts or editable workflow data.",
    ],
    doesNotPermit: [
      "Deleting, archiving, or restoring records.",
      "Final approvals.",
      "Issuing or voiding official documents.",
      "Confirming funding or payment.",
      "Paying, processing, verifying proof, or finalizing workflow actions.",
    ],
  },
  deleteArchive: {
    title: "Delete / Archive",
    shortLabel: "Archive and restore",
    permits: [
      "Archive records where the workflow allows it.",
      "Soft-delete records where the workflow allows it.",
      "Restore archived or deleted records where allowed.",
      "Remove attachments where allowed.",
      "Manage removed records inside the approved section scope.",
    ],
    doesNotPermit: [
      "Final approvals.",
      "Issuing or voiding official documents.",
      "Confirming funding or payment.",
      "Paying, processing, verifying proof, or finalizing workflow actions.",
      "Managing Finance Access Approvals unless the user is Admin and explicitly approved.",
    ],
  },
  approveExecute: {
    title: "Approve / Execute",
    shortLabel: "Final actions",
    permits: [
      "Approve, reject, or request correction.",
      "Issue or void official documents.",
      "Confirm funding pools.",
      "Create or confirm payment distributions.",
      "Verify proof.",
      "Pay, process, export, or finalize workflow actions.",
    ],
    doesNotPermit: [
      "Managing Finance Access Approvals unless the Access Approvals section is granted and the user is Admin.",
      "Bypassing ownership, backend permissions, RLS, or security rules outside the granted section scope.",
    ],
  },
};

const masterDataRead: Permission[] = [
  "accessFinance",
  "viewFinance",
  "manageFinanceMasterData",
  "viewClients",
  "viewVendors",
  "viewBankAccounts",
  "viewPaymentMethods",
  "viewPaymentTerms",
  "viewShippingTerms",
  "viewUnitsOfMeasure",
  "viewTaxCodes",
  "viewExpenseCategories",
  "viewRevenueCategories",
  "viewItems",
];

const masterDataCreate: Permission[] = [
  "createFinanceRecords",
  "manageClients",
  "manageVendors",
];

const masterDataUpdate: Permission[] = [
  "editFinanceRecords",
  "manageClients",
  "manageVendors",
  "addFinanceComments",
  "viewFinanceComments",
  "addFinanceAttachments",
];

const masterDataDeleteArchive: Permission[] = [
  "archiveFinanceRecords",
  "removeFinanceAttachments",
];

const masterDataApproveExecute: Permission[] = [
  "approveFinanceRecords",
];

const incomingMoneyFlowRead: Permission[] = [
  "accessFinance",
  "viewFinance",
  "accessReceivables",
  "viewReceivables",
  "viewInvoices",
  "viewReceivedPayments",
];

const incomingMoneyFlowCreate: Permission[] = [
  "createFinanceRecords",
  "createInvoices",
  "recordPaymentsReceived",
];

const incomingMoneyFlowUpdate: Permission[] = [
  "editFinanceRecords",
  "editDraftInvoices",
  "addFinanceComments",
  "viewFinanceComments",
  "addFinanceAttachments",
];

const incomingMoneyFlowDeleteArchive: Permission[] = [
  "archiveFinanceRecords",
  "removeFinanceAttachments",
];

const incomingMoneyFlowApproveExecute: Permission[] = [
  "approveFinanceRecords",
  "sendInvoices",
  "voidInvoices",
  "recordPaymentsReceived",
  "exportReceivables",
];

const supplierProcurementRead: Permission[] = [
  "accessFinance",
  "viewFinance",
  "accessPayables",
  "viewPayables",
  "viewBills",
  "viewPaymentsMade",
  "viewVendors",
];

const supplierProcurementCreate: Permission[] = [
  "createFinanceRecords",
  "createBills",
  "recordPaymentsMade",
];

const supplierProcurementUpdate: Permission[] = [
  "editFinanceRecords",
  "editDraftBills",
  "manageVendors",
  "addFinanceComments",
  "viewFinanceComments",
  "addFinanceAttachments",
];

const supplierProcurementDeleteArchive: Permission[] = [
  "archiveFinanceRecords",
  "removeFinanceAttachments",
];

const supplierProcurementApproveExecute: Permission[] = [
  "approveFinanceRecords",
  "openBills",
  "voidBills",
  "recordPaymentsMade",
  "exportPayables",
];

const expensesFundingPaymentRead: Permission[] = [
  "accessFinance",
  "viewFinance",
  "accessExpenses",
  "viewExpenses",
  "viewReimbursements",
  "viewPaymentsMade",
];

const expensesFundingPaymentCreate: Permission[] = [
  "createFinanceRecords",
  "issueReimbursements",
  "recordReimbursementPayments",
  "recordPaymentsMade",
];

const expensesFundingPaymentUpdate: Permission[] = [
  "editFinanceRecords",
  "editAllDraftExpenses",
  "addFinanceComments",
  "viewFinanceComments",
  "addFinanceAttachments",
];

const expensesFundingPaymentDeleteArchive: Permission[] = [
  "archiveFinanceRecords",
  "cancelExpenses",
  "removeFinanceAttachments",
];

const expensesFundingPaymentApproveExecute: Permission[] = [
  "approveFinanceRecords",
  "approveExpenses",
  "rejectExpenses",
  "issueReimbursements",
  "recordReimbursementPayments",
  "recordPaymentsMade",
  "exportExpenseReports",
  "exportReimbursementReports",
];

const payrollFundBasketRead: Permission[] = [
  "accessFinance",
  "viewFinance",
  "accessPayroll",
  "viewPayroll",
  "viewOwnPaychecks",
];

const payrollFundBasketCreate: Permission[] = [
  "createFinanceRecords",
  "createPayrollRuns",
];

const payrollFundBasketUpdate: Permission[] = [
  "editFinanceRecords",
  "editPayrollRuns",
  "managePayProfiles",
  "addFinanceComments",
  "addFinanceAttachments",
];

const payrollFundBasketDeleteArchive: Permission[] = [
  "archiveFinanceRecords",
  "removeFinanceAttachments",
];

const payrollFundBasketApproveExecute: Permission[] = [
  "approveFinanceRecords",
  "approvePayroll",
  "processPayrollPayments",
];

const reportsRead: Permission[] = [
  "accessFinance",
  "viewFinance",
  "viewReports",
];

const reportsCreate: Permission[] = [
  "viewReports",
];

const reportsUpdate: Permission[] = [
  "viewReports",
  "exportFinanceReports",
];

const reportsDeleteArchive: Permission[] = [
  "exportFinanceReports",
];

const reportsApproveExecute: Permission[] = [
  "exportFinanceReports",
  "exportReceivables",
  "exportPayables",
  "exportExpenseReports",
  "exportReimbursementReports",
];

const accessApprovalsRead: Permission[] = [
  "accessApprovals",
  "viewApprovalQueue",
];

const accessApprovalsCreate: Permission[] = [
  "manageUsers",
];

const accessApprovalsUpdate: Permission[] = [
  "manageUsers",
];

const accessApprovalsDeleteArchive: Permission[] = [
  "manageUsers",
];

const accessApprovalsApproveExecute: Permission[] = [
  "actOnFinanceApprovals",
  "manageUsers",
];

export const ACCESS_APPROVAL_SECTIONS: AccessApprovalSection[] = [
  {
    key: "masterData",
    groupKey: "masterData",
    title: "Master Data",
    shortTitle: "Master Data",
    scope: "Finance reference data and connected company records",
    controls: [
      "Companies",
      "Clients",
      "Vendors",
      "Bank Accounts",
      "Payment Terms",
      "Shipping Terms",
      "Tax Codes",
      "Items",
      "Currencies",
      "Employees",
      "Categories",
    ],
    tooltip: {
      title: "Master Data",
      description:
        "Controls finance reference data used by every transaction flow, including companies, clients, vendors, bank accounts, terms, tax codes, items, currencies, employees, and categories.",
      permits: [
        "Read master-data pages according to the enabled level.",
        "Create new master-data records when Create is enabled.",
        "Edit master-data records, upload files, and add notes when Update is enabled.",
        "Archive, delete, restore, or remove records/files when Delete / Archive is enabled.",
        "Run final master-data control actions when Approve / Execute is enabled.",
      ],
      doesNotPermit: [
        "Transaction workflow execution.",
        "Expense or payroll payment execution.",
        "Access approval management.",
      ],
    },
    levels: {
      read: masterDataRead,
      create: masterDataCreate,
      update: masterDataUpdate,
      deleteArchive: masterDataDeleteArchive,
      approveExecute: masterDataApproveExecute,
    },
  },
  {
    key: "incomingMoneyFlow",
    groupKey: "transactions",
    title: "Incoming Money Flow",
    shortTitle: "Incoming Money",
    scope: "Company receivables workflow",
    controls: [
      "Quotations",
      "Customer POs",
      "Proforma Invoices",
      "Invoices",
      "Payments Received",
    ],
    tooltip: {
      title: "Incoming Money Flow",
      description:
        "Controls the full customer-side receivable flow from quotation and customer commitment through proforma, final invoice, and payment collection.",
      permits: [
        "Read quotations, customer POs, proforma invoices, invoices, and payments received when Read is enabled.",
        "Create incoming-money records when Create is enabled.",
        "Edit drafts, upload documents, and add notes when Update is enabled.",
        "Archive, delete, restore, or remove files when Delete / Archive is enabled.",
        "Issue, void, approve, export, or execute final incoming-money actions when Approve / Execute is enabled.",
      ],
      doesNotPermit: [
        "Supplier procurement actions.",
        "Expense funding/payment execution.",
        "Payroll funding/payment execution.",
        "Access approval management.",
      ],
    },
    levels: {
      read: incomingMoneyFlowRead,
      create: incomingMoneyFlowCreate,
      update: incomingMoneyFlowUpdate,
      deleteArchive: incomingMoneyFlowDeleteArchive,
      approveExecute: incomingMoneyFlowApproveExecute,
    },
  },
  {
    key: "supplierProcurementFlow",
    groupKey: "transactions",
    title: "Supplier Procurement Flow",
    shortTitle: "Supplier Procurement",
    scope: "Company supplier and payable workflow",
    controls: [
      "Vendor Quotations",
      "Purchase Orders",
      "Vendor PI / Invoice",
      "Payment Made",
    ],
    tooltip: {
      title: "Supplier Procurement Flow",
      description:
        "Controls the supplier-side procurement and payable flow from vendor quotation through purchase order, vendor PI/invoice, and outgoing payment.",
      permits: [
        "Read supplier procurement records when Read is enabled.",
        "Create procurement and payable records when Create is enabled.",
        "Edit drafts, upload documents, and add notes when Update is enabled.",
        "Archive, delete, restore, or remove files when Delete / Archive is enabled.",
        "Open, void, approve, export, or execute final procurement/payable actions when Approve / Execute is enabled.",
      ],
      doesNotPermit: [
        "Incoming customer receivable actions.",
        "Employee personal expense or paycheck ownership rights.",
        "Payroll funding/payment execution.",
        "Access approval management.",
      ],
    },
    levels: {
      read: supplierProcurementRead,
      create: supplierProcurementCreate,
      update: supplierProcurementUpdate,
      deleteArchive: supplierProcurementDeleteArchive,
      approveExecute: supplierProcurementApproveExecute,
    },
  },
  {
    key: "expensesFundingPayment",
    groupKey: "transactions",
    title: "Expenses & Reimbursements",
    shortTitle: "Expense Funding",
    scope: "Finance/Admin expense approval, funding, and payment execution",
    controls: [
      "Expense Requests",
      "Expense Funding Pool",
      "Expense Payment Distribution",
      "Payment Proof Review",
      "Recipient Confirmation Monitoring",
    ],
    defaultRule:
      "Normal users can see, create, edit, submit, upload, and confirm their own expenses and reimbursements by default.",
    tooltip: {
      title: "Expenses & Reimbursements",
      description:
        "Controls the company-side Finance/Admin layer of expenses and reimbursements. It does not remove normal users’ own expense/reimbursement rights.",
      permits: [
        "Read the Finance/Admin expense payment execution area when Read is enabled.",
        "Create funding/payment execution records when Create is enabled.",
        "Update funding/payment records, upload documents, and add notes when Update is enabled.",
        "Archive, delete, restore, cancel, or remove files when Delete / Archive is enabled.",
        "Approve, allocate funds, distribute payments, verify proof, export, or finalize actions when Approve / Execute is enabled.",
      ],
      doesNotPermit: [
        "Blocking normal users from seeing, creating, editing, submitting, uploading, or confirming their own expense/reimbursement records.",
        "Payroll funding/payment execution.",
        "Supplier procurement actions.",
        "Access approval management.",
      ],
    },
    levels: {
      read: expensesFundingPaymentRead,
      create: expensesFundingPaymentCreate,
      update: expensesFundingPaymentUpdate,
      deleteArchive: expensesFundingPaymentDeleteArchive,
      approveExecute: expensesFundingPaymentApproveExecute,
    },
  },
  {
    key: "payrollFundBasket",
    groupKey: "transactions",
    title: "Payroll & Paycheck Requests",
    shortTitle: "Payroll Basket",
    scope: "Finance/Admin payroll funding and payment execution",
    controls: [
      "Paycheck Requests",
      "Payroll Funding Pool",
      "Paycheck Payment Distribution",
      "Payroll Proof Review",
      "Employee Confirmation Monitoring",
    ],
    defaultRule:
      "Normal users can see, create, edit, submit, upload, and confirm their own paycheck requests by default.",
    tooltip: {
      title: "Payroll & Paycheck Requests",
      description:
        "Controls the company-side Finance/Admin layer of payroll funding pools and paycheck payment distributions. It does not remove normal users’ own paycheck request rights.",
      permits: [
        "Read payroll funding/payment execution pages when Read is enabled.",
        "Create payroll funding/payment records when Create is enabled.",
        "Update payroll records, upload documents, and add notes when Update is enabled.",
        "Archive, delete, restore, or remove files when Delete / Archive is enabled.",
        "Approve, allocate funding, distribute paycheck payments, verify proof, or finalize payroll actions when Approve / Execute is enabled.",
      ],
      doesNotPermit: [
        "Blocking normal users from seeing, creating, editing, submitting, uploading, or confirming their own paycheck requests.",
        "Expense funding/payment execution.",
        "Supplier procurement actions.",
        "Access approval management.",
      ],
    },
    levels: {
      read: payrollFundBasketRead,
      create: payrollFundBasketCreate,
      update: payrollFundBasketUpdate,
      deleteArchive: payrollFundBasketDeleteArchive,
      approveExecute: payrollFundBasketApproveExecute,
    },
  },
  {
    key: "reports",
    groupKey: "reports",
    title: "Reports",
    shortTitle: "Reports",
    scope: "Finance reports, analytics, and exports",
    controls: [
      "Finance Reports",
      "Receivables Reports",
      "Payables Reports",
      "Expense Reports",
      "Reimbursement Reports",
      "Report Exports",
    ],
    tooltip: {
      title: "Reports",
      description:
        "Controls finance reporting, analytics, summaries, saved report views if added later, and official report exports.",
      permits: [
        "Read the Finance Reports page when Read is enabled.",
        "Create or prepare report views where supported when Create is enabled.",
        "Update report views or report settings where supported when Update is enabled.",
        "Manage removed/superseded report views where supported when Delete / Archive is enabled.",
        "Export, download, or share official finance reports when Approve / Execute is enabled.",
      ],
      doesNotPermit: [
        "Editing source transaction records.",
        "Executing payments.",
        "Changing master data.",
        "Managing access approvals.",
      ],
    },
    levels: {
      read: reportsRead,
      create: reportsCreate,
      update: reportsUpdate,
      deleteArchive: reportsDeleteArchive,
      approveExecute: reportsApproveExecute,
    },
  },
  {
    key: "accessApprovals",
    groupKey: "settings",
    title: "Finance Access Approvals",
    shortTitle: "Access Control",
    scope: "Admin-only user access management",
    controls: [
      "User Access Approval",
      "Finance-Level Permission Matrix",
      "Read / Create / Update / Delete-Archive / Approve-Execute Controls",
    ],
    adminOnly: true,
    tooltip: {
      title: "Finance Access Approvals",
      description:
        "Admin-only control for managing what users can read, create, update, delete/archive, and approve/execute across the full AiXia Finance module.",
      permits: [
        "Read the Finance Access Approvals page only if the current user is Admin.",
        "Create user-access assignments only if Admin.",
        "Update user permissions only if Admin.",
        "Archive, remove, or restore access-control records only if Admin.",
        "Operate final access-control actions only if Admin.",
      ],
      doesNotPermit: [
        "Normal users managing other users’ access.",
        "Finance operators managing access unless they are Admin.",
        "Bypassing Admin-only security rules.",
      ],
    },
    levels: {
      read: accessApprovalsRead,
      create: accessApprovalsCreate,
      update: accessApprovalsUpdate,
      deleteArchive: accessApprovalsDeleteArchive,
      approveExecute: accessApprovalsApproveExecute,
    },
  },
];

export const ACCESS_APPROVAL_GROUPS: AccessApprovalGroup[] = [
  {
    key: "masterData",
    title: "Master Data",
    shortTitle: "Master Data",
    description:
      "Finance reference data used by companies, clients, vendors, bank accounts, terms, items, currencies, and categories.",
    sections: ["masterData"],
  },
  {
    key: "transactions",
    title: "Transactions",
    shortTitle: "Transactions",
    description:
      "Company transaction workflows: incoming money, supplier procurement, expenses/reimbursements, and payroll/paychecks.",
    sections: [
      "incomingMoneyFlow",
      "supplierProcurementFlow",
      "expensesFundingPayment",
      "payrollFundBasket",
    ],
  },
  {
    key: "reports",
    title: "Reports",
    shortTitle: "Reports",
    description:
      "Finance dashboards, analytics, summaries, and official report exports.",
    sections: ["reports"],
  },
  {
    key: "settings",
    title: "Settings",
    shortTitle: "Settings",
    description:
      "Admin-only Finance Access Approvals and permission matrix controls.",
    sections: ["accessApprovals"],
  },
];

export const ACCESS_APPROVAL_SECTION_BY_KEY = ACCESS_APPROVAL_SECTIONS.reduce(
  (map, section) => {
    map[section.key] = section;
    return map;
  },
  {} as Record<AccessApprovalSectionKey, AccessApprovalSection>
);

export const ACCESS_APPROVAL_GROUP_BY_KEY = ACCESS_APPROVAL_GROUPS.reduce(
  (map, group) => {
    map[group.key] = group;
    return map;
  },
  {} as Record<AccessApprovalGroupKey, AccessApprovalGroup>
);

export function getSectionsForGroup(groupKey: AccessApprovalGroupKey) {
  const group = ACCESS_APPROVAL_GROUP_BY_KEY[groupKey];

  if (!group) return [];

  return group.sections.map((sectionKey) => ACCESS_APPROVAL_SECTION_BY_KEY[sectionKey]);
}

export function getSectionPermissionSet(section: AccessApprovalSection) {
  return new Set<Permission>([
    ...section.levels.read,
    ...section.levels.create,
    ...section.levels.update,
    ...section.levels.deleteArchive,
    ...section.levels.approveExecute,
  ]);
}

export function getRequiredPermissionsThroughLevel(
  section: AccessApprovalSection,
  level: AccessApprovalLevel
) {
  const levelIndex = ACCESS_APPROVAL_LEVEL_ORDER.indexOf(level);
  const selectedLevels = ACCESS_APPROVAL_LEVEL_ORDER.slice(0, levelIndex + 1);

  return new Set<Permission>(
    selectedLevels.flatMap((selectedLevel) => section.levels[selectedLevel])
  );
}

export function getHigherLevelPermissions(
  section: AccessApprovalSection,
  level: AccessApprovalLevel
) {
  const levelIndex = ACCESS_APPROVAL_LEVEL_ORDER.indexOf(level);
  const higherLevels = ACCESS_APPROVAL_LEVEL_ORDER.slice(levelIndex + 1);

  return new Set<Permission>(
    higherLevels.flatMap((higherLevel) => section.levels[higherLevel])
  );
}

export function isPermissionSetEnabled(
  permissions: Record<Permission, boolean>,
  permissionSet: Permission[]
) {
  if (permissionSet.length === 0) return false;
  return permissionSet.every((permission) => Boolean(permissions[permission]));
}

export function getSectionLevelState(
  section: AccessApprovalSection,
  effectivePermissions: Record<Permission, boolean>
): AccessLevelState {
  return {
    read: isPermissionSetEnabled(effectivePermissions, section.levels.read),
    create: isPermissionSetEnabled(effectivePermissions, section.levels.create),
    update: isPermissionSetEnabled(effectivePermissions, section.levels.update),
    deleteArchive: isPermissionSetEnabled(
      effectivePermissions,
      section.levels.deleteArchive
    ),
    approveExecute: isPermissionSetEnabled(
      effectivePermissions,
      section.levels.approveExecute
    ),
  };
}

export function getEffectiveAccessLabel(
  section: AccessApprovalSection,
  state: AccessLevelState
): AccessApprovalEffectiveLabel {
  if (section.adminOnly && state.approveExecute) return "Admin Only";
  if (state.approveExecute) return "Can Approve / Execute";
  if (state.deleteArchive) return "Can Delete / Archive";
  if (state.update) return "Can Update Records";
  if (state.create) return "Can Create Records";
  if (state.read) return "Can Read Section";
  return "No Company Access";
}

export function getEffectiveAccessDescription(
  section: AccessApprovalSection,
  state: AccessLevelState
) {
  if (section.adminOnly && state.approveExecute) {
    return "Admin-level access control is enabled for this user.";
  }

  if (state.approveExecute) {
    return "This user can perform final approval and execution actions in this section.";
  }

  if (state.deleteArchive) {
    return "This user can archive, delete, restore, and manage removed records in this section.";
  }

  if (state.update) {
    return "This user can edit records, upload documents, and add notes in this section.";
  }

  if (state.create) {
    return "This user can create company-side records in this section.";
  }

  if (state.read) {
    return "This user can open and read this section.";
  }

  if (section.defaultRule) {
    return section.defaultRule;
  }

  return "No company-level access is enabled for this section.";
}

export function getPermissionOverrideForTarget(
  permission: Permission,
  targetValue: boolean,
  roleDefaultPermissions: Record<Permission, boolean>
) {
  return targetValue === roleDefaultPermissions[permission] ? undefined : targetValue;
}

export function setPermissionOverride(
  overrides: Partial<Record<Permission, boolean>>,
  permission: Permission,
  targetValue: boolean,
  roleDefaultPermissions: Record<Permission, boolean>
) {
  const overrideValue = getPermissionOverrideForTarget(
    permission,
    targetValue,
    roleDefaultPermissions
  );

  if (overrideValue === undefined) {
    delete overrides[permission];
  } else {
    overrides[permission] = overrideValue;
  }
}

export function buildSectionToggleOverrides({
  section,
  level,
  enabled,
  currentOverrides,
  roleDefaultPermissions,
}: ToggleSectionLevelInput) {
  const nextOverrides: Partial<Record<Permission, boolean>> = {
    ...currentOverrides,
  };

  if (enabled) {
    const requiredPermissions = getRequiredPermissionsThroughLevel(section, level);

    requiredPermissions.forEach((permission) => {
      setPermissionOverride(nextOverrides, permission, true, roleDefaultPermissions);
    });

    return nextOverrides;
  }

  const permissionsToDisable = new Set<Permission>([
    ...section.levels[level],
    ...getHigherLevelPermissions(section, level),
  ]);

  permissionsToDisable.forEach((permission) => {
    setPermissionOverride(nextOverrides, permission, false, roleDefaultPermissions);
  });

  return nextOverrides;
}

export function countEnabledSections(
  states: Record<AccessApprovalSectionKey, AccessLevelState>
) {
  return ACCESS_APPROVAL_SECTIONS.filter((section) => states[section.key]?.read).length;
}

export function countOperatorSections(
  states: Record<AccessApprovalSectionKey, AccessLevelState>
) {
  return ACCESS_APPROVAL_SECTIONS.filter(
    (section) => states[section.key]?.approveExecute
  ).length;
}

export function countEnabledSectionsForGroup(
  groupKey: AccessApprovalGroupKey,
  states: Record<AccessApprovalSectionKey, AccessLevelState>
) {
  return getSectionsForGroup(groupKey).filter((section) => states[section.key]?.read)
    .length;
}

export function countOperatorSectionsForGroup(
  groupKey: AccessApprovalGroupKey,
  states: Record<AccessApprovalSectionKey, AccessLevelState>
) {
  return getSectionsForGroup(groupKey).filter(
    (section) => states[section.key]?.approveExecute
  ).length;
}

export function countAvailableLevelsForGroup(
  groupKey: AccessApprovalGroupKey,
  states: Record<AccessApprovalSectionKey, AccessLevelState>
) {
  return getSectionsForGroup(groupKey).reduce((total, section) => {
    const state = states[section.key];

    if (!state) return total;

    return (
      total +
      ACCESS_APPROVAL_LEVEL_ORDER.filter((level) => Boolean(state[level])).length
    );
  }, 0);
}

export function countTotalLevelsForGroup(groupKey: AccessApprovalGroupKey) {
  return getSectionsForGroup(groupKey).length * ACCESS_APPROVAL_LEVEL_ORDER.length;
}

export function createEmptyAccessStateMap(): Record<
  AccessApprovalSectionKey,
  AccessLevelState
> {
  return ACCESS_APPROVAL_SECTIONS.reduce(
    (map, section) => {
      map[section.key] = {
        read: false,
        create: false,
        update: false,
        deleteArchive: false,
        approveExecute: false,
      };
      return map;
    },
    {} as Record<AccessApprovalSectionKey, AccessLevelState>
  );
}
