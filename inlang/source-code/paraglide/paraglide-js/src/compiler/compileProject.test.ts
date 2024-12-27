import { expect, test, describe, vi, beforeEach } from "vitest";
import { createProject as typescriptProject, ts } from "@ts-morph/bootstrap";
import {
	type BundleNested,
	Declaration,
	insertBundleNested,
	loadProjectInMemory,
	type Match,
	newProject,
	Pattern,
	VariableReference,
} from "@inlang/sdk";
import { compileProject } from "./compileProject.js";
import { rollup as _rollup } from "rollup";
import virtual from "@rollup/plugin-virtual";

beforeEach(() => {
	// reset the imports to make sure that the runtime is reloaded
	vi.resetModules();
	vi.restoreAllMocks();
});
describe("output-formalities", async () => {
	const project = await loadProjectInMemory({
		blob: await newProject({
			settings: {
				locales: ["en", "de"],
				baseLocale: "en",
			},
		}),
	});

	const output = await compileProject({ project });
	// the compiled should be ignored to avoid merge conflicts
	test("the files should include a gitignore file", async () => {
		expect(output).toHaveProperty(".gitignore");
		expect(output[".gitignore"]).toContain("*");
	});
	// ignore all formatting stuff
	test("the files should include a prettierignore file", async () => {
		expect(output).toHaveProperty(".prettierignore");
		expect(output[".prettierignore"]).toContain("*");
	});

	test("the files should include files for each language, even if there are no messages", async () => {
		const output = await compileProject({ project });
		expect(output["messages/en.js"]).toBeDefined();
		expect(output["messages/de.js"]).toBeDefined();
	});
});

describe("tree-shaking", () => {
	test("should tree-shake unused messages", async () => {
		const code = await bundleCode(
			output,
			`import * as m from "./paraglide/messages.js"

			console.log(m.sad_penguin_bundle())`
		);
		const log = vi.spyOn(console, "log").mockImplementation(() => {});
		// all required code for the message to be rendered is included like sourceLanguageTag.
		// but, all other messages except of 'sad_penguin_bundle' are tree-shaken away.
		for (const { id } of mockBundles) {
			if (id === "sad_penguin_bundle") {
				expect(code).toContain(id);
			} else {
				expect(code).not.toContain(id);
			}
		}
		eval(code);
		expect(log).toHaveBeenCalledWith("A simple message.");
	});

	test("should not treeshake messages that are used", async () => {
		const code = await bundleCode(
			output,
			`import * as m from "./paraglide/messages.js"
		
			console.log(
				m.sad_penguin_bundle(),
				m.depressed_dog({ name: "Samuel" }),
				m.insane_cats({ name: "Samuel", count: 5 })
			)`
		);
		const log = vi.spyOn(console, "log").mockImplementation(() => {});
		for (const id of mockBundles.map((m) => m.id)) {
			if (["sad_penguin_bundle", "depressed_dog", "insane_cats"].includes(id)) {
				expect(code).toContain(id);
			} else {
				expect(code).not.toContain(id);
			}
		}
		eval(code);
		expect(log).toHaveBeenCalledWith(
			"A simple message.",
			"Good morning Samuel!",
			"Hello Samuel! You have 5 messages."
		);
	});
});

