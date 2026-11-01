import { redirect } from "next/navigation";

/**
 * The agents no longer have a page of their own for this role. Their work arrives on the home screen as approvals,
 * activity and escalations. Manual runs live under Super Admin > Autonomous AI Agents ("Run now (override)").
 */
export default function Page() {
  redirect("/workspace/faculty/dashboard");
}
