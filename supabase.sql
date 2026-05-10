create table employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text default 'employee',
  commission_percent numeric default 46,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

create table services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id),
  service_id uuid references services(id),
  date date not null default current_date,
  service_name text not null,
  amount numeric not null,
  payment_method text not null check (payment_method in ('cash', 'card', 'booksy_pay', 'voucher')),
  tip_amount numeric default 0,
  note text,
  created_at timestamp with time zone default now()
);

create table day_closures (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id),
  date date not null default current_date,
  total_cash numeric default 0,
  total_card numeric default 0,
  total_booksy_pay numeric default 0,
  total_voucher numeric default 0,
  total_tips numeric default 0,
  note text,
  closed_at timestamp with time zone default now(),
  unique(employee_id, date)
);

insert into employees (name, role, commission_percent) values
('Michał', 'employee', 46),
('Wiktor', 'employee', 46),
('Ahmed', 'employee', 46),
('Ola', 'employee', 46);

insert into services (name, price) values
('Strzyżenie włosów', 90),
('Broda', 70),
('Combo trymer', 140),
('Combo brzytwa', 150),
('Depilacja woskiem jedna partia', 30);
