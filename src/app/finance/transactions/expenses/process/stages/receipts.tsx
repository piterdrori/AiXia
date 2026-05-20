import {
  AixiaDocumentUploadPanel,
  AixiaFieldLabel,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaInputField,
} from "@/components/aixia";
import type { ExpenseApplicationFormState } from "@/lib/finance/expenses/expenseApplicationTypes";

type ReceiptsStageProps = {
  form: ExpenseApplicationFormState;
  updateField: <Key extends keyof ExpenseApplicationFormState>(
    key: Key,
    value: ExpenseApplicationFormState[Key],
  ) => void;
  documentationFile: File | null;
  setDocumentationFile: (file: File | null) => void;
  isReimbursement: boolean;
};

export function ReceiptsStage({
  form,
  updateField,
  documentationFile,
  setDocumentationFile,
  isReimbursement,
}: ReceiptsStageProps) {
  return (
    <AixiaFormGrid>
      <AixiaFormFullWidth>
        <AixiaFieldLabel
          label="Documentation Link"
          helper={
            isReimbursement
              ? "Reimbursements require proof before submit."
              : "Optional link to receipt or invoice."
          }
        />
        <AixiaInputField
          value={form.externalDocumentationLink}
          onChange={(event) => updateField("externalDocumentationLink", event.target.value)}
          placeholder="https://..."
        />
      </AixiaFormFullWidth>

      <AixiaFormFullWidth>
        <AixiaDocumentUploadPanel
          selectedFile={documentationFile}
          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
          dropTitle="Drop receipt or proof here"
          dropDescription="Upload receipt, invoice, screenshot, or supporting document."
          uploadLabel="Attach File"
          emptyTitle="No file selected"
          emptyDescription={
            isReimbursement
              ? "Upload proof of payment for reimbursement requests."
              : "Attach supporting documentation if available."
          }
          onFileSelect={(file) => setDocumentationFile(file)}
          onRemoveSelectedFile={() => setDocumentationFile(null)}
          onUpload={() => undefined}
        />
      </AixiaFormFullWidth>
    </AixiaFormGrid>
  );
}
