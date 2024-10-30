export function isValidFaceitUsername(username: string) {
	const regex = /^[a-zA-Z0-9_-]{1,24}$/;

	return regex.test(username);
}
