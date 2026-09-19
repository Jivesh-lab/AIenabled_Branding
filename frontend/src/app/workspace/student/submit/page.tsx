import type { Metadata } from "next";
import { Card } from "@/components/shared/Surface";
import PageContainer from "@/components/shared/PageContainer";
import IdeaSubmissionWizard from "./_components/IdeaSubmissionWizard";

export const metadata: Metadata = {
  title: "Submit a New Idea | AAI–DBITIC",
};

const REVIEW_STEPS = [
  { title: "Submitted", detail: "Your idea enters the pipeline" },
  { title: "Faculty Review", detail: "A faculty guide is assigned and reviews it" },
  { title: "Department Review", detail: "Assessed by your department" },
  { title: "Incubation Review", detail: "Considered for incubation support" },
  { title: "Decision", detail: "Approved, revision requested, or rejected" },
];

/** Static context beside the form. Server-rendered; no interactivity. */
function ReviewProcessAside() {
  return (
    <Card className="p-5">
      <h2 className="text-[14px] font-semibold text-ink">What happens after you submit</h2>

      <ol className="mt-4 flex flex-col">
        {REVIEW_STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                aria-hidden="true"
                className="mt-1 size-2 shrink-0 rounded-full border-2 border-brand-cyan bg-white"
              />
              {i < REVIEW_STEPS.length - 1 && <span aria-hidden="true" className="w-px flex-1 bg-line" />}
            </div>
            <div className={i < REVIEW_STEPS.length - 1 ? "pb-4" : undefined}>
              <p className="text-[13px] font-medium leading-tight text-ink">{s.title}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-muted-ink">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-5 border-t border-line pt-4">
        <h2 className="text-[14px] font-semibold text-ink">Before you start</h2>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4 text-[12px] leading-relaxed text-muted-ink marker:text-brand-cyan">
          <li>Takes about 10–15 minutes. Your draft saves each time you change step.</li>
          <li>You don&apos;t need a faculty guide — one is assigned after submission.</li>
          <li>Team members you invite must accept before they join.</li>
          <li>You don&apos;t need funding or market details at this stage.</li>
        </ul>
      </div>
    </Card>
  );
}

export default function SubmitIdeaPage() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Submit a New Idea</h1>
          <p className="mt-1.5 text-[14px] text-muted-ink">
            Tell us about the idea you want to develop through AAI–DBITIC.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
          <div className="min-w-0 max-w-3xl xl:max-w-none">
            <IdeaSubmissionWizard />
          </div>

          <aside className="hidden xl:sticky xl:top-[84px] xl:block">
            <ReviewProcessAside />
          </aside>
        </div>
      </div>
    </PageContainer>
  );
}