describe("e2e", async () => {
	// The compiled output needs to be bundled into one file to be dynamically imported.
	const code = await bundleCode(
		output,
		`export * as m from "./paraglide/messages.js"
		export * as runtime from "./paraglide/runtime.js"
		export * as en from "./paraglide/messages/en.js"`
	);

	// test is a direct result of a bug
	test("locales should include locales with a hyphen", async () => {
		const { runtime } = await importCode(code);

		expect(runtime.locales).toContain("en-US");
	});

	test("it should be possible to directly import a message function via a resource file", async () => {
		const { en } = await importCode(code);

		expect(en).toBeDefined();
		expect(en.sad_penguin_bundle()).toBe("A simple message.");
	});

	test("should set the baseLocale as default getLocale value", async () => {
		const { runtime } = await importCode(code);

		expect(runtime.getLocale()).toBe(runtime.baseLocale);
	});

	test("should return the correct message for the current locale", async () => {
		const { m, runtime } = await importCode(code);

		runtime.setLocale("en");

		expect(m.sad_penguin_bundle()).toBe("A simple message.");

		runtime.setLocale("de");

		expect(m.sad_penguin_bundle()).toBe("Eine einfache Nachricht.");
	});

	test("setting the locale as a getter function should be possible", async () => {
		const { m, runtime } = await importCode(code);

		runtime.setLocale(() => "en");

		expect(m.sad_penguin_bundle()).toBe("A simple message.");

		runtime.setLocale(() => "de");

		expect(m.sad_penguin_bundle()).toBe("Eine einfache Nachricht.");
	});

	test("defining onSetLocale should be possible and should be called when the locale changes", async () => {
		const { runtime } = await importCode(code);

		const mockOnSetLocale = vi.fn().mockImplementation(() => {});
		runtime.onSetLocale((locale: any) => {
			mockOnSetLocale(locale);
		});

		runtime.setLocale("de");
		expect(mockOnSetLocale).toHaveBeenLastCalledWith("de");

		runtime.setLocale("en");
		expect(mockOnSetLocale).toHaveBeenLastCalledWith("en");

		expect(mockOnSetLocale).toHaveBeenCalledTimes(2);
	});

	test("Calling onSetLocale() multiple times should override the previous callback", async () => {
		const cb1 = vi.fn().mockImplementation(() => {});
		const cb2 = vi.fn().mockImplementation(() => {});

		const { runtime } = await importCode(code);

		runtime.onSetLocale(cb1);
		runtime.setLocale("en");

		expect(cb1).toHaveBeenCalledTimes(1);

		runtime.onSetLocale(cb2);
		runtime.setLocale("de");

		expect(cb2).toHaveBeenCalledTimes(1);
		expect(cb1).toHaveBeenCalledTimes(1);
	});

	test("should return the correct message if a languageTag is set in the message options", async () => {
		const { m, runtime } = await importCode(code);

		// set the language tag to de to make sure that the message options override the runtime language tag
		runtime.setLanguageTag("de");
		expect(m.sad_penguin_bundle()).toBe("Eine einfache Nachricht.");
		expect(m.sad_penguin_bundle(undefined, { languageTag: "en" })).toBe(
			"A simple message."
		);
	});

	test("runtime.isAvailableLocale should only return `true` if a locale is passed to it", async () => {
		const { runtime } = await importCode(code);

		for (const tag of runtime.availableLanguageTags) {
			expect(runtime.isAvailableLocale(tag)).toBe(true);
		}

		expect(runtime.isAvailableLocale("")).toBe(false);
		expect(runtime.isAvailableLocale("pl")).toBe(false);
		expect(runtime.isAvailableLocale("--")).toBe(false);
	});

	test("falls back to base locale", async () => {
		const project = await loadProjectInMemory({
			blob: await newProject({
				settings: { locales: ["en", "de", "en-US"], baseLocale: "en" },
			}),
		});

		await insertBundleNested(
			project.db,
			createBundleNested({
				id: "missingInGerman",
				messages: [
					{
						locale: "en",
						variants: [
							{ pattern: [{ type: "text", value: "A simple message." }] },
						],
					},
				],
			})
		);

		const output = await compileProject({
			project,
		});
		const code = await bundleCode(
			output,
			`export * as m from "./paraglide/messages.js"
			export * as runtime from "./paraglide/runtime.js"`
		);
		const { m, runtime } = await importCode(code);

		runtime.setLocale("de");
		expect(m.missingInGerman()).toBe("A simple message.");

		runtime.setLocale("en-US");
		expect(m.missingInGerman()).toBe("A simple message.");
	});

	test("falls back to parent locale if message doesn't exist", async () => {
		const project = await loadProjectInMemory({
			blob: await newProject({
				settings: { locales: ["en", "en-US"], baseLocale: "en" },
			}),
		});

		await insertBundleNested(
			project.db,
			createBundleNested({
				id: "exists_in_both",
				messages: [
					{
						locale: "en",
						variants: [
							{ pattern: [{ type: "text", value: "A simple message." }] },
						],
					},
					{
						locale: "en-US",
						variants: [
							{
								pattern: [
									{ type: "text", value: "A simple message for Americans." },
								],
							},
						],
					},
				],
			})
		);

		await insertBundleNested(
			project.db,
			createBundleNested({
				id: "missing_in_en_US",
				messages: [
					{
						locale: "en",
						variants: [
							{ pattern: [{ type: "text", value: "Fallback message." }] },
						],
					},
				],
			})
		);

		const output = await compileProject({
			project,
		});

		const code = await bundleCode(
			output,
			`export * as m from "./paraglide/messages.js"
			export * as runtime from "./paraglide/runtime.js"`
		);
		const { m, runtime } = await importCode(code);

		runtime.setLocale("en-US");
		expect(m.exists_in_both()).toBe("A simple message for Americans.");

		runtime.setLocale("en-US");
		expect(m.missing_in_en_US()).toBe("Fallback message.");
	});

	test("throws an error if getLocale() returns an unavailable locale", async () => {
		const { runtime } = await importCode(code);

		expect(() => {
			runtime.setLocale(() => "dsklfgj");
			runtime.getLocale();
		}).toThrow();
	});
});

