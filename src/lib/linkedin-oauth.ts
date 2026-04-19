const encoder = new TextEncoder();

function base64urlEncode(bytes: Uint8Array): string {
	let s = "";
	for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
	return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
	const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
	const b64 = str.replaceAll("-", "+").replaceAll("_", "/") + pad;
	const bin = atob(b64);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

async function getKey(secret: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	);
}

async function sign(secret: string, data: string): Promise<string> {
	const key = await getKey(secret);
	const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
	return base64urlEncode(new Uint8Array(sig));
}

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

export type OAuthStatePayload = {
	memoId: string | number;
	stance: "endorse" | "oppose";
	nonce: string;
	ts: number;
};

export async function createState(
	secret: string,
	payload: Omit<OAuthStatePayload, "nonce" | "ts">,
): Promise<string> {
	const nonceBytes = new Uint8Array(16);
	crypto.getRandomValues(nonceBytes);
	const full: OAuthStatePayload = {
		...payload,
		nonce: base64urlEncode(nonceBytes),
		ts: Date.now(),
	};
	const body = base64urlEncode(encoder.encode(JSON.stringify(full)));
	const sig = await sign(secret, body);
	return `${body}.${sig}`;
}

export async function verifyState(
	secret: string,
	state: string,
	maxAgeMs = 10 * 60 * 1000,
): Promise<OAuthStatePayload | null> {
	const parts = state.split(".");
	if (parts.length !== 2) return null;
	const [body, sig] = parts;
	const expected = await sign(secret, body);
	if (!(await timingSafeEqual(sig, expected))) return null;
	try {
		const json = new TextDecoder().decode(base64urlDecode(body));
		const parsed = JSON.parse(json) as OAuthStatePayload;
		if (typeof parsed.ts !== "number") return null;
		if (Date.now() - parsed.ts > maxAgeMs) return null;
		if (parsed.stance !== "endorse" && parsed.stance !== "oppose") return null;
		return parsed;
	} catch {
		return null;
	}
}

export const LINKEDIN_AUTHORIZE_URL =
	"https://www.linkedin.com/oauth/v2/authorization";
export const LINKEDIN_TOKEN_URL =
	"https://www.linkedin.com/oauth/v2/accessToken";
export const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
export const LINKEDIN_SCOPES = "openid profile email";
export const STATE_COOKIE = "li_oauth_state";
