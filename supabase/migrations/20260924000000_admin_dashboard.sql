-- Run this migration before using the admin dashboard.
create or replace function public.is_active_admin()
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.user_profiles
    where user_id = (select auth.uid()) and role = 'admin' and is_active = true
  );
$$;
revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to authenticated;

grant select on public.user_profiles to authenticated;
create policy "Admins can read all user profiles"
on public.user_profiles for select to authenticated
using (public.is_active_admin());

create policy "Admins can read all company profiles"
on public.company_profiles for select to authenticated
using (public.is_active_admin());

-- Admin actions run with elevated table rights after an explicit role check.
create or replace function public.admin_review_company(p_user_id uuid, p_status text)
returns void language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_active_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_status not in ('approved', 'rejected', 'pending') then
    raise exception 'Invalid review status' using errcode = '22023';
  end if;
  update public.company_profiles
  set review_status = p_status, updated_at = now()
  where user_id = p_user_id;
  if not found then
    raise exception 'Company profile not found' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.admin_review_company(uuid, text) from public;
grant execute on function public.admin_review_company(uuid, text) to authenticated;

create or replace function public.admin_update_account(p_user_id uuid, p_active boolean, p_role text)
returns void language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_role text;
begin
  if not public.is_active_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Cannot change your own admin account' using errcode = '42501';
  end if;
  if p_active is null or p_role not in ('applicant', 'company', 'staff') then
    raise exception 'Invalid account update' using errcode = '22023';
  end if;
  select role into v_role from public.user_profiles where user_id = p_user_id for update;
  if not found or v_role = 'admin' then
    raise exception 'Account cannot be changed here' using errcode = '42501';
  end if;
  -- Company onboarding and the company profile depend on the original role.
  if p_role <> v_role and (v_role = 'company' or p_role = 'company') then
    raise exception 'Company roles cannot be reassigned here' using errcode = '22023';
  end if;
  update public.user_profiles set is_active = p_active, role = p_role where user_id = p_user_id;
end;
$$;
revoke all on function public.admin_update_account(uuid, boolean, text) from public;
grant execute on function public.admin_update_account(uuid, boolean, text) to authenticated;
