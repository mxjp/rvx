
/**
 * @param {number} seed
 */
export function mulberry32(seed = 77) {
	return () => {
		let x = seed += 0x6D2B79F5;
		x = Math.imul(x ^ x >>> 15, x | 1);
		x ^= x + Math.imul(x ^ x >>> 7, x | 61);
		return (x ^ x >>> 14) >>> 0;
	};
}
