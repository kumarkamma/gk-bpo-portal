-- GK Tax Consultancy BPO Portal
-- Run this in Supabase SQL Editor

-- Users
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  phone text,
  role text not null default 'bpo_agent' check (role in ('super_admin','supervisor','bpo_agent','auditor','accounts')),
  status text default 'active' check (status in ('active','inactive','suspended','banned')),
  created_at timestamptz default now()
);

-- Attendance
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  date date not null,
  login_time timestamptz,
  logout_time timestamptz,
  working_hours numeric(5,2),
  created_at timestamptz default now()
);

-- Leads
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  mobile text not null,
  alternate_mobile text,
  email text,
  city text,
  state text,
  occupation text,
  source text,
  data_batch_number text,
  pan_available boolean default false,
  assigned_bpo uuid references users(id),
  assigned_date date,
  last_contact_date date,
  next_followup_date date,
  lead_owner uuid references users(id),
  conversion_date date,
  status text default 'New Lead',
  created_at timestamptz default now()
);

-- Call Logs
create table if not exists call_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  agent_id uuid references users(id),
  call_status text,
  interest_status text,
  lead_temperature text,
  service_required text,
  followup_date date,
  followup_time time,
  whatsapp_sent boolean default false,
  proposal_sent boolean default false,
  documents_requested boolean default false,
  documents_received boolean default false,
  remarks text,
  created_at timestamptz default now()
);

-- Clients
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id),
  client_name text not null,
  pan_number text,
  mobile text,
  email text,
  city text,
  state text,
  assessment_year text,
  service_type text,
  assigned_bpo uuid references users(id),
  assigned_auditor uuid references users(id),
  current_status text default 'New Client',
  created_at timestamptz default now()
);

-- Filings
create table if not exists filings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  assessment_year text,
  filing_status text default 'Documents Pending',
  filing_date date,
  ack_number text,
  acknowledgement_pdf text,
  itr_type text,
  filing_completed_by uuid references users(id),
  reviewed_by uuid references users(id),
  remarks text,
  created_at timestamptz default now()
);

-- Payments
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  service_type text,
  service_fee numeric(10,2) default 0,
  discount numeric(10,2) default 0,
  final_amount numeric(10,2) default 0,
  amount_paid numeric(10,2) default 0,
  amount_due numeric(10,2) default 0,
  payment_status text default 'Not Paid',
  payment_mode text,
  transaction_id text,
  invoice_number text,
  receipt_number text,
  receipt_url text,
  payment_verified_by uuid references users(id),
  verified_date date,
  payment_date date,
  created_at timestamptz default now()
);

-- Documents
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  file_name text,
  file_url text,
  uploaded_by uuid references users(id),
  created_at timestamptz default now()
);

-- Audit Logs
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  action text,
  table_name text,
  record_id text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz default now()
);

-- RLS
alter table users enable row level security;
alter table attendance enable row level security;
alter table leads enable row level security;
alter table call_logs enable row level security;
alter table clients enable row level security;
alter table filings enable row level security;
alter table payments enable row level security;
alter table documents enable row level security;
alter table audit_logs enable row level security;

-- Users: super_admin sees all; others see own row
create policy "users_select" on users for select using (
  auth.uid() = id or
  (select role from users where id = auth.uid()) = 'super_admin'
);
create policy "users_insert" on users for insert with check (
  (select role from users where id = auth.uid()) = 'super_admin'
);
create policy "users_update" on users for update using (
  auth.uid() = id or
  (select role from users where id = auth.uid()) = 'super_admin'
);

-- Leads: agents see only assigned; others see all
create policy "leads_select" on leads for select using (
  (select role from users where id = auth.uid()) in ('super_admin','supervisor','accounts') or
  assigned_bpo = auth.uid() or lead_owner = auth.uid()
);
create policy "leads_insert" on leads for insert with check (
  (select role from users where id = auth.uid()) in ('super_admin','supervisor','bpo_agent')
);
create policy "leads_update" on leads for update using (
  (select role from users where id = auth.uid()) in ('super_admin','supervisor') or
  assigned_bpo = auth.uid()
);

