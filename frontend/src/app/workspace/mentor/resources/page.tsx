import Link from "next/link";
import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import PageContainer from "@/components/shared/PageContainer";
import { Card } from "@/components/shared/Surface";

/**
 * There is no resource library behind this page yet (no stored resources, no upload, no sharing), so it says so
 * instead of listing invented guides with made-up save counts and links that go nowhere. When a real library exists,
 * its list, search and "add resource" belong here.
 */
export default function MentorResourcesPage() {
  return (
    <PageContainer
      title="Resource Library"
      description="Guides, templates and links to share with your mentees."
    >
      <Card className="flex flex-col items-center px-6 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-full border border-line bg-canvas text-icon">
          <DocumentDuplicateIcon className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-[16px] font-semibold text-ink">The resource library isn&apos;t connected yet</h2>
        <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-muted-ink">
          Nothing is listed here because no resource library is set up for this workspace. There are no guides, templates or links to
          browse, save or share right now.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/workspace/mentor/mentees"
            className="inline-flex h-9 items-center rounded-lg bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1"
          >
            View my mentees
          </Link>
          <Link
            href="/workspace/mentor/dashboard"
            className="inline-flex h-9 items-center rounded-lg border border-line bg-white px-4 text-[13px] font-medium text-ink transition-colors hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            Back to dashboard
          </Link>
        </div>
      </Card>
    </PageContainer>
  );
}
