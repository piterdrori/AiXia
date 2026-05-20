-- Proforma + Invoice Payments Received: schema, recalc, triggers, and RPC updates.

-- ---------------------------------------------------------------------------
-- 1. Schema
-- ---------------------------------------------------------------------------

ALTER TABLE public.finance_payments_received
  ADD COLUMN IF NOT EXISTS proforma_invoice_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'finance_payments_received_proforma_invoice_id_fkey'
  ) THEN
    ALTER TABLE public.finance_payments_received
      ADD CONSTRAINT finance_payments_received_proforma_invoice_id_fkey
      FOREIGN KEY (proforma_invoice_id)
      REFERENCES public.finance_proforma_invoices(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'finance_payments_received_target_document_check'
  ) THEN
    ALTER TABLE public.finance_payments_received
      ADD CONSTRAINT finance_payments_received_target_document_check
      CHECK (
        (
          invoice_id IS NOT NULL
          AND proforma_invoice_id IS NULL
        )
        OR (
          invoice_id IS NULL
          AND proforma_invoice_id IS NOT NULL
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_finance_payments_received_proforma_invoice_id
  ON public.finance_payments_received (proforma_invoice_id)
  WHERE proforma_invoice_id IS NOT NULL;

ALTER TABLE public.finance_proforma_invoices
  ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';

UPDATE public.finance_proforma_invoices
SET
  paid_amount = 0,
  balance_due = COALESCE(total_amount, 0),
  payment_status = 'unpaid';

ALTER TABLE public.finance_proforma_invoices
  DROP CONSTRAINT IF EXISTS finance_proforma_invoices_payment_status_check;

ALTER TABLE public.finance_proforma_invoices
  ADD CONSTRAINT finance_proforma_invoices_payment_status_check
  CHECK (payment_status = ANY (ARRAY['unpaid'::text, 'partial'::text, 'paid'::text]));

ALTER TABLE public.finance_proforma_invoices
  DROP CONSTRAINT IF EXISTS finance_proforma_status_check;

ALTER TABLE public.finance_proforma_invoices
  ADD CONSTRAINT finance_proforma_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'draft'::text,
        'issued'::text,
        'confirmed'::text,
        'partially_paid'::text,
        'paid'::text,
        'converted'::text,
        'archived'::text,
        'canceled'::text,
        'deleted'::text
      ]
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Recalculate proforma totals from confirmed payments
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.finance_recalculate_proforma_invoice_totals(p_proforma_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_total_amount numeric := 0;
  v_paid_amount numeric := 0;
  v_balance_due numeric := 0;
  v_payment_status text := 'unpaid';
  v_status text;
  v_current_status text;
BEGIN
  IF p_proforma_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    COALESCE(total_amount, 0),
    status
  INTO
    v_total_amount,
    v_current_status
  FROM public.finance_proforma_invoices
  WHERE id = p_proforma_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(
    CASE
      WHEN p.status = 'confirmed' THEN COALESCE(p.converted_amount, 0)
      ELSE 0
    END
  ), 0)
  INTO v_paid_amount
  FROM public.finance_payments_received p
  WHERE p.proforma_invoice_id = p_proforma_id;

  v_balance_due := v_total_amount - v_paid_amount;

  v_payment_status :=
    CASE
      WHEN COALESCE(v_paid_amount, 0) <= 0 THEN 'unpaid'
      WHEN v_balance_due <= 0 AND COALESCE(v_total_amount, 0) > 0 THEN 'paid'
      WHEN COALESCE(v_paid_amount, 0) > 0 AND v_balance_due > 0 THEN 'partial'
      ELSE 'unpaid'
    END;

  v_status :=
    CASE
      WHEN v_current_status IN ('draft', 'archived', 'deleted', 'converted', 'canceled') THEN v_current_status
      WHEN v_payment_status = 'paid' THEN 'paid'
      WHEN v_payment_status = 'partial' THEN 'partially_paid'
      ELSE v_current_status
    END;

  UPDATE public.finance_proforma_invoices
  SET
    paid_amount = v_paid_amount,
    balance_due = v_balance_due,
    payment_status = v_payment_status,
    status = v_status,
    updated_at = now()
  WHERE id = p_proforma_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Refresh proforma totals trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.finance_refresh_proforma_from_payments()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF tg_op = 'DELETE' THEN
    IF old.proforma_invoice_id IS NOT NULL THEN
      PERFORM public.finance_recalculate_proforma_invoice_totals(old.proforma_invoice_id);
    END IF;
    RETURN old;
  END IF;

  IF new.proforma_invoice_id IS NOT NULL THEN
    PERFORM public.finance_recalculate_proforma_invoice_totals(new.proforma_invoice_id);
  END IF;

  IF tg_op = 'UPDATE'
     AND old.proforma_invoice_id IS DISTINCT FROM new.proforma_invoice_id
     AND old.proforma_invoice_id IS NOT NULL
  THEN
    PERFORM public.finance_recalculate_proforma_invoice_totals(old.proforma_invoice_id);
  END IF;

  RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_payments_received_refresh_proforma
  ON public.finance_payments_received;

CREATE TRIGGER trg_finance_payments_received_refresh_proforma
  AFTER INSERT OR DELETE OR UPDATE
  ON public.finance_payments_received
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_refresh_proforma_from_payments();

-- ---------------------------------------------------------------------------
-- 4. Validate payment target (invoice OR proforma) and client consistency
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.finance_validate_payment_received()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_invoice record;
  v_proforma record;
BEGIN
  IF new.invoice_id IS NOT NULL AND new.proforma_invoice_id IS NOT NULL THEN
    RAISE EXCEPTION 'Payment cannot link to both invoice and proforma invoice';
  END IF;

  IF new.invoice_id IS NULL AND new.proforma_invoice_id IS NULL THEN
    RAISE EXCEPTION 'Payment must link to an invoice or proforma invoice';
  END IF;

  IF new.invoice_id IS NOT NULL THEN
    SELECT *
    INTO v_invoice
    FROM public.finance_invoices_issued
    WHERE id = new.invoice_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invoice not found for payment';
    END IF;

    IF v_invoice.counterparty_type = 'client' THEN
      IF new.client_id IS NULL THEN
        RAISE EXCEPTION 'Client payment must have client_id';
      END IF;

      IF new.client_id <> v_invoice.client_id THEN
        RAISE EXCEPTION 'Payment client_id must match invoice client_id';
      END IF;
    END IF;

    IF v_invoice.counterparty_type = 'company' THEN
      IF new.client_id IS NOT NULL THEN
        RAISE EXCEPTION 'Intercompany payment must not have client_id';
      END IF;
    END IF;
  END IF;

  IF new.proforma_invoice_id IS NOT NULL THEN
    SELECT *
    INTO v_proforma
    FROM public.finance_proforma_invoices
    WHERE id = new.proforma_invoice_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Proforma invoice not found for payment';
    END IF;

    IF COALESCE(v_proforma.counterparty_type, 'client') = 'client' THEN
      IF new.client_id IS NULL THEN
        RAISE EXCEPTION 'Client payment must have client_id';
      END IF;

      IF new.client_id <> v_proforma.client_id THEN
        RAISE EXCEPTION 'Payment client_id must match proforma client_id';
      END IF;
    END IF;

    IF COALESCE(v_proforma.counterparty_type, 'client') = 'company' THEN
      IF new.client_id IS NOT NULL THEN
        RAISE EXCEPTION 'Intercompany payment must not have client_id';
      END IF;
    END IF;
  END IF;

  RETURN new;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 5. Prevent overpayment (invoice OR proforma branch)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.finance_prevent_payment_received_overpayment()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_document_total numeric := 0;
  v_existing_confirmed numeric := 0;
  v_allowed_amount numeric := 0;
  v_effective_converted_amount numeric := 0;
BEGIN
  IF new.status <> 'confirmed' THEN
    RETURN new;
  END IF;

  IF new.invoice_id IS NOT NULL THEN
    SELECT COALESCE(total_amount, 0)
    INTO v_document_total
    FROM public.finance_invoices_issued
    WHERE id = new.invoice_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Linked invoice not found';
    END IF;

    SELECT COALESCE(SUM(COALESCE(converted_amount, 0)), 0)
    INTO v_existing_confirmed
    FROM public.finance_payments_received
    WHERE invoice_id = new.invoice_id
      AND status = 'confirmed'
      AND id IS DISTINCT FROM new.id;
  ELSIF new.proforma_invoice_id IS NOT NULL THEN
    SELECT COALESCE(total_amount, 0)
    INTO v_document_total
    FROM public.finance_proforma_invoices
    WHERE id = new.proforma_invoice_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Linked proforma invoice not found';
    END IF;

    SELECT COALESCE(SUM(COALESCE(converted_amount, 0)), 0)
    INTO v_existing_confirmed
    FROM public.finance_payments_received
    WHERE proforma_invoice_id = new.proforma_invoice_id
      AND status = 'confirmed'
      AND id IS DISTINCT FROM new.id;
  ELSE
    RETURN new;
  END IF;

  v_allowed_amount := v_document_total - v_existing_confirmed;
  v_effective_converted_amount := COALESCE(new.converted_amount, 0);

  IF v_effective_converted_amount > v_allowed_amount THEN
    RAISE EXCEPTION
      'Payment exceeds document open balance. Allowed max in document currency: %, attempted converted amount: %',
      v_allowed_amount,
      v_effective_converted_amount;
  END IF;

  RETURN new;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 6. Snapshot fill for invoice OR proforma
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.finance_fill_payment_received_snapshot(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_payment public.finance_payments_received%ROWTYPE;
  v_invoice public.finance_invoices_issued%ROWTYPE;
  v_proforma public.finance_proforma_invoices%ROWTYPE;
BEGIN
  SELECT *
  INTO v_payment
  FROM public.finance_payments_received
  WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment received not found';
  END IF;

  IF v_payment.invoice_id IS NOT NULL THEN
    SELECT *
    INTO v_invoice
    FROM public.finance_invoices_issued
    WHERE id = v_payment.invoice_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Linked invoice not found for payment received';
    END IF;
  ELSIF v_payment.proforma_invoice_id IS NOT NULL THEN
    SELECT *
    INTO v_proforma
    FROM public.finance_proforma_invoices
    WHERE id = v_payment.proforma_invoice_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Linked proforma invoice not found for payment received';
    END IF;
  END IF;

  UPDATE public.finance_payments_received
  SET
    company_name_snapshot =
      COALESCE(
        NULLIF(v_payment.company_name_snapshot, ''),
        NULLIF(v_invoice.company_name_snapshot, ''),
        NULLIF(v_proforma.company_name_snapshot, '')
      ),
    company_contact_person_snapshot =
      COALESCE(
        NULLIF(v_payment.company_contact_person_snapshot, ''),
        NULLIF(v_invoice.company_contact_person_snapshot, ''),
        NULLIF(v_proforma.company_contact_person_snapshot, '')
      ),
    company_email_snapshot =
      COALESCE(
        NULLIF(v_payment.company_email_snapshot, ''),
        NULLIF(v_invoice.company_email_snapshot, ''),
        NULLIF(v_proforma.company_email_snapshot, '')
      ),
    company_phone_snapshot =
      COALESCE(
        NULLIF(v_payment.company_phone_snapshot, ''),
        NULLIF(v_invoice.company_phone_snapshot, ''),
        NULLIF(v_proforma.company_phone_snapshot, '')
      ),
    company_address_snapshot =
      COALESCE(
        NULLIF(v_payment.company_address_snapshot, ''),
        NULLIF(v_invoice.company_address_snapshot, ''),
        NULLIF(v_proforma.company_address_snapshot, '')
      ),
    client_name_snapshot =
      COALESCE(
        NULLIF(v_payment.client_name_snapshot, ''),
        NULLIF(v_invoice.counterparty_name_snapshot, ''),
        NULLIF(v_invoice.client_name_snapshot, ''),
        NULLIF(v_proforma.counterparty_name_snapshot, ''),
        NULLIF(v_proforma.client_name_snapshot, '')
      ),
    client_contact_person_snapshot =
      COALESCE(
        NULLIF(v_payment.client_contact_person_snapshot, ''),
        NULLIF(v_invoice.counterparty_contact_person_snapshot, ''),
        NULLIF(v_invoice.client_contact_person_snapshot, ''),
        NULLIF(v_proforma.counterparty_contact_person_snapshot, ''),
        NULLIF(v_proforma.client_contact_person_snapshot, '')
      ),
    client_email_snapshot =
      COALESCE(
        NULLIF(v_payment.client_email_snapshot, ''),
        NULLIF(v_invoice.counterparty_email_snapshot, ''),
        NULLIF(v_invoice.client_email_snapshot, ''),
        NULLIF(v_proforma.counterparty_email_snapshot, ''),
        NULLIF(v_proforma.client_email_snapshot, '')
      ),
    client_phone_snapshot =
      COALESCE(
        NULLIF(v_payment.client_phone_snapshot, ''),
        NULLIF(v_invoice.counterparty_phone_snapshot, ''),
        NULLIF(v_invoice.client_phone_snapshot, ''),
        NULLIF(v_proforma.counterparty_phone_snapshot, ''),
        NULLIF(v_proforma.client_phone_snapshot, '')
      ),
    billing_address_snapshot =
      COALESCE(
        NULLIF(v_payment.billing_address_snapshot, ''),
        NULLIF(v_invoice.billing_address_snapshot, ''),
        NULLIF(v_proforma.billing_address_snapshot, '')
      ),
    updated_at = now()
  WHERE id = p_payment_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.finance_fill_payment_received_snapshot_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF tg_op = 'INSERT' THEN
    PERFORM public.finance_fill_payment_received_snapshot(new.id);
    RETURN new;
  END IF;

  IF tg_op = 'UPDATE' THEN
    IF new.invoice_id IS DISTINCT FROM old.invoice_id
       OR new.proforma_invoice_id IS DISTINCT FROM old.proforma_invoice_id
       OR new.client_id IS DISTINCT FROM old.client_id
       OR new.status IS DISTINCT FROM old.status
    THEN
      PERFORM public.finance_fill_payment_received_snapshot(new.id);
    END IF;
    RETURN new;
  END IF;

  RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_fill_payment_received_snapshot
  ON public.finance_payments_received;

CREATE TRIGGER trg_finance_fill_payment_received_snapshot
  AFTER INSERT OR UPDATE OF invoice_id, proforma_invoice_id, client_id
  ON public.finance_payments_received
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_fill_payment_received_snapshot_trigger();

-- ---------------------------------------------------------------------------
-- 7. Create payment received draft (invoice OR proforma)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.finance_create_payment_received_draft(
  uuid,
  uuid,
  date,
  numeric,
  text,
  text,
  numeric,
  numeric,
  text,
  date,
  text,
  uuid,
  text,
  uuid
);

CREATE OR REPLACE FUNCTION public.finance_create_payment_received_draft(
  p_invoice_id uuid,
  p_client_id uuid,
  p_payment_date date,
  p_amount numeric,
  p_payment_currency_code text,
  p_invoice_currency_code text,
  p_exchange_rate numeric,
  p_converted_amount numeric,
  p_exchange_rate_source text,
  p_exchange_rate_date date,
  p_reference_number text,
  p_payment_method_id uuid,
  p_notes text,
  p_created_by uuid,
  p_proforma_invoice_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  v_payment_id uuid;
  v_invoice public.finance_invoices_issued%ROWTYPE;
  v_proforma public.finance_proforma_invoices%ROWTYPE;
BEGIN
  IF (p_invoice_id IS NULL) = (p_proforma_invoice_id IS NULL) THEN
    RAISE EXCEPTION 'Exactly one of invoice or proforma invoice is required';
  END IF;

  IF p_proforma_invoice_id IS NOT NULL THEN
    SELECT *
    INTO v_proforma
    FROM public.finance_proforma_invoices
    WHERE id = p_proforma_invoice_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Proforma invoice not found';
    END IF;

    IF v_proforma.status NOT IN ('issued', 'confirmed', 'partially_paid') THEN
      RAISE EXCEPTION 'Only issued or confirmed proforma invoices can receive payments';
    END IF;

    IF COALESCE(v_proforma.balance_due, 0) <= 0 THEN
      RAISE EXCEPTION 'Proforma invoice has no balance due';
    END IF;

    INSERT INTO public.finance_payments_received (
      invoice_id,
      proforma_invoice_id,
      client_id,
      counterparty_type,
      counterparty_company_id,
      is_intercompany,
      payment_date,
      amount,
      payment_currency_code,
      invoice_currency_code,
      exchange_rate,
      converted_amount,
      exchange_rate_source,
      exchange_rate_date,
      reference_number,
      payment_method_id,
      notes,
      status,
      metadata,
      created_by,
      updated_by
    )
    VALUES (
      NULL,
      p_proforma_invoice_id,
      CASE
        WHEN COALESCE(v_proforma.counterparty_type, 'client') = 'client'
          THEN COALESCE(p_client_id, v_proforma.client_id)
        ELSE NULL
      END,
      COALESCE(v_proforma.counterparty_type, 'client'),
      CASE
        WHEN COALESCE(v_proforma.counterparty_type, 'client') = 'company'
          THEN v_proforma.counterparty_company_id
        ELSE NULL
      END,
      (COALESCE(v_proforma.counterparty_type, 'client') = 'company'),
      p_payment_date,
      p_amount,
      p_payment_currency_code,
      p_invoice_currency_code,
      p_exchange_rate,
      p_converted_amount,
      p_exchange_rate_source,
      p_exchange_rate_date,
      p_reference_number,
      p_payment_method_id,
      p_notes,
      'draft',
      jsonb_build_object(
        'creation_mode', 'manual_draft',
        'source_proforma_invoice_id', p_proforma_invoice_id
      ),
      p_created_by,
      p_created_by
    )
    RETURNING id INTO v_payment_id;
  ELSE
    SELECT *
    INTO v_invoice
    FROM public.finance_invoices_issued
    WHERE id = p_invoice_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invoice not found';
    END IF;

    IF v_invoice.status NOT IN ('issued', 'partially_paid', 'paid') THEN
      RAISE EXCEPTION 'Only issued invoices can receive payments';
    END IF;

    INSERT INTO public.finance_payments_received (
      invoice_id,
      proforma_invoice_id,
      client_id,
      counterparty_type,
      counterparty_company_id,
      is_intercompany,
      payment_date,
      amount,
      payment_currency_code,
      invoice_currency_code,
      exchange_rate,
      converted_amount,
      exchange_rate_source,
      exchange_rate_date,
      reference_number,
      payment_method_id,
      notes,
      status,
      metadata,
      created_by,
      updated_by
    )
    VALUES (
      p_invoice_id,
      NULL,
      CASE
        WHEN v_invoice.counterparty_type = 'client'
          THEN COALESCE(p_client_id, v_invoice.client_id)
        ELSE NULL
      END,
      v_invoice.counterparty_type,
      CASE
        WHEN v_invoice.counterparty_type = 'company'
          THEN v_invoice.counterparty_company_id
        ELSE NULL
      END,
      (v_invoice.counterparty_type = 'company'),
      p_payment_date,
      p_amount,
      p_payment_currency_code,
      p_invoice_currency_code,
      p_exchange_rate,
      p_converted_amount,
      p_exchange_rate_source,
      p_exchange_rate_date,
      p_reference_number,
      p_payment_method_id,
      p_notes,
      'draft',
      jsonb_build_object(
        'creation_mode', 'manual_draft',
        'source_invoice_id', p_invoice_id
      ),
      p_created_by,
      p_created_by
    )
    RETURNING id INTO v_payment_id;
  END IF;

  RETURN v_payment_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 8. Update payment received (invoice OR proforma)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.finance_update_payment_received(
  uuid,
  uuid,
  uuid,
  date,
  numeric,
  text,
  text,
  numeric,
  numeric,
  text,
  date,
  text,
  uuid,
  text,
  uuid
);

CREATE OR REPLACE FUNCTION public.finance_update_payment_received(
  p_payment_id uuid,
  p_invoice_id uuid,
  p_client_id uuid,
  p_payment_date date,
  p_amount numeric,
  p_payment_currency_code text,
  p_invoice_currency_code text,
  p_exchange_rate numeric,
  p_converted_amount numeric,
  p_exchange_rate_source text,
  p_exchange_rate_date date,
  p_reference_number text,
  p_payment_method_id uuid,
  p_notes text,
  p_updated_by uuid,
  p_proforma_invoice_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_invoice public.finance_invoices_issued%ROWTYPE;
  v_proforma public.finance_proforma_invoices%ROWTYPE;
BEGIN
  IF p_payment_id IS NULL THEN
    RAISE EXCEPTION 'Payment id is required';
  END IF;

  IF (p_invoice_id IS NULL) = (p_proforma_invoice_id IS NULL) THEN
    RAISE EXCEPTION 'Exactly one of invoice or proforma invoice is required';
  END IF;

  IF p_proforma_invoice_id IS NOT NULL THEN
    SELECT *
    INTO v_proforma
    FROM public.finance_proforma_invoices
    WHERE id = p_proforma_invoice_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Proforma invoice not found';
    END IF;

    UPDATE public.finance_payments_received
    SET
      invoice_id = NULL,
      proforma_invoice_id = p_proforma_invoice_id,
      client_id = CASE
        WHEN COALESCE(v_proforma.counterparty_type, 'client') = 'client'
          THEN COALESCE(p_client_id, v_proforma.client_id)
        ELSE NULL
      END,
      counterparty_type = COALESCE(v_proforma.counterparty_type, 'client'),
      counterparty_company_id = CASE
        WHEN COALESCE(v_proforma.counterparty_type, 'client') = 'company'
          THEN v_proforma.counterparty_company_id
        ELSE NULL
      END,
      is_intercompany = (COALESCE(v_proforma.counterparty_type, 'client') = 'company'),
      payment_date = p_payment_date,
      amount = p_amount,
      payment_currency_code = p_payment_currency_code,
      invoice_currency_code = p_invoice_currency_code,
      exchange_rate = p_exchange_rate,
      converted_amount = p_converted_amount,
      exchange_rate_source = p_exchange_rate_source,
      exchange_rate_date = p_exchange_rate_date,
      reference_number = p_reference_number,
      payment_method_id = p_payment_method_id,
      notes = p_notes,
      updated_by = p_updated_by,
      updated_at = now()
    WHERE id = p_payment_id;
  ELSE
    SELECT *
    INTO v_invoice
    FROM public.finance_invoices_issued
    WHERE id = p_invoice_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invoice not found';
    END IF;

    UPDATE public.finance_payments_received
    SET
      invoice_id = p_invoice_id,
      proforma_invoice_id = NULL,
      client_id = CASE
        WHEN v_invoice.counterparty_type = 'client'
          THEN COALESCE(p_client_id, v_invoice.client_id)
        ELSE NULL
      END,
      counterparty_type = v_invoice.counterparty_type,
      counterparty_company_id = CASE
        WHEN v_invoice.counterparty_type = 'company'
          THEN v_invoice.counterparty_company_id
        ELSE NULL
      END,
      is_intercompany = (v_invoice.counterparty_type = 'company'),
      payment_date = p_payment_date,
      amount = p_amount,
      payment_currency_code = p_payment_currency_code,
      invoice_currency_code = p_invoice_currency_code,
      exchange_rate = p_exchange_rate,
      converted_amount = p_converted_amount,
      exchange_rate_source = p_exchange_rate_source,
      exchange_rate_date = p_exchange_rate_date,
      reference_number = p_reference_number,
      payment_method_id = p_payment_method_id,
      notes = p_notes,
      updated_by = p_updated_by,
      updated_at = now()
    WHERE id = p_payment_id;
  END IF;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 9. Convert proforma to invoice: transfer confirmed payments
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.finance_convert_proforma_to_invoice(p_proforma_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  v_proforma record;
  v_invoice_id uuid;
  v_company_id uuid;
  v_bank_id uuid;
  v_payment_terms_id uuid;
  v_shipping_term_id uuid;
BEGIN
  SELECT *
  INTO v_proforma
  FROM public.finance_proforma_invoices
  WHERE id = p_proforma_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proforma not found';
  END IF;

  IF v_proforma.status = 'converted' THEN
    RAISE EXCEPTION 'Proforma already converted';
  END IF;

  v_company_id := (v_proforma.metadata ->> 'issuing_company_id')::uuid;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Proforma missing issuing company';
  END IF;

  SELECT id
  INTO v_bank_id
  FROM finance_bank_accounts
  WHERE company_id = v_company_id
    AND is_default = true
  LIMIT 1;

  SELECT id
  INTO v_payment_terms_id
  FROM finance_payment_terms
  WHERE is_default = true
  LIMIT 1;

  SELECT id
  INTO v_shipping_term_id
  FROM finance_shipping_terms
  WHERE is_default = true
  LIMIT 1;

  INSERT INTO public.finance_invoices_issued (
    id,
    client_id,
    counterparty_type,
    company_id,
    issue_date,
    due_date,
    status,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    currency_id,
    exchange_rate,
    project_id,
    task_id,
    notes,
    metadata,
    proforma_invoice_id,
    bank_account_id,
    payment_terms_id,
    shipping_term_id,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_proforma.client_id,
    'client',
    v_company_id,
    v_proforma.issue_date,
    v_proforma.issue_date + interval '30 days',
    'draft',
    v_proforma.subtotal,
    v_proforma.tax_amount,
    v_proforma.discount_amount,
    v_proforma.total_amount,
    v_proforma.currency_id,
    v_proforma.exchange_rate,
    v_proforma.project_id,
    v_proforma.task_id,
    v_proforma.notes,
    v_proforma.metadata,
    v_proforma.id,
    v_bank_id,
    v_payment_terms_id,
    v_shipping_term_id,
    now(),
    now()
  )
  RETURNING id INTO v_invoice_id;

  INSERT INTO public.finance_invoice_issued_line_items (
    id,
    invoice_id,
    description,
    quantity,
    unit_price,
    line_total,
    sort_order,
    revenue_category_id,
    project_id,
    task_id,
    item_id,
    unit_of_measure_id,
    tax_code_id,
    discount,
    status,
    reference_number,
    posted_to_ledger,
    notes,
    metadata,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    v_invoice_id,
    description,
    quantity,
    unit_price,
    line_total,
    sort_order,
    revenue_category_id,
    project_id,
    task_id,
    item_id,
    unit_of_measure_id,
    tax_code_id,
    discount,
    status,
    reference_number,
    false,
    notes,
    metadata,
    now(),
    now()
  FROM public.finance_proforma_invoice_line_items
  WHERE proforma_invoice_id = p_proforma_id;

  UPDATE public.finance_payments_received
  SET
    invoice_id = v_invoice_id,
    proforma_invoice_id = NULL,
    updated_at = now()
  WHERE proforma_invoice_id = p_proforma_id
    AND status = 'confirmed';

  UPDATE public.finance_proforma_invoices
  SET
    status = 'converted',
    updated_at = now()
  WHERE id = p_proforma_id;

  PERFORM public.finance_recalculate_proforma_invoice_totals(p_proforma_id);
  PERFORM public.finance_recalculate_invoice_issued_totals(v_invoice_id);

  RETURN v_invoice_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 10. Hard delete proforma: block if confirmed payments exist
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.finance_hard_delete_proforma_invoice(p_proforma_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row record;
BEGIN
  SELECT *
  INTO v_row
  FROM public.finance_proforma_invoices
  WHERE id = p_proforma_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proforma invoice not found';
  END IF;

  IF v_row.status <> 'deleted' THEN
    RAISE EXCEPTION 'Only deleted proforma invoices can be hard deleted';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.finance_invoices_issued i
    WHERE i.proforma_invoice_id = p_proforma_id
  ) THEN
    RAISE EXCEPTION 'Converted or linked proforma invoices cannot be hard deleted';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.finance_payments_received p
    WHERE p.proforma_invoice_id = p_proforma_id
      AND p.status = 'confirmed'
  ) THEN
    RAISE EXCEPTION 'Proforma invoice with confirmed payments cannot be hard deleted';
  END IF;

  DELETE FROM public.finance_proforma_invoice_line_items
  WHERE proforma_invoice_id = p_proforma_id;

  DELETE FROM public.finance_proforma_invoices
  WHERE id = p_proforma_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.finance_recalculate_proforma_invoice_totals(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finance_create_payment_received_draft(
  uuid,
  uuid,
  date,
  numeric,
  text,
  text,
  numeric,
  numeric,
  text,
  date,
  text,
  uuid,
  text,
  uuid,
  uuid
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finance_update_payment_received(
  uuid,
  uuid,
  uuid,
  date,
  numeric,
  text,
  text,
  numeric,
  numeric,
  text,
  date,
  text,
  uuid,
  text,
  uuid,
  uuid
) TO authenticated;
