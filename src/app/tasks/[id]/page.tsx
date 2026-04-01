import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTaskDetailData } from "@/features/tasks/hooks/useTaskDetailData";
import { useTaskPermissions } from "@/features/tasks/hooks/useTaskPermissions";
import { useTaskDerivedState } from "@/features/tasks/hooks/useTaskDerivedState";
import { useTaskDetailActions } from "@/features/tasks/hooks/useTaskDetailActions";
import { useTaskDetailRealtime } from "@/features/tasks/hooks/useTaskDetailRealtime";
import { TaskDetailHeader } from "@/features/tasks/components/detail/TaskDetailHeader";
import { TaskOverviewTab } from "@/features/tasks/components/detail/TaskOverviewTab";
import { TaskFilesTab } from "@/features/tasks/components/detail/TaskFilesTab";
import { TaskDiscussionTab } from "@/features/tasks/components/detail/TaskDiscussionTab";
import { TaskActivityTab } from "@/features/tasks/components/detail/TaskActivityTab";
import { TaskDetailsSidebar } from "@/features/tasks/components/detail/TaskDetailsSidebar";
import { TaskMembersSidebar } from "@/features/tasks/components/detail/TaskMembersSidebar";
import { TaskStatusDialog } from "@/features/tasks/components/detail/TaskStatusDialog";
import { useLanguage } from "@/lib/i18n";
import { useAppClock } from "@/lib/clock/provider";
import { formatDateInTimezone } from "@/lib/datetime";
import { TaskRow, TaskCommentRow, FileUploadRow, TaskActivityRow, TaskMemberRow, ProfileRow, TranslatedComment } from "@/features/tasks/lib/task.types";
import { getProjectName } from "@/features/tasks/lib/task.utils";
import { CHINA_TIMEZONE } from "@/features/tasks/lib/task.constants";

