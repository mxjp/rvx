![](./docs/assets/banner.svg)

# rvx!
This is a signal based frontend framework.

```jsx
import { $, mount } from "rvx";

const count = $(0);

mount(
  document.body,
  <button on:click={() => { count.value++ }}>
    Clicked {count} times
  </button>
);
```

## [Documentation](https://mxjp.github.io/rvx/)
