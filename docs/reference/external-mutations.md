# External Mutations
Rvx is built on the assumption that the rendered DOM tree is never mutated externally. This results in some limitations that are outlined on this page.

Common use cases for manual DOM mutation are the embedding of third party libraries or things that rvx just can't do.

## Attributes & Properties
Attributes and properties can be safely updated manually. When a signal involved in setting a value is updated, that value is overwritten.

In the example below, updating `someSignal` will overwrite only the `"alt"` attribute:

=== "JSX"
	```jsx
	const elem = <img src="./a.webp" alt={someSignal} /> as HTMLElement;
	elem.src = "./b.webp";
	elem.alt = "Something else...";
	```

=== "No Build"
	```jsx
	const elem = e("img").set("src", "./a.webp").set("alt", someSignal).elem;
	elem.src = "./b.webp";
	elem.alt = "Something else...";
	```

### `class`
When any signal used in the `class` attribute is updated, only the affected tokens are added or removed.

In the example below, updating `someSignal` has no effect on other tokens.

=== "JSX"
	```jsx
	const elem = <div class={["foo", someSignal]} /> as HTMLElement;
	elem.classList.remove("foo");
	elem.classList.add("bar");
	```

=== "No Build"
	```jsx
	const elem = e("div").class(["foo", someSignal]).elem;
	elem.classList.remove("foo");
	elem.classList.add("bar");
	```

### `style`
When any signal used in the `style` attribute is updated, only the affected property is overwritten.

In the example below, updating `someSignal` will only overwrite the `"color"` property:

=== "JSX"
	```jsx
	const elem = <div style={{ color: someSignal }} /> as HTMLElement;
	elem.style.color = "red";
	elem.style.display = "block";
	```

=== "No Build"
	```jsx
	const elem = e("div").style({ color: someSignal }).elem;
	elem.style.color = "red";
	elem.style.display = "block";
	```

## Nodes

!!! info
	The term **logical node** in this section refers to anything that was used as [content](./core/elements.md#content) such as an element, a text node or an entire view.

	Each line of content in the example below represents a logical node:

	=== "JSX"
		```jsx
		render(<>
			Hello World!
			<some-element />
			<Show when={...}>...</Show>
		</>);
		```

	=== "No Build"
		```jsx
		render([
			"Hello World!",
			e("some-element"),
			Show({ when: ... }),
		])
		```

	_The concept of logical nodes doesn't exist at runtime and is only a means of explanation._

!!! warning
	This section only covers the content of elements, content returned from components and views created with the [`mount` or `render`](./core/views/render.md) function.

	It's never safe to mutate the children of other views like `<Show>` or `<For>`.

### Inserting Nodes
Arbitrary nodes can always be safely inserted **between** logical children. In the case of elements, nodes can also be inserted as first or last child.

The example below shows safe and unsafe positions for inserting nodes:

=== "JSX"
	```jsx
	render(<>
		{/* unsafe */}
		A
		{/* safe */}
		B
		{/* unsafe */}
	</>)

	<div>
		{/* safe */}
		A
		{/* safe */}
		B
		{/* safe */}
	</div>
	```

=== "No Build"
	```jsx
	render([
		// unsafe
		"A",
		// safe
		"B",
		// unsafe
	])

	e("div").append(
		// safe
		"A",
		// safe
		"B",
		// safe
	)
	```

### Removing Nodes
Entire logical nodes can be safely removed if they are not the first or last one. In the case of elements, the first and last logical nodes can also be safely removed.

It's also safe to remove any nodes that have been manually inserted.

The example below shows which logical nodes are safe and which are unsafe to remove:

=== "JSX"
	```jsx
	render(<>
		A {/* unsafe */}
		B {/* safe */}
		C {/* unsafe */}
	</>)

	<div>
		A {/* safe */}
		B {/* safe */}
		C {/* safe */}
	</div>
	```

=== "No Build"
	```jsx
	render([
		"A", // unsafe
		"B", // safe
		"C", // unsafe
	])

	e("div").append(
		"A", // safe
		"B", // safe
		"C", // safe
	)
	```

!!! warning
	Removing nodes doesn't affect their [lifecycle](./core/lifecycle.md) in any way and signal updates for removed nodes are still processed.

!!! warning
	When removing entire views, you need to make sure that all nodes of that view remain in one same parent node at all time as explained [here](./core/views/index.md#view-api).

### Moving Nodes
Moving nodes is safe, if [removing](#removing-nodes) them from their current position and [inserting](#inserting-nodes) them at the new position is safe.

### Referencing Logical Nodes
Since the concept of logical nodes doesn't exist at runtime, you need to convert them into views using the [`render`](./core/views/render.md) function. A view's `first` and `last` properties always refer to the respective DOM nodes of that view.

=== "JSX"
	```jsx
	function SomeComponent() {
		const nodeB = render(<>B</>);
		console.log(nodeB.first, nodeB.last);
		return <>
			A
			{nodeB}
			C
		</>;
	}
	```

=== "No Build"
	```jsx
	function SomeComponent() {
		const nodeB = render("B");
		console.log(nodeB.first, nodeB.last);
		return [
			"A",
			nodeB,
			"C",
		];
	}
	```

!!! tip
	You can assume, that the `first` and `last` properties always refer to an arbitrary node since [views are never empty](./core/views/index.md#implementing-views).
