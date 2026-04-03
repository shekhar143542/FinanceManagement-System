"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type UserRole = "ADMIN" | "ANALYST" | "VIEWER";

type SafeUser = {
	id: string;
	name: string;
	email: string;
	role: UserRole;
};

type LoginResponse = {
	user?: SafeUser;
	error?: string;
};

const roleRedirects: Record<UserRole, string> = {
	ADMIN: "/admin",
	ANALYST: "/analyst",
	VIEWER: "/viewer",
};

const demoUsers: Record<Exclude<UserRole, "VIEWER">, { email: string; password: string }> = {
	ADMIN: { email: "admin@test.com", password: "123456" },
	ANALYST: { email: "analyst@test.com", password: "123456" },
};

const authStorageKey = "auth_user";

export default function LoginForm() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const stored = localStorage.getItem(authStorageKey);
		if (!stored) return;

		try {
			const user = JSON.parse(stored) as SafeUser;
			if (!user?.role) return;
			router.replace(roleRedirects[user.role] ?? "/viewer");
		} catch {
			localStorage.removeItem(authStorageKey);
		}
	}, [router]);

	const loginRequest = async (emailValue: string, passwordValue: string) => {
		if (loading) return;
		setLoading(true);
		setError(null);

		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ email: emailValue, password: passwordValue }),
			});

			const data = (await response.json()) as LoginResponse;

			if (!response.ok || !data.user) {
				const fallback = response.status === 401 ? "Invalid credentials" : "Login failed";
				setError(data.error ?? fallback);
				return;
			}

			localStorage.setItem(authStorageKey, JSON.stringify(data.user));

			router.push(roleRedirects[data.user.role] ?? "/viewer");
		} catch (fetchError) {
			console.error("Login request failed:", fetchError);
			setError("Unable to login. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmedEmail = email.trim();
		const trimmedPassword = password.trim();

		if (!trimmedEmail || !trimmedPassword) {
			setError("Email and password are required");
			return;
		}

		await loginRequest(trimmedEmail, trimmedPassword);
	};

	const handleDemoLogin = async (role: Exclude<UserRole, "VIEWER">) => {
		const demoUser = demoUsers[role];
		setEmail(demoUser.email);
		setPassword(demoUser.password);
		await loginRequest(demoUser.email, demoUser.password);
	};

	return (
		<div className="min-h-screen bg-zinc-50 px-6 py-16">
			<div className="mx-auto flex w-full max-w-md flex-col items-center justify-center">
				<div className="w-full rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
					<h1 className="text-center text-2xl font-semibold text-zinc-900">Login</h1>
					<p className="mt-2 text-center text-sm text-zinc-500">
						Enter your credentials to continue.
					</p>

					<form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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
								autoComplete="current-password"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
								placeholder="Enter your password"
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

						<button
							type="submit"
							disabled={loading}
							className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{loading ? "Signing in..." : "Login"}
						</button>
					</form>

					<div className="mt-6 border-t border-zinc-100 pt-4">
						<p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
							Demo Login
						</p>
						<div className="mt-3 grid gap-2">
							<button
								type="button"
								disabled={loading}
								onClick={() => handleDemoLogin("ADMIN")}
								className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
							>
								Login as Admin
							</button>
							<button
								type="button"
								disabled={loading}
								onClick={() => handleDemoLogin("ANALYST")}
								className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
							>
								Login as Analyst
							</button>
						</div>
					</div>

					<p className="mt-6 text-center text-sm text-zinc-500">
						Don&apos;t have an account?{" "}
						<Link className="font-medium text-zinc-900 hover:underline" href="/signup">
							Signup
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
