/**
 * Root route — redirects to the login page.
 * The old development health-check page has been removed.
 */
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/login");
}
