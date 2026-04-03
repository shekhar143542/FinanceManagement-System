import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { inArray } from "drizzle-orm";
import { usersTable } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql });

type NewUser = typeof usersTable.$inferInsert;

const defaultUsers: NewUser[] = [
	{
		name: "Admin",
		email: "admin@test.com",
		password: "123456",
		role: "ADMIN",
	},
	{
		name: "Analyst",
		email: "analyst@test.com",
		password: "123456",
		role: "ANALYST",
	},
	{
		name: "Viewer",
		email: "viewer@test.com",
		password: "123456",
		role: "VIEWER",
	},
];

async function seed() {
	const emails = defaultUsers.map((user) => user.email);
	const existing = await db
		.select({ email: usersTable.email })
		.from(usersTable)
		.where(inArray(usersTable.email, emails));

	const existingEmails = new Set(existing.map((row) => row.email));
	const usersToInsert = defaultUsers.filter(
		(user) => !existingEmails.has(user.email),
	);

	if (usersToInsert.length === 0) {
		console.log("Seed: no new users inserted. All default users already exist.");
		return;
	}

	await db.insert(usersTable).values(usersToInsert);
	console.log(`Seed: inserted ${usersToInsert.length} user(s).`);
}

seed()
	.then(() => {
		console.log("Seed: completed successfully.");
	})
	.catch((error) => {
		console.error("Seed: failed with error:", error);
		process.exitCode = 1;
	});
