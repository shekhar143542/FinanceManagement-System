import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type UserRole = "ADMIN" | "ANALYST" | "VIEWER";

export type AuthUser = {
	id: string;
	name: string;
	email: string;
	role: UserRole;
};

const authCookieName = "auth_user";
const roleRedirects: Record<UserRole, string> = {
	ADMIN: "/admin",
	ANALYST: "/analyst",
	VIEWER: "/viewer",
};

function parseAuthUser(value: string): AuthUser | null {
	try {
		const parsed = JSON.parse(decodeURIComponent(value)) as AuthUser;
		if (!parsed?.id || !parsed?.email || !parsed?.role) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

export async function getAuthUser(): Promise<AuthUser | null> {
	const cookieStore = await cookies();
	const raw = cookieStore.get(authCookieName)?.value;
	if (!raw) {
		return null;
	}

	return parseAuthUser(raw);
}

export async function requireRole(roles?: UserRole[]): Promise<AuthUser> {
	const user = await getAuthUser();
	if (!user) {
		redirect("/login");
	}

	if (roles && roles.length > 0 && !roles.includes(user.role)) {
		redirect(roleRedirects[user.role] ?? "/login");
	}

	return user;
}
