"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LogoutButtonProps = {
	label?: string;
	className?: string;
};

const authStorageKey = "auth_user";

export default function LogoutButton({ label = "Logout", className }: LogoutButtonProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	const handleLogout = async () => {
		if (loading) return;
		setLoading(true);

		try {
			await fetch("/api/auth/logout", { method: "POST" });
			localStorage.removeItem(authStorageKey);
			router.push("/login");
		} catch (error) {
			console.error("Logout failed:", error);
			setLoading(false);
		}
	};

	return (
		<button
			type="button"
			onClick={handleLogout}
			disabled={loading}
			className={
				className ??
				"rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
			}
		>
			{loading ? "Signing out..." : label}
		</button>
	);
}
