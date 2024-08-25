// navigation.ts
import type { Route } from "@/routers/types";
import uniqueId from "lodash/uniqueId"; // Instead of import _ from 'lodash';

export const NAVBAR_LINKS = [
	{
		id: "0",
		href: "/",
		name: "صفحه اصلی",
	},

	{
		id: "1",
		href: "/archive/demo-slug" as Route,
		name: "وبلاگ",
	},

	{
		id: "2",
		href: "/market",
		name: "مارکت",
	},
	{
		id: "3",
		href: "/about",
		name: "درباره ما",
	},
	{
		id: "4",
		href: "/contact",
		name: "تماس با ما",
	},
] as const;




