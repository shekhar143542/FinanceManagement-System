"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SignupResponse = {
	user?: {
		id: string;
		name: string;
		email: string;
		role: "ADMIN" | "ANALYST" | "VIEWER";
	};
	error?: string;
};

type UserRole = "ADMIN" | "ANALYST" | "VIEWER";

const roleRedirects: Record<UserRole, string> = {
	ADMIN: "/admin",
	ANALYST: "/analyst",
	VIEWER: "/viewer",
};

const authStorageKey = "auth_user";

export default function SignupForm() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const redirectTimer = useRef<number | null>(null);

	useEffect(() => {
		const stored = localStorage.getItem(authStorageKey);
		if (stored) {
			try {
				const user = JSON.parse(stored) as { role?: UserRole };
				if (user?.role) {
					router.replace(roleRedirects[user.role] ?? "/viewer");
					return;
				}
			} catch {
				localStorage.removeItem(authStorageKey);
			}
		}

		if (!success) return;
		redirectTimer.current = window.setTimeout(() => {
			router.push("/login");
		}, 1500);

		return () => {
			if (redirectTimer.current) {
				window.clearTimeout(redirectTimer.current);
			}
		};
	}, [success, router]);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (loading) return;

		const trimmedName = name.trim();
		const trimmedEmail = email.trim();
		const trimmedPassword = password.trim();

		if (!trimmedName || !trimmedEmail || !trimmedPassword) {
			setError("All fields are required");
			return;
		}

		setLoading(true);
		setError(null);
		setSuccess(false);

		try {
			const response = await fetch("/api/auth/signup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: trimmedName,
					email: trimmedEmail,
					password: trimmedPassword,
				}),
			});

			const data = (await response.json()) as SignupResponse;

			if (!response.ok || !data.user) {
				setError(data.error ?? "Signup failed");
				return;
			}

			setSuccess(true);
		} catch (fetchError) {
			console.error("Signup request failed:", fetchError);
			setError("Unable to signup. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-white px-6 py-16">
			<div className="mx-auto flex w-full max-w-md flex-col items-center justify-center">
				<div className="w-full rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
					<h1 className="text-center text-2xl font-semibold text-zinc-900">
						Create Account
					</h1>
					<p className="mt-2 text-center text-sm text-zinc-500">
						Set up your profile to access the workspace.
					</p>

					<form className="mt-6 space-y-4" onSubmit={handleSubmit}>
						<label className="block text-sm text-zinc-700">
							<span>Name</span>
							<input
								type="text"
								name="name"
								autoComplete="name"
								value={name}
								onChange={(event) => setName(event.target.value)}
								className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
								placeholder="Jane Doe"
								required
							/>
						</label>

						<label className="block text-sm text-zinc-700">
							<span>Email</span>
							<input
								type="email"
								name="email"
								autoComplete="email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
								placeholder="you@company.com"
								required
							/>
						</label>

						<label className="block text-sm text-zinc-700">
							<span>Password</span>
							<input
								type="password"
								name="password"
								autoComplete="new-password"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
								placeholder="Create a password"
								required
							/>
						</label>

						{error ? (
							<div
								role="alert"
								className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
							>
								{error}
							</div>
						) : null}

						{success ? (
							<div
								role="status"
								className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
							>
								Account created. Redirecting to login...
							</div>
						) : null}

						<button
							type="submit"
							disabled={loading}
							className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{loading ? "Signing up..." : "Signup"}
						</button>
					</form>

					<p className="mt-6 text-center text-sm text-zinc-500">
						Already have an account?{" "}
						<Link className="font-medium text-zinc-900 hover:underline" href="/login">
							Login
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}