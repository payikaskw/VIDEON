import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import AdminDashboard from "./ui";
export const dynamic="force-dynamic";
export default async function DashboardPage(){const session=await getAdminSession();if(!session)redirect("/admin");return <AdminDashboard username={session.username}/>;}
