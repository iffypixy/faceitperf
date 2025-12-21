# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

### Guidelines

When reporting information, be extremely concise.

### Project overview

faceitperf is an HLTV-style performance tracking tool for FACEIT CS2/CS:GO players. It displays player statistics with HLTV Rating 2.0 calculations derived from machine learning models trained on HLTV data.

### Repository structure

- `apps/web/` - React frontend (Vite, TypeScript, TailwindCSS)
- `rating/` - ML pipeline for deriving HLTV Rating 2.0 formulae (TypeScript, Python)

### Essential Commands

In `apps/web/` directory:

- `pnpm run dev` - Start development server with hot reloading
- `pnpm run build` - Build web client for production

### Coding style

#### Avoid temporary variables if they are only used once, to reduce the mental load on people reading your code.

Don't write:

```typescript
const url = new URL("..."); // url isn't used for anything else than accessing its searchParams below
const param = url.searchParams.get("param");
```

Prefer:

```typescript
const param = new URL("...").searchParams.get("param");
```

#### Don't comment on what the code does, only comment if there is context that can't be inferred from the code

Don't write:

```typescript
// Parse the date
const d = new Date("...");
```

Prefer:

```typescript
const d = new Date("...");
```

#### When reasonable, omit braces on if/for statements to make the code more compact

Don't write:

```typescript
if (cond) {
	return 3;
}
```

Prefer:

```typescript
if (cond) return 3;
```
