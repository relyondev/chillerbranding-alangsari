-- READ ONLY VERIFY
select routine_name, security_type
from information_schema.routines
where routine_schema='public'
  and routine_name in (
    'normalize_business_text',
    'normalize_phone',
    'assert_no_duplicate_submission',
    'create_submission_draft',
    'submit_submission'
  )
order by routine_name;

select public.normalize_business_text(' Warung   Maju!! ') as normalized_text;
select public.normalize_phone('+62 812-3456-7890') as normalized_phone;
