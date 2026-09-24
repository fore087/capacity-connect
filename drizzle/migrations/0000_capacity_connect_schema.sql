
create type public.app_role as enum ('admin','trainer','trainee');
create type public.trainer_status as enum ('pending','approved','rejected','suspended');
create type public.account_status as enum ('active','suspended');
create type public.course_status as enum ('draft','published','archived');
create type public.resource_type as enum ('recorded_lecture','video','pdf','presentation','document','study_material','external_link');
create type public.submission_status as enum ('in_progress','submitted','late','evaluated');

create table public.profiles (
  id uuid primary key,
  full_name text not null default '',
  email text not null default '',
  phone text,
  avatar_url text,
  account_status public.account_status not null default 'active',
  trainer_status public.trainer_status,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
create table public.trainee_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  address text, qualifications text, education text, work_experience text,
  skills text, interests text, areas_of_interest text, certificates text, bio text,
  updated_at timestamptz not null default now()
);
create table public.trainer_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  qualification text, experience text, experience_years int default 0,
  specialization text, skills text, subjects_taught text, certifications text, bio text,
  updated_at timestamptz not null default now()
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_active_user(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = _uid and account_status = 'active')
$$;
create or replace function public.is_approved_trainer(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p join public.user_roles r on r.user_id = p.id and r.role = 'trainer'
    where p.id = _uid and p.trainer_status = 'approved' and p.account_status = 'active')
$$;

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 200),
  description text not null default '',
  category text not null default 'General',
  difficulty text not null default 'beginner' check (difficulty in ('beginner','intermediate','advanced')),
  duration text,
  prerequisites text,
  learning_objectives text,
  skills text,
  status public.course_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  content text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  trainee_id uuid not null references public.profiles(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (course_id, trainee_id)
);
create table public.module_completions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  trainee_id uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (module_id, trainee_id)
);

create or replace function public.is_course_trainer(_course uuid, _uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.courses where id = _course and trainer_id = _uid)
$$;
create or replace function public.is_enrolled(_course uuid, _uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.enrollments where course_id = _course and trainee_id = _uid)
$$;
create or replace function public.is_course_published(_course uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.courses where id = _course and status = 'published')
$$;

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid references public.course_modules(id) on delete set null,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  resource_type public.resource_type not null,
  file_path text,
  external_url text,
  visibility text not null default 'enrolled' check (visibility in ('enrolled','public')),
  created_at timestamptz not null default now()
);
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid references public.course_modules(id) on delete set null,
  title text not null,
  description text,
  instructions text,
  attachment_path text,
  deadline timestamptz not null,
  max_marks int not null default 100 check (max_marks > 0),
  allowed_file_types text not null default 'pdf,docx,zip,png,jpg',
  submission_rules text,
  created_at timestamptz not null default now()
);
create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  trainee_id uuid not null references public.profiles(id) on delete cascade,
  file_path text,
  comments text,
  status public.submission_status not null default 'in_progress',
  submitted_at timestamptz,
  marks numeric,
  feedback text,
  evaluated_by uuid references public.profiles(id),
  evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (assignment_id, trainee_id)
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid references public.course_modules(id) on delete set null,
  title text not null,
  description text,
  start_at timestamptz,
  deadline timestamptz,
  duration_minutes int not null default 30 check (duration_minutes > 0),
  passing_percentage int not null default 50 check (passing_percentage between 0 and 100),
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  question text not null,
  options jsonb not null,
  correct_index int not null,
  marks int not null default 1 check (marks > 0),
  position int not null default 0,
  check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) >= 4),
  check (correct_index >= 0 and correct_index < jsonb_array_length(options))
);
create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  trainee_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  total_marks int,
  obtained_marks int,
  percentage numeric,
  correct_count int,
  incorrect_count int,
  passed boolean,
  unique (assessment_id, trainee_id)
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_code text not null unique,
  trainee_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  trainee_name text not null,
  course_title text not null,
  trainer_name text,
  score numeric,
  issued_at timestamptz not null default now(),
  unique (trainee_id, course_id)
);
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  trainee_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comments text,
  resource_feedback text,
  created_at timestamptz not null default now(),
  unique (course_id, trainee_id)
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null default 'General',
  image_url text,
  publish_at timestamptz not null default now(),
  expire_at timestamptz,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  image_url text,
  achieved_on date,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);
