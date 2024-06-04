import {create} from "zustand";

export const useStore = create<{
	username: string;
	setUsername(username: string): void;
	isCurrentFormOpen: boolean;
	setIsCurrentFormOpen(open: boolean): void;
}>((set) => ({
	username: "",
	setUsername: (username) => set({username}),
	isCurrentFormOpen: true,
	setIsCurrentFormOpen: (open) => set({isCurrentFormOpen: open}),
}));
