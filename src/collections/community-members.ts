import type { CollectionConfig } from "payload";

const adminOnly = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);

export const CommunityMembers: CollectionConfig = {
	slug: "community-members",
	admin: {
		useAsTitle: "name",
		defaultColumns: ["name", "email", "createdAt"],
		description:
			"People (not site users/builders) who have endorsed or opposed a memo via LinkedIn sign-in.",
	},
	access: {
		read: adminOnly,
		create: adminOnly,
		update: adminOnly,
		delete: adminOnly,
	},
	fields: [
		{
			name: "name",
			type: "text",
			required: true,
			admin: { readOnly: true, description: "Populated from LinkedIn." },
		},
		{
			name: "email",
			type: "text",
			required: true,
			unique: true,
			admin: { readOnly: true, description: "Populated from LinkedIn." },
		},
		{
			name: "linkedinId",
			type: "text",
			required: true,
			unique: true,
			admin: {
				readOnly: true,
				description: "Stable LinkedIn OIDC 'sub' identifier.",
			},
		},
	],
};
