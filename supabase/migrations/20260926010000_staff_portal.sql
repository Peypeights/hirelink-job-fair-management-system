-- Run once AFTER 20260926000000_company_portal.sql.
begin;
create function public.is_active_reviewer()
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.user_profiles where user_id=auth.uid() and is_active and role in ('staff','admin'));
$$;
revoke all on function public.is_active_reviewer() from public;
grant execute on function public.is_active_reviewer() to authenticated;
create policy staff_companies_read on public.company_profiles for select to authenticated using(public.is_active_reviewer());
create policy staff_jobs_read on public.job_postings for select to authenticated using(public.is_active_reviewer());
create policy staff_categories_read on public.job_categories for select to authenticated using(public.is_active_reviewer());
create policy staff_applications_read on public.applications for select to authenticated using(public.is_active_reviewer());
create policy staff_interviews_read on public.interviews for select to authenticated using(public.is_active_reviewer());
create policy staff_related_people_read on public.user_profiles for select to authenticated using(
 public.is_active_reviewer() and (role in ('staff','admin')
 or exists(select 1 from public.applications a where a.applicant_id=user_profiles.user_id)
 or exists(select 1 from public.company_profiles c where c.user_id=user_profiles.user_id))
);

-- Replace the company-phase guard. A transaction lock serializes every schedule
-- mutation before checking overlaps, including writes from Supabase Table Editor.
-- Functions are VOLATILE (the default), so statements after the lock see current
-- committed rows at Postgres's default READ COMMITTED isolation level.
create or replace function public.company_interview_guard()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_app public.applications%rowtype; v_company uuid;
begin
 perform pg_advisory_xact_lock(7262601);
 if tg_op='UPDATE' and new.application_id is distinct from old.application_id then
  raise exception 'An interview cannot be moved to another application.' using errcode='22023';
 end if;
 select * into v_app from public.applications where application_id=new.application_id for update;
 if not found then raise exception 'Application not found.' using errcode='P0002'; end if;
 new.interview_location := trim(regexp_replace(new.interview_location,'[[:space:]]+',' ','g'));
 if new.interview_status='Scheduled' then
  if v_app.application_status<>'Shortlisted' then raise exception 'Only shortlisted applications can be scheduled.' using errcode='P0001'; end if;
  select company_id into v_company from public.job_postings where job_id=v_app.job_id;
  if not exists(select 1 from public.user_profiles where user_id=new.staff_id and is_active and role in ('staff','admin')) then
   raise exception 'Choose an active staff member or administrator.' using errcode='22023';
  end if;
  if not exists(select 1 from public.user_profiles where user_id=v_app.applicant_id and is_active and role='applicant')
   or not exists(select 1 from public.user_profiles where user_id=v_company and is_active and role='company') then
   raise exception 'The applicant and company accounts must be active.' using errcode='P0001';
  end if;
  if not isfinite(new.starts_at) or not isfinite(new.ends_at) or new.ends_at<=new.starts_at then raise exception 'End time must be later than start time.' using errcode='22023'; end if;
  if exists(
   select 1 from public.interviews i join public.applications a using(application_id) join public.job_postings j using(job_id)
   where i.interview_status='Scheduled' and i.interview_id<>new.interview_id
   and i.starts_at<new.ends_at and new.starts_at<i.ends_at
   and (a.applicant_id=v_app.applicant_id or j.company_id=v_company or i.staff_id=new.staff_id
    or lower(trim(regexp_replace(i.interview_location,'[[:space:]]+',' ','g')))=lower(new.interview_location))
  ) then raise exception 'This time overlaps another interview for the applicant, company, staff member, or location.' using errcode='23P01'; end if;
 end if;
 return new;
end;
$$;
revoke all on function public.company_interview_guard() from public;

