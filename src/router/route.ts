import { Component, computed, eq, Expression, get, nest, View } from "../core/index.js";
import { ChildRouter } from "./child-router.js";
import { normalize } from "./path.js";
import { Router, ROUTER } from "./router.js";

export interface RouteMatchResult {
	/**
	 * The normalized matched path.
	 */
	path: string;

	/**
	 * The parameters extracted from the matched path.
	 */
	params?: unknown;
}

export interface RouteMatchFn {
	/**
	 * Check if this route matches the specified path.
	 *
	 * @param path The path to match against.
	 * @returns The match result or undefined if the path doesn't match.
	 */
	(path: string): RouteMatchResult | undefined;
}

export interface Route {
	/**
	 * The paths this route matches.
	 */
	match?: string | RegExp | RouteMatchFn;
}

export interface ParentRouteMatch<T extends Route> {
	/**
	 * The route that has been matched.
	 */
	route: T;

	/**
	 * The normalized matched path.
	 */
	path: string;

	/**
	 * The parameters extracted from the matched path.
	 */
	params?: unknown;
}

export interface RouteMatch<T extends Route> extends ParentRouteMatch<T> {
	/**
	 * The normalized remaining rest path.
	 */
	rest: string;
}

/**
 * Match a route against the specified path.
 *
 * @param path The {@link normalize normalized} path to match against. Non normalized paths result in undefined behavior.
 * @param route The route to match.
 * @returns A match or undefined if the route doesn't match.
 */
export function matchRoute<T extends Route>(path: string, route: T): RouteMatch<T> | undefined {
	if (typeof route.match === "string") {
		const test = route.match === "/" ? "" : route.match;
		if (test.endsWith("/")) {
			if (path.startsWith(test) || path === test.slice(0, -1)) {
				return {
					route,
					path: normalize(path.slice(0, test.length - 1)),
					params: undefined,
					rest: normalize(path.slice(test.length)),
				};
			}
		} else if (test === path) {
			return { route, path, rest: "" };
		}
	} else if (typeof route.match === "function") {
		const match = route.match(path);
		if (match !== undefined) {
			let rest = path;
			if (path.startsWith(match.path) && (path.length === match.path.length || path[match.path.length] === "/")) {
				rest = normalize(path.slice(match.path.length));
			}
			return { ...match, route, rest };
		}
	} else if (route.match instanceof RegExp) {
		const match = route.match.exec(path);
		if (match !== null) {
			const matched = normalize(match[0], false);
			let rest = path;
			if (path.startsWith(matched) && (path.length === matched.length || path[matched.length] === "/")) {
				rest = normalize(path.slice(matched.length));
			}
			return { route, path: matched, params: match, rest };
		}
	} else {
		return { route, path: "", rest: path };
	}
}

export interface ComputedRoutes<T extends Route> {
	match: () => ParentRouteMatch<T> | undefined;
	rest: () => string;
}

/**
 * @deprecated Use {@link ComputedRoutes} instead.
 */
export type WatchedRoutes<T extends Route> = ComputedRoutes<T>;

/**
 * Match routes against an expression.
 *
 * @param path The normalized path.
 * @param routes The routes to match.
 * @returns An object with individually computable route match and the unmatched rest path.
 */
export function computedRoutes<T extends Route>(path: Expression<string>, routes: Expression<Iterable<T>>): ComputedRoutes<T> {
	const result = computed(() => {
		const p = get(path);
		for (const route of get(routes)) {
			const match = matchRoute(p, route);
			if (match) {
				return match;
			}
		}
	});
	const match = computed(result, eq<RouteMatch<T> | undefined>((a, b) => a?.route === b?.route && a?.path === b?.path));
	const rest = computed(() => result()?.rest ?? "");
	return { match, rest };
}

/**
 * @deprecated Use {@link computedRoutes} instead.
 */
export const watchRoutes = computedRoutes;

/**
 * Props passed to the root component of a {@link ComponentRoute}.
 */
export interface RouteProps<P = unknown> {
	/** Matched route parameters. */
	params: P;
}

/**
 * A route where the content is a component to render.
 */
export interface ComponentRoute<P = unknown> extends Route {
	content: Component<RouteProps<P>>;
}

/**
 * Match and render routes in the current context.
 *
 * A {@link ChildRouter} is provided as a replacement for the current router when rendering route content.
 */
export function routes(routes: Expression<Iterable<ComponentRoute<any>>>): View {
	const router = ROUTER.current;
	if (!router) {
		// Router is not available in the current context:
		throw new Error("G3");
	}
	const matched = computedRoutes(router.path, routes);
	return nest(matched.match, match => {
		if (match) {
			return ROUTER.provide(new ChildRouter(router, match.path, matched.rest), () => {
				return match.route.content({ params: match.params });
			});
		}
	});
}

/**
 * Match and render routes in the current context.
 *
 * A {@link ChildRouter} is provided as a replacement for the current router when rendering route content.
 */
export function Routes(props: {
	/**
	 * The routes to match.
	 */
	routes: Expression<Iterable<ComponentRoute<any>>>;
}): View {
	return routes(props.routes);
}

/**
 * Check if the specified pattern matches the current router's rest path.
 */
export function isCurrent(match: Route["match"], router?: Router): boolean {
	router ??= ROUTER.current;
	if (!router) {
		// Router is not available in the current context:
		throw new Error("G3");
	}
	return matchRoute(router.path(), { match }) !== undefined;
}
