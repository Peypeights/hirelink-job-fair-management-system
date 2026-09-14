-- Company representatives complete one profile after signup. The profile is
-- created as pending and can only be changed to another review state by a
-- privileged staff workflow added in a later task.
create table public.company_profiles (
  user_id uuid primary key references public.user_profiles(user_id) on delete cascade,
  company_name varchar(100) not null,
  description varchar(2000) not null,
  industry varchar(100) not null,
  address varchar(500) not null,
  contact_email varchar(254) not null,
  contact_phone varchar(30) not null,
  website varchar(2048),
  review_status varchar(20) not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint company_profiles_company_name_length
    check (char_length(trim(company_name)) between 2 and 100),
  constraint company_profiles_description_length
    check (char_length(trim(description)) between 1 and 2000),
  constraint company_profiles_industry_length
    check (char_length(trim(industry)) between 1 and 100),
  constraint company_profiles_address_length
    check (char_length(trim(address)) between 1 and 500),
  constraint company_profiles_contact_email_format
    check (
      char_length(trim(contact_email)) between 3 and 254
      and trim(contact_email) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ),
  constraint company_profiles_contact_phone_format
    check (
      char_length(trim(contact_phone)) between 7 and 30
      and trim(contact_phone) ~ '^[0-9+(). -]+$'
      and char_length(regexp_replace(trim(contact_phone), '[^0-9]', '', 'g')) >= 7
    ),
  constraint company_profiles_website_format
    check (
      website is null
      or (
        char_length(trim(website)) between 8 and 2048
        and trim(website) ~* '^https?://[^[:space:]]+$'
      )
    ),
  constraint company_profiles_review_status_check
    check (review_status in ('pending', 'approved', 'rejected'))
);

alter table public.company_profiles enable row level security;

revoke all on table public.company_profiles from anon, authenticated;
grant select, insert on table public.company_profiles to authenticated;

create policy "Company representatives can read their own profile"
  on public.company_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Company representatives can create their own pending profile"
  on public.company_profiles
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and review_status = 'pending'
    and exists (
      select 1
      from public.user_profiles
      where user_profiles.user_id = auth.uid()
        and user_profiles.role = 'company'
        and user_profiles.is_active = true
    )
  );

-- This function is the atomic application path for company onboarding. It
-- derives the representative from auth.uid(), writes Auth metadata and both
-- rows in one transaction, and never accepts a caller-provided status.
create or replace function public.complete_company_onboarding(
  p_first_name text,
  p_last_name text,
  p_company_name text,
  p_description text,
  p_industry text,
  p_address text,
  p_contact_email text,
  p_contact_phone text,
  p_website text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user_id uuid := auth.uid();
  v_auth_email text;
  v_metadata jsonb;
  v_profile public.user_profiles%rowtype;
  v_company_profile public.company_profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select email, raw_user_meta_data
    into v_auth_email, v_metadata
  from auth.users
  where id = v_user_id;

  if not found or v_auth_email is null then
    raise exception 'Authenticated user email is required.' using errcode = '42501';
  end if;

  select *
    into v_profile
  from public.user_profiles
  where user_id = v_user_id
  for update;

  if found then
    if v_profile.role is distinct from 'company'
      or coalesce(v_profile.is_active, false) = false then
      raise exception 'This account cannot complete company onboarding.' using errcode = '42501';
    end if;

    if exists (
      select 1
      from public.company_profiles
      where user_id = v_user_id
    ) then
      raise exception 'Company onboarding is already complete.' using errcode = '23505';
    end if;

    update public.user_profiles
    set first_name = trim(p_first_name),
        last_name = trim(p_last_name),
        email = v_auth_email
    where user_id = v_user_id;
  else
    insert into public.user_profiles (
      user_id,
      first_name,
      last_name,
      email,
      phone,
      role,
      is_active
    ) values (
      v_user_id,
      trim(p_first_name),
      trim(p_last_name),
      v_auth_email,
      null,
      'company',
      true
    );
  end if;

  v_metadata := coalesce(v_metadata, '{}'::jsonb);
  v_metadata := jsonb_set(v_metadata, '{first_name}', to_jsonb(trim(p_first_name)), true);
  v_metadata := jsonb_set(v_metadata, '{last_name}', to_jsonb(trim(p_last_name)), true);
  v_metadata := jsonb_set(v_metadata, '{role}', '"company"'::jsonb, true);
  v_metadata := jsonb_set(v_metadata, '{company_name}', to_jsonb(trim(p_company_name)), true);

  update auth.users
  set raw_user_meta_data = v_metadata
  where id = v_user_id;

  insert into public.company_profiles (
    user_id,
    company_name,
    description,
    industry,
    address,
    contact_email,
    contact_phone,
    website,
    review_status
  ) values (
    v_user_id,
    trim(p_company_name),
    trim(p_description),
    trim(p_industry),
    trim(p_address),
    trim(p_contact_email),
    trim(p_contact_phone),
    nullif(trim(p_website), ''),
    'pending'
  )
  returning * into v_company_profile;

  return jsonb_build_object(
    'user_profile', jsonb_build_object(
      'user_id', v_user_id,
      'first_name', trim(p_first_name),
      'last_name', trim(p_last_name),
      'email', v_auth_email,
      'role', 'company',
      'is_active', true
    ),
    'company_profile', to_jsonb(v_company_profile)
  );
end;
$function$;

revoke all on function public.complete_company_onboarding(
  text, text, text, text, text, text, text, text, text
) from public;

grant execute on function public.complete_company_onboarding(
  text, text, text, text, text, text, text, text, text
) to authenticated;
