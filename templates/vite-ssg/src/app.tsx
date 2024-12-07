import { Routes } from "rvx/router";

export const prerender = [
	"",
	"404.html",
];

export function App() {
	return <Routes routes={[
		{
			match: "",
			content: () => <h1>Hello World!</h1>,
		},
		{
			content: () => <h1>Not found</h1>,
		},
	]} />;
}
