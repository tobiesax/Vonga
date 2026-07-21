import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getDashboardData } from "@/lib/repository";
import Dashboard from "./view";

export default async function DashboardPage() {
  if (!(await isAuthenticated())) redirect("/login");
  const data = await getDashboardData();
  return <Dashboard initial={data} />;
}
