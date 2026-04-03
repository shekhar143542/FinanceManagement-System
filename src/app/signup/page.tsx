import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import SignupForm from "./signup-form";



const roleRedirects = {
	ADMIN: "/admin",
	ANALYST: "/analyst",
	VIEWER: "/viewer",
} as const;

export default async function SignupPage() {
	const user = await getAuthUser();
	if (user) {
		redirect(roleRedirects[user.role] ?? "/viewer");
	}

	return <SignupForm />;
}