-- Call logs
create policy "call_logs_select" on call_logs for select using (
  (select role from users where id = auth.uid()) in ('super_admin','supervisor') or
  agent_id = auth.uid()
);
create policy "call_logs_insert" on call_logs for insert with check (
  (select role from users where id = auth.uid()) in ('super_admin','supervisor','bpo_agent')
);

-- Clients
create policy "clients_select" on clients for select using (
  (select role from users where id = auth.uid()) in ('super_admin','supervisor','accounts') or
  assigned_bpo = auth.uid() or assigned_auditor = auth.uid()
);
create policy "clients_insert" on clients for insert with check (
  (select role from users where id = auth.uid()) in ('super_admin','supervisor','bpo_agent')
);
create policy "clients_update" on clients for update using (
  (select role from users where id = auth.uid()) in ('super_admin','supervisor') or
  assigned_auditor = auth.uid()
);

-- Filings
create policy "filings_select" on filings for select using (
  (select role from users where id = auth.uid()) in ('super_admin','supervisor','accounts') or
  filing_completed_by = auth.uid()
);
create policy "filings_insert" on filings for insert with check (
  (select role from users where id = auth.uid()) in ('super_admin','auditor')
);
create policy "filings_update" on filings for update using (
  (select role from users where id = auth.uid()) in ('super_admin','auditor')
);

-- Payments
create policy "payments_select" on payments for select using (
  (select role from users where id = auth.uid()) in ('super_admin','supervisor','accounts')
);
create policy "payments_insert" on payments for insert with check (
  (select role from users where id = auth.uid()) in ('super_admin','accounts')
);
create policy "payments_update" on payments for update using (
  (select role from users where id = auth.uid()) in ('super_admin','accounts')
);

-- Attendance: own + admin/supervisor
create policy "attendance_select" on attendance for select using (
  user_id = auth.uid() or
  (select role from users where id = auth.uid()) in ('super_admin','supervisor')
);
create policy "attendance_insert" on attendance for insert with check (user_id = auth.uid());
create policy "attendance_update" on attendance for update using (user_id = auth.uid());

-- Audit logs: super admin only
create policy "audit_logs_select" on audit_logs for select using (
  (select role from users where id = auth.uid()) = 'super_admin'
);
create policy "audit_logs_insert" on audit_logs for insert with check (true);

-- Documents
create policy "documents_select" on documents for select using (
  (select role from users where id = auth.uid()) in ('super_admin','supervisor','auditor','accounts')
);
create policy "documents_insert" on documents for insert with check (
  (select role from users where id = auth.uid()) in ('super_admin','auditor','bpo_agent')
);

-- Trigger: auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Indexes for performance
create index if not exists idx_leads_assigned_bpo on leads(assigned_bpo);
create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_followup on leads(next_followup_date);
create index if not exists idx_call_logs_lead on call_logs(lead_id);
create index if not exists idx_call_logs_agent on call_logs(agent_id);
create index if not exists idx_filings_client on filings(client_id);
create index if not exists idx_payments_client on payments(client_id);
create index if not exists idx_attendance_user_date on attendance(user_id, date);
create index if not exists idx_audit_logs_user on audit_logs(user_id);

-- ── Migration: extend user status constraint ──────────────────
-- Run this if you already have the users table created
alter table users drop constraint if exists users_status_check;
alter table users add constraint users_status_check
  check (status in ('active','inactive','suspended','banned'));

-- ── Privacy Policy Consents ──────────────────────────────────
create table if not exists policy_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  policy_version text not null default 'v1.0',
  consented_at timestamptz default now(),
  ip_address text,
  user_agent text,
  signature text,
  unique(user_id, policy_version)
);

alter table policy_consents enable row level security;

-- Users can insert/view their own consent; super_admin sees all
create policy "policy_consents_insert" on policy_consents
  for insert with check (auth.uid() = user_id);

create policy "policy_consents_select" on policy_consents
  for select using (
    auth.uid() = user_id or
    (select role from users where id = auth.uid()) = 'super_admin'
  );

-- Profile picture storage bucket (run in Supabase Storage settings too)
-- Storage bucket name: avatars (create manually in Supabase dashboard)
