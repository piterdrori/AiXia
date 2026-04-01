import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n";

interface TaskStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingStatus: string | null;
  statusRemark: string;
  onStatusRemarkChange: (value: string) => void;
  statusSaving: boolean;
  onConfirm: () => void;
}

export function TaskStatusDialog({
  open,
  onOpenChange,
  pendingStatus,
  statusRemark,
  onStatusRemarkChange,
  statusSaving,
  onConfirm,
}: TaskStatusDialogProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-950 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle>{t("taskDetail.statusModal.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-slate-400">
            {t("taskDetail.statusModal.newStatus")}{" "}
            <span className="text-white">{pendingStatus}</span>
          </div>

          <Textarea
            placeholder={t("taskDetail.statusModal.placeholder")}
            value={statusRemark}
            onChange={(e) => onStatusRemarkChange(e.target.value)}
            rows={4}
            className="bg-slate-900 border-slate-800 text-white"
          />

          <Button
            disabled={statusSaving || statusRemark.trim().length < 5}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            onClick={onConfirm}
          >
            {statusSaving ? t("taskDetail.statusModal.updating") : t("taskDetail.statusModal.confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
