/*

# Custom View / Rotate
This example shows a custom view that rotates the order of it's logical children when a signal is updated.

You can toggle the visibility of the entire view or one of it's children to demonstrate boundary tracking.

*/

import { $, Attach, View, render } from "rvx";
import { Emitter, Event } from "rvx/event";

export function Example() {
	const rotate = new Emitter<[]>();
	const allVisible = $(true);
	const innerVisible = $(true);

	return <div class="column">
		<div class="row">
			<button on:click={() => { rotate.emit() }}>Rotate Order</button>
			<button on:click={() => allVisible.value = !allVisible.value}>Toggle Outer Visibility</button>
			<button on:click={() => innerVisible.value = !innerVisible.value}>Toggle Inner Visibility</button>
		</div>
		<Attach when={allVisible}>
			<RotateOrder on={rotate.event}>
				<input type="text" value="A" />
				<input type="text" value="BB" />

				{/* This "Attach" view is treated as a single child: */}
				<Attach when={innerVisible}>
					<input type="text" value="CC1" />
					<input type="text" value="CC2" />
				</Attach>
			</RotateOrder>
		</Attach>
	</div>;
}

function RotateOrder(props: {
	children?: unknown;
	on: Event<[]>;
}) {
	// Get a flat array of all children of this component:
	const children = [props.children].flat(Infinity);

	// Skip creating an actual view if there is only zero or one child:
	if (children.length < 2) {
		return children[0];
	}

	// Create a new view instance that can
	// be directly used as content in rvx:
	// (See the "View" constructor docs for the exact
	//  requirements of a custom view implementation.)
	return new View((setBoundary, self) => {
		// Create a child view for each child using the "render" function:
		const views = children.map(render);
		// Create an initial parent node:
		const parent = document.createDocumentFragment();

		// Views need to keep track of their first and last nodes.
		for (const view of views) {
			view.appendTo(parent);

			// Keep track of child view boundary updates to
			// update this view's boundary:
			view.setBoundaryOwner((first, last) => {
				// Update the first node of the current view if
				// this child view is currently the first one:
				if (view === views[0]) {
					setBoundary(first, undefined);
				}
				// Update the last node of the current view if
				// this child view is currently the last one:
				if (view === views[views.length - 1]) {
					setBoundary(undefined, last);
				}
			});
		}

		// Set the initial boundary:
		setBoundary(parent.firstChild!, parent.lastChild!);

		// Handle rotation events:
		props.on(() => {
			const parent = self.parent;
			if (parent) {
				// Rotate the order in the view array and DOM nodes:
				const view = views.pop()!;
				view.insertBefore(parent, views[0].first);
				views.unshift(view);

				// Notify the custom view that our boundary has changed:
				setBoundary(view.first, views[views.length - 1].last);
			}

			// If the parent doesn't exist, we can assume that there
			// is at most one node. Rotating the child nodes can be
			// skipped in this case.
		});
	});
}
