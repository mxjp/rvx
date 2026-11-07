# rvx/element
+ `class MyElement extends RvxElement` - Base class for rvx web components.
  + `abstract render()` - Called to render the component content.
  + `this.reflect(name)` - Get a signal that reflects an element attribute.
  + `static observedAttributes` - Array of attribute names used with `reflect`.
		+ This is required to update created signals when the DOM attribute changes.
