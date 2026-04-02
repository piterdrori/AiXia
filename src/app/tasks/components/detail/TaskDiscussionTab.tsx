import { useMemo } from "react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import {
  Clock3,
  Edit,
  MessageSquare,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";

import { useAppClock } from "@/lib/clock/provider";
import { useLanguage } from "@/lib/i18n";

import { getInitials } from "../../lib/task.utils";

import type {
  ProfileRow,
  TaskCommentRow,
  TranslatedComment,
} from "../../lib/task.types";

interface TaskDiscussionTabProps {
  comments: TaskCommentRow[];
  profiles: ProfileRow[];
  currentUserId: string | null;
  newComment: string;
  editingCommentId: string | null;
  editingCommentText: string;
  commentSaving: boolean;
  commentActionLoading: string | null;
  translatingCommentId: string | null;
  translatedComments: Record<string, TranslatedComment>;
  showMentionDropdown: boolean;
  mentionCandidates: ProfileRow[];
  canManageComment: (comment: TaskCommentRow) => boolean;
  onNewCommentChange: (value: string) => void;
  onAddComment: () => void;
  onStartEdit: (comment: TaskCommentRow) => void;
  onCancelEdit: () => void;
  onSaveEdit: (comment: TaskCommentRow) => void;
  onDeleteComment: (comment: TaskCommentRow) => void;
  onTranslateComment: (comment: TaskCommentRow) => void;
  onInsertMention: (fullName: string) => void;
}

export function TaskDiscussionTab({
  comments,
  profiles,
  currentUserId,
  newComment,
  editingCommentId,
  commentSaving,
  translatingCommentId,
  translatedComments,
  canManageComment,
  onNewCommentChange,
  onAddComment,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteComment,
  onTranslateComment,
}: TaskDiscussionTabProps) {
  const { t } = useLanguage();
  const clock = useAppClock();

  const profileMap = useMemo(() => {
    const map = new Map<string, ProfileRow>();
    profiles.forEach((profile) => map.set(profile.user_id, profile));
    return map;
  }, [profiles]);

  const visibleComments = useMemo(() => {
    return [...comments].slice(-50).reverse();
  }, [comments]);

  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-indigo-400" />
          <CardTitle className="text-white">
            {t("taskDetail.discussion.title")}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="mb-2">
            <p className="text-sm font-medium text-white">
              {t("taskDetail.discussion.addUpdate")}
            </p>
            <p className="text-xs text-slate-500">
              {t("taskDetail.discussion.addUpdateHelper")}
            </p>
          </div>

          <Textarea
            placeholder={t("taskDetail.discussion.placeholder")}
            value={newComment}
            onChange={(e) => onNewCommentChange(e.target.value)}
            rows={4}
            className="resize-none border-slate-800 bg-slate-900 text-white placeholder:text-slate-600"
          />

          {showMentionDropdown && (
            <div className="mt-2 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-lg">
              {mentionCandidates.length === 0 ? (
                <div className="px-3 py-2 text-sm text-slate-500">
                  {t("taskDetail.discussion.noMatchingParticipants")}
                </div>
              ) : (
                mentionCandidates.map((profile) => (
                  <button
                    key={profile.user_id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onInsertMention(profile.full_name || "")}
                    className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-slate-800"
                  >
                    <div>
                      <div className="text-sm font-medium text-white">
                        {profile.full_name || t("taskDetail.fallbacks.unknown")}
                      </div>
                      <div className="text-xs text-slate-500">
                        {profile.role.toUpperCase()}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              {t("taskDetail.discussion.visibilityNote")}
            </p>

            <Button
              type="button"
              onClick={onAddComment}
              disabled={commentSaving || !newComment.trim()}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <Send className="mr-2 h-4 w-4" />
              {commentSaving
                ? t("taskDetail.discussion.posting")
                : t("taskDetail.discussion.postUpdate")}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {visibleComments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
              <MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-600" />
              <p className="font-medium text-white">
                {t("taskDetail.discussion.emptyTitle")}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {t("taskDetail.discussion.emptyDescription")}
              </p>
            </div>
          ) : (
            visibleComments.map((comment) => {
              const profile = profileMap.get(comment.user_id);
              const authorName =
                profile?.full_name || t("taskDetail.fallbacks.unknown");
              const authorRole = profile?.role || "";
              const isMine = comment.user_id === currentUserId;
              const isEditing = editingCommentId === comment.id;

              return (
                <div
                  key={comment.id}
                  className={`rounded-xl border p-4 ${
                    isMine
                      ? "border-indigo-800/40 bg-indigo-950/20"
                      : "border-slate-800 bg-slate-950/50"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-xs font-medium text-white">
                        {getInitials(authorName)}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-white">
                            {authorName}
                          </p>

                          {authorRole && (
                            <Badge className="bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                              {authorRole.toUpperCase()}
                            </Badge>
                          )}

                          {isMine && (
                            <Badge className="bg-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-300">
                              {t("taskDetail.discussion.you")}
                            </Badge>
                          )}
                        </div>

                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <Clock3 className="h-3 w-3" />
                          <span>
                            {format(clock.shiftDate(comment.created_at), "MMM d, yyyy • h:mm a")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {canManageComment(comment) && !isEditing && (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-slate-700 text-slate-300 hover:bg-slate-800"
                          onClick={() => onStartEdit(comment)}
                          disabled={commentActionLoading === comment.id}
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          {t("taskDetail.actions.edit")}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-red-800 text-red-400 hover:bg-red-900/20"
                          onClick={() => onDeleteComment(comment)}
                          disabled={commentActionLoading === comment.id}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          {t("taskDetail.actions.delete")}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="pl-12">
                    {isEditing ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editingCommentText}
                          onChange={(e) => onNewCommentChange(editingCommentText === newComment ? e.target.value : e.target.value)}
                          rows={4}
                          className="resize-none border-slate-800 bg-slate-900 text-white"
                        />

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="bg-indigo-600 text-white hover:bg-indigo-700"
                            onClick={() => onSaveEdit(comment)}
                            disabled={
                              commentActionLoading === comment.id ||
                              !editingCommentText.trim()
                            }
                          >
                            <Save className="mr-1 h-3 w-3" />
                            {t("taskDetail.actions.save")}
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-slate-700 text-slate-300 hover:bg-slate-800"
                            onClick={onCancelEdit}
                            disabled={commentActionLoading === comment.id}
                          >
                            <X className="mr-1 h-3 w-3" />
                            {t("taskDetail.actions.cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">
                          {translatedComments[comment.id]?.text || comment.content}
                        </p>

                        {translatedComments[comment.id]?.source && (
                          <p className="text-[10px] text-slate-400 opacity-70">
                            Source: {translatedComments[comment.id].source}
                          </p>
                        )}

                        <button
                          type="button"
                          className="text-xs text-indigo-400 hover:text-indigo-300"
                          onClick={() => onTranslateComment(comment)}
                          disabled={translatingCommentId === comment.id}
                        >
                          {translatingCommentId === comment.id
                            ? t("taskDetail.discussion.translating")
                            : translatedComments[comment.id]
                              ? t("taskDetail.discussion.original")
                              : t("taskDetail.discussion.translate")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
