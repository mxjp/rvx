import { $, Expression, get, watch } from "../core/signals.js";
import { Nest } from "../core/view.js";
import { ChildRouter } from "./child-router.js";
import { normalize } from "./path.js";
import { ROUTER } from "./router.js";

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
 * Find the first matching route.
 *
 * @param path The {@link normalize normalized} path to match against. Non normalized paths result in undefined behavior.
 * @param routes The routes to test in order.
 * @returns A match or undefined if none of the routes matched.
 */
export function matchRoute<T extends Route>(path: string, routes: Iterable<T>): RouteMatch<T> | undefined {
	for (const route of routes) {
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
}

export interface WatchedRoutes<T extends Route> {
	match: () => ParentRouteMatch<T> | undefined;
	rest: () => string;
}

/**
 * Watch and match routes against an expression.
 *
 * @param path The normalized path.
 * @param routes The routes to watch.
 * @returns An object with individually watchable route match and the unmatched rest path.
 */
export function watchRoutes<T extends Route>(path: Expression<string>, routes: Expression<Iterable<T>>): WatchedRoutes<T> {
	const parent = $<ParentRouteMatch<T> | undefined>(undefined);
	const rest = $<string>(undefined!);
	watch(() => matchRoute(get(path), get(routes)), match => {
		if (match) {
			if (!parent.value || parent.value.path !== match.path || parent.value.route !== match.route) {
				parent.value = match;
			}
			rest.value = match.rest;
		} else {
			parent.value = undefined;
			rest.value = "";
		}
	});
	return {
		match: () => parent.value,
		rest: () => rest.value,
	};
}

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
	content: (props: RouteProps<P>) => unknown;
}

/**
 * Match and render routes in the current context.
 *
 * A {@link ChildRouter} is injected as a replacement for the current router when rendering route content.
 */
export function Routes(props: {
	/**
	 * The routes to match.
	 */
	routes: Expression<Iterable<ComponentRoute<unknown>>>;
}): unknown {
	const router = ROUTER.current;
	if (!router) {
		// Router is not available in the current context:
		throw new Error("G3");
	}
	const watched = watchRoutes(() => router.path, props.routes);
	return Nest({
		children: () => {
			const match = watched.match();
			if (match) {
				return () => ROUTER.inject(new ChildRouter(router, match.path, watched.rest), () => {
					return match.route.content({ params: match.params });
				});
			}
		},
	});
}
