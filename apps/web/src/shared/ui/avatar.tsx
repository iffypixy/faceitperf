import noavatar from "@shared/assets/avatar.webp";

export const Avatar: React.FC<React.ComponentProps<"img">> = (props) => (
	// eslint-disable-next-line jsx-a11y/alt-text
	<img
		{...props}
		onError={(event) => {
			event.currentTarget.src = noavatar;
		}}
	/>
);
