import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import LoginForm from "./login-form";

const roleRedirects = {
	ADMIN: "/admin",
	ANALYST: "/analyst",
	VIEWER: "/viewer",
} as const;

export default async function LoginPage() {
	const user = await getAuthUser();
	if (user) {
		redirect(roleRedirects[user.role] ?? "/viewer");
	}

	return <LoginForm />;
}
