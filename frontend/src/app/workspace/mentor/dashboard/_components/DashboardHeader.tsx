export default function DashboardHeader() {
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="text-[13px] font-medium text-brand">{today}</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink">
          Welcome back, Dr. Mentor
        </h1>
        <p className="mt-1 text-[14px] text-muted-ink">
          Here is what is happening with your mentees today.
        </p>
      </div>
    </div>
  );
}
