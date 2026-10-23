
/**
 * A function to test if a previous a next value are equal.
 */
export type EqualsFn<T> = (prev: T, next: T) => boolean;

export const SKIP_EQ: EqualsFn<any> = () => false;

export function arrayEq<T>(innerEq: EqualsFn<T> = Object.is): EqualsFn<T[] | null | undefined> {
	return (prev, next) => {
		return (prev === next) || (
			Boolean(prev && next)
			&& prev!.length === next!.length
			&& prev!.some((p, i) => innerEq(p, next![i]))
		);
	};
}