create table public.competencies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
create table public.subject_requirements (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  competency_id uuid not null references public.competencies(id) on delete cascade,
  required_level int not null check (required_level between 1 and 4),
  unique (subject_id, competency_id)
);
create table public.trainer_competencies (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  competency_id uuid not null references public.competencies(id) on delete cascade,
  level int not null check (level between 1 and 4),
  unique (trainer_id, competency_id)
);
create table public.trainer_assignments (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id),
  match_score numeric,
  notes text,
  created_at timestamptz not null default now(),
  unique (subject_id, trainer_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant select on public.courses, public.course_modules, public.announcements, public.achievements to anon;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.trainee_profiles enable row level security;
alter table public.trainer_profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.enrollments enable row level security;
alter table public.module_completions enable row level security;
alter table public.resources enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.certificates enable row level security;
alter table public.feedback enable row level security;
alter table public.announcements enable row level security;
alter table public.achievements enable row level security;
alter table public.subjects enable row level security;
alter table public.competencies enable row level security;
alter table public.subject_requirements enable row level security;
alter table public.trainer_competencies enable row level security;
alter table public.trainer_assignments enable row level security;
alter table public.notifications enable row level security;

create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "admin read profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "trainer reads enrolled trainees" on public.profiles for select to authenticated using (
  exists (select 1 from public.enrollments e join public.courses c on c.id = e.course_id
          where e.trainee_id = profiles.id and c.trainer_id = auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "admin update profiles" on public.profiles for update to authenticated using (public.has_role(auth.uid(),'admin'));

create policy "own roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "trainee profile read" on public.trainee_profiles for select to authenticated using (
  user_id = auth.uid() or public.has_role(auth.uid(),'admin') or
  exists (select 1 from public.enrollments e join public.courses c on c.id = e.course_id where e.trainee_id = trainee_profiles.user_id and c.trainer_id = auth.uid()));
create policy "trainee profile write" on public.trainee_profiles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "trainer profile read" on public.trainer_profiles for select to authenticated using (true);
create policy "trainer profile write" on public.trainer_profiles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "public reads published courses" on public.courses for select to anon, authenticated using (status = 'published');
create policy "trainer reads own courses" on public.courses for select to authenticated using (trainer_id = auth.uid());
create policy "enrolled reads course" on public.courses for select to authenticated using (public.is_enrolled(id, auth.uid()));
create policy "admin reads courses" on public.courses for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "approved trainer creates" on public.courses for insert to authenticated with check (trainer_id = auth.uid() and public.is_approved_trainer(auth.uid()));
create policy "trainer updates own" on public.courses for update to authenticated using (trainer_id = auth.uid() and public.is_approved_trainer(auth.uid())) with check (trainer_id = auth.uid());
create policy "trainer deletes own draft" on public.courses for delete to authenticated using (trainer_id = auth.uid() and status = 'draft');
create policy "admin updates courses" on public.courses for update to authenticated using (public.has_role(auth.uid(),'admin'));

create policy "modules read" on public.course_modules for select to anon, authenticated using (
  public.is_course_published(course_id) or public.is_course_trainer(course_id, auth.uid()) or public.is_enrolled(course_id, auth.uid()) or public.has_role(auth.uid(),'admin'));
create policy "modules write" on public.course_modules for all to authenticated using (public.is_course_trainer(course_id, auth.uid()) and public.is_approved_trainer(auth.uid())) with check (public.is_course_trainer(course_id, auth.uid()) and public.is_approved_trainer(auth.uid()));

create policy "enrollments read" on public.enrollments for select to authenticated using (
  trainee_id = auth.uid() or public.is_course_trainer(course_id, auth.uid()) or public.has_role(auth.uid(),'admin'));
create policy "trainee enrolls" on public.enrollments for insert to authenticated with check (
  trainee_id = auth.uid() and public.has_role(auth.uid(),'trainee') and public.is_active_user(auth.uid()) and public.is_course_published(course_id));
create policy "trainer removes enrollment" on public.enrollments for delete to authenticated using (public.is_course_trainer(course_id, auth.uid()) or public.has_role(auth.uid(),'admin'));

create policy "completions read" on public.module_completions for select to authenticated using (
  trainee_id = auth.uid() or public.has_role(auth.uid(),'admin') or
  exists (select 1 from public.course_modules m where m.id = module_id and public.is_course_trainer(m.course_id, auth.uid())));
create policy "completions write" on public.module_completions for insert to authenticated with check (
  trainee_id = auth.uid() and exists (select 1 from public.course_modules m where m.id = module_id and public.is_enrolled(m.course_id, auth.uid())));
create policy "completions delete" on public.module_completions for delete to authenticated using (trainee_id = auth.uid());

create policy "resources read" on public.resources for select to authenticated using (
  public.is_course_trainer(course_id, auth.uid()) or public.is_enrolled(course_id, auth.uid()) or public.has_role(auth.uid(),'admin')
  or (visibility = 'public' and public.is_course_published(course_id)));
create policy "resources write" on public.resources for all to authenticated using (public.is_course_trainer(course_id, auth.uid()) and public.is_approved_trainer(auth.uid())) with check (trainer_id = auth.uid() and public.is_course_trainer(course_id, auth.uid()) and public.is_approved_trainer(auth.uid()));

create policy "assignments read" on public.assignments for select to authenticated using (
  public.is_course_trainer(course_id, auth.uid()) or public.is_enrolled(course_id, auth.uid()) or public.has_role(auth.uid(),'admin'));
create policy "assignments write" on public.assignments for all to authenticated using (public.is_course_trainer(course_id, auth.uid()) and public.is_approved_trainer(auth.uid())) with check (public.is_course_trainer(course_id, auth.uid()) and public.is_approved_trainer(auth.uid()));

create policy "submissions read" on public.assignment_submissions for select to authenticated using (
  trainee_id = auth.uid() or public.has_role(auth.uid(),'admin') or
  exists (select 1 from public.assignments a where a.id = assignment_id and public.is_course_trainer(a.course_id, auth.uid())));
create policy "trainee creates submission" on public.assignment_submissions for insert to authenticated with check (
  trainee_id = auth.uid() and public.is_active_user(auth.uid()) and
  exists (select 1 from public.assignments a where a.id = assignment_id and public.is_enrolled(a.course_id, auth.uid())));
create policy "trainee updates submission" on public.assignment_submissions for update to authenticated using (trainee_id = auth.uid() and status <> 'evaluated') with check (trainee_id = auth.uid());
create policy "trainer evaluates" on public.assignment_submissions for update to authenticated using (
  exists (select 1 from public.assignments a where a.id = assignment_id and public.is_course_trainer(a.course_id, auth.uid())));

create policy "assessments read" on public.assessments for select to authenticated using (
  public.is_course_trainer(course_id, auth.uid()) or public.has_role(auth.uid(),'admin') or (published and public.is_enrolled(course_id, auth.uid())));
create policy "assessments write" on public.assessments for all to authenticated using (public.is_course_trainer(course_id, auth.uid()) and public.is_approved_trainer(auth.uid())) with check (public.is_course_trainer(course_id, auth.uid()) and public.is_approved_trainer(auth.uid()));

create policy "questions read" on public.assessment_questions for select to authenticated using (
  exists (select 1 from public.assessments a where a.id = assessment_id and (public.is_course_trainer(a.course_id, auth.uid()) or public.has_role(auth.uid(),'admin'))));
create policy "questions write" on public.assessment_questions for all to authenticated using (
  exists (select 1 from public.assessments a where a.id = assessment_id and public.is_course_trainer(a.course_id, auth.uid()) and public.is_approved_trainer(auth.uid())))
  with check (exists (select 1 from public.assessments a where a.id = assessment_id and public.is_course_trainer(a.course_id, auth.uid()) and public.is_approved_trainer(auth.uid())));

create policy "attempts read" on public.assessment_attempts for select to authenticated using (
  trainee_id = auth.uid() or public.has_role(auth.uid(),'admin') or
  exists (select 1 from public.assessments a where a.id = assessment_id and public.is_course_trainer(a.course_id, auth.uid())));

create policy "certificates read" on public.certificates for select to authenticated using (
  trainee_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.is_course_trainer(course_id, auth.uid()));

create policy "feedback read" on public.feedback for select to authenticated using (
  trainee_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.is_course_trainer(course_id, auth.uid()));
create policy "feedback insert" on public.feedback for insert to authenticated with check (trainee_id = auth.uid() and public.is_enrolled(course_id, auth.uid()));
create policy "feedback update" on public.feedback for update to authenticated using (trainee_id = auth.uid()) with check (trainee_id = auth.uid());

create policy "public announcements" on public.announcements for select to anon, authenticated using (status = 'published' and publish_at <= now() and (expire_at is null or expire_at > now()));
create policy "admin announcements" on public.announcements for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "public achievements" on public.achievements for select to anon, authenticated using (published);
create policy "admin achievements" on public.achievements for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "subjects read" on public.subjects for select to authenticated using (true);
create policy "subjects admin" on public.subjects for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "competencies read" on public.competencies for select to authenticated using (true);
create policy "competencies admin" on public.competencies for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "requirements read" on public.subject_requirements for select to authenticated using (true);
create policy "requirements admin" on public.subject_requirements for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "trainer comp read" on public.trainer_competencies for select to authenticated using (trainer_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "trainer comp write" on public.trainer_competencies for all to authenticated using (trainer_id = auth.uid() and public.has_role(auth.uid(),'trainer')) with check (trainer_id = auth.uid() and public.has_role(auth.uid(),'trainer'));
create policy "trainer assignments read" on public.trainer_assignments for select to authenticated using (trainer_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "trainer assignments admin" on public.trainer_assignments for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "own notifications update" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own notifications delete" on public.notifications for delete to authenticated using (user_id = auth.uid());

create or replace function public.notify(_user uuid, _title text, _body text, _link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, title, body, link) values (_user, _title, _body, _link)
$$;
revoke execute on function public.notify(uuid,text,text,text) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare _role text := coalesce(new.raw_user_meta_data->>'role', 'trainee');
begin
  if _role not in ('trainee','trainer') then _role := 'trainee'; end if;
  insert into public.profiles (id, full_name, email, trainer_status)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email,
          case when _role = 'trainer' then 'pending'::public.trainer_status else null end);
  insert into public.user_roles (user_id, role) values (new.id, _role::public.app_role);
  if _role = 'trainer' then
    insert into public.trainer_profiles (user_id) values (new.id);
    perform public.notify(r.user_id, 'New trainer awaiting approval', coalesce(new.raw_user_meta_data->>'full_name', new.email) || ' registered as a trainer.', '/admin/users')
      from public.user_roles r where r.role = 'admin';
  else
    insert into public.trainee_profiles (user_id) values (new.id);
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    new.account_status := old.account_status;
    new.trainer_status := old.trainer_status;
    new.email := old.email;
  end if;
  new.updated_at := now();
  if new.trainer_status is distinct from old.trainer_status then
    perform public.notify(new.id, 'Trainer status updated', 'Your trainer account is now ' || new.trainer_status::text || '.', '/dashboard');
  end if;
  if new.account_status is distinct from old.account_status then
    perform public.notify(new.id, 'Account status updated', 'Your account is now ' || new.account_status::text || '.', '/dashboard');
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles for each row execute function public.protect_profile_fields();

create or replace function public.claim_first_admin()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  perform pg_advisory_xact_lock(424242);
  if exists (select 1 from public.user_roles where role = 'admin') then
    raise exception 'An administrator already exists';
  end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), 'admin') on conflict do nothing;
  return true;
