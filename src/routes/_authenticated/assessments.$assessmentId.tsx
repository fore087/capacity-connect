import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EmptyState, Loading, PageHeader, StatCard, StatusBadge, errMsg, fmtDate } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assessments/$assessmentId")({
  head: () => ({ meta: [{ title: "Assessment — Capacity Connect" }] }),
  component: AssessmentPage,
});

type Q = { id: string; question: string; options: string[]; marks: number; correct_index?: number };

function AssessmentPage() {
  const { assessmentId } = Route.useParams();
  const { session } = useAuth();
  const uid = session!.user.id;
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["assessment", assessmentId, uid],
    queryFn: async () => {
      const [{ data: a }, { data: att }] = await Promise.all([
        supabase.from("assessments").select("*, courses(title)").eq("id", assessmentId).maybeSingle(),
        supabase.from("assessment_attempts").select("*").eq("assessment_id", assessmentId).eq("trainee_id", uid).maybeSingle(),
      ]);
      return { a, att };
    },
  });
  const reload = () => { qc.invalidateQueries({ queryKey: ["assessment", assessmentId] }); qc.invalidateQueries({ queryKey: ["my-assessments"] }); };

  if (isLoading) return <Loading />;
  const a = data?.a;
  const att = data?.att;
  if (!a) return <EmptyState title="Assessment not available" />;

  async function start() {
    const { error } = await supabase.rpc("start_assessment", { _assessment: assessmentId });
    if (error) { toast.error(errMsg(error)); return; }
    reload();
  }

  if (att?.submitted_at) return <Result a={a} att={att} />;
  if (att) return <Attempt a={a} startedAt={att.started_at} onDone={reload} />;

  const notYet = a.start_at && new Date(a.start_at) > new Date();
  const closed = a.deadline && new Date(a.deadline) < new Date();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={a.title} description={a.courses?.title} />
      <div className="space-y-4 rounded-xl border bg-card p-6">
        {a.description && <p>{a.description}</p>}
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>Duration: <strong>{a.duration_minutes} minutes</strong> (timer starts when you begin)</li>
          <li>Pass mark: <strong>{a.passing_percentage}%</strong></li>
          {a.start_at && <li>Opens: {fmtDate(a.start_at, true)}</li>}
          {a.deadline && <li>Closes: {fmtDate(a.deadline, true)}</li>}
          <li>You have <strong>one attempt</strong>. Answers are submitted automatically when time runs out.</li>
        </ul>
        {notYet ? <p className="text-sm font-medium">This assessment hasn't opened yet.</p> : closed ? <p className="text-sm font-medium text-destructive">The deadline for this assessment has passed.</p> : <Button onClick={start}>Start assessment</Button>}
      </div>
    </div>
  );
}

