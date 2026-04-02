import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useLanguage } from "@/lib/i18n";
import { useAppClock } from "@/lib/clock/provider";

import { useTaskDetailData } from "../hooks/useTaskDetailData";
import { useTaskPermissions } from "../hooks/useTaskPermissions";
import { useTaskDerivedState } from "../hooks/useTaskDerivedState";
import { useTaskDetailActions } from "../hooks/useTaskDetailActions";
import { useTaskDetailRealtime } from "../hooks/useTaskDetailRealtime";

import { TaskDetailHeader } from "../components/detail/TaskDetailHeader";
import { TaskOverviewTab } from "../components/detail/TaskOverviewTab";
import { TaskFilesTab } from "../components/detail/TaskFilesTab";
import { TaskDiscussionTab } from "../components/detail/TaskDiscussionTab";
import { TaskActivityTab } from "../components/detail/TaskActivityTab";
import { TaskDetailsSidebar } from "../components/detail/TaskDetailsSidebar";
import { TaskMembersSidebar } from "../components/detail/TaskMembersSidebar";
import { TaskStatusDialog } from "../components/detail/TaskStatusDialog";

import type {
  FileUploadRow,
  ProfileRow,
  TaskActivityRow,
  TaskCommentRow,
  TaskMemberRow,
  TaskRow,
  TranslatedComment,
} from "../lib/task.types";

