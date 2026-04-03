import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { usersTable } from "@/db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql });
const authCookieName = "auth_user";

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	if (!body || typeof body !== "object") {
		return Response.json({ error: "Invalid request body" }, { status: 400 });
	}

	const { email, password } = body as Record<string, unknown>;

	if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
		return Response.json({ error: "Email and password are required" }, { status: 400 });
	}

	const normalizedEmail = email.trim().toLowerCase();
	const passwordValue = password.trim();

	try {
		const [user] = await db
			.select({
				id: usersTable.id,
				name: usersTable.name,
				email: usersTable.email,
				role: usersTable.role,
				password: usersTable.password,
			})
			.from(usersTable)
			.where(eq(usersTable.email, normalizedEmail))
			.limit(1);

		if (!user || user.password !== passwordValue) {
			return Response.json({ error: "Invalid credentials" }, { status: 401 });
		}

		const { password: _password, ...safeUser } = user;
		const cookieStore = await cookies();
		cookieStore.set(authCookieName, encodeURIComponent(JSON.stringify(safeUser)), {
			httpOnly: true,
			sameSite: "lax",
			path: "/",
			secure: process.env.NODE_ENV === "production",
		});
		return Response.json({ user: safeUser }, { status: 200 });
	} catch (error) {
		console.error("Login error:", error);
		return Response.json({ error: "Internal server error" }, { status: 500 });
	}
}
