import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";

export default async function ViewerLayout({
	children,
}: {
	children: ReactNode;
}) {
	await requireRole(["VIEWER"]);
	return <>{children}</>;
}