end $$;
create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role = 'admin')
$$;
grant execute on function public.admin_exists() to anon, authenticated;

create or replace function public.trainer_public_info(_ids uuid[])
returns table (id uuid, full_name text, avatar_url text, specialization text, bio text, qualification text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.avatar_url, t.specialization, t.bio, t.qualification
  from public.profiles p join public.user_roles r on r.user_id = p.id and r.role = 'trainer'
  left join public.trainer_profiles t on t.user_id = p.id
  where p.id = any(_ids)
$$;
grant execute on function public.trainer_public_info(uuid[]) to anon, authenticated;

create or replace function public.on_enrollment()
returns trigger language plpgsql security definer set search_path = public as $$
declare _c record;
begin
  select title, trainer_id into _c from public.courses where id = new.course_id;
  perform public.notify(new.trainee_id, 'Enrollment confirmed', 'You are enrolled in ' || _c.title || '.', '/learn/' || new.course_id);
  perform public.notify(_c.trainer_id, 'New enrollment', 'A trainee enrolled in ' || _c.title || '.', '/teach/' || new.course_id);
  return new;
end $$;
create trigger enrollments_notify after insert on public.enrollments for each row execute function public.on_enrollment();

create or replace function public.on_assignment_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify(e.trainee_id, 'New assignment: ' || new.title, 'Due ' || to_char(new.deadline, 'DD Mon YYYY HH24:MI'), '/assignments/' || new.id)
    from public.enrollments e where e.course_id = new.course_id;
  return new;
end $$;
create trigger assignments_notify after insert on public.assignments for each row execute function public.on_assignment_created();

create or replace function public.on_assessment_published()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.published and (tg_op = 'INSERT' or not old.published) then
    perform public.notify(e.trainee_id, 'New assessment: ' || new.title, 'An assessment is now available.', '/assessments/' || new.id)
      from public.enrollments e where e.course_id = new.course_id;
  end if;
  return new;
end $$;
create trigger assessments_notify after insert or update on public.assessments for each row execute function public.on_assessment_published();

create or replace function public.on_submission_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare _a record; _is_trainer boolean;
begin
  select * into _a from public.assignments where id = new.assignment_id;
  _is_trainer := public.is_course_trainer(_a.course_id, auth.uid());
  if _is_trainer and tg_op = 'UPDATE' then
    new.file_path := old.file_path; new.comments := old.comments; new.submitted_at := old.submitted_at; new.trainee_id := old.trainee_id;
    if new.marks is not null then
      if new.marks < 0 or new.marks > _a.max_marks then raise exception 'Marks must be between 0 and %', _a.max_marks; end if;
      new.status := 'evaluated'; new.evaluated_by := auth.uid(); new.evaluated_at := now();
      if old.status is distinct from 'evaluated' or old.marks is distinct from new.marks then
        perform public.notify(new.trainee_id, 'Assignment evaluated', _a.title || ': ' || new.marks || '/' || _a.max_marks, '/assignments/' || _a.id);
      end if;
    else
      new.status := old.status;
    end if;
    return new;
  end if;
  if tg_op = 'UPDATE' then
    new.marks := old.marks; new.feedback := old.feedback; new.evaluated_by := old.evaluated_by; new.evaluated_at := old.evaluated_at;
  else
    new.marks := null; new.feedback := null; new.evaluated_by := null; new.evaluated_at := null;
  end if;
  if new.status in ('submitted','late') then
    if new.file_path is null and coalesce(new.comments,'') = '' then raise exception 'Please attach a file or add a comment'; end if;
    new.submitted_at := now();
    new.status := case when now() > _a.deadline then 'late'::public.submission_status else 'submitted'::public.submission_status end;
  elsif new.status = 'evaluated' then
    raise exception 'Not allowed';
  end if;
  return new;
end $$;
create trigger submissions_rules before insert or update on public.assignment_submissions for each row execute function public.on_submission_write();

create or replace function public.on_announcement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    perform public.notify(p.id, 'Announcement: ' || new.title, left(new.description, 140), '/notifications') from public.profiles p;
  end if;
  return new;
end $$;
create trigger announcements_notify after insert or update on public.announcements for each row execute function public.on_announcement();

create or replace function public.get_assessment_for_attempt(_assessment uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare _a record;
begin
  select * into _a from public.assessments where id = _assessment;
  if _a.id is null or not _a.published or not public.is_enrolled(_a.course_id, auth.uid()) then raise exception 'Not authorized'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'question', q.question, 'options', q.options, 'marks', q.marks) order by q.position, q.id)
    from public.assessment_questions q where q.assessment_id = _assessment), '[]'::jsonb);
