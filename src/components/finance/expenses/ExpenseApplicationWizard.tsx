"use client";

import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { AixiaAlert, AixiaLoadingState } from "@/components/aixia";
import { FinanceProcessBookShell } from "@/components/finance/process-book/FinanceProcessBookShell";
import { AixiaButton } from "@/components/aixia";
import { WIZARD_STAGE_IDS } from "@/lib/finance/expenses/expenseApplicationTypes";
import { useExpenseApplicationForm } from "@/lib/finance/expenses/useExpenseApplicationForm";
import { EXPENSE_PROCESSES } from "@/lib/finance/processBook";

import {
  AmountStage,
  DetailsStage,
  ExpenseTypeStage,
  PayeeStage,
  ReceiptsStage,
  ReviewSubmitStage,
} from "@/app/finance/transactions/expenses/process/stages";

type ExpenseApplicationWizardProps = {
  expenseId?: string;
};

export function ExpenseApplicationWizard({ expenseId }: ExpenseApplicationWizardProps) {
  const navigate = useNavigate();
  const applicationProcess = EXPENSE_PROCESSES.find((process) => process.key === "application")!;
  const wizard = useExpenseApplicationForm({ expenseId });

  const stages = useMemo(() => {
    const wizardStages = applicationProcess.stages.filter((stage) =>
      WIZARD_STAGE_IDS.includes(stage.id as (typeof WIZARD_STAGE_IDS)[number]),
    );

    return wizardStages.map((stage) => {
      let content = null;

      switch (stage.id) {
        case "expense-type":
          content = <ExpenseTypeStage form={wizard.form} updateField={wizard.updateField} />;
          break;
        case "payee":
          content = (
            <PayeeStage
              form={wizard.form}
              updateField={wizard.updateField}
              companies={wizard.companies}
              employees={wizard.employees}
              employeeIdentities={wizard.employeeIdentities}
            />
          );
          break;
        case "details":
          content = <DetailsStage form={wizard.form} updateField={wizard.updateField} />;
          break;
        case "amount":
          content = (
            <AmountStage
              form={wizard.form}
              updateField={wizard.updateField}
              currencies={wizard.currencies}
            />
          );
          break;
        case "receipts":
          content = (
            <ReceiptsStage
              form={wizard.form}
              updateField={wizard.updateField}
              documentationFile={wizard.documentationFile}
              setDocumentationFile={wizard.setDocumentationFile}
              isReimbursement={wizard.form.expenseType === "reimbursement"}
            />
          );
          break;
        case "review-submit":
          content = (
            <ReviewSubmitStage
              form={wizard.form}
              companies={wizard.companies}
              employees={wizard.employees}
              documentationStatus={wizard.documentationStatus}
            />
          );
          break;
        default:
          content = null;
      }

      return { ...stage, content };
    });
  }, [applicationProcess.stages, wizard]);

  const handleSaveDraft = useCallback(async () => {
    const result = await wizard.saveExpense("draft");
    if (result?.id) {
      navigate(`/finance/transactions/expenses/process/${result.id}`);
    }
  }, [navigate, wizard]);

  const handleSubmit = useCallback(async () => {
    const result = await wizard.saveExpense("request");
    if (result?.id) {
      navigate(`/finance/transactions/expenses/${result.id}`);
    }
  }, [navigate, wizard]);

  if (wizard.isLoadingOptions || wizard.isLoadingExpense) {
    return (
      <AixiaLoadingState
        title="Loading expense wizard"
        description="Companies, employees, and currencies are being loaded."
      />
    );
  }

  return (
    <div className="aixia-stack">
      {wizard.formError ? <AixiaAlert tone="error">{wizard.formError}</AixiaAlert> : null}
      {wizard.formSuccess ? <AixiaAlert tone="success">{wizard.formSuccess}</AixiaAlert> : null}

      <FinanceProcessBookShell
        processKey="application"
        eyebrow={applicationProcess.eyebrow}
        title={applicationProcess.title}
        subtitle={applicationProcess.subtitle}
        statusLabel={applicationProcess.statusLabel}
        progressLabel={`${WIZARD_STAGE_IDS.length} stages`}
        recordLabel={expenseId ? "Draft" : applicationProcess.recordLabel}
        summaryItems={applicationProcess.summary}
        stages={stages}
        onSaveDraft={() => void handleSaveDraft()}
        saveDisabled={wizard.isSaving}
        finalAction={
          <AixiaButton
            type="button"
            variant="primary"
            disabled={wizard.isSaving}
            onClick={() => void handleSubmit()}
          >
            {wizard.isSaving ? "Submitting..." : "Submit expense"}
          </AixiaButton>
        }
      />
    </div>
  );
}
