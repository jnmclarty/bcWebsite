import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
	createState,
	LINKEDIN_AUTHORIZE_URL,
	LINKEDIN_SCOPES,
	STATE_COOKIE,
} from "@/lib/linkedin-oauth";

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const memoId = searchParams.get("memoId");
	const stance = searchParams.get("stance");

	if (!memoId || (stance !== "endorse" && stance !== "oppose")) {
		return NextResponse.json(
			{ error: "Invalid memoId or stance." },
			{ status: 400 },
		);
	}

	const clientId = process.env.LINKEDIN_CLIENT_ID;
	const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
	const secret = process.env.PAYLOAD_SECRET;
	if (!clientId || !redirectUri || !secret) {
		return NextResponse.json(
			{ error: "LinkedIn OAuth is not configured." },
			{ status: 500 },
		);
	}

	const state = await createState(secret, { memoId, stance });

	const authUrl = new URL(LINKEDIN_AUTHORIZE_URL);
	authUrl.searchParams.set("response_type", "code");
	authUrl.searchParams.set("client_id", clientId);
	authUrl.searchParams.set("redirect_uri", redirectUri);
	authUrl.searchParams.set("scope", LINKEDIN_SCOPES);
	authUrl.searchParams.set("state", state);

	const res = NextResponse.redirect(authUrl.toString());
	res.cookies.set(STATE_COOKIE, state, {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: 10 * 60,
	});
	return res;
}
