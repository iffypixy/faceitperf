/** @type { import("eslint").Linter.Config } */
module.exports = {
	root: true,
	env: {
		browser: true,
		node: true,
	},
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:react-hooks/recommended",
		"plugin:jsx-a11y/recommended",
	],
	parser: "@typescript-eslint/parser",
	ignorePatterns: [".eslintrc.cjs"],
};
