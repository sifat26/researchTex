import { redirect } from "next/navigation";

/**
 * Redirects the root path to the dashboard.
 * In the future, this might redirect to a marketing landing page if unauthenticated.
 */
export default function HomePage() {
  redirect("/dashboard");
}