function Attempt({ a, startedAt, onDone }: { a: { id: string; title: string; duration_minutes: number }; startedAt: string; onDone: () => void }) {
  const storageKey = `cc-answers-${a.id}`;
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const submitted = useRef(false);
  const endAt = new Date(startedAt).getTime() + a.duration_minutes * 60000;
  const [left, setLeft] = useState(Math.max(0, endAt - Date.now()));

  const { data: questions, isLoading, error } = useQuery({
    queryKey: ["attempt-questions", a.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_assessment_for_attempt", { _assessment: a.id });
      if (error) throw error;
      return data as unknown as Q[];
    },
  });

  useEffect(() => {
    try { const saved = localStorage.getItem(storageKey); if (saved) setAnswers(JSON.parse(saved)); } catch { /* ignore */ }
  }, [storageKey]);
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(answers)); }, [answers, storageKey]);

  const submit = useCallback(async () => {
    if (submitted.current) return;
    submitted.current = true;
    setBusy(true);
    const { error } = await supabase.rpc("submit_assessment", { _assessment: a.id, _answers: answers });
    setBusy(false);
    if (error) { submitted.current = false; toast.error(errMsg(error)); return; }
    localStorage.removeItem(storageKey);
    toast.success("Assessment submitted");
    onDone();
  }, [a.id, answers, onDone, storageKey]);

  useEffect(() => {
    const t = setInterval(() => {
      const l = Math.max(0, endAt - Date.now());
      setLeft(l);
      if (l === 0) submit();
    }, 1000);
    return () => clearInterval(t);
  }, [endAt, submit]);

  if (isLoading) return <Loading />;
  if (error || !questions) return <EmptyState title="Could not load questions" description={errMsg(error)} />;
  if (questions.length === 0) return <EmptyState title="This assessment has no questions yet." />;
  const q = questions[idx]!;
  const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
  const answered = Object.keys(answers).length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{a.title}</h1>
        <span className={cn("flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-sm font-semibold", left < 60000 ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground")}>
          <Clock className="h-4 w-4" />{String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
        </span>
      </div>
      <Progress value={(answered / questions.length) * 100} className="mb-4" />
      <div className="rounded-xl border bg-card p-6">
        <p className="text-xs text-muted-foreground">Question {idx + 1} of {questions.length} · {q.marks} mark{q.marks > 1 ? "s" : ""}</p>
        <p className="mt-2 text-lg font-medium">{q.question}</p>
        <div className="mt-4 space-y-2">
          {q.options.map((o, i) => (
            <button key={i} type="button" onClick={() => setAnswers({ ...answers, [q.id]: i })}
              className={cn("flex w-full items-center gap-3 rounded-lg border p-3 text-left transition", answers[q.id] === i ? "border-primary bg-secondary" : "hover:bg-muted")}>
              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold", answers[q.id] === i && "border-primary bg-primary text-primary-foreground")}>{String.fromCharCode(65 + i)}</span>
              {o}
            </button>
          ))}
        </div>
        <div className="mt-6 flex justify-between">
          <Button variant="outline" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>Previous</Button>
          {idx < questions.length - 1 ? <Button onClick={() => setIdx(idx + 1)}>Next</Button> : (
            <Button disabled={busy} onClick={() => { if (answered < questions.length && !confirm(`You have answered ${answered} of ${questions.length}. Submit anyway?`)) return; submit(); }}>Submit assessment</Button>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {questions.map((qq, i) => (
          <button key={qq.id} onClick={() => setIdx(i)} className={cn("h-9 w-9 rounded-md border text-sm font-medium", i === idx && "ring-2 ring-ring", answers[qq.id] !== undefined ? "bg-primary text-primary-foreground" : "bg-card")}>{i + 1}</button>
        ))}
      </div>
    </div>
  );
}

function Result({ a, att }: { a: { id: string; title: string; passing_percentage: number; courses: { title: string } | null }; att: { percentage: number | null; obtained_marks: number | null; total_marks: number | null; correct_count: number | null; incorrect_count: number | null; passed: boolean | null; submitted_at: string | null; answers: unknown } }) {
  const { data: review } = useQuery({
    queryKey: ["attempt-review", a.id],
    queryFn: async () => ((await supabase.rpc("get_attempt_review", { _assessment: a.id })).data ?? []) as unknown as Q[],
  });
  const answers = (att.answers ?? {}) as Record<string, number>;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={a.title} description={`Submitted ${fmtDate(att.submitted_at, true)}`} actions={<StatusBadge status={att.passed ? "passed" : "failed"} />} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Score" value={`${Number(att.percentage)}%`} hint={`Pass mark ${a.passing_percentage}%`} />
        <StatCard label="Marks" value={`${att.obtained_marks}/${att.total_marks}`} />
        <StatCard label="Correct" value={att.correct_count} />
        <StatCard label="Incorrect / unanswered" value={att.incorrect_count} />
      </div>
      <h2 className="mb-3 mt-8 font-semibold">Answer review</h2>
      <div className="space-y-3">
        {(review ?? []).map((q, i) => {
          const mine = answers[q.id];
          const ok = mine === q.correct_index;
          return (
            <div key={q.id} className="rounded-xl border bg-card p-4">
              <p className="flex items-start gap-2 font-medium">{ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />}{i + 1}. {q.question}</p>
              <ul className="mt-2 space-y-1 pl-7 text-sm">
                {q.options.map((o, j) => (
                  <li key={j} className={cn(j === q.correct_index && "font-semibold text-success", j === mine && !ok && "text-destructive line-through")}>{String.fromCharCode(65 + j)}. {o}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <Button asChild variant="ghost" className="mt-6"><Link to="/assessments">← All assessments</Link></Button>
    </div>
  );
}
