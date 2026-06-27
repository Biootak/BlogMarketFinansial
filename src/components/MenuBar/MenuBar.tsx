"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Transition } from "@headlessui/react";
import NavMobile from "@/components/Navigation/NavMobile";
import { usePathname } from "next/navigation";

interface MenuBarProps {
	className?: string;
}

const MenuBar = ({ className }: MenuBarProps) => {
	const [isVisible, setIsVisible] = useState(false);
	const pathname = usePathname();

	useEffect(() => {
		setIsVisible(false);
	}, [pathname]);

	const handleToggleMenu = () => {
		setIsVisible((prev) => !prev);
	};

	const handleOverlayInteraction = useCallback(
		(e: React.MouseEvent | React.KeyboardEvent) => {
			if (
				e.type === "click" ||
				(e as React.KeyboardEvent).key === "Enter" ||
				(e as React.KeyboardEvent).key === " "
			) {
				handleToggleMenu();
			}
		},
		[],
	);

	const menuIcon = useMemo(
		() => (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				className="h-7 w-7"
				viewBox="0 0 20 20"
				fill="currentColor"
				aria-hidden="true"
			>
				<path
					fillRule="evenodd"
					d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
					clipRule="evenodd"
				/>
			</svg>
		),
		[],
	);

	return (
		<div className={className}>
			<button
				type="button"
				onClick={handleToggleMenu}
				className="p-2.5 rounded-lg text-neutral-700 dark:text-neutral-300 focus:outline-none flex items-center justify-center"
				aria-label="Toggle menu"
				aria-expanded={isVisible}
				aria-controls="mobile-menu"
			>
				{menuIcon}
			</button>

			<Transition show={isVisible} as={React.Fragment}>
				<div className="relative z-50">
					<Transition.Child
						as={React.Fragment}
						enter="transition-opacity duration-300"
						enterFrom="opacity-0"
						enterTo="opacity-100"
						leave="transition-opacity duration-200"
						leaveFrom="opacity-100"
						leaveTo="opacity-0"
					>
						<div
							className="fixed inset-0 bg-neutral-900 bg-opacity-50"
							onClick={handleOverlayInteraction}
							onKeyDown={handleOverlayInteraction}
							role="button"
							tabIndex={0}
						/>
					</Transition.Child>

					<Transition.Child
						as={React.Fragment}
						enter="transition transform duration-100"
						enterFrom="opacity-0 -translate-x-14 rtl:translate-x-14"
						enterTo="opacity-100 translate-x-0"
						leave="transition transform duration-150"
						leaveFrom="opacity-100 translate-x-0"
						leaveTo="opacity-0 -translate-x-14 rtl:translate-x-14"
					>
						<div
							className="fixed inset-y-0 start-0 w-screen max-w-sm overflow-y-auto z-50"
							id="mobile-menu"
						>
							<div className="flex min-h-full">
								<div className="w-full max-w-sm overflow-hidden transition-all">
									<NavMobile onClickClose={handleToggleMenu} />
								</div>
							</div>
						</div>
					</Transition.Child>
				</div>
			</Transition>
		</div>
	);
};

export default MenuBar;
