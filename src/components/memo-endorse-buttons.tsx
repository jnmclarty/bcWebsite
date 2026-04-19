"use client";

import { useEffect, useRef, useState } from "react";

type RecentVoter = { id: string | number; name: string };

type Props = {
	memoId: string | number;
	endorseCount: number;
	opposeCount: number;
	recentEndorsers: RecentVoter[];
	recentOpposers: RecentVoter[];
	voted?: "endorse" | "oppose" | null;
	voteError?: string | null;
};

export default function MemoEndorseButtons({
	memoId,
	endorseCount,
	opposeCount,
	recentEndorsers,
	recentOpposers,
	voted,
	voteError,
}: Props) {
	const [openFor, setOpenFor] = useState<"endorse" | "oppose" | null>(null);
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dlg = dialogRef.current;
		if (!dlg) return;
		if (openFor && !dlg.open) dlg.showModal();
		if (!openFor && dlg.open) dlg.close();
	}, [openFor]);

	const stanceLabel = openFor === "oppose" ? "oppose" : "endorse";
	const startUrl = openFor
		? `/api/auth/linkedin/start?memoId=${encodeURIComponent(String(memoId))}&stance=${openFor}`
		: "#";

	return (
		<div className="endorse-block">
			{voted && (
				<div className="endorse-toast" role="status">
					Thanks — your {voted === "endorse" ? "endorsement" : "opposition"} is
					recorded.
				</div>
			)}
			{voteError && (
				<div className="endorse-toast endorse-toast--error" role="alert">
					Something went wrong ({voteError}). Please try again.
				</div>
			)}

			<div className="endorse-buttons">
				<button
					type="button"
					className="endorse-button endorse-button--endorse"
					onClick={() => setOpenFor("endorse")}
				>
					<span className="endorse-button__label">Endorse</span>
					<span className="endorse-button__count">{endorseCount}</span>
				</button>
				<button
					type="button"
					className="endorse-button endorse-button--oppose"
					onClick={() => setOpenFor("oppose")}
				>
					<span className="endorse-button__label">Oppose</span>
					<span className="endorse-button__count">{opposeCount}</span>
				</button>
			</div>

			<div className="endorse-lists">
				<div className="endorse-list">
					<h4 className="endorse-list__title">Recent endorsers</h4>
					{recentEndorsers.length === 0 ? (
						<p className="endorse-list__empty">No endorsements yet.</p>
					) : (
						<ul className="endorse-list__items">
							{recentEndorsers.map((v) => (
								<li key={v.id}>{v.name}</li>
							))}
						</ul>
					)}
				</div>
				<div className="endorse-list">
					<h4 className="endorse-list__title">Recent opposers</h4>
					{recentOpposers.length === 0 ? (
						<p className="endorse-list__empty">No opposition yet.</p>
					) : (
						<ul className="endorse-list__items">
							{recentOpposers.map((v) => (
								<li key={v.id}>{v.name}</li>
							))}
						</ul>
					)}
				</div>
			</div>

			<dialog
				ref={dialogRef}
				className="endorse-dialog"
				onClose={() => setOpenFor(null)}
			>
				<div className="endorse-dialog__body">
					<h3 className="endorse-dialog__title">
						{stanceLabel === "endorse" ? "Endorse this memo" : "Oppose this memo"}
					</h3>
					<p className="endorse-dialog__text">
						Sign in with LinkedIn to {stanceLabel} this memo. Your name and
						verified email will be recorded alongside your choice.
					</p>
					<div className="endorse-dialog__actions">
						<button
							type="button"
							className="endorse-button endorse-button--ghost"
							onClick={() => setOpenFor(null)}
						>
							Cancel
						</button>
						<a className="endorse-button endorse-button--primary" href={startUrl}>
							Continue with LinkedIn
						</a>
					</div>
				</div>
			</dialog>
		</div>
	);
}
