import type { CollectionConfig } from "payload";

const adminOnly = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export const MemoEndorsements: CollectionConfig = {
	slug: "memo-endorsements",
	admin: {
		useAsTitle: "id",
		defaultColumns: ["memo", "member", "stance", "updatedAt"],
		description:
			"A community member's endorse/oppose choice on a memo. One row per (memo, member); latest choice wins.",
	},
	access: {
		read: adminOnly,
		create: adminOnly,
		update: adminOnly,
		delete: adminOnly,
	},
	fields: [
		{
			name: "memo",
			type: "relationship",
			relationTo: "memos",
			required: true,
			index: true,
		},
		{
			name: "member",
			type: "relationship",
			relationTo: "community-members",
			required: true,
			index: true,
		},
		{
			name: "stance",
			type: "select",
			required: true,
			options: [
				{ label: "Endorse", value: "endorse" },
				{ label: "Oppose", value: "oppose" },
			],
		},
	],
};
