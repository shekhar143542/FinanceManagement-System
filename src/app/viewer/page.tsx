"use client";

import { useEffect, useState } from "react";
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

const currencyFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

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

export default function ViewerPage() {
	const [summary, setSummary] = useState<SummaryResponse | null>(null);
	const [records, setRecords] = useState<RecordItem[]>([]);
	const [summaryLoading, setSummaryLoading] = useState(true);
	const [recordsLoading, setRecordsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

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
			try {
				const response = await fetch("/api/records", { credentials: "include" });
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
	}, []);

	return (
		<div className="min-h-screen bg-slate-950 text-slate-100">
			<header className="border-b border-white/5 bg-slate-950/80 backdrop-blur">
				<div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
					<div className="space-y-1">
						<h1 className="text-xl font-semibold">Finance Dashboard</h1>
						<p className="text-xs text-slate-400">Read-only overview</p>
					</div>
					<div className="flex items-center gap-3">
						<span className="rounded-full border border-slate-400/40 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
							VIEWER
						</span>
						<LogoutButton
							label="Logout"
							className="rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
						/>
					</div>
				</div>
			</header>

			<main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
				<section className="rounded-2xl border border-white/10 bg-white/5 p-6">
					<div className="flex flex-wrap items-center gap-4">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-slate-200">
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
								<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
								<circle cx="12" cy="12" r="3" />
							</svg>
						</div>
						<div>
							<p className="text-sm text-slate-300">Viewer</p>
							<h2 className="text-lg font-semibold text-white">
								Read-only access
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

				<section className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="text-sm font-semibold text-slate-100">Records</h3>
							<p className="text-xs text-slate-400">Read-only records list</p>
						</div>
					</div>

					{error ? (
						<p className="mt-4 text-sm text-rose-300">{error}</p>
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
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5">
								{recordsLoading ? (
									<tr>
										<td colSpan={5} className="px-3 py-6 text-center text-slate-500">
											Loading records...
										</td>
									</tr>
								) : records.length === 0 ? (
									<tr>
										<td colSpan={5} className="px-3 py-6 text-center text-slate-500">
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
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</section>
			</main>
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
