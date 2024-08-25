"use client";

import type React from "react";
import { logout } from "@/actions/auth-actions";
import Link from "next/link";
import { LogoutIcon } from "../Icons";

const Logout = () => {
	const handleLogout = () => {
		logout();
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			handleLogout();
		}
	};

	return (
		<div
			onClick={handleLogout}
			onKeyDown={handleKeyDown}
			role="button"
			tabIndex={0}
			className="flex items-center p-2 -m-3 transition duration-150 ease-in-out rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus-visible:ring focus-visible:ring-orange-500 focus-visible:ring-opacity-50"
		>
			<LogoutIcon
				className="flex-shrink-0 w-6 h-6 text-neutral-500 dark:text-neutral-300"
				title="خروج"
			/>
			<div className="ms-4">
				<p className="text-sm font-medium">خروج</p>
			</div>
		</div>
	);
};

export default Logout;
