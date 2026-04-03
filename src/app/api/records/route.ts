import { neon } from "@neondatabase/serverless";
import { and, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { recordsTable } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql });

const recordTypes = ["income", "expense"] as const;
type RecordType = (typeof recordTypes)[number];

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function parseRecordType(value: unknown): RecordType | null {
	if (typeof value !== "string") return null;
	return recordTypes.includes(value as RecordType) ? (value as RecordType) : null;
}

function parseAmount(value: unknown): string | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value.toString();
	}
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) return null;
		const parsed = Number(trimmed);
		if (Number.isFinite(parsed)) {
			return parsed.toString();
		}
	}
	return null;
}

function parseDate(value: unknown): Date | null {
	if (typeof value !== "string" && typeof value !== "number") return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(request: Request) {
	const user = await getAuthUser();
	if (!user) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (user.role !== "ADMIN") {
		return Response.json({ error: "Forbidden" }, { status: 403 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	if (!body || typeof body !== "object") {
		return Response.json({ error: "Invalid request body" }, { status: 400 });
	}

	const { amount, type, category, date, note } = body as Record<string, unknown>;

	const amountValue = parseAmount(amount);
	const typeValue = parseRecordType(type);
	const dateValue = parseDate(date);

	if (!amountValue || !typeValue || !isNonEmptyString(category) || !dateValue) {
		return Response.json(
			{ error: "Amount, type, category, and date are required" },
			{ status: 400 },
		);
	}

	if (note !== undefined && note !== null && typeof note !== "string") {
		return Response.json({ error: "Note must be a string" }, { status: 400 });
	}

	const noteValue = typeof note === "string" ? note.trim() || null : null;

	try {
		const [created] = await db
			.insert(recordsTable)
			.values({
				amount: amountValue,
				type: typeValue,
				category: category.trim(),
				date: dateValue,
				note: noteValue,
				userId: user.id,
			})
			.returning({
				id: recordsTable.id,
				amount: recordsTable.amount,
				type: recordsTable.type,
				category: recordsTable.category,
				date: recordsTable.date,
				note: recordsTable.note,
				userId: recordsTable.userId,
				createdAt: recordsTable.createdAt,
			});

		return Response.json({ record: created }, { status: 201 });
	} catch (error) {
		console.error("Create record error:", error);
		return Response.json({ error: "Internal server error" }, { status: 500 });
	}
}

export async function GET(request: Request) {
	const user = await getAuthUser();
	if (!user) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { searchParams } = new URL(request.url);
	const typeParam = searchParams.get("type");
	const categoryParam = searchParams.get("category");
	const startDateParam = searchParams.get("startDate");
	const endDateParam = searchParams.get("endDate");

	const filters = [] as Array<ReturnType<typeof eq>>;

	if (typeParam) {
		const parsedType = parseRecordType(typeParam);
		if (!parsedType) {
			return Response.json({ error: "Invalid type filter" }, { status: 400 });
		}
		filters.push(eq(recordsTable.type, parsedType));
	}

	if (categoryParam !== null) {
		const trimmedCategory = categoryParam.trim();
		if (!trimmedCategory) {
			return Response.json({ error: "Invalid category filter" }, { status: 400 });
		}
		filters.push(eq(recordsTable.category, trimmedCategory));
	}

	if (startDateParam) {
		const parsedStart = parseDate(startDateParam);
		if (!parsedStart) {
			return Response.json({ error: "Invalid startDate filter" }, { status: 400 });
		}
		filters.push(gte(recordsTable.date, parsedStart));
	}

	if (endDateParam) {
		const parsedEnd = parseDate(endDateParam);
		if (!parsedEnd) {
			return Response.json({ error: "Invalid endDate filter" }, { status: 400 });
		}
		filters.push(lte(recordsTable.date, parsedEnd));
	}

	const whereClause =
		filters.length === 0
			? undefined
			: filters.length === 1
				? filters[0]
				: and(...filters);

	try {
		const records = await (whereClause
			? db
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
					.where(whereClause)
			: db
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
					.from(recordsTable));

		return Response.json({ records }, { status: 200 });
	} catch (error) {
		console.error("Fetch records error:", error);
		return Response.json({ error: "Internal server error" }, { status: 500 });
	}
}
