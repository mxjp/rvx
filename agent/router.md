# rvx/router
+ `Router` - Common interface for routers. Routers provide reactive path, query & methods for navigation.
	+ `HistoryRouter` - History API router.
	+ `HashRouter` - Location hash router.
	+ `MemoryRouter` - In-memory router for e.g. server-side rendering or testing.
	+ `ChildRouter` - Router provided inside of matched routes with the rest path.
+ `ROUTER` - Context for the current router.
+ `ROUTER.current` - Get the router in this context.
+ `ROUTER.current!.root` - Get the root router for top level navigation.
+ `router.path()` / `router.query()` - Reactively get the unmatched rest path and query.
+ `router.push(path, query?)` / `router.replace(path, query?)` - Navigate.
+ `router.root` / `router.parent` - Get the root & parent router.
+ `routes(routes)` / `<Routes routes={...} />` - Match & render component routes.
+ `matchRoute(path, route)` - Test if a route matches the specified path.
+ `computedRoutes(path, routes)` - Match routes reactively.
+ `isCurrent(match, router?)` - Check if a pattern matches the current router's rest path.
+ `normalize(path)` / `join(parent, child)` / `relative(from, to)` - Path utilities.
