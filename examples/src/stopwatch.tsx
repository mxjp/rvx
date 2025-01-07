/*

# Stopwatch
A proper stopwatch that doesn't drift over time.

This example also demonstrates how state and logic can be separated from it's representation if needed.

*/

import { $, Expression, IndexFor, Show, get, memo, teardown } from "rvx";

export function Example() {
	// Create a reactive timer instance:
	const timer = createTimer();

	// Render the timer UI:
	return <div class="column">
		<div style={{ "font-size": "2rem" }}>
			<Time value={timer.elapsed} />
		</div>
		<div class="row">
			<Show when={timer.running} else={() => <>
					<button on:click={timer.start}>Start</button>
					<button on:click={timer.reset}>Reset</button>
			</>}>
				{() => <>
					<button on:click={timer.stop}>Stop</button>
					<button on:click={timer.lap}>Lap</button>
				</>}
			</Show>
		</div>
		<ul>
			<IndexFor each={timer.laps}>
				{(lap, index) => <li>
					Lap {index + 1}: <Time value={lap.lap} />
				</li>}
			</IndexFor>
		</ul>
	</div>;
}

// A small component for displaying a time in milliseconds:
function Time(props: {
	value: Expression<number>;
}) {
	return <>
		<Show when={() => {
			const hours = Math.floor(get(props.value) / 1000 / 60 / 60);
			if (hours > 0) {
				return String(hours);
			}
		}}>
			{hours => <>{hours}:</>}
		</Show>
		{() => String(Math.floor(get(props.value) / 1000 / 60) % 60)}
		:
		{() => String(Math.floor(get(props.value) / 1000) % 60).padStart(2, "0")}
		.
		{() => String(Math.floor(get(props.value)) % 1000).padStart(3, "0")}
	</>;
}

function createTimer() {
	type State = {
		type: "paused",
		elapsed: number,
		lastLap: number,
	} | {
		type: "running",
		started: number,
		lastLap: number,
	};

	// Create a signal that is updated with the current time every frame:
	const now = $(performance.now());
	let nextFrame = requestAnimationFrame(function update() {
		nextFrame = requestAnimationFrame(update);
		now.value = performance.now();
	});
	// Stop updating the timer when this lifecycle is disposed:
	teardown(() => cancelAnimationFrame(nextFrame));

	const laps = $<Lap[]>([]);
	const state = $<State>({
		type: "paused",
		elapsed: 0,
		lastLap: 0,
	});

	// Compute the elapsed time on demand from
	// the current time and state signals:
	const elapsed = memo(() => {
		switch (state.value.type) {
			case "paused": return state.value.elapsed;
			case "running": return now.value - state.value.started;
		}
	});

	// Return an object with reactive accessors for the
	// current state and some functions to control this timer:
	return {
		running: () => state.value.type === "running",
		laps: () => laps.value,
		elapsed,

		start: () => {
			if (state.value.type === "paused") {
				state.value = {
					type: "running",
					started: now.value - state.value.elapsed,
					lastLap: state.value.lastLap,
				};
			}
		},

		stop: () => {
			if (state.value.type === "running") {
				state.value = {
					type: "paused",
					elapsed: elapsed(),
					lastLap: state.value.lastLap,
				};
			}
		},

		lap: () => {
			const lap = elapsed() - state.value.lastLap;
			if (lap > 0) {
				state.value.lastLap = elapsed();
				laps.update(laps => {
					laps.push({
						lap,
						elapsed: elapsed(),
					});
				});
			}
		},

		reset: () => {
			laps.value = [];
			state.value = {
				type: "paused",
				elapsed: 0,
				lastLap: 0,
			};
		},
	};
}

interface Lap {
	lap: number;
	elapsed: number;
}
