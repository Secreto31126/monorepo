import { loadProjectFromDirectory } from "@inlang/sdk";
import path from "node:path";
import { ENV_VARIABLES } from "../services/env-variables/index.js";
import { compileProject } from "./compileProject.js";
import { writeOutput } from "../services/file-handling/write-output.js";

/**
 * Loads, compiles, and writes the output to disk.
 *
 * This is the main function to use when you want to compile a project.
 * If you want to adjust inlang project loading, or the output, use
 * `compileProject()` instead.
 *
 * @example
 *   await compile({
 *     path: 'path/to/project',
 *     outdir: 'path/to/output',
 *   })
 */
export async function compile(args: {
	path: string;
	outdir: string;
	fs: typeof import("node:fs");
}): Promise<void> {
	const absoluteOutdir = path.resolve(process.cwd(), args.outdir);

	const project = await loadProjectFromDirectory({
		path: args.path,
		fs: args.fs,
		appId: ENV_VARIABLES.PARJS_APP_ID,
	});

	const output = await compileProject({
		project,
	});

	await writeOutput(absoluteOutdir, output, args.fs.promises);
}