end $$;

create or replace function public.start_assessment(_assessment uuid)
returns public.assessment_attempts language plpgsql security definer set search_path = public as $$
declare _a record; _att public.assessment_attempts;
begin
  select * into _a from public.assessments where id = _assessment;
  if _a.id is null or not _a.published or not public.is_enrolled(_a.course_id, auth.uid()) or not public.is_active_user(auth.uid()) then raise exception 'Not authorized'; end if;
  select * into _att from public.assessment_attempts where assessment_id = _assessment and trainee_id = auth.uid();
  if _att.id is not null then return _att; end if;
  if _a.start_at is not null and now() < _a.start_at then raise exception 'Assessment has not started yet'; end if;
  if _a.deadline is not null and now() > _a.deadline then raise exception 'Assessment deadline has passed'; end if;
  insert into public.assessment_attempts (assessment_id, trainee_id) values (_assessment, auth.uid()) returning * into _att;
  return _att;
end $$;

create or replace function public.submit_assessment(_assessment uuid, _answers jsonb)
returns public.assessment_attempts language plpgsql security definer set search_path = public as $$
declare _a record; _att public.assessment_attempts; _total int := 0; _obt int := 0; _cor int := 0; _inc int := 0; q record; _ans text; _pct numeric;
begin
  select * into _a from public.assessments where id = _assessment;
  select * into _att from public.assessment_attempts where assessment_id = _assessment and trainee_id = auth.uid();
  if _att.id is null then raise exception 'Start the assessment first'; end if;
  if _att.submitted_at is not null then raise exception 'Already submitted'; end if;
  for q in select * from public.assessment_questions where assessment_id = _assessment loop
    _total := _total + q.marks;
    _ans := _answers->>(q.id::text);
    if _ans is not null and _ans ~ '^\d+$' and _ans::int = q.correct_index then _obt := _obt + q.marks; _cor := _cor + 1;
    else _inc := _inc + 1; end if;
  end loop;
  _pct := case when _total > 0 then round(_obt * 100.0 / _total, 2) else 0 end;
  update public.assessment_attempts set answers = _answers, submitted_at = now(), total_marks = _total, obtained_marks = _obt,
    percentage = _pct, correct_count = _cor, incorrect_count = _inc, passed = _pct >= _a.passing_percentage
    where id = _att.id returning * into _att;
  perform public.notify(auth.uid(), 'Assessment result: ' || _a.title, _pct || '% - ' || case when _att.passed then 'Passed' else 'Not passed' end, '/assessments/' || _assessment);
  return _att;