-- The company function and this function both lock the application before a
-- hiring decision. Scheduling locks that same row before checking its status.
create function public.staff_portal_write(p_action text,p_id uuid,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
 v_company public.company_profiles%rowtype; v_job public.job_postings%rowtype;
 v_app public.applications%rowtype; v_interview public.interviews%rowtype;
 v_allowed text[]; v_next text; v_company_id uuid; v_exists boolean;
begin
 if p_action in ('schedule','interview_status') then perform pg_advisory_xact_lock(7262601); end if;
 perform 1 from public.user_profiles where user_id=auth.uid() and is_active and role in ('staff','admin') for share;
 if not found then raise exception 'Active staff or administrator access required.' using errcode='42501'; end if;
 if p_id is null or p_data is null or jsonb_typeof(p_data)<>'object' then raise exception 'Invalid request.' using errcode='22023'; end if;
 v_allowed:=case p_action
 when 'review_company' then array['status','expected_updated_at']
 when 'review_job' then array['status','expected_updated_at']
 when 'application_status' then array['status','expected_status','company_decision_confirmed']
 when 'schedule' then array['staff_id','starts_at','ends_at','interview_location','expected_interview']
 when 'interview_status' then array['status','expected_interview'] end;
 if v_allowed is null or exists(select 1 from jsonb_object_keys(p_data) k where not(k=any(v_allowed))) then
 raise exception 'Unsupported action or field.' using errcode='22023'; end if;
 v_next:=p_data->>'status';
 if p_action='review_company' then
  select * into v_company from public.company_profiles where user_id=p_id for update;
  if not found then raise exception 'Company not found.' using errcode='P0002'; end if;
  if v_company.review_status<>'pending' or v_company.updated_at is distinct from (p_data->>'expected_updated_at')::timestamptz then
   raise exception 'This company changed. Refresh before reviewing it.' using errcode='P0001'; end if;
  if coalesce(v_next,'') not in ('approved','rejected') then raise exception 'Invalid review status.' using errcode='22023'; end if;
  if v_next='approved' and not exists(select 1 from public.user_profiles where user_id=p_id and role='company' and is_active) then
   raise exception 'The company account must be active.' using errcode='P0001'; end if;
  update public.company_profiles set review_status=v_next,updated_at=now() where user_id=p_id returning * into v_company;
  return to_jsonb(v_company);
 elsif p_action='review_job' then
  select company_id into v_company_id from public.job_postings where job_id=p_id;
  if not found then raise exception 'Job not found.' using errcode='P0002'; end if;
  -- Match the company writer's company-before-job lock order.
  select * into v_company from public.company_profiles where user_id=v_company_id for update;
  select * into v_job from public.job_postings where job_id=p_id for update;
  if v_job.status<>'Pending' or v_job.updated_at is distinct from (p_data->>'expected_updated_at')::timestamptz then
   raise exception 'This job changed. Refresh before reviewing it.' using errcode='P0001'; end if;
  if coalesce(v_next,'') not in ('Approved','Rejected') then raise exception 'Invalid review status.' using errcode='22023'; end if;
  if v_next='Approved' and (v_company.review_status<>'approved' or not exists(select 1 from public.user_profiles where user_id=v_company_id and role='company' and is_active)) then
   raise exception 'Approve the active company before approving its jobs.' using errcode='P0001'; end if;
  update public.job_postings set status=v_next,updated_at=now() where job_id=p_id returning * into v_job;
  return to_jsonb(v_job);
 elsif p_action='application_status' then
  select * into v_app from public.applications where application_id=p_id for update;
  if not found then raise exception 'Application not found.' using errcode='P0002'; end if;
  if v_app.application_status is distinct from p_data->>'expected_status' then raise exception 'This application changed. Refresh and try again.' using errcode='P0001'; end if;
  if not coalesce((v_app.application_status='Submitted' and v_next='Under Review')
   or (v_app.application_status='Under Review' and v_next in ('Shortlisted','Rejected'))
   or (v_app.application_status='Shortlisted' and v_next in ('Hired','Rejected')),false) then
   raise exception 'This application status change is not allowed.' using errcode='P0001'; end if;
  if v_next in ('Hired','Rejected') and p_data->'company_decision_confirmed' is distinct from 'true'::jsonb then
   raise exception 'Confirm that you are recording the company decision.' using errcode='22023'; end if;
  if exists(select 1 from public.interviews where application_id=p_id and interview_status='Scheduled') then
   raise exception 'Complete or cancel the scheduled interview before a final decision.' using errcode='P0001'; end if;
  update public.applications set application_status=v_next where application_id=p_id returning * into v_app;
  return to_jsonb(v_app);
 elsif p_action='schedule' then
  -- p_id is the application ID. One interview row per application, including reschedules.
  select * into v_app from public.applications where application_id=p_id for update;
  if not found then raise exception 'Application not found.' using errcode='P0002'; end if;
  if v_app.application_status<>'Shortlisted' then raise exception 'Only shortlisted applications can be scheduled.' using errcode='P0001'; end if;
  select * into v_interview from public.interviews where application_id=p_id for update;
  v_exists:=found;
  if v_exists and v_interview.interview_status='Completed' then raise exception 'A completed interview cannot be rescheduled.' using errcode='P0001'; end if;
  if (case when v_exists then to_jsonb(v_interview) else 'null'::jsonb end) is distinct from p_data->'expected_interview' then
   raise exception 'This interview changed. Refresh before saving.' using errcode='P0001'; end if;
  -- Synchronize assignment with account deactivation and role changes.
  perform 1 from public.user_profiles where user_id=(p_data->>'staff_id')::uuid and is_active and role in ('staff','admin') for share;
  if not found then raise exception 'Choose an active staff member or administrator.' using errcode='22023'; end if;
  if v_exists then
   update public.interviews set staff_id=(p_data->>'staff_id')::uuid,starts_at=(p_data->>'starts_at')::timestamptz,
    ends_at=(p_data->>'ends_at')::timestamptz,interview_location=p_data->>'interview_location',interview_status='Scheduled'
    where application_id=p_id returning * into v_interview;
  else
   insert into public.interviews(application_id,staff_id,starts_at,ends_at,interview_location)
    values(p_id,(p_data->>'staff_id')::uuid,(p_data->>'starts_at')::timestamptz,(p_data->>'ends_at')::timestamptz,p_data->>'interview_location') returning * into v_interview;
  end if;
  return to_jsonb(v_interview);
 elsif p_action='interview_status' then
  select application_id into v_company_id from public.interviews where interview_id=p_id;
  if not found then raise exception 'Interview not found.' using errcode='P0002'; end if;
  perform 1 from public.applications where application_id=v_company_id for update;
  select * into v_interview from public.interviews where interview_id=p_id for update;
  if to_jsonb(v_interview) is distinct from p_data->'expected_interview' or v_interview.interview_status<>'Scheduled' then
   raise exception 'This interview changed. Refresh and try again.' using errcode='P0001'; end if;
  if coalesce(v_next,'') not in ('Completed','Cancelled') then raise exception 'Invalid interview status.' using errcode='22023'; end if;
  update public.interviews set interview_status=v_next where interview_id=p_id returning * into v_interview;
  return to_jsonb(v_interview);
 end if;
end;
$$;
revoke all on function public.staff_portal_write(text,uuid,jsonb) from public;
grant execute on function public.staff_portal_write(text,uuid,jsonb) to authenticated;
commit;
