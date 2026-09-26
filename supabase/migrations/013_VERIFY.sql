-- READ ONLY VERIFY
select routine_name,security_type
from information_schema.routines
where routine_schema='public' and routine_name='admin_update_reopened_submission';
