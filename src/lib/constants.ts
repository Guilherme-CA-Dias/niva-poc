export const RECORD_ACTIONS = [
	{
		key: "get-submissions",
		name: "Submissions",
		type: "default",
	},
	{
		key: "get-deals",
		name: "Deals",
		type: "default",
	},
] as const;

export type RecordActionKey = (typeof RECORD_ACTIONS)[number]["key"] | string;
