-- Strengthen two-level task hierarchy: block reparenting tasks with children, block archived parents.

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

  IF parent_row.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot attach to an archived parent task';
  END IF;

  IF NEW.id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.tasks child
    WHERE child.parent_task_id = NEW.id
      AND child.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot set a parent on a task that already has subtasks';
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
