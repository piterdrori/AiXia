-- Task hierarchy (two levels), soft lifecycle, and project-specific custom task fields.

-- ---------------------------------------------------------------------------
-- tasks: hierarchy + lifecycle columns
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- project_task_field_definitions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.project_task_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  field_type text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  include_by_default boolean NOT NULL DEFAULT true,
  allows_multiple boolean NOT NULL DEFAULT false,
  options_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES public.profiles (user_id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles (user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_task_field_definitions_field_type_chk CHECK (
    field_type IN (
      'plain_text',
      'textarea',
      'datetime',
      'checkbox_list',
      'radio_list',
      'dropdown',
      'multi_select_dropdown'
    )
  ),
  CONSTRAINT project_task_field_definitions_status_chk CHECK (
    status IN ('active', 'archived', 'deleted')
  )
);

CREATE INDEX IF NOT EXISTS idx_project_task_field_definitions_project
  ON public.project_task_field_definitions (project_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_project_task_field_definitions_project_status
  ON public.project_task_field_definitions (project_id, status);

-- ---------------------------------------------------------------------------
-- project_task_field_values
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.project_task_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  field_definition_id uuid NOT NULL REFERENCES public.project_task_field_definitions (id) ON DELETE CASCADE,
  value_text text,
  value_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_task_field_values_task_field_uniq UNIQUE (task_id, field_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_project_task_field_values_task
  ON public.project_task_field_values (task_id);

CREATE INDEX IF NOT EXISTS idx_project_task_field_values_definition
  ON public.project_task_field_values (field_definition_id);

-- ---------------------------------------------------------------------------
-- Triggers: updated_at
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_project_task_field_definitions_updated_at
  ON public.project_task_field_definitions;

CREATE TRIGGER trg_project_task_field_definitions_updated_at
BEFORE UPDATE ON public.project_task_field_definitions
FOR EACH ROW
EXECUTE FUNCTION public.finance_set_updated_at();

DROP TRIGGER IF EXISTS trg_project_task_field_values_updated_at
  ON public.project_task_field_values;

CREATE TRIGGER trg_project_task_field_values_updated_at
BEFORE UPDATE ON public.project_task_field_values
FOR EACH ROW
EXECUTE FUNCTION public.finance_set_updated_at();

-- ---------------------------------------------------------------------------
-- Triggers: two-level hierarchy + project consistency
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_task_two_level_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_row public.tasks%ROWTYPE;
BEGIN
  IF NEW.parent_task_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_task_id = NEW.id THEN
    RAISE EXCEPTION 'Task cannot be its own parent';
  END IF;

  SELECT *
  INTO parent_row
  FROM public.tasks
  WHERE id = NEW.parent_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent task not found';
  END IF;

  IF parent_row.parent_task_id IS NOT NULL THEN
    RAISE EXCEPTION 'Subtasks cannot have subtasks (two-level hierarchy only)';
  END IF;

  IF parent_row.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot attach to a deleted parent task';
  END IF;

  IF NEW.project_id IS NOT NULL
    AND parent_row.project_id IS NOT NULL
    AND NEW.project_id IS DISTINCT FROM parent_row.project_id THEN
    RAISE EXCEPTION 'Subtask project must match parent project';
  END IF;

  IF NEW.project_id IS NULL AND parent_row.project_id IS NOT NULL THEN
    NEW.project_id := parent_row.project_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_enforce_two_level_hierarchy ON public.tasks;

CREATE TRIGGER trg_tasks_enforce_two_level_hierarchy
BEFORE INSERT OR UPDATE OF parent_task_id, project_id ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.enforce_task_two_level_hierarchy();

-- ---------------------------------------------------------------------------
-- Triggers: field value must belong to same project as task
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_task_field_value_project_match()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  task_project_id uuid;
  definition_project_id uuid;
BEGIN
  SELECT t.project_id, d.project_id
  INTO task_project_id, definition_project_id
  FROM public.tasks t
  JOIN public.project_task_field_definitions d ON d.id = NEW.field_definition_id
  WHERE t.id = NEW.task_id;

  IF task_project_id IS NULL OR definition_project_id IS NULL THEN
    RAISE EXCEPTION 'Task or field definition not found';
  END IF;

  IF task_project_id IS DISTINCT FROM definition_project_id THEN
    RAISE EXCEPTION 'Field definition does not belong to task project';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_task_field_values_project_match
  ON public.project_task_field_values;

CREATE TRIGGER trg_project_task_field_values_project_match
BEFORE INSERT OR UPDATE ON public.project_task_field_values
FOR EACH ROW
EXECUTE FUNCTION public.enforce_task_field_value_project_match();

-- ---------------------------------------------------------------------------
-- RLS: project_task_field_definitions (mirror tasks via project_id)
-- ---------------------------------------------------------------------------

ALTER TABLE public.project_task_field_definitions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_task_field_definitions TO authenticated;

DROP POLICY IF EXISTS project_task_field_definitions_select ON public.project_task_field_definitions;
DROP POLICY IF EXISTS project_task_field_definitions_insert ON public.project_task_field_definitions;
DROP POLICY IF EXISTS project_task_field_definitions_update ON public.project_task_field_definitions;
DROP POLICY IF EXISTS project_task_field_definitions_delete ON public.project_task_field_definitions;

CREATE POLICY project_task_field_definitions_select
ON public.project_task_field_definitions
FOR SELECT
TO authenticated
USING (public.can_access_project(project_id));

CREATE POLICY project_task_field_definitions_insert
ON public.project_task_field_definitions
FOR INSERT
TO authenticated
WITH CHECK (public.can_access_project(project_id));

CREATE POLICY project_task_field_definitions_update
ON public.project_task_field_definitions
FOR UPDATE
TO authenticated
USING (public.can_access_project(project_id))
WITH CHECK (public.can_access_project(project_id));

CREATE POLICY project_task_field_definitions_delete
ON public.project_task_field_definitions
FOR DELETE
TO authenticated
USING (public.can_access_project(project_id));

-- ---------------------------------------------------------------------------
-- RLS: project_task_field_values (via task project access)
-- ---------------------------------------------------------------------------

ALTER TABLE public.project_task_field_values ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_task_field_values TO authenticated;

DROP POLICY IF EXISTS project_task_field_values_select ON public.project_task_field_values;
DROP POLICY IF EXISTS project_task_field_values_insert ON public.project_task_field_values;
DROP POLICY IF EXISTS project_task_field_values_update ON public.project_task_field_values;
DROP POLICY IF EXISTS project_task_field_values_delete ON public.project_task_field_values;

CREATE POLICY project_task_field_values_select
ON public.project_task_field_values
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = project_task_field_values.task_id
      AND public.can_access_project(t.project_id)
  )
);

CREATE POLICY project_task_field_values_insert
ON public.project_task_field_values
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = project_task_field_values.task_id
      AND public.can_access_project(t.project_id)
  )
);

CREATE POLICY project_task_field_values_update
ON public.project_task_field_values
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = project_task_field_values.task_id
      AND public.can_access_project(t.project_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = project_task_field_values.task_id
      AND public.can_access_project(t.project_id)
  )
);

CREATE POLICY project_task_field_values_delete
ON public.project_task_field_values
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = project_task_field_values.task_id
      AND public.can_access_project(t.project_id)
  )
);
