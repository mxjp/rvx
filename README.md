This project is licensed under the [GNU Affero General Public License v3.0](./LICENSE).

![](./docs/assets/banner.svg)

# rvx!
This is a signal based frontend framework.

```jsx
import { $, mount } from "rvx";

const count = $(0);

<button on:click={() => { count.value++ }}>
	Clicked {count} times
</button>
```

## [Documentation](https://mxjp.github.io/rvx/)
