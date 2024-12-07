# Contributing
Contributions are generally welcome. If you have any questions, suggestions or find a bug, feel free to [file an issue](https://github.com/mxjp/rvx/issues).

## Project Structure
```bash

# Benchmark utilities
benchmark/

# Compiled modules & bundles:
dist/
	es/ # Compiled ES modules & type definitions.

# Documentation source code:
docs/
	assets/    # rvx logo
	reference/ # API reference

# Source code for the examples:
examples/src/

# Scripts for development & publishing:
scripts/

# All the runtime source code:
src/
	async/   # Async utilities
	core/    # The core module
	element/ # Web Component API (RvxElement)
	event/   # Event System
	id/      # Unique ID utilities
	router/  # Routing API
	store/   # Store API (reactive wrappers)
	test/    # Test utilities

# Minimal templates for new projects:
templates/
	vite/    # Vite + TypeScript & JSX
	webpack/ # Webpack + TypeScript & JSX

# Unit tests for the runtime:
tests/
```

## Building Rvx
```bash
# Install dependencies:
npm ci

# Build & watch for changes:
npm start

# Build for production:
npm run build
```

## Running Tests
```bash
# Build rvx & tests:
npm run build
# Or build & watch for changes:
npm start

# Run (already built) tests:
npm test
```

## Building the Documentation
Building the docs also requires python and [mkdocs-material](https://squidfunk.github.io/mkdocs-material/)
```bash
# Install requirements:
pip install mkdocs-material

# Build examples:
npm run build --prefix examples

# Build the documentation:
mkdocs build --site-dir docs_out
```

## Running benchmarks
The benchmark setup runs a set of benchmarks from `benchmark/src/benchmarks` against one or more bundled snapshots of rvx in the same browsing context.

```bash
cd benchmark

# Install dependencies.
npm ci
npx playwright install

# Build & bundle a snapshot of the current source code:
# This creates a "base" snapshot or an "update" snapshot if base already exists.
node ./snapshot.js

# Run benchmarks against existing snapshots:
node ./run.js

# Run only benchmarks starting with "signals-":
node ./run.js --only signals-
```
