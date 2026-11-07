# rvx/convert
+ `debounce(source, delay)` - Create a debounced signal for use in user input components.
+ `trim(source)` - Create a string trimming signal for use in user input components.
+ `string(expr)` - Stringify an expression.
  + E.g. `aria-expanded={string(expanded)}`
+ `optionalString(expr)` - Stringify except `null` or `undefined`.
  + E.g. `aria-expanded={optionalString(expanded)}`
+ `separated(expr, separator?)` - Join array entries.
  + E.g. `aria-owns={separated(["a", "b"])}`
