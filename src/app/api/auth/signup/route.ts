import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { usersTable } from "@/db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql });

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

	const { name, email, password } = body as Record<string, unknown>;

	if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
		return Response.json({ error: "Name, email, and password are required" }, { status: 400 });
	}

	// Role is intentionally not accepted from user input to prevent privilege escalation.
	const roleValue = "VIEWER";

	const normalizedEmail = email.trim().toLowerCase();

	try {
		const existing = await db
			.select({ id: usersTable.id })
			.from(usersTable)
			.where(eq(usersTable.email, normalizedEmail))
			.limit(1);

		if (existing.length > 0) {
			return Response.json({ error: "User already exists" }, { status: 409 });
		}

		const [created] = await db
			.insert(usersTable)
			.values({
				name: name.trim(),
				email: normalizedEmail,
				password: password.trim(),
				role: roleValue,
			})
			.returning({
				id: usersTable.id,
				name: usersTable.name,
				email: usersTable.email,
				role: usersTable.role,
				isActive: usersTable.isActive,
				createdAt: usersTable.createdAt,
			});

		return Response.json({ user: created }, { status: 201 });
	} catch (error) {
		console.error("Signup error:", error);
		return Response.json({ error: "Internal server error" }, { status: 500 });
	}
}
