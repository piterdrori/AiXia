import { useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Upload, ExternalLink, Download, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { FileUploadRow, ProfileRow } from "../../lib/task.types";
import { getProfileName } from "../../lib/task.utils";
import { useAppClock } from "@/lib/clock/provider";
import { useLanguage } from "@/lib/i18n";

interface TaskFilesTabProps {
  files: FileUploadRow[];
  profiles: ProfileRow[];
  isUploading: boolean;
  isUploadDialogOpen: boolean;
  isDragOverUploadZone: boolean;
  fileActionLoading: string | null;
  canDeleteFile: (file: FileUploadRow) => boolean;
  onUploadDialogOpenChange: (open: boolean) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileDrop: (e: React.DragEvent) => void;
  onDragStateChange: (isOver: boolean) => void;
  onOpenFile: (file: FileUploadRow) => void;
  onDownloadFile: (file: FileUploadRow) => void;
  onDeleteFile: (file: FileUploadRow) => void;
  onTriggerFileInput: () => void;
}

export function TaskFilesTab({
  files,
  profiles,
  isUploading,
  isUploadDialogOpen,
  isDragOverUploadZone,
  fileActionLoading,
  canDeleteFile,
  onUploadDialogOpenChange,
  onFileSelect,
  onFileDrop,
  onDragStateChange,
  onOpenFile,
  onDownloadFile,
  onDeleteFile,
  onTriggerFileInput,
}: TaskFilesTabProps) {
  const { t } = useLanguage();
  const clock = useAppClock();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-white">{t("taskDetail.files.title")}</CardTitle>

          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={onFileSelect}
              disabled={isUploading}
            />

            <Button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={isUploading}
              onClick={() => onUploadDialogOpenChange(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? t("taskDetail.files.uploading") : t("taskDetail.files.uploadFile")}
            </Button>

            <Dialog
              open={isUploadDialogOpen}
              onOpenChange={(open) => {
                if (isUploading) return;
                onUploadDialogOpenChange(open);
                if (!open) onDragStateChange(false);
              }}
            >
              <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t("taskDetail.files.uploadFile")}</DialogTitle>
                </DialogHeader>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (!isUploading && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    !isUploading && onDragStateChange(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    !isUploading && onDragStateChange(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const relatedTarget = e.relatedTarget as Node | null;
                    if (!e.currentTarget.contains(relatedTarget)) {
                      onDragStateChange(false);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDragStateChange(false);
                    if (!isUploading) onFileDrop(e);
                  }}
                  className={`rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
                    isDragOverUploadZone
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-slate-700 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-900"
                  } ${isUploading ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800">
                    <Upload className="h-7 w-7 text-indigo-400" />
                  </div>

                  <h4 className="text-xl font-semibold text-white">Drag files here to upload</h4>
                  <p className="mt-2 text-sm text-slate-400">Or click to choose a file from your computer</p>

                  <div className="mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-700 text-slate-300 hover:bg-slate-800"
                      disabled={isUploading}
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </Button>
                  </div>

                  {isUploading && (
                    <p className="mt-4 text-sm text-indigo-300">{t("taskDetail.files.uploading")}</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </>
        </div>
      </CardHeader>

      <CardContent>
        {files.length === 0 ? (
          <p className="text-slate-500">{t("taskDetail.files.empty")}</p>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-950/50 p-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <FileText className="h-5 w-5 shrink-0 text-indigo-400" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">{file.file_name}</p>
                    <p className="text-xs text-slate-500">
                      {getProfileName(file.user_id, profiles, t("taskDetail.fallbacks.unknown"))} •{" "}
                      {format(clock.shiftDate(file.created_at), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    onClick={() => onOpenFile(file)}
                    disabled={fileActionLoading === file.id}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t("taskDetail.files.open")}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-700 text-green-400 hover:bg-slate-800"
                    onClick={() => onDownloadFile(file)}
                    disabled={fileActionLoading === file.id}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {t("taskDetail.files.download")}
                  </Button>

                  {canDeleteFile(file) && (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-800 text-red-400 hover:bg-red-900/20"
                      onClick={() => onDeleteFile(file)}
                      disabled={fileActionLoading === file.id}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("taskDetail.actions.delete")}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
