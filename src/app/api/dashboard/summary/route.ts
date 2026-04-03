import { neon } from "@neondatabase/serverless";
import { desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { recordsTable } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";

const sqlClient = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sqlClient });

const sumAmount = sql<string>`coalesce(sum(${recordsTable.amount}), 0)`;

function toNumber(value: unknown): number {
	if (typeof value === "number") return Number.isFinite(value) ? value : 0;
	if (typeof value === "string") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
}

export async function GET() {
	const user = await getAuthUser();
	if (!user) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const [incomeRow] = await db
			.select({ total: sumAmount })
			.from(recordsTable)
			.where(eq(recordsTable.type, "income"));

		const [expenseRow] = await db
			.select({ total: sumAmount })
			.from(recordsTable)
			.where(eq(recordsTable.type, "expense"));

		const totalIncome = toNumber(incomeRow?.total ?? 0);
		const totalExpense = toNumber(expenseRow?.total ?? 0);
		const netBalance = totalIncome - totalExpense;

		const categoryRows = await db
			.select({
				category: recordsTable.category,
				total: sumAmount,
			})
			.from(recordsTable)
			.groupBy(recordsTable.category);

		const categoryBreakdown = categoryRows.map((row) => ({
			category: row.category,
			total: toNumber(row.total),
		}));

		const recentTransactions = await db
			.select({
				id: recordsTable.id,
				amount: recordsTable.amount,
				type: recordsTable.type,
				category: recordsTable.category,
				date: recordsTable.date,
				note: recordsTable.note,
				userId: recordsTable.userId,
				createdAt: recordsTable.createdAt,
			})
			.from(recordsTable)
			.orderBy(desc(recordsTable.date))
			.limit(5);

		return Response.json(
			{
				totalIncome,
				totalExpense,
				netBalance,
				categoryBreakdown,
				recentTransactions,
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("Dashboard summary error:", error);
		return Response.json({ error: "Internal server error" }, { status: 500 });
	}
}
