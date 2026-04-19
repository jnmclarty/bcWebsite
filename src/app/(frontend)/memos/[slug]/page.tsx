import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPayloadClient } from "@/lib/payload";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import MemoEndorseButtons from "@/components/memo-endorse-buttons";
import { RichText } from "@payloadcms/richtext-lexical/react";

function getMediaUrl(media: unknown): string {
	if (!media || typeof media !== "object") return "/images/Logo-Box.png";
	const m = media as { url?: string };
	return m.url || "/images/Logo-Box.png";
}

/**
 * Extract raw HTML from a Lexical richtext field that was migrated from Webflow.
 * The migration stored the entire HTML string as a single Lexical text node.
 * Returns the HTML string if detected, or null if the data is proper Lexical JSON.
 */
function extractHtmlFromLexical(data: unknown): string | null {
	if (!data || typeof data !== "object") return null;
	const root = (data as Record<string, unknown>).root as
		| Record<string, unknown>
		| undefined;
	if (!root) return null;
	const children = root.children as
		| Array<Record<string, unknown>>
		| undefined;
	if (!children || children.length !== 1) return null;
	const para = children[0];
	if (para.type !== "paragraph") return null;
	const textChildren = para.children as
		| Array<Record<string, unknown>>
		| undefined;
	if (!textChildren || textChildren.length !== 1) return null;
	const textNode = textChildren[0];
	if (textNode.type !== "text") return null;
	const text = textNode.text as string;
	if (/<[a-z][\s\S]*>/i.test(text)) return text;
	return null;
}

function RichTextOrHtml({ data, className }: { data: unknown; className?: string }) {
	const html = extractHtmlFromLexical(data);
	if (html) {
		return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
	}
	return (
		<div className={className}>
			<RichText data={data} />
		</div>
	);
}

type Args = {
	params: Promise<{ slug: string }>;
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Args): Promise<Metadata> {
	const { slug } = await params;
	const payload = await getPayloadClient();
	const { docs } = await payload.find({
		collection: "memos",
		where: { slug: { equals: slug } },
		limit: 1,
	});

	const memo = docs[0];
	if (!memo) return { title: "Memo Not Found" };

	const builder =
		memo.builder && typeof memo.builder === "object" ? memo.builder : null;
	const authorName =
		builder?.name || (memo.builderName as string) || "Build Canada";

	return {
		title: memo.title,
		description: (memo.description as string) || "",
		alternates: { canonical: `/memos/${slug}` },
		openGraph: {
			title: memo.title,
			description: (memo.description as string) || "",
			url: `/memos/${slug}`,
			images: memo.seoImage ? [getMediaUrl(memo.seoImage)] : undefined,
		},
		authors: [{ name: authorName }],
	};
}

