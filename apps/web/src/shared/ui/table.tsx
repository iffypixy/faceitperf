import {cx} from "class-variance-authority";
import {twMerge} from "tailwind-merge";

export const Table: React.FC<React.ComponentPropsWithoutRef<"table">> = ({
	className,
	...props
}) => {
	return (
		<table
			className={cx(
				"bg-fixed-profile bg-profile rounded-4 overflow-hidden",
				className,
			)}
			{...props}
		/>
	);
};

export const TableRow: React.FC<React.ComponentPropsWithoutRef<"tr">> = ({
	className,
	...props
}) => {
	return (
		<tr
			className={twMerge(
				cx(
					"flex bg-[#364250] border-t border-[#495867] last:border-b-0 first:bg-[#35404e] even:bg-[#2d3844]",
					className,
				),
			)}
			{...props}
		/>
	);
};

export const TableHeader: React.FC<React.ComponentPropsWithoutRef<"th">> = ({
	className,
	children,
	...props
}) => {
	return (
		<th
			className={twMerge(
				cx(
					"border-l border-[#495867] first:border-l-0 py-16 px-8 text-center font-bold text-16 break-all",
					className,
				),
			)}
			{...props}
		>
			<span className="text-[#929a9e]">{children}</span>
		</th>
	);
};

export const TableData: React.FC<React.ComponentPropsWithoutRef<"td">> = ({
	className,
	...props
}) => {
	return (
		<td
			className={cx(
				"border-l border-[#495867] first:border-l-0 py-12 px-4 text-center font-normal text-[#929a9e] text-14 break-all",
				className,
			)}
			{...props}
		/>
	);
};
