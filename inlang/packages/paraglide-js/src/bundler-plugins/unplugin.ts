import type { UnpluginFactory } from "unplugin";
import type { ParaglideCompilerOptions } from "../compiler/compileProject.js";
import { compile } from "../compiler/compile.js";
import fs from "node:fs";
import { resolve } from "node:path";

const PLUGIN_NAME = "unplugin-paraglide-js";

export const unpluginFactory: UnpluginFactory<{
	/**
	 * The path to the inlang project.
	 *
	 * @example "./project.inlang"
	 */
	project: string;
	/**
	 * The path to the output directory.
	 *
	 * @example "./src/paraglide"
	 */
	outdir: string;
	options?: ParaglideCompilerOptions;
}> = (args) => ({
	name: PLUGIN_NAME,
	enforce: "pre",
	async buildStart() {
		console.log("Paraglide JS: Compiling inlang project...");
		await compile({
			project: args.project,
			outdir: args.outdir,
			options: args.options,
			fs: wrappedFs,
		});

		for (const path of Array.from(readFiles)) {
			this.addWatchFile(path);
		}
	},
	async watchChange(path) {
		if (readFiles.has(path)) {
			console.log(`Paraglide JS: Recompiling inlang project...`);
			readFiles.clear();
			await compile({
				project: args.project,
				outdir: args.outdir,
				options: args.options,
				fs: wrappedFs,
			});
		}
	},
	webpack(compiler) {
		//we need the compiler to run before the build so that the message-modules will be present
		//In the other bundlers `buildStart` already runs before the build. In webpack it's a race condition
		compiler.hooks.beforeRun.tapPromise(PLUGIN_NAME, async () => {
			await compile({
				project: args.project,
				outdir: args.outdir,
				options: args.options,
				fs: wrappedFs,
			});
		});
	},
});

const readFiles = new Set<string>();

// Create a wrapper around the fs object to intercept and store read files
const wrappedFs: typeof import("node:fs") = {
	...fs,
	// @ts-expect-error - Node's fs has too many overloads
	readFile: (
		path: fs.PathLike | number,
		options: { encoding?: null; flag?: string } | null | undefined,
		callback: (err: NodeJS.ErrnoException | null, data: Buffer) => void
	) => {
		readFiles.add(resolve(process.cwd(), path.toString()));
		return fs.readFile(path, options, callback);
	},
	// @ts-expect-error - Node's fs has too many overloads
	readFileSync: (
		path: fs.PathLike | number,
		options?: { encoding?: null; flag?: string } | null | undefined
	) => {
		readFiles.add(resolve(process.cwd(), path.toString()));
		return fs.readFileSync(path, options);
	},
	promises: {
		...fs.promises,
		// @ts-expect-error - Node's fs.promises has too many overloads
		readFile: async (
			path: fs.PathLike,
			options?: { encoding?: null; flag?: string } | null
		): Promise<Buffer> => {
			readFiles.add(resolve(process.cwd(), path.toString()));
			return fs.promises.readFile(path, options);
		},
	},
	// Add other fs methods as needed
};
