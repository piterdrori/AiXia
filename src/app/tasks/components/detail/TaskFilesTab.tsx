import { useRef, useMemo, useCallback } from "react";
import { format } from "date-fns";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  FileText,
  Upload,
  ExternalLink,
  Download,
  Trash2,
} from "lucide-react";

import { useLanguage } from "@/lib/i18n";
import { useAppClock } from "@/lib/clock/provider";

import { getProfileName } from "../../lib/task.utils";

import type {
  FileUploadRow,
  ProfileRow,
} from "../../lib/task.types";

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
}

export function TaskFilesTab(props: TaskFilesTabProps) {
  const {
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
  } = props;

  const { t } = useLanguage();
  const clock = useAppClock();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // =========================
  // TEXT
  // =========================

  const text = useMemo(() => ({
    title: t("taskDetail.files.title"),
    upload: t("taskDetail.files.uploadFile"),
    uploading: t("taskDetail.files.uploading"),
    empty: t("taskDetail.files.empty"),
    open: t("taskDetail.files.open"),
    download: t("taskDetail.files.download"),
    delete: t("taskDetail.actions.delete"),
    unknownUser: t("taskDetail.fallbacks.unknown"),
    dragTitle: t("taskDetail.files.dragTitle", "Drag files here to upload"),
    dragSubtitle: t(
      "taskDetail.files.dragSubtitle",
      "Or click to choose a file"
    ),
    choose: t("taskDetail.files.chooseFile", "Choose File"),
  }), [t]);

  // =========================
  // HANDLERS
  // =========================

  const handleDialogChange = useCallback(
    (open: boolean) => {
      if (isUploading) return;
      onUploadDialogOpenChange(open);
      if (!open) onDragStateChange(false);
    },
    [isUploading, onUploadDialogOpenChange, onDragStateChange]
  );

  const openFilePicker = useCallback(() => {
    if (!isUploading) fileInputRef.current?.click();
  }, [isUploading]);

  const handleDrag = useCallback(
    (e: React.DragEvent, state: boolean) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isUploading) onDragStateChange(state);
    },
    [isUploading, onDragStateChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDragStateChange(false);
      if (!isUploading) onFileDrop(e);
    },
    [isUploading, onFileDrop, onDragStateChange]
  );

  // =========================
  // FILE ROW RENDER
  // =========================

  const renderFileRow = useCallback(
    (file: FileUploadRow) => {
      const isLoading = fileActionLoading === file.id;

      return (
        <div
          key={file.id}
          className="flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-950/50 p-3"
        >
          <div className="flex flex-1 items-center gap-3 min-w-0">
            <FileText className="h-5 w-5 text-indigo-400 shrink-0" />

            <div className="min-w-0">
              <p className="truncate text-sm text-white">
                {file.file_name}
              </p>

              <p className="text-xs text-slate-500">
                {getProfileName(
                  file.user_id,
                  profiles,
                  text.unknownUser
                )}{" "}
                •{" "}
                {format(
                  clock.shiftDate(file.created_at),
                  "MMM d, yyyy h:mm a"
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => onOpenFile(file)}
              disabled={isLoading}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {text.open}
            </Button>

            <Button
              variant="outline"
              onClick={() => onDownloadFile(file)}
              disabled={isLoading}
              className="text-green-400"
            >
              <Download className="mr-2 h-4 w-4" />
              {text.download}
            </Button>

            {canDeleteFile(file) && (
              <Button
                variant="outline"
                onClick={() => onDeleteFile(file)}
                disabled={isLoading}
                className="text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {text.delete}
              </Button>
            )}
          </div>
        </div>
      );
    },
    [
      fileActionLoading,
      profiles,
      text,
      clock,
      onOpenFile,
      onDownloadFile,
      onDeleteFile,
      canDeleteFile,
    ]
  );

  // =========================
  // RENDER
  // =========================

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-white">
            {text.title}
          </CardTitle>

          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={onFileSelect}
            />

            <Button onClick={() => onUploadDialogOpenChange(true)}>
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? text.uploading : text.upload}
            </Button>

            <Dialog
              open={isUploadDialogOpen}
              onOpenChange={handleDialogChange}
            >
              <DialogContent className="bg-slate-950 border-slate-800">
                <DialogHeader>
                  <DialogTitle>{text.upload}</DialogTitle>
                </DialogHeader>

                <div
                  onClick={openFilePicker}
                  onDragEnter={(e) => handleDrag(e, true)}
                  onDragOver={(e) => handleDrag(e, true)}
                  onDragLeave={(e) => handleDrag(e, false)}
                  onDrop={handleDrop}
                  className={`p-10 border-2 border-dashed rounded-2xl text-center ${
                    isDragOverUploadZone
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-slate-700"
                  }`}
                >
                  <Upload className="mx-auto mb-4" />

                  <h4 className="text-white">{text.dragTitle}</h4>
                  <p className="text-slate-400">
                    {text.dragSubtitle}
                  </p>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      openFilePicker();
                    }}
                  >
                    {text.choose}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        </div>
      </CardHeader>

      <CardContent>
        {files.length === 0 ? (
          <p className="text-slate-500">{text.empty}</p>
        ) : (
          <div className="space-y-3">
            {files.map(renderFileRow)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
