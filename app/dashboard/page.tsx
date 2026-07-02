import { getDashboardData } from "@/lib/repository";
import { isAuthenticated } from "@/lib/auth";
import { redirect } from "next/navigation";
import Dashboard from "./view";

export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  if (!(await isAuthenticated())) redirect("/login");
  return <Dashboard initial={await getDashboardData()} />;
}
