-- Idempotent repair: ensure task hierarchy columns exist on databases that missed 20260518120000.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES public.tasks (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES public.profiles (user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles (user_id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_no_self_parent_chk'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_no_self_parent_chk
      CHECK (parent_task_id IS NULL OR parent_task_id <> id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id
  ON public.tasks (parent_task_id)
  WHERE parent_task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_project_active
  ON public.tasks (project_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_project_archived
  ON public.tasks (project_id)
  WHERE archived_at IS NOT NULL AND deleted_at IS NULL;

NOTIFY pgrst, 'reload schema';
