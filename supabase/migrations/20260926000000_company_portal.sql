-- Run AFTER the existing company_profiles and admin_dashboard migrations.
-- Uses company_profiles.user_id as the company FK; no existing columns are renamed.
begin;
create table public.job_categories (
 category_id uuid primary key default gen_random_uuid(),
 category_name text not null check (length(trim(category_name)) between 2 and 100),
 description text
);
create unique index job_category_name_unique on public.job_categories (lower(trim(category_name)));
insert into public.job_categories(category_name) values
 ('Information Technology'), ('Business and Administration'), ('Engineering'),
 ('Sales and Marketing'), ('Hospitality'), ('Education'), ('Healthcare'), ('Other');
create table public.job_postings (
 job_id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.company_profiles(user_id),
 category_id uuid not null references public.job_categories(category_id),
 job_title text not null check(length(trim(job_title)) between 2 and 100),
 job_description text not null check(length(trim(job_description)) between 1 and 2000),
 requirements text not null check(length(trim(requirements)) between 1 and 2000),
 location text not null check(length(trim(location)) between 1 and 500),
 employment_type text not null check(employment_type in ('Full-time','Part-time','Contract','Internship')),
 status text not null default 'Pending' check(status in ('Pending','Approved','Rejected','Closed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index jobs_company_idx on public.job_postings(company_id);
create table public.applications (
 application_id uuid primary key default gen_random_uuid(),
 job_id uuid not null references public.job_postings(job_id),
 applicant_id uuid not null references public.user_profiles(user_id),
 application_note text not null check(length(trim(application_note)) between 1 and 2000),
 application_status text not null default 'Submitted' check(application_status in ('Submitted','Under Review','Shortlisted','Hired','Rejected')),
 application_date timestamptz not null default now(),
 unique(job_id, applicant_id)
);
create index applications_applicant_idx on public.applications(applicant_id);
create table public.interviews (
 interview_id uuid primary key default gen_random_uuid(),
 application_id uuid not null unique references public.applications(application_id),
 staff_id uuid not null references public.user_profiles(user_id),
 starts_at timestamptz not null, ends_at timestamptz not null,
 interview_location text not null check(length(trim(interview_location)) between 1 and 500),
 interview_status text not null default 'Scheduled' check(interview_status in ('Scheduled','Completed','Cancelled')),
 check(ends_at > starts_at)
);

create function public.company_portal_active()
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
 select exists(select 1 from public.user_profiles where user_id=auth.uid() and role='company' and is_active);
$$;
revoke all on function public.company_portal_active() from public;
grant execute on function public.company_portal_active() to authenticated;

alter table public.job_categories enable row level security;
alter table public.job_postings enable row level security;
alter table public.applications enable row level security;
alter table public.interviews enable row level security;
revoke all on public.job_categories, public.job_postings, public.applications, public.interviews from anon, authenticated;
grant select on public.job_categories, public.job_postings, public.applications, public.interviews to authenticated;
create policy company_categories_read on public.job_categories for select to authenticated using(public.company_portal_active());
create policy company_jobs_read on public.job_postings for select to authenticated using(company_id=auth.uid() and public.company_portal_active());
create policy company_applications_read on public.applications for select to authenticated using(public.company_portal_active() and exists(select 1 from public.job_postings j where j.job_id=applications.job_id and j.company_id=auth.uid()));
create policy company_interviews_read on public.interviews for select to authenticated using(public.company_portal_active() and exists(select 1 from public.applications a join public.job_postings j using(job_id) where a.application_id=interviews.application_id and j.company_id=auth.uid()));
-- Contact details are returned only by the owner-scoped RPC below, not by broad profile SELECT policies.
create function public.company_application_contacts(p_ids uuid[])
returns table(user_id uuid, first_name text, last_name text, email text, phone text)
language sql stable security definer set search_path = pg_catalog, public as $$
 select distinct u.user_id,u.first_name,u.last_name,u.email,u.phone
 from public.user_profiles u join public.applications a on a.applicant_id=u.user_id
 join public.job_postings j on j.job_id=a.job_id
 where public.company_portal_active() and j.company_id=auth.uid() and a.application_id=any(p_ids);
$$;
revoke all on function public.company_application_contacts(uuid[]) from public;
grant execute on function public.company_application_contacts(uuid[]) to authenticated;

-- All company writes go through this function; no direct table UPDATE grants.
-- Ownership, role, account access and workflow checks also protect direct RPC calls.
create function public.company_portal_write(p_action text, p_id uuid default null, p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
 v_company public.company_profiles%rowtype;
 v_job public.job_postings%rowtype;
 v_application public.applications%rowtype;
 v_allowed text[];
begin
 -- Lock account and company so deactivation/review cannot race this write.
 perform 1 from public.user_profiles where user_id=auth.uid() and role='company' and is_active for update;
 if not found then raise exception 'Active company account required.' using errcode='42501'; end if;
 select * into v_company from public.company_profiles where user_id=auth.uid() for update;
 if not found then raise exception 'Company profile not found.' using errcode='P0002'; end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' then raise exception 'Invalid request.' using errcode='22023'; end if;
 v_allowed := case p_action
 when 'profile' then array['company_name','description','industry','address','contact_email','contact_phone','website']
 when 'create_job' then array['job_title','job_description','requirements','location','employment_type','category_id']
 when 'edit_job' then array['job_title','job_description','requirements','location','employment_type','category_id']
 when 'close_job' then array[]::text[]
 when 'decision' then array['application_status'] end;
 if v_allowed is null or exists(select 1 from jsonb_object_keys(p_data) k where not(k=any(v_allowed))) then
 raise exception 'Unsupported action or field.' using errcode='22023'; end if;
 if p_action='profile' then
 update public.company_profiles set company_name=trim(p_data->>'company_name'), description=trim(p_data->>'description'),
 industry=trim(p_data->>'industry'), address=trim(p_data->>'address'), contact_email=trim(p_data->>'contact_email'),
 contact_phone=trim(p_data->>'contact_phone'), website=nullif(trim(p_data->>'website'),''), review_status='pending', updated_at=now()
 where user_id=auth.uid() returning * into v_company;
 return to_jsonb(v_company);
 elsif p_action in ('create_job','edit_job','close_job') then
 if p_action<>'close_job' and v_company.review_status<>'approved' then
 raise exception 'Your company must be approved before submitting job content.' using errcode='42501'; end if;
 if p_action<>'create_job' then
 select * into v_job from public.job_postings where job_id=p_id and company_id=auth.uid() for update;
 if not found then raise exception 'Job not found.' using errcode='P0002'; end if;
 end if;
 if p_action='close_job' then
 update public.job_postings set status='Closed',updated_at=now() where job_id=p_id returning * into v_job;
 elsif p_action='create_job' then
 insert into public.job_postings(company_id,category_id,job_title,job_description,requirements,location,employment_type)
 values(auth.uid(),(p_data->>'category_id')::uuid,trim(p_data->>'job_title'),trim(p_data->>'job_description'),trim(p_data->>'requirements'),trim(p_data->>'location'),p_data->>'employment_type') returning * into v_job;
 else
 update public.job_postings set category_id=(p_data->>'category_id')::uuid,job_title=trim(p_data->>'job_title'),job_description=trim(p_data->>'job_description'),requirements=trim(p_data->>'requirements'),location=trim(p_data->>'location'),employment_type=p_data->>'employment_type',status='Pending',updated_at=now()
 where job_id=p_id returning * into v_job;
 end if;
 return to_jsonb(v_job);
 elsif p_action='decision' then
 select a.* into v_application from public.applications a join public.job_postings j using(job_id)
 where a.application_id=p_id and j.company_id=auth.uid() for update of a;
 if not found then raise exception 'Application not found.' using errcode='P0002'; end if;
 if v_application.application_status<>'Shortlisted' or coalesce(p_data->>'application_status','') not in ('Hired','Rejected') then
 raise exception 'Only shortlisted applicants can receive a final hiring decision.' using errcode='P0001'; end if;
 if exists(select 1 from public.interviews where application_id=p_id and interview_status='Scheduled') then
 raise exception 'Staff must complete or cancel the scheduled interview first.' using errcode='P0001'; end if;
 update public.applications set application_status=p_data->>'application_status' where application_id=p_id returning * into v_application;
 return to_jsonb(v_application);
 end if;
end;
$$;
revoke all on function public.company_portal_write(text,uuid,jsonb) from public;
grant execute on function public.company_portal_write(text,uuid,jsonb) to authenticated;

-- All future interview writers must lock the application BEFORE changing schedules.
-- This trigger ensures scheduling cannot race a final company decision, even in SQL Editor.
create function public.company_interview_guard()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_status text;
begin
 select application_status into v_status from public.applications where application_id=new.application_id for update;
 if new.interview_status='Scheduled' and v_status is distinct from 'Shortlisted' then
 raise exception 'Only shortlisted applications can have scheduled interviews.' using errcode='23514'; end if;
 return new;
end;
$$;
revoke all on function public.company_interview_guard() from public;
create trigger company_interview_guard before insert or update on public.interviews for each row execute function public.company_interview_guard();
-- Preserve the meaning of application and interview ownership during admin role changes.
create function public.company_record_role_guard()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
 if new.role is distinct from old.role then
  if exists(select 1 from public.applications where applicant_id=old.user_id) and new.role<>'applicant' then
   raise exception 'An account with applications must remain an applicant.' using errcode='23514';
  end if;
  if exists(select 1 from public.interviews where staff_id=old.user_id) and new.role not in ('staff','admin') then
   raise exception 'An assigned interviewer must remain staff or admin.' using errcode='23514';
  end if;
 end if;
 return new;
end;
$$;
revoke all on function public.company_record_role_guard() from public;
create trigger company_record_role_guard before update of role on public.user_profiles for each row execute function public.company_record_role_guard();
commit;
