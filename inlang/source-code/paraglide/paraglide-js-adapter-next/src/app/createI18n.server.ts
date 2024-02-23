import { createLink } from "./Link.base"
import { getLanguage } from "./getLanguage.server"
import { availableLanguageTags, sourceLanguageTag } from "$paraglide/runtime.js"
import { prefixStrategy } from "./routing/prefix"
import { createNavigation, createRedirects } from "./navigation.base"
import { ExcludeConfig, createExclude } from "./exclude"
import { createMiddleware } from "./middleware"

export type I18nOptions<T extends string> = {
	/**
	 * A list of patterns that should not be localized.
	 *
	 * @example
	 * ```ts
	 * exclude: [/^\/api\//] // Exclude `/api/*` from localization
	 * ```
	 *
	 * @default []
	 */
	exclude?: ExcludeConfig

	/**
	 * The default language to use when no language is set.
	 *
	 * @default sourceLanguageTag
	 */
	defaultLanguage?: T

	/**
	 * A map of text-directions for each language.
	 */
	textDirection?: Record<T, "ltr" | "rtl">
}

/**
 * Creates an i18n instance that manages your internationalization.
 *
 * @param options The options for the i18n instance.
 * @returns An i18n instance.
 *
 * @example
 * ```ts
 * // src/lib/i18n.js:
 * import * as runtime from "../paraglide/runtime.js"
 * import { createI18n } from "@inlang/paraglide-js-adapter-sveltekit"
 *
 * export const i18n = createI18n({ ...options })
 * ```
 */
export function createI18n(options: I18nOptions<string> = {}) {
	const exclude = createExclude(options.exclude ?? [])

	const strategy = prefixStrategy({
		availableLanguageTags,
		sourceLanguageTag,
		exclude,
	})

	/**
	 * React Component that enables client-side transitions between routes.
	 *
	 * Automatically localises the href based on the current language.
	 */
	const Link = createLink(getLanguage, strategy)
	const { usePathname, useRouter } = createNavigation(getLanguage, strategy)
	const { redirect, permanentRedirect } = createRedirects(getLanguage, strategy)
	const middleware = createMiddleware(strategy)

	return {
		Link,
		usePathname,
		middleware,
		useRouter,
		redirect,
		permanentRedirect,
	}
}