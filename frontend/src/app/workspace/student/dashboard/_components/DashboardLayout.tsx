import PageContainer from "@/components/shared/PageContainer";

/**
 * The one dashboard grid, used by the live page AND its loading skeleton so both have identical dimensions and
 * nothing jumps when data arrives.
 *
 *   heading
 *   KPI row (4 across on desktop, 2 on tablet, 1 on phones)
 *   main (two thirds)  |  side (one third)      -> stacks below 1024px
 *   lower sections, full width
 */
export default function DashboardLayout({
  heading,
  kpis,
  main,
  side,
  lower,
}: {
  heading: React.ReactNode;
  kpis: React.ReactNode;
  main: React.ReactNode;
  side: React.ReactNode;
  lower: React.ReactNode;
}) {
  return (
    <PageContainer className="space-y-0">
      <div className="flex flex-col gap-7">
        {heading}
        {kpis}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">{main}</div>
          <div className="flex min-w-0 flex-col gap-6">{side}</div>
        </div>
        {lower}
      </div>
    </PageContainer>
  );
}
