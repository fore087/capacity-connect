ALTER TABLE public.assignment_submissions DROP CONSTRAINT IF EXISTS assignment_submissions_evaluated_by_fkey,
  ADD CONSTRAINT assignment_submissions_evaluated_by_fkey FOREIGN KEY (evaluated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_created_by_fkey,
  ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.trainer_assignments DROP CONSTRAINT IF EXISTS trainer_assignments_assigned_by_fkey,
  ADD CONSTRAINT trainer_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_courses_trainer ON public.courses(trainer_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_modules_course ON public.course_modules(course_id, position);
CREATE INDEX IF NOT EXISTS idx_enrollments_trainee ON public.enrollments(trainee_id);
CREATE INDEX IF NOT EXISTS idx_module_completions_trainee ON public.module_completions(trainee_id);
CREATE INDEX IF NOT EXISTS idx_resources_course ON public.resources(course_id);
CREATE INDEX IF NOT EXISTS idx_resources_module ON public.resources(module_id);
CREATE INDEX IF NOT EXISTS idx_resources_trainer ON public.resources(trainer_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON public.assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_module ON public.assignments(module_id);
CREATE INDEX IF NOT EXISTS idx_submissions_trainee ON public.assignment_submissions(trainee_id);
CREATE INDEX IF NOT EXISTS idx_submissions_evaluated_by ON public.assignment_submissions(evaluated_by);
CREATE INDEX IF NOT EXISTS idx_assessments_course ON public.assessments(course_id);
CREATE INDEX IF NOT EXISTS idx_assessments_module ON public.assessments(module_id);
CREATE INDEX IF NOT EXISTS idx_questions_assessment ON public.assessment_questions(assessment_id, position);
CREATE INDEX IF NOT EXISTS idx_attempts_trainee ON public.assessment_attempts(trainee_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course ON public.certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_feedback_trainee ON public.feedback(trainee_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON public.announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_announcements_publish ON public.announcements(status, publish_at);
CREATE INDEX IF NOT EXISTS idx_subject_req_competency ON public.subject_requirements(competency_id);
CREATE INDEX IF NOT EXISTS idx_trainer_comp_competency ON public.trainer_competencies(competency_id);
CREATE INDEX IF NOT EXISTS idx_trainer_assign_trainer ON public.trainer_assignments(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_assign_assigned_by ON public.trainer_assignments(assigned_by);

COMMENT ON TABLE public.certificates IS 'trainee_name, course_title, trainer_name are intentional snapshots frozen at issue time so certificates never change retroactively.';