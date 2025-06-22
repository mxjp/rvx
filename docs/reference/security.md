# Security
Rvx itself never evaluates code from strings, but as with any other framework, there are many ways to introduce severe security vulnerabilities into rvx based applications by directly using untrusted input in the wrong places.

## Interpolation
Interpolation in rendered content is always safe to use.

=== "JSX"
	```jsx
	// This is always safe to use:
	<h1>Hello {untrusted}!</h1>;

	// Using interpolation in content is equivalent to the following code:
	const text = document.createTextNode("");
	text.textContent = String(untrusted);
	```

=== "No Build"
	```jsx
	// This is always safe to use:
	e("h1").append("Hello ", untrusted, "!");

	// Using interpolation in content is equivalent to the following code:
	const text = document.createTextNode("");
	text.textContent = String(untrusted);
	```

Interpolation in attribute values is safe to use as long as the same is true for HTML itself. E.g. an image `alt` attribute is fine, but `href` is not.

=== "JSX"
	```jsx
	// The safety of this depends on the attribute ("alt" in this case):
	<img alt={untrusted} />;

	// Using interpolation in attribute values is equivalent to the following code:
	image.setAttribute("alt", String(untrusted));
	```

=== "No Build"
	```jsx
	// The safety of this depends on the attribute ("alt" in this case):
	e("img").set("alt", untrusted);

	// Using interpolation in attribute values is equivalent to the following code:
	image.setAttribute("alt", String(untrusted));
	```

## Common Mistakes
The examples below show some common mistakes and how they could be exploited.

=== "JSX"
	```jsx
	// Setting "innerHTML" to untrusted input:
	<div prop:innerHTML={untrusted} />;
	<div prop:innerHTML="<img src=x onerror=alert(location.origin)>" />;

	// Setting any event attributes to untrusted input:
	<div onclick={untrusted} />;
	<div onclick="alert(location.origin)" />;

	// Using untrusted input as attribute name:
	<div {...{ [untrusted]: someValue }} />
	<div onclick="alert(location.origin)" />;

	// Setting any url attribute to untrusted input:
	<a href={untrusted}>Click me!</a>
	<a href="javascript:alert(location.origin)">Click me!</a>
	```

=== "No Build"
	```jsx
	// Setting "innerHTML" to untrusted input:
	e("div").prop("innerHTML", untrusted);
	e("div").prop("innerHTML", "<img src=x onerror=alert(location.origin)>");

	// Setting any event attributes to untrusted input:
	e("div").set("onclick", untrusted);
	e("div").set("onclick", "alert(location.origin)");

	// Using untrusted input as attribute name:
	e("div").set(untrusted, someValue);
	e("div").set("onclick", "alert(location.origin)");

	// Setting any url attribute to untrusted input:
	e("a").set("href", untrusted).append("Click me!");
	e("a").set("href", "javascript:alert(location.origin)").append("Click me!");
	```

Note, that this is only a small fraction of things that can go wrong.