// remove with v3 of paraglide js
test("./runtime.js types", async () => {
	const project = await typescriptProject({
		useInMemoryFileSystem: true,
		compilerOptions: {
			outDir: "dist",
			declaration: true,
			allowJs: true,
			checkJs: true,
			module: ts.ModuleKind.Node16,
			strict: true,
		},
	});

	for (const [fileName, code] of Object.entries(output)) {
		if (fileName.endsWith(".js")) {
			project.createSourceFile(fileName, code);
		}
	}
	project.createSourceFile(
		"test.ts",
		`
    import * as runtime from "./runtime.js"

    // --------- RUNTIME ---------

    // getLocale() should return type should be a union of language tags, not a generic string
    runtime.getLocale() satisfies "de" | "en" | "en-US"

    // availableLocales should have a narrow type, not a generic string
    runtime.locales satisfies Readonly<Array<"de" | "en" | "en-US">>

    // setLocale() should fail if the given language tag is not included in availableLocales
    // @ts-expect-error
    runtime.setLocale("fr")

    // setLocale() should not fail if the given language tag is included in availableLocales
    runtime.setLocale("de")

		// setting the locale as a getter function should be possible
		runtime.setLocale(() => "en")

		// isAvailableLocale should narrow the type of it's argument
		const thing = 5;
		if(runtime.isAvailableLocale(thing)) {
			const a : "de" | "en" | "en-US" = thing
		} else {
			// @ts-expect-error - thing is not a language tag
			const a : "de" | "en" | "en-US" = thing
		}
  `
	);

	const program = project.createProgram();
	const diagnostics = ts.getPreEmitDiagnostics(program);
	for (const diagnostic of diagnostics) {
		console.error(diagnostic.messageText, diagnostic.file?.fileName);
	}
	expect(diagnostics.length).toEqual(0);
});

