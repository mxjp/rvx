import { $, Expression, get, map, memo, trigger, untrack, watch, watchUpdates } from "rvx";

declare const Expr: Expression<number>;
declare const Any: any;
declare const Unknown: unknown;
const pipe = trigger(() => {});

// These calls should be marked as deprecated:

watch(42, () => {});
watchUpdates(42, () => {});
memo(42);
untrack(42);
pipe(42);
get(42);
map(42, () => {});

// These calls should be ok:

watch(Expr, () => {});
watch(Any, () => {});
watch(Unknown, () => {});
watch(() => 42, () => {});
watch($(42), () => {});

watchUpdates(Expr, () => {});
watchUpdates(Any, () => {});
watchUpdates(Unknown, () => {});
watchUpdates(() => 42, () => {});
watchUpdates($(42), () => {});

memo(Expr);
memo(Any);
memo(Unknown);
memo(() => 42);
memo($(42));

untrack(Expr);
untrack(Any);
untrack(Unknown);
untrack(() => 42);
untrack($(42));

pipe(Expr);
pipe(Any);
pipe(Unknown);
pipe(() => 42);
pipe($(42));

get(Expr);
get(Any);
get(Unknown);
get(() => 42);
get($(42));

map(Expr, () => {});
map(Any, () => {});
map(Unknown, () => {});
map(() => 42, () => {});
map($(42), () => {});
