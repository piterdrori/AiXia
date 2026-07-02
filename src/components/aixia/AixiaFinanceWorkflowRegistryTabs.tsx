/**
 * Canonical workflow-registry tab strip for Finance paycheck + expense pages.
 * Do not import ExpenseHubTabs / PaycheckHubTabs from finance feature folders in registry pages.
 */
export {
  ExpenseHubTabs as AixiaFinanceWorkflowRegistryTabs,
  type ExpenseHubTabItem as AixiaFinanceWorkflowRegistryTabItem,
} from "@/components/finance/expenses/ExpenseHubTabs";
