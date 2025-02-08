# Views
Views are an abstraction for sequences of DOM nodes that may change over time. To keep track of their position they contain at least one node which may be a comment node if there is nothing to render.

Views can be used as [element content](../elements.md#content) or can be returned from [component functions](../components.md).

## Creating Views
Rvx provides the following views for common use cases:

+ [`render` & `mount`](./render.md) - Wrap content in a view.
+ [`<Show> / when`](show.md) - Render content if a condition is met.
+ [`<Attach> / attachWhen`](attach.md) -  Attach already rendered content if a condition is met.
+ [`<Nest> / nest`](nest.md) - Render a component returned from an expression.
+ [`<For> / forEach`](for-each.md) - Render content for each unique value in an iterable.
+ [`<Index> / indexEach`](index-each.md) - Render content for each index/value pair in an iterable.
+ [`movable`](movable.md) - Wrap content for safely moving it somewhere else.

## View API

!!! warning
	As a direct consumer of the view API, you need to guarantee that:

	+ The sequence of nodes inside the view is not modified from the outside.
	+ If there are multiple nodes, all nodes must have a common parent node at all time.

The current boundary can be access via the `first` and `last` properties.
```jsx
console.log(view.first, view.last);
```

A callback that is called for any boundary updates (known as the _boundary owner_) can be set until the current [lifecycle](../lifecycle.md) is disposed. Note, that there can be only one boundary owner at a time.
```jsx
view.setBoundaryOwner((first, last) => {
	// "first" and "last" are the new current boundary.
});
```

To move or detach a view, use the `appendTo`, `insertBefore` and `detach` functions. They ensure, that a view doens't break when moving or detaching a view with multiple nodes.
```jsx
// Append all nodes of the view to an element:
view.appendTo(someElement);

// Insert all nodes of the view before a reference node:
view.insertBefore(parent, someChild);

// Detach the view from it's current position:
view.detach();
```

## Implementing Views

!!! tip
	Before implementing your own view, consider using one of the [already existing](#creating-views) views. Custom views are usually only needed for very special (often performance critical) use cases involving a large number of elements to render.

!!! warning
	When implementing your own view, you need to guarantee the following:

	+ The view doesn't break when the parent node is replaced or when a view consisting of only a single node is detached from it's parent.
	+ The boundary is updated immediately after the first or last node has been updated.
	+ There is at least one node at all time.
	+ If there are multiple nodes, all nodes remain in the current parent.
	+ If there are multiple nodes, the initial nodes must have a common parent.
	+ When changing nodes, the view must remain in it's current position.
	+ When the [lifecycle](../lifecycle.md) the view was created in is disposed, it's content is no longer updated in any way and no nodes are removed.

A view is created using the `View` constructor. The example below creates a view that consists of a single text node:

=== "JSX"
	```jsx
	import { View } from "rvx";

	const view = new View((setBoundary, self) => {
		// "self" is this view instance.

		const node = document.createTextNode("Hello World!");

		// Set the initial first and last node:
		// (This must be called at least once before this callback returns)
		setBoundary(node, node);
	});
	```

=== "No Build"
	```jsx
	import { View } from "./rvx.js";

	const view = new View((setBoundary, self) => {
		// "self" is this view instance.

		const node = document.createTextNode("Hello World!");

		// Set the initial first and last node:
		// (This must be called at least once before this callback returns)
		setBoundary(node, node);
	});
	```

!!! warning
	The `self` parameter is the view that is currently being created.

	Before the boundary is initialized, `first`, `last` and `parent` may return `undefined` and using anything else will result in undefined behavior.

Most of the view implementations provided by rvx are returned from component functions like in the example below:

=== "JSX"
	```jsx
	function ExampleView(props: { message: string }) {
		return new View((setBoundary, self) => {
			const node = document.createTextNode(props.message);
			setBoundary(node, node);
		});
	}

	<ExampleView message="Hello World!" />
	```

=== "No Build"
	```jsx
	function ExampleView(props: { message: string }) {
		return new View((setBoundary, self) => {
			const node = document.createTextNode(props.message);
			setBoundary(node, node);
		});
	}

	ExampleView({ message: "Hello World!" })
	```

The example below appends an element every time an event is fired:

=== "JSX"
	```jsx
	import { View, Event } from "rvx";
	import { Emitter } from "rvx/event";

	function LogEvents(props: { messages: Event<[string]> }) {
		return new View((setBoundary, self) => {
			// Create a placeholder node:
			// In this example, this will always be the last node of the view.
			const placeholder = document.createComment("");
			setBoundary(placeholder, placeholder);

			props.messages(message => {
				// Ensure, that there is a parent node to append to:
				let parent = self.parent;
				if (!parent) {
					parent = document.createDocumentFragment();
					parent.appendChild(placeholder);
				}

				// Create & insert the new node before the placeholder:
				const node = <li>{message}</li> as Node;
				parent.insertBefore(node, placeholder);

				// If this is the first message to append, update the boundary:
				if (placeholder === self.first) {
					setBoundary(node, undefined);
					// After this, the view boundary will always consist
					// of the first appended message and the placeholder.
				}
			});
		});
	}

	const messages = new Emitter<[string]>();

	<ul>
		<LogEvents messages={messages.event} />
	</ul>

	messages.emit("Foo");
	messages.emit("Bar");
	```

=== "No Build"
	```jsx
	import { View, Event, Emitter, e } from "./rvx.js";

	function LogEvents(props) {
		return new View((setBoundary, self) => {
			// Create a placeholder node:
			// In this example, this will always be the last node of the view.
			const placeholder = document.createComment("");
			setBoundary(placeholder, placeholder);

			props.messages(message => {
				// Ensure, that there is a parent node to append to:
				let parent = self.parent;
				if (!parent) {
					parent = document.createDocumentFragment();
					parent.appendChild(placeholder);
				}

				// Create & insert the new node before the placeholder:
				const node = e("li").append(message).elem;
				parent.insertBefore(node, placeholder);

				// If this is the first message to append, update the boundary:
				if (placeholder === self.first) {
					setBoundary(node, undefined);
					// After this, the view boundary will always consist
					// of the first appended message and the placeholder.
				}
			});
		});
	}

	const messages = new Emitter<[string]>();

	e("ul").append(
		LogEvents({ messages: messages.event })
	)

	messages.emit("Foo");
	messages.emit("Bar");
	```

You can find more complex view implementation examples [in rvx's core view module](https://github.com/mxjp/rvx/blob/main/src/core/view.ts) and [this example](../../examples/custom-view.md).

## Lifecycle Conventions
When the [lifecycle](../lifecycle.md) in which a view was created is disposed, all of it's nodes should remain in place by convention.
+ This results in much better performance when disposing large amounts of nested views.
+ Users of that view have the ability to keep displaying remaining content for animation purposes.
