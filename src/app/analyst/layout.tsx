import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";

export default async function AnalystLayout({
	children,
}: {
	children: ReactNode;
}) {
	await requireRole(["ANALYST"]);
	return <>{children}</>;
}
