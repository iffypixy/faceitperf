export interface Dto<Req, Res> {
	req: Req;
	res: Res;
}

export interface PropsWithClassName {
	className?: string;
}

export type Nullable<T> = T | null;

export interface ReqWithPagination {
	limit?: number;
	skip?: number;
}