// remove with v3 of paraglide js
test("./runtime.js (legacy) types", async () => {
	const project = await typescriptProject({
		useInMemoryFileSystem: true,
		compilerOptions: {
			outDir: "dist",
			declaration: true,
			allowJs: true,
			checkJs: true,
			module: ts.ModuleKind.Node16,
			strict: true,
		},
	});

	for (const [fileName, code] of Object.entries(output)) {
		if (fileName.endsWith(".js")) {
			project.createSourceFile(fileName, code);
		}
	}
	project.createSourceFile(
		"test.ts",
		`
    import * as runtime from "./runtime.js"

    // --------- RUNTIME ---------

    // sourceLanguageTag should have a narrow type, not a generic string

    runtime.sourceLanguageTag satisfies "en"

    // availableLanguageTags should have a narrow type, not a generic string
    runtime.availableLanguageTags satisfies Readonly<Array<"de" | "en" | "en-US">>

    // setLanguageTag() should fail if the given language tag is not included in availableLanguageTags
    // @ts-expect-error
    runtime.setLanguageTag("fr")

    // setLanguageTag() should not fail if the given language tag is included in availableLanguageTags
    runtime.setLanguageTag("de")

    // languageTag should return type should be a union of language tags, not a generic string
    runtime.languageTag() satisfies "de" | "en" | "en-US"

		// setting the language tag as a getter function should be possible
		runtime.setLanguageTag(() => "en")

		// isAvailableLocale should narrow the type of it's argument
		const thing = 5;
		if(runtime.isAvailableLocale(thing)) {
			const a : "de" | "en" | "en-US" = thing
		} else {
			// @ts-expect-error - thing is not a language tag
			const a : "de" | "en" | "en-US" = thing
		}
  `
	);

	const program = project.createProgram();
	const diagnostics = ts.getPreEmitDiagnostics(program);
	for (const diagnostic of diagnostics) {
		console.error(diagnostic.messageText, diagnostic.file?.fileName);
	}
	expect(diagnostics.length).toEqual(0);
});

test("./messages.js types", async () => {
	const project = await typescriptProject({
		useInMemoryFileSystem: true,
		compilerOptions: {
			outDir: "dist",
			declaration: true,
			allowJs: true,
			checkJs: true,
			module: ts.ModuleKind.Node16,
			strict: true,
		},
	});

	for (const [fileName, code] of Object.entries(output)) {
		if (fileName.endsWith(".js")) {
			project.createSourceFile(fileName, code);
		}
	}
	project.createSourceFile(
		"test.ts",
		`
    import * as m from "./messages.js"

    // --------- MESSAGES ---------

    // the return value of a message should be a string
    m.insane_cats({ name: "John", count: 5 }) satisfies string
      
    // @ts-expect-error - missing all params
    m.insane_cats()
      
    // @ts-expect-error - one param missing
    m.insane_cats({ name: "John" })

    // a message without params shouldn't require params
    m.sad_penguin_bundle() satisfies string

		// --------- MESSAGE OPTIONS ---------
		// the languageTag option should be optional
		m.sad_penguin_bundle({}, {}) satisfies string

		// the languageTag option should be allowed
		m.sad_penguin_bundle({}, { languageTag: "en" }) satisfies string

		// the languageTag option must be a valid language tag
		// @ts-expect-error - invalid language tag
		m.sad_penguin_bundle({}, { languageTag: "---" })
  `
	);

	const program = project.createProgram();
	const diagnostics = ts.getPreEmitDiagnostics(program);
	for (const diagnostic of diagnostics) {
		console.error(diagnostic.messageText, diagnostic.file?.fileName);
	}
	expect(diagnostics.length).toEqual(0);
});

async function bundleCode(output: Record<string, string>, file: string) {
	const bundle = await _rollup({
		input: "main.js",
		output: {
			minifyInternalExports: false,
		},
		plugins: [
			// @ts-expect-error - rollup types are not up to date
			virtual({
				...Object.fromEntries(
					Object.entries(output).map(([fileName, code]) => [
						"paraglide/" + fileName,
						code,
					])
				),
				"main.js": file,
			}),
		],
	});
	const compiled = await bundle.generate({ format: "esm" });
	const code = compiled.output[0].code;
	return code;
}

async function importCode(code: string) {
	return await import(
		`data:application/javascript;base64,${Buffer.from(code, "utf8").toString("base64")}`
	);
}

