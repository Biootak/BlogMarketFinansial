import SectionSubscribe2 from "@/components/SectionSubscribe2/SectionSubscribe2";
import React, { FC, type ReactNode } from "react";

const LayoutPage = ({ children }: { children: ReactNode }) => {
	return (
		<div className={"nc-LayoutPage relative"}>
			<div
				className={"absolute h-[350px] top-0 left-0 right-0 w-full bg-primary-100 dark:bg-neutral-800 bg-opacity-40 dark:bg-opacity-50"}
			/>
			<div className="container relative pt-4 sm:pt-8 pb-14 lg:pt-12 lg:pb-24">
				{/* CONTENT */}
				<div className="p-5 mx-auto bg-white rounded-2xl sm:rounded-3xl lg:rounded-[2rem] shadow-xl sm:p-8 lg:p-12 dark:bg-neutral-900 dark:shadow-2xl dark:shadow-neutral-800 max-w-5xl border border-neutral-100 dark:border-neutral-700">
					{children}
				</div>
			</div>

			<div className="container pb-14 lg:pb-24">
				<SectionSubscribe2 />
			</div>
		</div>
	);
};

export default LayoutPage;
