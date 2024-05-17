import type { Repository } from "@lix-js/client"
import { findFile, type CliStep } from "../utils.js"
import type { Logger } from "@inlang/paraglide-js/internal"
import path from "node:path"

export const addParaglideJSComponent: CliStep<
	{ repo: Repository; logger: Logger },
	unknown
> = async (ctx) => {
	const layoutFilePath = await findFile({
		base: process.cwd(),
		candidates: ["./src/routes/+layout.svelte"],
		fs: ctx.repo.nodeishFs,
	})

	if (!layoutFilePath) {
		// create it
		const layoutFilePath = path.resolve(process.cwd(), "./src/routes/+layout.svelte")
		const boilerplate = `<!-- File autogenerated by the Paraglide-SvelteKit CLI - Feel free to edit -->
<script>
    import { ParaglideJS } from "@inlang/paraglide-sveltekit"
    import { i18n } from "$lib/i18n"
</script>

<ParaglideJS {i18n}>
    <slot />
</ParaglideJS>`

		await ctx.repo.nodeishFs.writeFile(layoutFilePath, boilerplate)
		ctx.logger.success("Added layout file with Language Provider")
		return ctx
	} else {
		// update it
		const content = await ctx.repo.nodeishFs.readFile(layoutFilePath, { encoding: "utf-8" })
		const updatedContent = updateLayoutFile(content)
		await ctx.repo.nodeishFs.writeFile(layoutFilePath, updatedContent)

		ctx.logger.success("Added Language Provider to src/routes/+layout.svelte")
		return ctx
	}
}

// assumption: The <script> element is at the top (if present) and the <style> at the bottom (if present)
function updateLayoutFile(content: string): string {
	const scriptStart = content.indexOf("<script")
	const scriptEnd = content.indexOf("</script>")

	if (scriptStart !== -1 && scriptEnd !== -1) {
		// if there is a script present, add the imports to it
	} else {
		// if there isn't a script present, add one with the imports
		content =
			`<script>
    import { ParaglideJS } from "@inlang/paraglide-sveltekit"
    import { i18n } from "$lib/i18n"
</script>

<ParaglideJS {i18n}>\n` + content
	}

	const styleStart = content.indexOf("<style")
	if (styleStart !== -1 && styleStart > scriptStart) {
		content = content + "\n</ParaglideJS>"
	} else {
		const before = content.slice(0, Math.max(0, scriptStart))
		const after = content.slice(Math.max(0, scriptEnd))

		content = before + "\n</ParaglideJS>\n" + after
	}

	return content
}
