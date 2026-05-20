with proof_flags as (
  select
    e.id,
    case
      when lower(coalesce(e.documentation_status, '')) in ('uploaded', 'linked', 'files_and_links', 'verified')
        then lower(coalesce(e.documentation_status, ''))
      when exists (
        select 1
        from public.finance_record_attachments a
        where a.entity_type = 'finance_expense'
          and a.entity_id = e.id
      ) and nullif(trim(coalesce(e.metadata ->> 'documentation_link', '')), '') is not null
        then 'files_and_links'
      when exists (
        select 1
        from public.finance_record_attachments a
        where a.entity_type = 'finance_expense'
          and a.entity_id = e.id
      )
        then 'uploaded'
      when nullif(trim(coalesce(e.metadata ->> 'documentation_link', '')), '') is not null
        then 'linked'
      else null
    end as normalized_documentation_status
  from public.finance_expenses e
  where e.request_status = 'approved_to_spend'
    and coalesce(e.status, '') not in ('archived', 'deleted', 'cancelled')
    and coalesce(e.request_status, '') not in ('archived', 'deleted', 'cancelled')
),
eligible_rows as (
  select id, normalized_documentation_status
  from proof_flags
  where normalized_documentation_status is not null
)
update public.finance_expenses e
set
  request_status = 'documentation_submitted',
  documentation_status = eligible_rows.normalized_documentation_status,
  documentation_submitted_at = coalesce(e.documentation_submitted_at, now()),
  updated_at = now()
from eligible_rows
where e.id = eligible_rows.id
  and e.request_status = 'approved_to_spend';
