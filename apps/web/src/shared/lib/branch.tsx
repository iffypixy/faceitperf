import {Children} from "react";

interface BranchProps {
	if: boolean;
	children: React.ReactNode;
}

export const Branch: React.FC<BranchProps> = ({if: so, children}) => {
	const [then, otherwise] = Children.toArray(children);

	const output = so ? then : otherwise;

	return <>{output}</>;
};