export default function TaskDetailPage() {
  const { t } = useLanguage();
  const clock = useAppClock();

  const [activeTab, setActiveTab] = useState("overview");
  const [translatedComments, setTranslatedComments] = useState<
    Record<string, TranslatedComment>
  >({});
  const [localError, setLocalError] = useState("");

  const {
    id,
    task: taskFromHook,
    project,
    profiles: profilesFromHook,
    taskMembers: taskMembersFromHook,
    comments: commentsFromHook,
    files: filesFromHook,
    activity: activityFromHook,
    currentUserId,
    currentUserRole,
    isBootstrapping,
    isRefreshing,
    error,
    refresh,
    requestTracker,
  } = useTaskDetailData();

  const [task, setTask] = useState<TaskRow | null>(taskFromHook);
  const [profiles, setProfiles] = useState<ProfileRow[]>(profilesFromHook);
  const [taskMembers, setTaskMembers] = useState<TaskMemberRow[]>(
    taskMembersFromHook,
  );
  const [comments, setComments] = useState<TaskCommentRow[]>(commentsFromHook);
  const [files, setFiles] = useState<FileUploadRow[]>(filesFromHook);
  const [activity, setActivity] = useState<TaskActivityRow[]>(activityFromHook);

  useEffect(() => setTask(taskFromHook), [taskFromHook]);
  useEffect(() => setProfiles(profilesFromHook), [profilesFromHook]);
  useEffect(() => setTaskMembers(taskMembersFromHook), [taskMembersFromHook]);
  useEffect(() => setComments(commentsFromHook), [commentsFromHook]);
  useEffect(() => setFiles(filesFromHook), [filesFromHook]);
  useEffect(() => setActivity(activityFromHook), [activityFromHook]);
  useEffect(() => setLocalError(error || ""), [error]);

const translateForActions = useCallback(
  (
    key: string,
    fallback?: string,
    params?: Record<string, string | number>,
  ) => {
    return t(key, fallback, params);
  },
  [t],
);

const translateForSidebar = useCallback(
  (key: string, options?: object) => {
    return t(
      key,
      undefined,
      options as Record<string, string | number> | undefined,
    );
  },
  [t],
);

  const visibleProjectIds = useMemo(
    () => new Set(project?.id ? [project.id] : []),
    [project?.id],
  );

  const {
    canEdit,
    canDelete,
    canMove,
    canManageMembers,
    canManageComment,
    canDeleteFile,
  } = useTaskPermissions({
    task,
    currentUserId,
    currentUserRole,
    taskMembers,
    visibleProjectIds,
  });

  const { checkpointState, dueDateInfo, progressValue } = useTaskDerivedState({
    task,
    taskMembers,
    profiles,
    todayKey: clock.todayKey,
  });

const actions = useTaskDetailActions(
  task,
  currentUserId,
  translateForActions,
  requestTracker,
  setLocalError,
  setTaskMembers,
  setComments,
  setFiles,
  setTranslatedComments,
);

  useTaskDetailRealtime({
    taskId: id,
    onTaskUpdate: (updatedTask: Partial<TaskRow>) => {
      setTask((prev) => (prev ? { ...prev, ...updatedTask } : prev));
    },
    onCommentInsert: (newComment: TaskCommentRow) => {
      setComments((prev) => {
        if (prev.some((comment) => comment.id === newComment.id)) {
          return prev;
        }
        return [...prev, newComment];
      });
    },
    onActivityInsert: (newActivity: TaskActivityRow) => {
      setActivity((prev) => {
        if (prev.some((item) => item.id === newActivity.id)) {
          return prev;
        }
        return [newActivity, ...prev];
      });
    },
  });

  const profileMap = useMemo(() => {
    const map = new Map<string, ProfileRow>();
    profiles.forEach((profile) => map.set(profile.user_id, profile));
    return map;
  }, [profiles]);

  const mentionCandidates = useMemo(() => {
    const ids = new Set<string>();

    if (task?.created_by) {
      ids.add(task.created_by);
    }

    taskMembers.forEach((member) => ids.add(member.user_id));

    return Array.from(ids)
      .map((userId) => profileMap.get(userId))
      .filter((profile): profile is ProfileRow => Boolean(profile))
      .filter((profile) => profile.user_id !== currentUserId);
  }, [task, taskMembers, profileMap, currentUserId]);

  const filteredMentionCandidates = useMemo(() => {
    if (!actions.showMentionDropdown) {
      return [];
    }

    const query = actions.mentionQuery.trim().toLowerCase();

    return mentionCandidates.filter((profile) => {
      const name = (profile.full_name || "").toLowerCase();
      return !query || name.includes(query);
    });
  }, [mentionCandidates, actions.showMentionDropdown, actions.mentionQuery]);

  const availableEmployees = useMemo(() => {
    const existingIds = new Set(taskMembers.map((member) => member.user_id));

    return profiles.filter((profile) => {
      const allowedRole =
        profile.role === "employee" || profile.role === "manager";

      return (
        allowedRole &&
        profile.status === "active" &&
        !existingIds.has(profile.user_id)
      );
    });
  }, [profiles, taskMembers]);

  const dueDateDisplay = useMemo(() => {
    if (!task?.due_date) {
      return "-";
    }

    return format(clock.shiftDate(task.due_date), "MMM d, yyyy");
  }, [task?.due_date, clock]);

  const dueDateBadgeClassName = useMemo(() => {
    if (dueDateInfo.isOverdue) {
      return "bg-red-500/20 text-red-400 border-red-500/30";
    }

    if (dueDateInfo.isDueToday) {
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    }

    return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }, [dueDateInfo]);

  const handleStatusClick = useCallback(
    (status: string) => {
      actions.setPendingStatus(status);
      actions.setStatusModalOpen(true);
    },
    [actions],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && project) {
        void actions.handleFileUpload(file, project.id);
      }
    },
    [actions, project],
  );

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      const file = e.dataTransfer.files?.[0];
      if (file && project) {
        void actions.handleFileUpload(file, project.id);
      }
    },
    [actions, project],
  );

  const handleStartEdit = useCallback(
    (comment: TaskCommentRow) => {
      actions.setEditingCommentId(comment.id);
      actions.setEditingCommentText(comment.content);
    },
    [actions],
  );

  const handleCancelEdit = useCallback(() => {
    actions.setEditingCommentId(null);
    actions.setEditingCommentText("");
  }, [actions]);

  const handleAddMember = useCallback(
    (employeeId: string) => {
      void actions.handleAddMember(employeeId, canManageMembers);
    },
    [actions, canManageMembers],
  );

  const handleRemoveMember = useCallback(
    (member: TaskMemberRow) => {
      void actions.handleRemoveMember(member, canManageMembers);
    },
    [actions, canManageMembers],
  );

  if (isBootstrapping) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-slate-800" />
          <div className="h-4 w-40 rounded bg-slate-800" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 animate-pulse"
              >
                <div className="mb-4 h-5 w-40 rounded bg-slate-800" />
                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-slate-800" />
                  <div className="h-4 w-5/6 rounded bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <div className="flex h-[calc(100vh-100px)] flex-col">
      <TaskDetailHeader
        task={task}
        projectName={project?.name}
        canEdit={canEdit}
        canDelete={canDelete}
        isRefreshing={isRefreshing}
        isDeleting={actions.deleteSaving}
        onRefresh={refresh}
        onDelete={actions.handleDeleteTask}
      />

      {localError && (
        <Alert className="mt-4 border-red-800 bg-red-900/20 text-red-300">
          <AlertDescription>{localError}</AlertDescription>
        </Alert>
      )}

      <div className="mt-6 grid flex-1 min-h-0 items-start gap-6 overflow-hidden lg:grid-cols-3">
        <div className="flex min-h-0 flex-col overflow-hidden lg:col-span-2">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabsList className="h-auto shrink-0 self-start flex-wrap border border-slate-800 bg-slate-900">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-slate-800"
              >
                {t("taskDetail.tabs.overview")}
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="data-[state=active]:bg-slate-800"
              >
                {t("taskDetail.tabs.files")}
              </TabsTrigger>
              <TabsTrigger
                value="discussion"
                className="data-[state=active]:bg-slate-800"
              >
                {t("taskDetail.tabs.discussion")}
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="data-[state=active]:bg-slate-800"
              >
                {t("taskDetail.tabs.activity")}
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="overview"
              className="min-h-0 flex-1 overflow-y-auto pb-6 pr-2"
            >
              <TaskOverviewTab
                task={task}
                checkpointState={checkpointState}
                dueDateDisplay={dueDateDisplay}
                dueDateBadgeClassName={dueDateBadgeClassName}
                dueDateLabel={dueDateInfo.label}
                progressValue={progressValue}
                canUpdateStatus={canMove}
                onStatusClick={handleStatusClick}
                statusSaving={actions.statusSaving}
              />
            </TabsContent>

            <TabsContent
              value="files"
              className="min-h-0 flex-1 overflow-y-auto pb-6 pr-2"
            >
              <TaskFilesTab
                files={files}
                profiles={profiles}
                isUploading={actions.isUploading}
                isUploadDialogOpen={actions.isUploadDialogOpen}
                isDragOverUploadZone={actions.isDragOverUploadZone}
                fileActionLoading={actions.fileActionLoading}
                canDeleteFile={canDeleteFile}
                onUploadDialogOpenChange={actions.setIsUploadDialogOpen}
                onFileSelect={handleFileSelect}
                onFileDrop={handleFileDrop}
                onDragStateChange={actions.setIsDragOverUploadZone}
                onOpenFile={actions.handleOpenFile}
                onDownloadFile={actions.handleDownloadFile}
                onDeleteFile={actions.handleDeleteFile}
              />
            </TabsContent>

            <TabsContent
              value="discussion"
              className="min-h-0 flex-1 overflow-y-auto pb-6 pr-2"
            >
              <TaskDiscussionTab
                comments={comments}
                profiles={profiles}
                currentUserId={currentUserId}
                newComment={actions.newComment}
                editingCommentId={actions.editingCommentId}
                editingCommentText={actions.editingCommentText}
                commentSaving={actions.commentSaving}
                commentActionLoading={actions.commentActionLoading}
                translatingCommentId={actions.translatingCommentId}
                translatedComments={translatedComments}
                showMentionDropdown={actions.showMentionDropdown}
                mentionCandidates={filteredMentionCandidates}
                canManageComment={canManageComment}
                onNewCommentChange={actions.handleCommentInputChange}
                onEditingCommentTextChange={actions.setEditingCommentText}
                onAddComment={actions.handleAddComment}
                onStartEdit={handleStartEdit}
                onCancelEdit={handleCancelEdit}
                onSaveEdit={actions.handleSaveEditedComment}
                onDeleteComment={actions.handleDeleteComment}
                onTranslateComment={actions.handleTranslateComment}
                onInsertMention={actions.insertMention}
              />
            </TabsContent>

            <TabsContent
              value="activity"
              className="min-h-0 flex-1 overflow-y-auto pb-6 pr-2"
            >
              <TaskActivityTab activity={activity} profiles={profiles} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6 overflow-hidden lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
          <TaskDetailsSidebar
  task={task}
  project={project}
  dueDateDisplay={dueDateDisplay}
  dueDateColorClass={dueDateInfo.color}
  t={translateForSidebar}
/>

          <TaskMembersSidebar
            taskMembers={taskMembers}
            profiles={profiles}
            availableEmployees={availableEmployees}
            canManageMembers={canManageMembers}
            memberSaving={actions.memberSaving}
            memberActionLoading={actions.memberActionLoading}
            showManageMembers={actions.showManageMembers}
            onShowManageMembersChange={actions.setShowManageMembers}
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
          />
        </div>
      </div>

      <TaskStatusDialog
        open={actions.statusModalOpen}
        onOpenChange={actions.setStatusModalOpen}
        pendingStatus={actions.pendingStatus}
        statusRemark={actions.statusRemark}
        onStatusRemarkChange={actions.setStatusRemark}
        statusSaving={actions.statusSaving}
        onConfirm={actions.handleStatusUpdate}
      />
    </div>
  );
}
