-- Run once after the company and staff portal migrations.
begin;
-- Profile edits use the narrow RPC below. Protect email, role and activation
-- even if an older installation granted clients broad update permissions.
revoke update, delete on public.user_profiles from public,anon,authenticated;
revoke update(user_id,email,phone,role,is_active,created_at,first_name,last_name)
 on public.user_profiles from public,anon,authenticated;
create function public.is_active_applicant()
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.user_profiles where user_id=auth.uid() and role='applicant' and is_active);
$$;
revoke all on function public.is_active_applicant() from public;
grant execute on function public.is_active_applicant() to authenticated;

-- Historical application joins must keep working after a job closes, a company
-- changes its profile, or its representative is deactivated. These helpers bypass
-- RLS internally to avoid cyclic policies between jobs and applications.
create function public.applicant_has_job(p_job_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select public.is_active_applicant() and exists(select 1 from public.applications where job_id=p_job_id and applicant_id=auth.uid());
$$;
create function public.applicant_has_company(p_company_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select public.is_active_applicant() and exists(select 1 from public.applications a join public.job_postings j using(job_id) where a.applicant_id=auth.uid() and j.company_id=p_company_id);
$$;
revoke all on function public.applicant_has_job(uuid),public.applicant_has_company(uuid) from public;
grant execute on function public.applicant_has_job(uuid),public.applicant_has_company(uuid) to authenticated;
create policy applicant_applications_read on public.applications for select to authenticated using(applicant_id=auth.uid() and public.is_active_applicant());
create policy applicant_interviews_read on public.interviews for select to authenticated using(public.is_active_applicant() and exists(select 1 from public.applications a where a.application_id=interviews.application_id and a.applicant_id=auth.uid()));
create policy applicant_historical_jobs_read on public.job_postings for select to authenticated using(public.applicant_has_job(job_id));
create policy applicant_historical_companies_read on public.company_profiles for select to authenticated using(public.applicant_has_company(user_id));
-- Category names and descriptions are public reference data.
grant select on public.job_categories to anon;
create policy public_category_directory on public.job_categories for select to anon,authenticated using(true);

create index applicant_apps_recent on public.applications(applicant_id,application_date desc,application_id);
create index available_jobs_recent on public.job_postings(created_at desc,job_id) where status='Approved';
create index available_jobs_category on public.job_postings(category_id,created_at desc) where status='Approved';
create index scheduled_interview_times on public.interviews(starts_at,ends_at) where interview_status='Scheduled';

-- Public search exposes selected business/job fields only. It never returns
-- representative profiles, applicant notes, contact emails, or other applications.
create function public.browse_available_jobs(
 p_search text default '',p_category uuid default null,p_type text default '',
 p_page integer default 1,p_limit integer default 12,p_job_id uuid default null
) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare v_result jsonb; v_pattern text;
begin
 if p_page is null or p_page<1 or p_page>100000 or p_limit is null or p_limit<1 or p_limit>100 or length(coalesce(p_search,''))>100
  or coalesce(p_type,'') not in ('','Full-time','Part-time','Contract','Internship') then
  raise exception 'Invalid search parameters.' using errcode='22023';
 end if;
 -- Escape wildcard characters: user text is a literal keyword search.
 v_pattern := '%' || replace(replace(replace(trim(coalesce(p_search,'')),E'\\',E'\\\\'),'%',E'\\%'),'_',E'\\_') || '%';
 with available as materialized (
  select j.*,c.company_name,c.description as company_description,c.industry,c.address,c.website,k.category_name
  from public.job_postings j join public.company_profiles c on c.user_id=j.company_id
  join public.user_profiles u on u.user_id=c.user_id join public.job_categories k using(category_id)
  where j.status='Approved' and c.review_status='approved' and u.is_active and u.role='company'
   and (p_job_id is null or j.job_id=p_job_id) and (p_category is null or j.category_id=p_category)
   and (coalesce(p_type,'')='' or j.employment_type=p_type)
   and (trim(coalesce(p_search,''))='' or j.job_title ilike v_pattern or j.job_description ilike v_pattern or j.location ilike v_pattern or c.company_name ilike v_pattern)
 ), paged as (
  select * from available order by created_at desc,job_id offset (p_page-1)*p_limit limit p_limit
 ) select jsonb_build_object('data',coalesce((select jsonb_agg(jsonb_build_object(
  'job_id',p.job_id,'job_title',p.job_title,'job_description',p.job_description,'requirements',p.requirements,
  'location',p.location,'employment_type',p.employment_type,'category_id',p.category_id,'category_name',p.category_name,
  'created_at',p.created_at,'status',p.status,
  'company',jsonb_build_object('company_name',p.company_name,'description',p.company_description,'industry',p.industry,'address',p.address,'website',p.website),
  'has_applied',public.is_active_applicant() and exists(select 1 from public.applications a where a.job_id=p.job_id and a.applicant_id=auth.uid())
 ) order by p.created_at desc,p.job_id) from paged p),'[]'::jsonb),
 'count',(select count(*) from available),'page',p_page,'limit',p_limit) into v_result;
 return v_result;
end;
$$;
revoke all on function public.browse_available_jobs(text,uuid,text,integer,integer,uuid) from public;
grant execute on function public.browse_available_jobs(text,uuid,text,integer,integer,uuid) to anon,authenticated;

create function public.applicant_submit_application(p_job_id uuid,p_note text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_company_id uuid; v_company public.company_profiles%rowtype; v_job public.job_postings%rowtype; v_app public.applications%rowtype;
begin
 perform 1 from public.user_profiles where user_id=auth.uid() and role='applicant' and is_active for update;
 if not found then raise exception 'Active applicant access required.' using errcode='42501'; end if;
 if p_note is null or length(trim(p_note)) not between 1 and 2000 then raise exception 'Application note must contain 1 to 2000 characters.' using errcode='22023'; end if;
 select company_id into v_company_id from public.job_postings where job_id=p_job_id;
 if not found then raise exception 'Job is no longer available.' using errcode='P0002'; end if;
 -- Match company-account -> company-profile -> job lock order. These locks
 -- prevent approval edits, job closing, or account deactivation racing submission.
 perform 1 from public.user_profiles where user_id=v_company_id and role='company' and is_active for share;
 if not found then raise exception 'This job is not accepting applications.' using errcode='P0001'; end if;
 select * into v_company from public.company_profiles where user_id=v_company_id for share;
 select * into v_job from public.job_postings where job_id=p_job_id for share;
 if v_job.status is distinct from 'Approved' or v_company.review_status is distinct from 'approved' then
  raise exception 'This job is not accepting applications.' using errcode='P0001';
 end if;
 insert into public.applications(job_id,applicant_id,application_note)
 values(p_job_id,auth.uid(),trim(p_note)) returning * into v_app;
 -- The existing UNIQUE(job_id,applicant_id) also covers simultaneous requests.
 return to_jsonb(v_app);
end;
$$;
revoke all on function public.applicant_submit_application(uuid,text) from public;
grant execute on function public.applicant_submit_application(uuid,text) to authenticated;

create function public.applicant_update_profile(p_first_name text,p_last_name text,p_phone text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare v_profile public.user_profiles%rowtype; v_phone text := nullif(trim(p_phone),'');
begin
 perform 1 from public.user_profiles where user_id=auth.uid() and role='applicant' and is_active for update;
 if not found then raise exception 'Active applicant access required.' using errcode='42501'; end if;
 if p_first_name is null or p_last_name is null or length(trim(p_first_name)) not between 2 and 100 or length(trim(p_last_name)) not between 2 and 100 then
  raise exception 'Names must contain 2 to 100 characters.' using errcode='22023'; end if;
 if v_phone is not null and (length(v_phone) not between 7 and 30 or v_phone !~ '^[0-9+(). -]+$' or length(regexp_replace(v_phone,'[^0-9]','','g'))<7) then
  raise exception 'Enter a valid phone number.' using errcode='22023'; end if;
 update public.user_profiles set first_name=trim(p_first_name),last_name=trim(p_last_name),phone=v_phone
 where user_id=auth.uid() returning * into v_profile;
 update auth.users set raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb) || jsonb_build_object('first_name',v_profile.first_name,'last_name',v_profile.last_name) where id=auth.uid();
 return jsonb_build_object('user_id',v_profile.user_id,'first_name',v_profile.first_name,'last_name',v_profile.last_name,'phone',v_profile.phone,'email',v_profile.email);
end;
$$;
revoke all on function public.applicant_update_profile(text,text,text) from public;
grant execute on function public.applicant_update_profile(text,text,text) to authenticated;
commit;
