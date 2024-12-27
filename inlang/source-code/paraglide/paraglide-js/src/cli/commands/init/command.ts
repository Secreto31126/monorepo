import { Command } from "commander";
import consola from "consola";
import * as nodePath from "node:path";
import { Logger } from "../../../services/logger/index.js";
import { findPackageJson } from "../../../services/environment/package.js";
import { checkForUncommittedChanges } from "../../steps/check-for-uncomitted-changes.js";
import { initializeInlangProject } from "../../steps/initialize-inlang-project.js";
import { maybeAddSherlock } from "../../steps/maybe-add-sherlock.js";
import { maybeChangeTsConfig } from "../../steps/update-ts-config.js";
import { promptForOutdir } from "../../steps/prompt-for-outdir.js";
import { updatePackageJson } from "../../steps/update-package-json.js";
import { runCompiler } from "../../steps/run-compiler.js";
import type { CliStep } from "../../utils.js";
import nodeFs from "node:fs";
import type { NodeishFilesystem } from "../../../services/file-handling/types.js";
import { ENV_VARIABLES } from "../../../services/env-variables/index.js";

export const initCommand = new Command()
	.name("init")
	.summary("Initializes inlang Paraglide-JS.")
	.action(async () => {
		const logger = new Logger({ silent: false, prefix: false });

		logger.box("Welcome to inlang Paraglide-JS 🪂");

		const ctx = {
			logger,
			fs: nodeFs.promises,
			syncFs: nodeFs,
			root: process.cwd(),
		} as const;

		const ctx1 = await checkForUncommittedChanges(ctx);
		const ctx2 = await enforcePackageJsonExists(ctx1);
		const ctx3 = await initializeInlangProject(ctx2);
		const ctx4 = await promptForOutdir(ctx3);

		const ctx5 = await addParaglideJsToDevDependencies(ctx4);

		const ctx6 = await addCompileStepToPackageJSON(ctx5);

		const ctx7 = await maybeChangeTsConfig(ctx6);
		const ctx8 = await maybeAddSherlock(ctx7);

		try {
			await runCompiler(ctx8);
			ctx.logger.success("Run paraglide compiler");
		} catch {
			ctx.logger.warn(
				"Failed to compile project automatically. You will need to run the compiler manually"
			);
		}

		const absoluteSettingsPath = nodePath.resolve(
			ctx8.projectPath,
			"settings.json"
		);
		const relativeSettingsFilePath = absoluteSettingsPath.replace(
			process.cwd(),
			"."
		);

		const successMessage = [
			`inlang Paraglide-JS has been set up sucessfully.`,
			"\n",
			`1. Run your install command (npm i, yarn install, etc)`,
			`2. Register all your languages in ${relativeSettingsFilePath}`,
			`3. Run the build script (npm run build, or similar.)`,
			`4. Done :) Happy paragliding 🪂`,
			"\n",
			"\n",
			`For questions and feedback, visit`,
			`https://github.com/opral/inlang-paraglide-js/issues`,
		].join("\n");
		ctx.logger.box(successMessage);
	});

export const addParaglideJsToDevDependencies: CliStep<
	{
		fs: NodeishFilesystem;
		logger: Logger;
		packageJsonPath: string;
	},
	unknown
> = async (ctx) => {
	const ctx1 = await updatePackageJson({
		devDependencies: async (devDeps) => ({
			...devDeps,
			"@inlang/paraglide-js": ENV_VARIABLES.PARJS_PACKAGE_VERSION,
		}),
	})(ctx);
	ctx.logger.success(
		"Added @inlang/paraglide-js to the devDependencies in package.json."
	);
	return ctx1;
};

export const enforcePackageJsonExists: CliStep<
	{ logger: Logger; fs: NodeishFilesystem },
	{ packageJsonPath: string }
> = async (ctx) => {
	const packageJsonPath = await findPackageJson(ctx.fs, process.cwd());
	if (!packageJsonPath) {
		ctx.logger.warn(
			"No package.json found in the current working directory. Please change the working directory to the directory with a package.json file."
		);
		return process.exit(0);
	}
	return { ...ctx, packageJsonPath };
};

export const addCompileStepToPackageJSON: CliStep<
	{
		fs: NodeishFilesystem;
		logger: Logger;
		projectPath: string;
		outdir: string;
		packageJsonPath: string;
	},
	unknown
> = async (ctx) => {
	const projectPath = "./" + nodePath.relative(process.cwd(), ctx.projectPath);
	const outdir = "./" + nodePath.relative(process.cwd(), ctx.outdir);

	let shouldExit = false;

	ctx = await updatePackageJson({
		scripts: async (scripts) => {
			// add the compile command to the postinstall script
			// this isn't super important, so we won't interrupt the user if it fails
			if (!scripts.postinstall?.includes("paraglide-js compile")) {
				scripts.postinstall =
					`paraglide-js compile --project ${projectPath} --outdir ${outdir}` +
					(scripts.postinstall ? " && " + scripts.postinstall : "");
			}

			if (scripts.build === undefined) {
				scripts.build = `paraglide-js compile --project ${projectPath} --outdir ${outdir}`;
			} else if (scripts.build.includes("paraglide-js compile") === false) {
				scripts.build = `paraglide-js compile --project ${projectPath} --outdir ${outdir} && ${scripts.build}`;
			} else {
				ctx.logger
					.warn(`The "build" script in the \`package.json\` already contains a "paraglide-js compile" command.
				
				Please add the following command to your build script manually:
				
				\`paraglide-js compile --project ${ctx.projectPath}`);
				const response = await consola.prompt(
					"Have you added the compile command to your build script?",
					{
						type: "confirm",
						initial: false,
					}
				);
				if (response === false) {
					ctx.logger.log(
						"Please add the paraglide-js compile to your build script and try again."
					);
					shouldExit = true;
					throw new Error("Skip write");
				} else {
					throw new Error("Skip write");
				}
			}

			ctx.logger.success(
				"Successfully added the compile command to the build step in package.json."
			);
			return scripts;
		},
	})(ctx);

	if (shouldExit) process.exit(1);
	return ctx;
};
