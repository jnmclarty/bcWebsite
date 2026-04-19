import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";

import { Media } from "./collections/media";
import { Memos } from "./collections/memos";
import { Posts } from "./collections/posts";
import { Teams } from "./collections/teams";
import { Tools } from "./collections/tools";
import { Builders } from "./collections/builders";
import { Faqs } from "./collections/faqs";
import { Users } from "./collections/users";
import { CommunityMembers } from "./collections/community-members";
import { MemoEndorsements } from "./collections/memo-endorsements";

export default buildConfig({
	editor: lexicalEditor(),
	collections: [
		Users,
		Media,
		Teams,
		Memos,
		Posts,
		Tools,
		Builders,
		Faqs,
		CommunityMembers,
		MemoEndorsements,
	],
	db: postgresAdapter({
		pool: {
			connectionString: process.env.DATABASE_URL || "",
		},
	}),
	plugins: [
		...(process.env.S3_BUCKET
			? [
					s3Storage({
						collections: {
							media: {
								prefix: "media",
							},
						},
						bucket: process.env.S3_BUCKET,
						config: {
							credentials: {
								accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
								secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
							},
							region: "auto",
							endpoint: process.env.S3_ENDPOINT || "",
							forcePathStyle: true,
						},
					}),
				]
			: []),
	],
	admin: {
		user: "users",
		autoLogin: process.env.NODE_ENV === "development" ? { email: "admin@buildcanada.com" } : false,
	},
	cors: ["https://buildcanada.com", "https://www.buildcanada.com"],
	csrf: ["https://buildcanada.com", "https://www.buildcanada.com"],
	secret: process.env.PAYLOAD_SECRET || "dev-secret-change-me-in-production",
	typescript: {
		outputFile: "src/payload-types.ts",
	},
});
