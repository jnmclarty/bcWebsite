import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPayloadClient } from "@/lib/payload";
import {
	LINKEDIN_TOKEN_URL,
	LINKEDIN_USERINFO_URL,
	STATE_COOKIE,
	verifyState,
} from "@/lib/linkedin-oauth";

type UserInfo = {
	sub: string;
	name?: string;
	given_name?: string;
	family_name?: string;
	email?: string;
	email_verified?: boolean;
};

function errorRedirect(req: NextRequest, slug: string | null, reason: string) {
	const base = new URL(req.url);
	const target = new URL(slug ? `/memos/${slug}` : "/memos", base.origin);
	target.searchParams.set("voteError", reason);
	const res = NextResponse.redirect(target.toString());
	res.cookies.delete(STATE_COOKIE);
	return res;
}

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const code = searchParams.get("code");
	const state = searchParams.get("state");
	const oauthError = searchParams.get("error");

	if (oauthError) return errorRedirect(req, null, "denied");
	if (!code || !state) return errorRedirect(req, null, "missing_params");

	const cookieState = req.cookies.get(STATE_COOKIE)?.value;
	if (!cookieState || cookieState !== state)
		return errorRedirect(req, null, "bad_state");

	const secret = process.env.PAYLOAD_SECRET;
	const clientId = process.env.LINKEDIN_CLIENT_ID;
	const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
	const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
	if (!secret || !clientId || !clientSecret || !redirectUri)
		return errorRedirect(req, null, "not_configured");

	const payload = await verifyState(secret, state);
	if (!payload) return errorRedirect(req, null, "bad_state");

	const tokenRes = await fetch(LINKEDIN_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: redirectUri,
			client_id: clientId,
			client_secret: clientSecret,
		}).toString(),
	});
	if (!tokenRes.ok) return errorRedirect(req, null, "token_exchange_failed");
	const { access_token } = (await tokenRes.json()) as { access_token?: string };
	if (!access_token) return errorRedirect(req, null, "no_access_token");

	const userRes = await fetch(LINKEDIN_USERINFO_URL, {
		headers: { Authorization: `Bearer ${access_token}` },
	});
	if (!userRes.ok) return errorRedirect(req, null, "userinfo_failed");
	const info = (await userRes.json()) as UserInfo;
	const name =
		info.name ||
		[info.given_name, info.family_name].filter(Boolean).join(" ").trim();
	if (!info.sub || !info.email || !name)
		return errorRedirect(req, null, "incomplete_profile");
	if (info.email_verified === false)
		return errorRedirect(req, null, "email_unverified");

	const client = await getPayloadClient();

	const memoLookup = await client.findByID({
		collection: "memos",
		id: payload.memoId as string,
		depth: 0,
	});
	const slug = (memoLookup?.slug as string | undefined) ?? null;
	if (!memoLookup) return errorRedirect(req, null, "memo_not_found");

	const existingMembers = await client.find({
		collection: "community-members",
		where: { linkedinId: { equals: info.sub } },
		limit: 1,
	});
	let memberId: string | number;
	if (existingMembers.docs[0]) {
		const existing = existingMembers.docs[0];
		memberId = existing.id;
		if (existing.name !== name || existing.email !== info.email) {
			await client.update({
				collection: "community-members",
				id: memberId,
				data: { name, email: info.email },
			});
		}
	} else {
		const created = await client.create({
			collection: "community-members",
			data: { name, email: info.email, linkedinId: info.sub },
		});
		memberId = created.id;
	}

	const existingEndorsements = await client.find({
		collection: "memo-endorsements",
		where: {
			and: [
				{ memo: { equals: payload.memoId } },
				{ member: { equals: memberId } },
			],
		},
		limit: 1,
	});
	if (existingEndorsements.docs[0]) {
		await client.update({
			collection: "memo-endorsements",
			id: existingEndorsements.docs[0].id,
			data: { stance: payload.stance },
		});
	} else {
		await client.create({
			collection: "memo-endorsements",
			data: {
				memo: payload.memoId,
				member: memberId,
				stance: payload.stance,
			},
		});
	}

	const base = new URL(req.url);
	const target = new URL(`/memos/${slug}`, base.origin);
	target.searchParams.set("voted", payload.stance);
	const res = NextResponse.redirect(target.toString());
	res.cookies.delete(STATE_COOKIE);
	return res;
}