const project = await loadProjectInMemory({
	blob: await newProject({
		settings: {
			baseLocale: "en",
			locales: ["en", "de", "en-US"],
		},
	}),
});

const mockBundles: BundleNested[] = [
	createBundleNested({
		id: "sad_penguin_bundle",
		messages: [
			{
				locale: "en",
				variants: [{ pattern: [{ type: "text", value: "A simple message." }] }],
			},
			{
				locale: "de",
				variants: [
					{ pattern: [{ type: "text", value: "Eine einfache Nachricht." }] },
				],
			},
		],
	}),
	{
		id: "depressed_dog",
		declarations: [
			{
				type: "input-variable",
				name: "name",
			},
		],
		messages: [
			{
				id: "depressed_dog_en",
				bundleId: "depressed_dog",
				locale: "en",
				selectors: [],
				variants: [
					{
						id: "depressed_dog_en_variant_one",
						messageId: "depressed_dog_en",
						matches: [],
						pattern: [
							{ type: "text", value: "Good morning " },
							{
								type: "expression",
								arg: { type: "variable-reference", name: "name" },
							},
							{ type: "text", value: "!" },
						],
					},
				],
			},
			{
				id: "depressed_dog_de",
				bundleId: "depressed_dog",
				locale: "de",
				selectors: [],

				variants: [
					{
						id: "depressed_dog_de_variant_one",
						messageId: "depressed_dog_de",
						matches: [],
						pattern: [
							{ type: "text", value: "Guten Morgen " },
							{
								type: "expression",
								arg: { type: "variable-reference", name: "name" },
							},
							{ type: "text", value: "!" },
						],
					},
				],
			},
		],
	},
	{
		id: "insane_cats",
		declarations: [
			{
				type: "input-variable",
				name: "name",
			},
			{
				type: "input-variable",
				name: "count",
			},
		],
		messages: [
			{
				id: "insane_cats_en",
				bundleId: "insane_cats",
				locale: "en",

				selectors: [],
				variants: [
					{
						id: "insane_cats_en_variant_one",
						messageId: "insane_cats_en",
						matches: [],
						pattern: [
							{ type: "text", value: "Hello " },
							{
								type: "expression",
								arg: { type: "variable-reference", name: "name" },
							},
							{ type: "text", value: "! You have " },
							{
								type: "expression",
								arg: { type: "variable-reference", name: "count" },
							},
							{ type: "text", value: " messages." },
						],
					},
				],
			},
			{
				id: "insane_cats_de",
				bundleId: "insane_cats",
				locale: "de",
				selectors: [],
				variants: [
					{
						id: "insane_cats_de_variant_one",
						messageId: "insane_cats_de",
						matches: [],
						pattern: [
							{ type: "text", value: "Hallo " },
							{
								type: "expression",
								arg: { type: "variable-reference", name: "name" },
							},
							{ type: "text", value: "! Du hast " },
							{
								type: "expression",
								arg: { type: "variable-reference", name: "count" },
							},
							{ type: "text", value: " Nachrichten." },
						],
					},
				],
			},
		],
	},
];

for (const bundle of mockBundles) {
	await insertBundleNested(project.db, bundle);
}

const output = await compileProject({ project });

function createBundleNested(args: {
	id: string;
	declarations?: Declaration[];
	messages: {
		selectors?: VariableReference[];
		locale: string;
		variants: {
			matches?: Match[];
			pattern: Pattern;
		}[];
	}[];
}): BundleNested {
	return {
		id: args.id,
		declarations: args.declarations ?? [],
		messages: args.messages.map((message) => ({
			id: args.id + "_" + message.locale,
			bundleId: args.id,
			locale: message.locale,
			selectors: message.selectors ?? [],
			variants: message.variants.map((variant) => ({
				id:
					args.id +
					"_" +
					message.locale +
					"_" +
					variant.pattern.map((p) => p.type).join(""),
				messageId: args.id,
				matches: variant.matches ?? [],
				pattern: variant.pattern,
			})),
		})),
	};
}
