"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import LogoutButton from "@/components/LogoutButton";

type RecordType = "income" | "expense";

type RecordItem = {
	id: string;
	amount: string;
	type: RecordType;
	category: string;
	date: string;
	note: string | null;
	userId: string;
	createdAt: string;
};

type SummaryResponse = {
	totalIncome: number;
	totalExpense: number;
	netBalance: number;
	categoryBreakdown: Array<{ category: string; total: number }>;
	recentTransactions: RecordItem[];
};

type RecordFormState = {
	amount: string;
	type: RecordType;
	category: string;
	date: string;
	note: string;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

const chartPalette = ["#22c55e", "#38bdf8", "#a855f7", "#f97316", "#facc15"];
const defaultCategories = [
	"Salary",
	"Freelance",
	"Investments",
	"Food",
	"Transport",
	"Entertainment",
	"Utilities",
	"Healthcare",
	"Education",
];

function formatCurrency(value: number) {
	return currencyFormatter.format(value);
}

function parseAmount(value: string) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function toDateInputValue(value: string | Date) {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
	return localDate.toISOString().slice(0, 10);
}

function buildAreaSeries(records: RecordItem[]) {
	const entries = new Map<
		string,
		{ income: number; expense: number; label: string }
	>();

	for (const record of records) {
		const date = new Date(record.date);
		if (Number.isNaN(date.getTime())) continue;
		const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
		const label = date.toLocaleDateString("en-US", { month: "short" });
		const current = entries.get(key) ?? { income: 0, expense: 0, label };
		const value = parseAmount(record.amount);
		if (record.type === "income") {
			current.income += value;
		} else {
			current.expense += value;
		}
		entries.set(key, current);
	}

	return Array.from(entries.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([, values]) => ({
			month: values.label,
			income: values.income,
			expense: values.expense,
		}));
}

const chartVars: CSSProperties & Record<string, string> = {
	"--income": "142 71% 45%",
	"--expense": "0 84% 60%",
	"--muted-foreground": "215 16% 70%",
};

export default function AdminPage() {
	const [summary, setSummary] = useState<SummaryResponse | null>(null);
	const [records, setRecords] = useState<RecordItem[]>([]);
	const [summaryLoading, setSummaryLoading] = useState(true);
	const [recordsLoading, setRecordsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [typeFilter, setTypeFilter] = useState<RecordType | "">("");
	const [categoryFilter, setCategoryFilter] = useState("");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
	const [formState, setFormState] = useState<RecordFormState>({
		amount: "",
		type: "income",
		category: "",
		date: "",
		note: "",
	});
	const [actionError, setActionError] = useState<string | null>(null);
	const [actionLoading, setActionLoading] = useState(false);

	const categoryOptions = useMemo(() => {
		const categories = new Set<string>(defaultCategories);
		summary?.categoryBreakdown.forEach((item) => categories.add(item.category));
		records.forEach((record) => categories.add(record.category));
		return Array.from(categories).sort();
	}, [summary, records]);

	const areaSeries = useMemo(() => buildAreaSeries(records), [records]);

	useEffect(() => {
		const loadSummary = async () => {
			setSummaryLoading(true);
			try {
				const response = await fetch("/api/dashboard/summary", {
					credentials: "include",
				});
				const data = (await response.json()) as SummaryResponse & { error?: string };
				if (!response.ok) {
					setError(data.error ?? "Failed to load dashboard summary");
					return;
				}
				setSummary(data);
			} catch (fetchError) {
				console.error("Summary fetch error:", fetchError);
				setError("Failed to load dashboard summary");
			} finally {
				setSummaryLoading(false);
			}
		};

		loadSummary();
	}, []);

	useEffect(() => {
		const loadRecords = async () => {
			setRecordsLoading(true);
			setError(null);
			const params = new URLSearchParams();
			if (typeFilter) params.set("type", typeFilter);
			if (categoryFilter) params.set("category", categoryFilter);
			const url = params.toString() ? `/api/records?${params}` : "/api/records";

			try {
				const response = await fetch(url, { credentials: "include" });
				const data = (await response.json()) as {
					records?: RecordItem[];
					error?: string;
				};
				if (!response.ok || !data.records) {
					setError(data.error ?? "Failed to load records");
					return;
				}
				setRecords(data.records);
			} catch (fetchError) {
				console.error("Records fetch error:", fetchError);
				setError("Failed to load records");
			} finally {
				setRecordsLoading(false);
			}
		};

		loadRecords();
	}, [typeFilter, categoryFilter]);

	const openCreateModal = () => {
		setEditingRecord(null);
		setFormState({
			amount: "",
			type: "income",
			category: "",
			date: toDateInputValue(new Date()),
			note: "",
		});
		setActionError(null);
		setIsModalOpen(true);
	};

	const openEditModal = (record: RecordItem) => {
		setEditingRecord(record);
		setFormState({
			amount: record.amount,
			type: record.type,
			category: record.category,
			date: toDateInputValue(record.date),
			note: record.note ?? "",
		});
		setActionError(null);
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setActionError(null);
	};

	const refreshData = async () => {
		const summaryResponse = await fetch("/api/dashboard/summary", {
			credentials: "include",
		});
		const summaryData = (await summaryResponse.json()) as SummaryResponse;
		if (summaryResponse.ok) setSummary(summaryData);

		const params = new URLSearchParams();
		if (typeFilter) params.set("type", typeFilter);
		if (categoryFilter) params.set("category", categoryFilter);
		const url = params.toString() ? `/api/records?${params}` : "/api/records";
		const recordsResponse = await fetch(url, { credentials: "include" });
		const recordsData = (await recordsResponse.json()) as { records?: RecordItem[] };
		if (recordsResponse.ok && recordsData.records) setRecords(recordsData.records);
	};

	const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (actionLoading) return;

		const amountValue = Number(formState.amount);
		if (!Number.isFinite(amountValue) || amountValue <= 0) {
			setActionError("Amount must be a valid number");
			return;
		}

		if (!formState.category.trim()) {
			setActionError("Category is required");
			return;
		}

		if (!formState.date) {
			setActionError("Date is required");
			return;
		}

		setActionLoading(true);
		setActionError(null);

		const payload = {
			amount: amountValue,
			type: formState.type,
			category: formState.category.trim(),
			date: formState.date,
			note: formState.note.trim() || undefined,
		};

		try {
			const endpoint = editingRecord
				? `/api/records/${editingRecord.id}`
				: "/api/records";
			const method = editingRecord ? "PUT" : "POST";
			const response = await fetch(endpoint, {
				method,
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify(payload),
			});
			const data = (await response.json()) as { error?: string };
			if (!response.ok) {
				setActionError(data.error ?? "Unable to save record");
				return;
			}

			await refreshData();
			setIsModalOpen(false);
		} catch (fetchError) {
			console.error("Save record error:", fetchError);
			setActionError("Unable to save record");
		} finally {
			setActionLoading(false);
		}
	};

	const handleDelete = async (recordId: string) => {
		if (actionLoading) return;
		const confirmed = window.confirm("Delete this record? This action cannot be undone.");
		if (!confirmed) return;

		setActionLoading(true);
		setActionError(null);
		try {
			const response = await fetch(`/api/records/${recordId}`, {
				method: "DELETE",
				credentials: "include",
			});
			const data = (await response.json()) as { error?: string };
			if (!response.ok) {
				setActionError(data.error ?? "Unable to delete record");
				return;
			}
			await refreshData();
		} catch (fetchError) {
			console.error("Delete record error:", fetchError);
			setActionError("Unable to delete record");
		} finally {
			setActionLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-slate-950 text-slate-100">
			<header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/70 backdrop-blur">
				<div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
					<div className="space-y-1">
						<h1 className="text-xl font-semibold">Finance Dashboard</h1>
						<p className="text-xs text-slate-400">
							Overview of income, expenses, and records
						</p>
					</div>
					<div className="flex items-center gap-3">
						<span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
							ADMIN
						</span>
						<LogoutButton
							label="Logout"
							className="rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
						/>
					</div>
				</div>
			</header>

			<main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
				<section className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/20 via-sky-500/20 to-indigo-500/20 p-6">
					<div className="flex flex-wrap items-center gap-4">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-200">
							<svg
								width="22"
								height="22"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
							</svg>
						</div>
						<div>
							<p className="text-sm text-emerald-200/80">Admin</p>
							<h2 className="text-lg font-semibold text-white">
								Full access to manage records and users
							</h2>
						</div>
					</div>
				</section>

				<section className="grid gap-4 md:grid-cols-3">
					<SummaryCard
						label="Total Income"
						value={summary?.totalIncome ?? 0}
						accent="text-emerald-300"
						loading={summaryLoading}
					/>
					<SummaryCard
						label="Total Expense"
						value={summary?.totalExpense ?? 0}
						accent="text-rose-300"
						loading={summaryLoading}
					/>
					<SummaryCard
						label="Net Balance"
						value={summary?.netBalance ?? 0}
						accent="text-sky-300"
						loading={summaryLoading}
					/>
				</section>

				<section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
					<div
						className="rounded-2xl border border-white/5 bg-slate-900/60 p-6"
						style={chartVars}
					>
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-semibold text-slate-100">
								Monthly Income vs Expense Trends
							</h3>
							<span className="text-xs text-slate-400">Last activity</span>
						</div>
						<div className="mt-4 h-64">
							{areaSeries.length === 0 ? (
								<p className="flex h-full items-center justify-center text-sm text-slate-500">
									No activity yet.
								</p>
							) : (
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart
										data={areaSeries}
										margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
									>
										<defs>
											<linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
												<stop
													offset="5%"
													stopColor="hsl(var(--income))"
													stopOpacity={0.3}
												/>
												<stop
													offset="95%"
													stopColor="hsl(var(--income))"
													stopOpacity={0}
												/>
											</linearGradient>
											<linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
												<stop
													offset="5%"
													stopColor="hsl(var(--expense))"
													stopOpacity={0.3}
												/>
												<stop
													offset="95%"
													stopColor="hsl(var(--expense))"
													stopOpacity={0}
												/>
											</linearGradient>
										</defs>
										<CartesianGrid
											stroke="hsl(217, 33%, 15%)"
											strokeDasharray="3 3"
											vertical={false}
										/>
										<XAxis
											dataKey="month"
											tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
											tickMargin={8}
											tickLine={false}
											axisLine={{ stroke: "hsl(217, 33%, 15%)" }}
										/>
										<YAxis
											tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
											tickFormatter={(value: number) => formatCurrency(value)}
											width={96}
											tickMargin={8}
											tickLine={false}
											axisLine={false}
										/>
										<Tooltip
											contentStyle={{
												background: "hsl(222, 47%, 11%)",
												border: "1px solid hsl(217, 33%, 20%)",
												borderRadius: 12,
												color: "hsl(210, 40%, 98%)",
												fontSize: 12,
												boxShadow: "0 12px 30px rgba(15,23,42,0.55)",
											}}
											labelStyle={{ color: "hsl(210, 40%, 96%)" }}
											itemStyle={{ color: "hsl(210, 40%, 96%)" }}
											cursor={{ stroke: "hsl(217, 33%, 20%)", strokeWidth: 1 }}
											formatter={(value: number) => formatCurrency(value)}
										/>
										<Area
											dataKey="income"
											type="monotone"
											stroke="hsl(var(--income))"
											fill="url(#income)"
											strokeWidth={2}
											dot={{ r: 2.5, strokeWidth: 1.5 }}
											activeDot={{ r: 5 }}
										/>
										<Area
											dataKey="expense"
											type="monotone"
											stroke="hsl(var(--expense))"
											fill="url(#expense)"
											strokeWidth={2}
											dot={{ r: 2.5, strokeWidth: 1.5 }}
											activeDot={{ r: 5 }}
										/>
										<Legend
											verticalAlign="bottom"
											align="center"
											iconType="circle"
											iconSize={8}
											formatter={(value) =>
												value === "income" ? "Income" : "Expense"
											}
											wrapperStyle={{
												fontSize: 11,
												color: "hsl(var(--muted-foreground))",
												paddingTop: 8,
											}}
										/>
									</AreaChart>
								</ResponsiveContainer>
							)}
						</div>
					</div>
					<div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-semibold text-slate-100">Category Mix</h3>
							<span className="text-xs text-slate-400">Breakdown</span>
						</div>
						<div className="mt-4 h-64">
							{!summary?.categoryBreakdown?.length ? (
								<p className="flex h-full items-center justify-center text-sm text-slate-500">
									No category data yet.
								</p>
							) : (
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={summary.categoryBreakdown}
											dataKey="total"
											nameKey="category"
											innerRadius={60}
											outerRadius={90}
											stroke="#0b1120"
											strokeWidth={2}
										>
											{summary.categoryBreakdown.map((entry, index) => (
												<Cell
													key={entry.category}
													fill={chartPalette[index % chartPalette.length]}
												/>
											))}
										</Pie>
										<Tooltip
											contentStyle={{
												background: "#0b1120",
												border: "1px solid rgba(148,163,184,0.3)",
												borderRadius: 12,
												color: "#f8fafc",
												fontSize: 12,
												boxShadow: "0 12px 30px rgba(15,23,42,0.55)",
											}}
											labelStyle={{ color: "#e2e8f0" }}
											itemStyle={{ color: "#f8fafc" }}
											formatter={(value: number) => formatCurrency(value)}
										/>
									</PieChart>
								</ResponsiveContainer>
							)}
						</div>
					</div>
				</section>

				<section className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div>
							<h3 className="text-sm font-semibold text-slate-100">Records</h3>
							<p className="text-xs text-slate-400">
								Manage all income and expense records
							</p>
						</div>
						<button
							type="button"
							onClick={openCreateModal}
							className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400"
						>
							Add Record
						</button>
					</div>

					<div className="mt-4 grid gap-3 md:grid-cols-3">
						<div>
							<label className="text-xs text-slate-400">Type</label>
							<select
								value={typeFilter}
								onChange={(event) => setTypeFilter(event.target.value as RecordType | "")}
								className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-200"
							>
								<option value="">All</option>
								<option value="income">Income</option>
								<option value="expense">Expense</option>
							</select>
						</div>
						<div>
							<label className="text-xs text-slate-400">Category</label>
							<select
								value={categoryFilter}
								onChange={(event) => setCategoryFilter(event.target.value)}
								className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-200"
							>
								<option value="">All</option>
								{categoryOptions.map((category) => (
									<option key={category} value={category}>
										{category}
									</option>
								))}
							</select>
						</div>
						<div className="flex items-end">
							<button
								type="button"
								onClick={() => {
									setTypeFilter("");
									setCategoryFilter("");
								}}
								className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10"
							>
								Reset Filters
							</button>
						</div>
					</div>

					{error ? (
						<p className="mt-4 text-sm text-rose-300">{error}</p>
					) : null}
					{actionError ? (
						<p className="mt-2 text-sm text-rose-300">{actionError}</p>
					) : null}

					<div className="mt-4 overflow-x-auto">
						<table className="min-w-full text-left text-sm">
							<thead className="text-xs uppercase text-slate-500">
								<tr>
									<th className="px-3 py-2">Category</th>
									<th className="px-3 py-2">Amount</th>
									<th className="px-3 py-2">Type</th>
									<th className="px-3 py-2">Date</th>
									<th className="px-3 py-2">Notes</th>
									<th className="px-3 py-2">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5">
								{recordsLoading ? (
									<tr>
										<td colSpan={6} className="px-3 py-6 text-center text-slate-500">
											Loading records...
										</td>
									</tr>
								) : records.length === 0 ? (
									<tr>
										<td colSpan={6} className="px-3 py-6 text-center text-slate-500">
											No records found.
										</td>
									</tr>
								) : (
									records.map((record) => (
										<tr key={record.id} className="text-slate-100">
											<td className="px-3 py-3">{record.category}</td>
											<td className="px-3 py-3">
												{formatCurrency(parseAmount(record.amount))}
											</td>
											<td className="px-3 py-3">
												<span
													className={
														record.type === "income"
															? "rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300"
															: "rounded-full bg-rose-500/15 px-2 py-1 text-xs text-rose-300"
													}
												>
													{record.type}
												</span>
											</td>
											<td className="px-3 py-3">{formatDate(record.date)}</td>
											<td className="px-3 py-3 text-slate-400">
												{record.note || "-"}
											</td>
											<td className="px-3 py-3">
												<div className="flex gap-2">
													<button
														type="button"
														onClick={() => openEditModal(record)}
														className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100 transition hover:bg-white/10"
													>
														Edit
													</button>
													<button
														type="button"
														onClick={() => handleDelete(record.id)}
														className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 transition hover:bg-rose-500/20"
													>
														Delete
													</button>
												</div>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</section>
			</main>

			{isModalOpen ? (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-6 py-10">
					<div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-xl">
						<div className="flex items-start justify-between gap-4">
							<div>
								<h3 className="text-lg font-semibold">
									{editingRecord ? "Edit Record" : "Add Record"}
								</h3>
								<p className="text-xs text-slate-400">
									Fill in the record details below.
								</p>
							</div>
							<button
								type="button"
								onClick={closeModal}
								className="text-sm text-slate-400 hover:text-white"
							>
								Close
							</button>
						</div>

						<form className="mt-6 space-y-4" onSubmit={handleSave}>
							<div className="grid gap-4 sm:grid-cols-2">
								<label className="text-xs text-slate-400">
									Amount
									<input
										type="number"
										step="0.01"
										value={formState.amount}
										onChange={(event) =>
											setFormState((prev) => ({
												...prev,
												amount: event.target.value,
											}))
										}
										className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
										placeholder="0.00"
										required
									/>
								</label>
								<label className="text-xs text-slate-400">
									Type
									<select
										value={formState.type}
										onChange={(event) =>
											setFormState((prev) => ({
												...prev,
												type: event.target.value as RecordType,
											}))
										}
										className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
									>
										<option value="income">Income</option>
										<option value="expense">Expense</option>
									</select>
								</label>
							</div>
							<label className="text-xs text-slate-400">
								Category
								<input
									type="text"
									list="category-options"
									value={formState.category}
									onChange={(event) =>
										setFormState((prev) => ({
											...prev,
											category: event.target.value,
										}))
									}
									className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
								required
								/>
								<datalist id="category-options">
									{defaultCategories.map((category) => (
										<option key={category} value={category} />
									))}
								</datalist>
							</label>
							<label className="text-xs text-slate-400">
								Date
								<input
									type="date"
									value={formState.date}
									onClick={(event) => event.currentTarget.showPicker?.()}
									onChange={(event) =>
										setFormState((prev) => ({
											...prev,
											date: event.target.value,
										}))
									}
									className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
								required
								/>
							</label>
							<label className="text-xs text-slate-400">
								Note (optional)
								<textarea
									rows={3}
									value={formState.note}
									onChange={(event) =>
										setFormState((prev) => ({
											...prev,
											note: event.target.value,
										}))
									}
									className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
									placeholder="Optional description"
								></textarea>
							</label>

							{actionError ? (
								<p className="text-sm text-rose-300">{actionError}</p>
							) : null}

							<div className="flex justify-end gap-3">
								<button
									type="button"
									onClick={closeModal}
									className="rounded-lg border border-white/10 px-4 py-2 text-xs text-slate-200"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={actionLoading}
									className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
								>
									{actionLoading ? "Saving..." : "Save Record"}
								</button>
							</div>
						</form>
					</div>
				</div>
			) : null}
		</div>
	);
}

function SummaryCard({
	label,
	value,
	accent,
	loading,
}: {
	label: string;
	value: number;
	accent: string;
	loading: boolean;
}) {
	return (
		<div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5">
			<p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
			<p className={`mt-3 text-2xl font-semibold ${accent}`}>
				{loading ? "--" : formatCurrency(value)}
			</p>
		</div>
	);
}
