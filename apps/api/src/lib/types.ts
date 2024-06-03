export type Nullable<T> = T | null;

export type Dto<Req, Res> = {
	req: Req;
	res: Res;
};