export default async function MemoPage({ params, searchParams }: Args) {
	const { slug } = await params;
	const sp = (await searchParams) ?? {};
	const votedRaw = typeof sp.voted === "string" ? sp.voted : null;
	const voted =
		votedRaw === "endorse" || votedRaw === "oppose" ? votedRaw : null;
	const voteError = typeof sp.voteError === "string" ? sp.voteError : null;

	const payload = await getPayloadClient();
	const { docs } = await payload.find({
		collection: "memos",
		where: { slug: { equals: slug } },
		limit: 1,
	});

	const memo = docs[0];
	if (!memo) notFound();

	const [endorse, oppose] = await Promise.all([
		payload.find({
			collection: "memo-endorsements",
			where: {
				and: [
					{ memo: { equals: memo.id } },
					{ stance: { equals: "endorse" } },
				],
			},
			sort: "-updatedAt",
			limit: 10,
			depth: 1,
		}),
		payload.find({
			collection: "memo-endorsements",
			where: {
				and: [
					{ memo: { equals: memo.id } },
					{ stance: { equals: "oppose" } },
				],
			},
			sort: "-updatedAt",
			limit: 10,
			depth: 1,
		}),
	]);

	const toVoter = (doc: { id: string | number; [key: string]: unknown }) => {
		const m = doc.member as { id?: string | number; name?: string } | null;
		return {
			id: doc.id,
			name: (m && typeof m === "object" && m.name) || "Anonymous",
		};
	};
	const recentEndorsers = endorse.docs.map(toVoter);
	const recentOpposers = oppose.docs.map(toVoter);

	const builder =
		memo.builder && typeof memo.builder === "object" ? memo.builder : null;
	const authorName =
		builder?.name || (memo.builderName as string) || "Build Canada";
	const authorTitle =
		builder?.title || (memo.builderTitle as string) || "Memo";
	const authorAvatar = builder?.profilePhoto
		? getMediaUrl(builder.profilePhoto)
		: (memo.builderAvatar as string) || "/images/Logo-Box.png";
	const authorLinkedin = builder?.linkedin as string | undefined;
	const authorTwitter = builder?.twitter as string | undefined;

	// Fetch related memos for "More memos" section
	const { docs: allMemos } = await payload.find({
		collection: "memos",
		limit: 4,
		sort: "-publishedAt",
		where: {
			_status: { equals: "published" },
			slug: { not_equals: slug },
		},
	});
	const relatedMemos = allMemos.slice(0, 3);

	return (
		<>
			<div className="wrapper">
				<Navbar />

				<section className="section">
					<div className="container">
						<div className="line-container">
							<div className="line-horizontal-top" />
							<div className="line-horizontal-bottom" />
							<div className="line-vertical-right" />
							<div className="line-vertical-left-3" />
							<h1 className="hero-title">{memo.title}</h1>
						</div>

						<div className="memo-author-block">
							<div className="builder">
								<img
									src={authorAvatar}
									loading="lazy"
									width={60}
									height={60}
									alt=""
									className="avatar-small"
								/>
								<div className="memo-card-name">
									<p className="p2 sans">{authorName}</p>
									<div className="meta">{authorTitle}</div>
								</div>
							</div>

							{(authorLinkedin || authorTwitter) && (
								<div className="author-social-links">
									{authorLinkedin && (
										<a
											href={authorLinkedin}
											target="_blank"
											rel="noopener noreferrer"
											aria-label="LinkedIn"
											className="social-icon-link"
										>
											<img
												src="/images/linkedin.svg"
												alt="LinkedIn"
												width={20}
												height={20}
											/>
										</a>
									)}
									{authorTwitter && (
										<a
											href={authorTwitter}
											target="_blank"
											rel="noopener noreferrer"
											aria-label="X (Twitter)"
											className="social-icon-link"
										>
											<img
												src="/images/x.svg"
												alt="X"
												width={20}
												height={20}
											/>
										</a>
									)}
								</div>
							)}

							{memo.supporters && (
								<div className="supported-by">
									<span className="meta">Supported by</span>
									<RichTextOrHtml data={memo.supporters} className="supporters-list" />
								</div>
							)}
						</div>

						{memo.keyMessages &&
							(memo.keyMessages as Array<{ message: string }>).length >
								0 && (
								<div className="key-messages">
									<h3>Key Messages</h3>
									<ul>
										{(
											memo.keyMessages as Array<{
												message: string;
											}>
										).map((km, i) => (
											<li key={i}>{km.message}</li>
										))}
									</ul>
								</div>
							)}

						{memo.body && (
							<RichTextOrHtml data={memo.body} className="memo-body rich-text" />
						)}

						{memo.appendix && (
							<div className="memo-appendix rich-text">
								<h3>Appendix</h3>
								<RichTextOrHtml data={memo.appendix} />
							</div>
						)}

						{memo.twitterEmbed && (
							<RichTextOrHtml
								data={memo.twitterEmbed}
								className="memo-twitter-embed"
							/>
						)}

						<MemoEndorseButtons
							memoId={memo.id}
							endorseCount={endorse.totalDocs}
							opposeCount={oppose.totalDocs}
							recentEndorsers={recentEndorsers}
							recentOpposers={recentOpposers}
							voted={voted}
							voteError={voteError}
						/>
					</div>
				</section>

				<section className="memo-section">
					<div className="container subscription-cta">
						<div className="line-container">
							<h2 className="newsletter-title">
								Be first to know what&apos;s possible
							</h2>
						</div>
						<p className="newsletter-paragraph">
							Get weekly recaps of current events, updates from our
							team, and ideas to help Canada grow
						</p>
						<a
							href="https://buildcanada.substack.com/subscribe"
							target="_blank"
							rel="noopener noreferrer"
							className="primary-button w-button"
						>
							Subscribe
						</a>
					</div>
				</section>

				{relatedMemos.length > 0 && (
					<section className="section">
						<div className="container">
							<h2>More memos</h2>
							<div className="memo-grid" role="list">
								{relatedMemos.map((related) => {
									const rb =
										related.builder &&
										typeof related.builder === "object"
											? related.builder
											: null;
									const rAvatar = rb?.profilePhoto
										? getMediaUrl(rb.profilePhoto)
										: (related.builderAvatar as string) ||
											"/images/Logo-Box.png";
									const rName =
										rb?.name ||
										(related.builderName as string) ||
										"Build Canada";
									const rTitle =
										rb?.title ||
										(related.builderTitle as string) ||
										"Memo";
									const rKeyMessages =
										related.keyMessages as
											| Array<{ message: string }>
											| undefined;
									const rBlurb =
										rKeyMessages?.[0]?.message ||
										(related.description as string) ||
										"";

									return (
										<div
											key={related.slug}
											className="memo-item"
											role="listitem"
										>
											<Link
												href={`/memos/${related.slug}`}
												className="memo-card"
											>
												<div className="card-text">
													<div className="memo-details">
														<h3>{related.title}</h3>
														<p>{rBlurb}</p>
													</div>
													<div className="builder">
														<img
															src={rAvatar}
															loading="lazy"
															width={60}
															height={60}
															alt=""
															className="avatar-small"
														/>
														<div className="memo-card-name">
															<p className="p2 sans">
																{rName}
															</p>
															<div className="meta">
																{rTitle}
															</div>
														</div>
													</div>
												</div>
												<div className="card-meta">
													<div className="cta">
														<div className="meta">
															Read more
														</div>
														<div className="read-icon">
															<img
																src="/images/arrow.svg"
																loading="lazy"
																width={14}
																height={14}
																alt=""
																className="arrow-right"
																style={{
																	transform:
																		"rotate(-90deg)",
																}}
															/>
														</div>
													</div>
												</div>
											</Link>
										</div>
									);
								})}
							</div>
							<Link href="/memos" className="cta" style={{ marginTop: "1rem" }}>
								<div className="meta">See more memos</div>
								<div className="read-icon">
									<img
										src="/images/arrow.svg"
										loading="lazy"
										width={14}
										height={14}
										alt=""
										className="arrow-right"
										style={{ transform: "rotate(-90deg)" }}
									/>
								</div>
							</Link>
						</div>
					</section>
				)}
			</div>

			<Footer />
		</>
	);
}