export default function TaskDetailPage() {
  const { t, language } = useLanguage();
  const clock = useAppClock();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [translatedComments, setTranslatedComments] = useState<Record<string, TranslatedComment>>({});

  const {
    id,
    task,
    project,
    profiles,
    taskMembers,
    comments,
    files,
    activity,
    currentUserId,
    currentUserRole,
    isBootstrapping,
    isRefreshing,
    error,
    setTask,
    setComments,
    setFiles,
    setActivity,
    setTaskMembers,
    loadTaskPage,
    requestTracker,
  } = useTaskDetailData();

  const { canEdit, canDelete, canMove, canManageMembers, canManageComment, canDeleteFile } = useTaskPermissions({
    task,
    currentUserId,
    currentUserRole,
    taskMembers,
    visibleProjectIds: new Set(project?.id ? [project.id] : []),
  });

  const {
    checkpointState,
    dueDateInfo,
    progressValue,
    assigneeProfiles,
  } = useTaskDerivedState({
    task,
    taskMembers,
    profiles,
    todayKey: clock.todayKey,
  });

  const actions = useTaskDetailActions(
    task,
    currentUserId,
    t,
    requestTracker,
    (err) => {}, // setError handled below
    setTaskMembers,
    setComments,
    setFiles,
    setTranslatedComments
  );

  // Realtime subscriptions
  useTaskDetailRealtime({
    taskId: id,
    onTaskUpdate: (updatedTask) => {
      setTask((prev) => (prev ? { ...prev, ...updatedTask } : prev));
    },
    onCommentInsert: (newComment) => {
      setComments((prev) => {
        if (prev.some((c) => c.id === newComment.id)) return prev;
        return [...prev, newComment];
      });
    },
    onActivityInsert: (newActivity) => {
      setActivity((prev) => {
        if (prev.some((a) => a.id === newActivity.id)) return prev;
        return [newActivity, ...prev];
      });
    },
  });

  const mentionCandidates = useMemo(() => {
    const candidateIds = Array.from(
      new Set([
        ...(task?.created_by ? [task.created_by] : []),
        ...taskMembers.map((m) => m.user_id),
      ])
    );
    return candidateIds
      .map((userId) => profiles.find((p) => p.user_id === userId))
      .filter((p): p is ProfileRow => Boolean(p))
      .filter((p) => p.user_id !== currentUserId);
  }, [task, taskMembers, profiles, currentUserId]);

  const availableEmployees = useMemo(() => {
    const existingIds = new Set(taskMembers.map((m) => m.user_id));
    return profiles.filter(
      (p) => (p.role === "employee" || p.role === "manager") && 
             p.status === "active" && 
             !existingIds.has(p.user_id)
    );
  }, [profiles, taskMembers]);

  const dueDateDisplay = useMemo(() => {
    if (!task?.due_date) return "-";
    return formatDateInTimezone(clock.shiftDate(task.due_date), language, clock.timezone);
  }, [task?.due_date, clock, language]);

  const dueDateBadgeClassName = useMemo(() => {
    if (dueDateInfo.isOverdue) return "bg-red-500/20 text-red-400 border-red-500/30";
    if (dueDateInfo.isDueToday) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }, [dueDateInfo]);

  if (isBootstrapping) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-slate-800" />
          <div className="h-4 w-40 rounded bg-slate-800" />
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-900/50 border-slate-800 rounded-lg p-6 animate-pulse">
                <div className="h-5 w-40 bg-slate-800 rounded mb-4" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-slate-800 rounded" />
                  <div className="h-4 w-5/6 bg-slate-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!task) return null;

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      <TaskDetailHeader
        task={task}
        projectName={project?.name}
        canEdit={canEdit}
        canDelete={canDelete}
        isRefreshing={isRefreshing}
        isDeleting={actions.deleteSaving}
        onRefresh={() => loadTaskPage("refresh")}
        onDelete={actions.handleDeleteTask}
      />

      {error && (
        <Alert className="bg-red-900/20 border-red-800 text-red-300 mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-6 items-start flex-1 min-h-0 overflow-hidden mt-6">
        <div className="lg:col-span-2 min-h-0 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
            <TabsList className="bg-slate-900 border border-slate-800 flex-wrap h-auto shrink-0 self-start">
              <TabsTrigger value="overview" className="data-[state=active]:bg-slate-800">Overview</TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:bg-slate-800">Files</TabsTrigger>
              <TabsTrigger value="discussion" className="data-[state=active]:bg-slate-800">Discussion</TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:bg-slate-800">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="min-h-0 flex-1 overflow-y-auto pb-6 pr-2">
              <TaskOverviewTab
                task={task}
                checkpointState={checkpointState}
                dueDateDisplay={dueDateDisplay}
                dueDateBadgeClassName={dueDateBadgeClassName}
                dueDateLabel={dueDateInfo.label}
                progressValue={progressValue}
                canUpdateStatus={canMove}
                onStatusClick={(status) => {
                  actions.setPendingStatus(status);
                  actions.setStatusModalOpen(true);
                }}
                statusSaving={actions.statusSaving}
              />
            </TabsContent>

            <TabsContent value="files" className="min-h-0 flex-1 overflow-y-auto pb-6 pr-2">
              <TaskFilesTab
                files={files}
                profiles={profiles}
                isUploading={actions.isUploading}
                isUploadDialogOpen={actions.isUploadDialogOpen}
                isDragOverUploadZone={actions.isDragOverUploadZone}
                fileActionLoading={actions.fileActionLoading}
                canDeleteFile={canDeleteFile}
                onUploadDialogOpenChange={actions.setIsUploadDialogOpen}
                onFileSelect={(e) => {
                  if (e.target.files?.[0] && project) {
                    actions.handleFileUpload(e.target.files[0], project.id);
                  }
                }}
                onFileDrop={(e) => {
                  const file = e.dataTransfer.files?.[0];
                  if (file && project) {
                    actions.handleFileUpload(file, project.id);
                  }
                }}
                onDragStateChange={actions.setIsDragOverUploadZone}
                onOpenFile={actions.handleOpenFile}
                onDownloadFile={actions.handleDownloadFile}
                onDeleteFile={actions.handleDeleteFile}
                onTriggerFileInput={() => {}}
              />
            </TabsContent>

            <TabsContent value="discussion" className="min-h-0 flex-1 overflow-y-auto pb-6 pr-2">
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
                mentionCandidates={mentionCandidates.filter((p) => 
                  (p.full_name || "").toLowerCase().includes(actions.mentionQuery.toLowerCase())
                )}
                mentionQuery={actions.mentionQuery}
                canManageComment={canManageComment}
                onNewCommentChange={actions.handleCommentInputChange}
                onAddComment={actions.handleAddComment}
                onStartEdit={(comment) => {
                  actions.setEditingCommentId(comment.id);
                  actions.setEditingCommentText(comment.content);
                }}
                onCancelEdit={() => {
                  actions.setEditingCommentId(null);
                  actions.setEditingCommentText("");
                }}
                onSaveEdit={actions.handleSaveEditedComment}
                onDeleteComment={actions.handleDeleteComment}
                onTranslateComment={actions.handleTranslateComment}
                onInsertMention={actions.insertMention}
              />
            </TabsContent>

            <TabsContent value="activity" className="min-h-0 flex-1 overflow-y-auto pb-6 pr-2">
              <TaskActivityTab activity={activity} profiles={profiles} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6 lg:flex-1 lg:min-h-0 lg:flex lg:flex-col overflow-hidden">
          <TaskDetailsSidebar
            task={task}
            project={project}
            dueDateDisplay={dueDateDisplay}
            dueDateColorClass={dueDateInfo.color}
            t={t}
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
            onAddMember={actions.handleAddMember}
            onRemoveMember={actions.handleRemoveMember}
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
