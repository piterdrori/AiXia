import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import {
  Send,
  MessageSquare,
  Clock3,
  Edit,
  Trash2,
  Save,
  X,
} from "lucide-react";

import { useAppClock } from "@/lib/clock/provider";
import { useLanguage } from "@/lib/i18n";

import {
  getInitials,
} from "../../lib/task.utils";

import type {
  TaskCommentRow,
  ProfileRow,
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
  onSaveEdit: (comment: TaskCommentRow, text: string) => void;
  onDeleteComment: (comment: TaskCommentRow) => void;
  onTranslateComment: (comment: TaskCommentRow) => void;
  onInsertMention: (fullName: string) => void;
}

export function TaskDiscussionTab(props: TaskDiscussionTabProps) {
  const {
    comments,
    profiles,
    currentUserId,
    newComment,
    editingCommentId,
    editingCommentText,
    commentSaving,
    commentActionLoading,
    translatingCommentId,
    translatedComments,
    showMentionDropdown,
    mentionCandidates,
    canManageComment,
    onNewCommentChange,
    onAddComment,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onDeleteComment,
    onTranslateComment,
    onInsertMention,
  } = props;

  const { t } = useLanguage();
  const clock = useAppClock();

  // =========================
  // PROFILE MAP (O(1))
  // =========================

  const profileMap = useMemo(() => {
    const map = new Map<string, ProfileRow>();
    profiles.forEach((p) => map.set(p.user_id, p));
    return map;
  }, [profiles]);

  // =========================
  // COMMENTS (LIMITED + SORTED)
  // =========================

  const visibleComments = useMemo(() => {
    return [...comments].slice(-50).reverse();
  }, [comments]);

  // =========================
  // EDIT STATE (LOCAL)
  // =========================

  const [editText, setEditText] = useState("");

  // =========================
  // HANDLERS
  // =========================

  const handleStartEdit = useCallback(
    (comment: TaskCommentRow) => {
      onStartEdit(comment);
      setEditText(comment.content);
    },
    [onStartEdit]
  );

  const handleSave = useCallback(
    (comment: TaskCommentRow) => {
      onSaveEdit(comment, editText);
      setEditText("");
    },
    [onSaveEdit, editText]
  );

  const handleCancel = useCallback(() => {
    onCancelEdit();
    setEditText("");
  }, [onCancelEdit]);

  // =========================
  // RENDER COMMENT
  // =========================

  const renderComment = useCallback(
    (comment: TaskCommentRow) => {
      const profile = profileMap.get(comment.user_id);
      const name =
        profile?.full_name ||
        t("taskDetail.fallbacks.unknown");

      const role = profile?.role;
      const isMine = comment.user_id === currentUserId;
      const isEditing = editingCommentId === comment.id;

      const translated = translatedComments[comment.id];

      return (
        <div
          key={comment.id}
          className={`rounded-xl border p-4 ${
            isMine
              ? "bg-indigo-950/20 border-indigo-800/40"
              : "bg-slate-950/50 border-slate-800"
          }`}
        >
          {/* HEADER */}
          <div className="flex justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center text-xs text-white">
                {getInitials(name)}
              </div>

              <div>
                <div className="flex gap-2 items-center flex-wrap">
                  <p className="text-white text-sm font-medium">{name}</p>

                  {role && (
                    <Badge className="text-[10px] bg-slate-800">
                      {role.toUpperCase()}
                    </Badge>
                  )}

                  {isMine && (
                    <Badge className="text-[10px] bg-indigo-500/20 text-indigo-300">
                      {t("taskDetail.discussion.you")}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center text-xs text-slate-500 mt-1">
                  <Clock3 className="w-3 h-3 mr-1" />
                  {format(
                    clock.shiftDate(comment.created_at),
                    "MMM d, yyyy • h:mm a"
                  )}
                </div>
              </div>
            </div>

            {/* ACTIONS */}
            {canManageComment(comment) && !isEditing && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStartEdit(comment)}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  {t("taskDetail.actions.edit")}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDeleteComment(comment)}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  {t("taskDetail.actions.delete")}
                </Button>
              </div>
            )}
          </div>

          {/* CONTENT */}
          <div className="pl-12">
            {isEditing ? (
              <>
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                />

                <div className="flex gap-2 mt-2">
                  <Button onClick={() => handleSave(comment)}>
                    <Save className="w-3 h-3 mr-1" />
                    {t("taskDetail.actions.save")}
                  </Button>

                  <Button onClick={handleCancel}>
                    <X className="w-3 h-3 mr-1" />
                    {t("taskDetail.actions.cancel")}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-200 whitespace-pre-wrap">
                  {translated?.text || comment.content}
                </p>

                {translated?.source && (
                  <p className="text-xs text-slate-400">
                    Source: {translated.source}
                  </p>
                )}

                <button
                  className="text-xs text-indigo-400"
                  onClick={() => onTranslateComment(comment)}
                >
                  {translatingCommentId === comment.id
                    ? t("taskDetail.discussion.translating")
                    : translated
                    ? t("taskDetail.discussion.original")
                    : t("taskDetail.discussion.translate")}
                </button>
              </>
            )}
          </div>
        </div>
      );
    },
    [
      profileMap,
      currentUserId,
      editingCommentId,
      translatedComments,
      translatingCommentId,
      t,
      clock,
      canManageComment,
      handleStartEdit,
      handleSave,
      handleCancel,
      onDeleteComment,
      onTranslateComment,
    ]
  );

  // =========================
  // RENDER
  // =========================

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          {t("taskDetail.discussion.title")}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* INPUT */}
        <div className="p-4 border rounded-xl bg-slate-950/60">
          <Textarea
            value={newComment}
            onChange={(e) => onNewCommentChange(e.target.value)}
          />

          <Button
            onClick={onAddComment}
            disabled={!newComment.trim() || commentSaving}
            className="mt-3"
          >
            <Send className="w-4 h-4 mr-2" />
            {t("taskDetail.discussion.postUpdate")}
          </Button>
        </div>

        {/* LIST */}
        {visibleComments.length === 0 ? (
          <div className="text-center text-slate-500">
            {t("taskDetail.discussion.emptyTitle")}
          </div>
        ) : (
          <div className="space-y-4">
            {visibleComments.map(renderComment)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
