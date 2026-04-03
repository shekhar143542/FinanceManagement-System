import { cookies } from "next/headers";

const authCookieName = "auth_user";

export async function POST() {
	const cookieStore = await cookies();
	cookieStore.delete(authCookieName);
	return Response.json({ ok: true }, { status: 200 });
}