end $$;

create or replace function public.get_attempt_review(_assessment uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.assessment_attempts where assessment_id = _assessment and trainee_id = auth.uid() and submitted_at is not null) then
    raise exception 'Not available'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'question', q.question, 'options', q.options, 'correct_index', q.correct_index, 'marks', q.marks) order by q.position, q.id)
    from public.assessment_questions q where q.assessment_id = _assessment), '[]'::jsonb);
end $$;

create or replace function public.course_completion_status(_course uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare _trainee uuid := auth.uid(); _mods int; _done int; _asg int; _sub int; _ass int; _passed int; _score numeric;
begin
  select count(*) into _mods from public.course_modules where course_id = _course;
  select count(*) into _done from public.module_completions mc join public.course_modules m on m.id = mc.module_id where m.course_id = _course and mc.trainee_id = _trainee;
  select count(*) into _asg from public.assignments where course_id = _course;
  select count(*) into _sub from public.assignment_submissions s join public.assignments a on a.id = s.assignment_id where a.course_id = _course and s.trainee_id = _trainee and s.status in ('submitted','late','evaluated');
  select count(*) into _ass from public.assessments where course_id = _course and published;
  select count(*), avg(t.percentage) into _passed, _score from public.assessment_attempts t join public.assessments a on a.id = t.assessment_id where a.course_id = _course and a.published and t.trainee_id = _trainee and t.passed;
  return jsonb_build_object('modules_total', _mods, 'modules_done', _done, 'assignments_total', _asg, 'assignments_submitted', _sub,
    'assessments_total', _ass, 'assessments_passed', _passed, 'score', round(coalesce(_score,0),1),
    'eligible', _mods > 0 and _done >= _mods and _sub >= _asg and _passed >= _ass);
end $$;

create or replace function public.claim_certificate(_course uuid)
returns public.certificates language plpgsql security definer set search_path = public as $$
declare _st jsonb; _cert public.certificates; _c record; _name text; _tname text;
begin
  if not public.is_enrolled(_course, auth.uid()) then raise exception 'Not enrolled'; end if;
  select * into _cert from public.certificates where course_id = _course and trainee_id = auth.uid();
  if _cert.id is not null then return _cert; end if;
  _st := public.course_completion_status(_course);
  if not (_st->>'eligible')::boolean then raise exception 'Completion requirements not yet met'; end if;
  select * into _c from public.courses where id = _course;
  select full_name into _name from public.profiles where id = auth.uid();
  select full_name into _tname from public.profiles where id = _c.trainer_id;
  insert into public.certificates (certificate_code, trainee_id, course_id, trainee_name, course_title, trainer_name, score)
  values ('CC-' || to_char(now(),'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)), auth.uid(), _course, _name, _c.title, _tname,
          case when (_st->>'assessments_total')::int > 0 then (_st->>'score')::numeric else null end)
  returning * into _cert;
  update public.enrollments set completed_at = now() where course_id = _course and trainee_id = auth.uid();
  perform public.notify(auth.uid(), 'Certificate available', 'Congratulations on completing ' || _c.title || '!', '/certificates/' || _cert.id);
  return _cert;
end $$;

create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare _enr int; _comp int;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Not authorized'; end if;
  select count(*), count(completed_at) into _enr, _comp from public.enrollments;
  return jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'trainees', (select count(*) from public.user_roles where role='trainee'),
    'trainers', (select count(*) from public.user_roles where role='trainer'),
    'pending_trainers', (select count(*) from public.profiles where trainer_status='pending'),
    'courses', (select count(*) from public.courses),
    'published_courses', (select count(*) from public.courses where status='published'),
    'enrollments', _enr,
    'completed_enrollments', _comp,
    'completion_rate', case when _enr > 0 then round(_comp*100.0/_enr,1) else 0 end,
    'assessments', (select count(*) from public.assessments),
    'attempts', (select count(*) from public.assessment_attempts where submitted_at is not null),
    'submissions', (select count(*) from public.assignment_submissions where status <> 'in_progress'),
    'certificates', (select count(*) from public.certificates),
    'active_learners', (select count(distinct trainee_id) from public.enrollments),
    'enrollments_by_month', coalesce((select jsonb_agg(x order by x->>'month') from (
        select jsonb_build_object('month', to_char(date_trunc('month', enrolled_at),'YYYY-MM'), 'count', count(*)) x
        from public.enrollments where enrolled_at > now() - interval '12 months' group by date_trunc('month', enrolled_at)) s), '[]'::jsonb),
    'courses_by_category', coalesce((select jsonb_agg(jsonb_build_object('category', category, 'count', n)) from (
        select category, count(*) n from public.courses group by category) s), '[]'::jsonb)
  );
end $$;

create or replace function public.trainer_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare _uid uuid := auth.uid();
begin
  if not public.has_role(_uid,'trainer') then raise exception 'Not authorized'; end if;
  return jsonb_build_object(
    'courses', (select count(*) from public.courses where trainer_id=_uid),
    'active_courses', (select count(*) from public.courses where trainer_id=_uid and status='published'),
    'trainees', (select count(distinct e.trainee_id) from public.enrollments e join public.courses c on c.id=e.course_id where c.trainer_id=_uid),
    'pending_submissions', (select count(*) from public.assignment_submissions s join public.assignments a on a.id=s.assignment_id join public.courses c on c.id=a.course_id where c.trainer_id=_uid and s.status in ('submitted','late')),
    'assessments', (select count(*) from public.assessments a join public.courses c on c.id=a.course_id where c.trainer_id=_uid),
    'resources', (select count(*) from public.resources where trainer_id=_uid),
    'avg_performance', (select round(coalesce(avg(t.percentage),0),1) from public.assessment_attempts t join public.assessments a on a.id=t.assessment_id join public.courses c on c.id=a.course_id where c.trainer_id=_uid and t.submitted_at is not null)
  );
end $$;

create policy "avatars read" on storage.objects for select to authenticated using (bucket_id = 'avatars');
create policy "avatars own write" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars own update" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars own delete" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "course files read" on storage.objects for select to authenticated using (
  bucket_id = 'course-files' and (
    public.is_course_trainer(((storage.foldername(name))[1])::uuid, auth.uid())
    or public.is_enrolled(((storage.foldername(name))[1])::uuid, auth.uid())
    or public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.resources r where r.file_path = name and r.visibility = 'public')));
create policy "course files write" on storage.objects for insert to authenticated with check (
  bucket_id = 'course-files' and public.is_course_trainer(((storage.foldername(name))[1])::uuid, auth.uid()) and public.is_approved_trainer(auth.uid()));
create policy "course files delete" on storage.objects for delete to authenticated using (
  bucket_id = 'course-files' and public.is_course_trainer(((storage.foldername(name))[1])::uuid, auth.uid()));

create policy "submission files read" on storage.objects for select to authenticated using (
  bucket_id = 'submissions' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.assignments a where a.id = ((storage.foldername(name))[2])::uuid and public.is_course_trainer(a.course_id, auth.uid()))));
create policy "submission files write" on storage.objects for insert to authenticated with check (
  bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text
  and exists (select 1 from public.assignments a where a.id = ((storage.foldername(name))[2])::uuid and public.is_enrolled(a.course_id, auth.uid())));
create policy "submission files update" on storage.objects for update to authenticated using (
  bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);
