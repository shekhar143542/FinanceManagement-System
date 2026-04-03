import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
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

async function getRecordById(id: string) {
	const [record] = await db
		.select({ id: recordsTable.id })
		.from(recordsTable)
		.where(eq(recordsTable.id, id))
		.limit(1);
	return record ?? null;
}

export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const user = await getAuthUser();
	if (!user) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (user.role !== "ADMIN") {
		return Response.json({ error: "Forbidden" }, { status: 403 });
	}

	const { id } = await params;
	if (!id) {
		return Response.json({ error: "Record id is required" }, { status: 400 });
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
	const updates: Record<string, unknown> = {};

	if (amount !== undefined) {
		const amountValue = parseAmount(amount);
		if (!amountValue) {
			return Response.json({ error: "Invalid amount" }, { status: 400 });
		}
		updates.amount = amountValue;
	}

	if (type !== undefined) {
		const typeValue = parseRecordType(type);
		if (!typeValue) {
			return Response.json({ error: "Invalid type" }, { status: 400 });
		}
		updates.type = typeValue;
	}

	if (category !== undefined) {
		if (!isNonEmptyString(category)) {
			return Response.json({ error: "Invalid category" }, { status: 400 });
		}
		updates.category = category.trim();
	}

	if (date !== undefined) {
		const dateValue = parseDate(date);
		if (!dateValue) {
			return Response.json({ error: "Invalid date" }, { status: 400 });
		}
		updates.date = dateValue;
	}

	if (note !== undefined) {
		if (note === null) {
			updates.note = null;
		} else if (typeof note === "string") {
			updates.note = note.trim() || null;
		} else {
			return Response.json({ error: "Invalid note" }, { status: 400 });
		}
	}

	if (Object.keys(updates).length === 0) {
		return Response.json({ error: "No fields to update" }, { status: 400 });
	}

	try {
		const existing = await getRecordById(id);
		if (!existing) {
			return Response.json({ error: "Record not found" }, { status: 404 });
		}

		const [updated] = await db
			.update(recordsTable)
			.set(updates)
			.where(eq(recordsTable.id, id))
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

		return Response.json({ record: updated }, { status: 200 });
	} catch (error) {
		console.error("Update record error:", error);
		return Response.json({ error: "Internal server error" }, { status: 500 });
	}
}

export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const user = await getAuthUser();
	if (!user) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (user.role !== "ADMIN") {
		return Response.json({ error: "Forbidden" }, { status: 403 });
	}

	const { id } = await params;
	if (!id) {
		return Response.json({ error: "Record id is required" }, { status: 400 });
	}

	try {
		const existing = await getRecordById(id);
		if (!existing) {
			return Response.json({ error: "Record not found" }, { status: 404 });
		}

		await db.delete(recordsTable).where(eq(recordsTable.id, id));
		return Response.json({ ok: true }, { status: 200 });
	} catch (error) {
		console.error("Delete record error:", error);
		return Response.json({ error: "Internal server error" }, { status: 500 });
	}
}
