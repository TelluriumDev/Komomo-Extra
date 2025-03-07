import { Config } from "./Config.js"

import fs from "fs-extra"
import path from "path"
/**
 * @template T type of language dictionary (key-value pairs for translations)
 * @template T 语言字典的类型（用于翻译的键值对）
 *
 * @description
 * The `Language` class extends the `Config` class and provides a way to manage
 * language files for internationalization (i18n). It can watch the language file
 * for changes and reload the translations when the file is updated.
 *
 * `Language` 类继承自 `Config` 类，并提供了一种管理语言文件的方法，用于国际化（i18n）。它可以监听语言文件的变化，
 * 并在文件更新时重新加载翻译内容。
 *
 * This class allows accessing and translating keys dynamically. If the translation
 * key is missing, it will return the key itself. It also supports replacing placeholders
 * in translations with data values.
 *
 * 该类允许动态访问和翻译键。如果缺少翻译键，它将返回键本身。它还支持用数据值替换翻译中的占位符。
 *
 * @example
 * const language = await createLanguage<{ [key: string]: string }>("en.json", true, { greeting: "Hello, {0}!" });
 * const translated = language.translate("greeting", ["John"]); // "Hello, John!"
 */
export class Language<T extends { [key: string]: string }> extends Config<T> {
    /**
     * Creates an instance of the `Language` class.
     * 创建 `Language` 类的实例。
     *
     * @param path - The file path to the language file
     *          - 语言文件的路径
     * @param watchFile - Whether to watch the language file for changes (default: false)
     *          - 是否监听语言文件的变化（默认为 false）
     * @param defaultValue - The default translations for the language
     *          - 语言的默认翻译
     * @param afterInit - A callback function to be executed after the language is initialized
     *          - 语言初始化后的回调函数
     */
    constructor(
        path: string,
        watchFile: boolean = false,
        defaultValue: T = {} as T,
        afterInit: () => void = () => {}
    ) {
        super(path, defaultValue, watchFile, afterInit)
    }

    /**
     * Translates a given key with optional placeholders replaced by the provided data.
     * 使用提供的数据替换可选占位符，翻译给定的键。
     *
     * @param key - The translation key to lookup in the language dictionary
     *          - 要在语言字典中查找的翻译键
     * @param data - An array of data values to replace placeholders in the translation string
     *          - 替换翻译字符串中占位符的数组数据
     * @returns The translated string with placeholders replaced, or the key itself if no translation is found
     *          - 替换占位符后的翻译字符串，如果未找到翻译，则返回键本身
     */
    translate(key: keyof T, data: any[]) {
        let result: string = this.get()[key]
        if (!result) {
            return key
        }
        for (let i = 0; i < data.length; i++) {
            const old = `{${i}}`
            result = result.split(old).join(data[i] as string)
        }
        return result
    }
}

/**
 * Creates an instance of the `Language` class and initializes it automatically.
 * 
 * 创建并自动初始化 `Language` 类的实例。
 *
 * @param path - The file path to the language file
 *          - 语言文件的路径
 * @param watchFile - Whether to watch the language file for changes (default: false)
 *          - 是否监听语言文件的变化（默认为 false）
 * @param defaultValue - The default translations for the language
 *          - 语言的默认翻译
 * @returns The initialized `Language` instance
 *          - 已初始化的 `Language` 实例
 */
export async function createLanguage<T extends { [key: string]: string }>(
    path: string,
    watchFile = false,
    defaultValue: T = {} as T
) {
    return new Promise<Language<T>>((resolve, _) => {
        const language = new Language<T>(path, watchFile, defaultValue, () => {
            resolve(language)
        })
    })
}

/**
 * @template T type of language dictionary (key-value pairs for translations)
 * @template T 语言字典的类型（用于翻译的键值对）
 *
 * @description
 * The `I18n` class is designed to handle multiple languages for internationalization (i18n).
 * It loads, manages, and switches between various `Language` instances dynamically, allowing
 * translation to be fetched based on the current language code. The class can also watch language
 * files for changes and reload them automatically.
 *
 * `I18n` 类旨在处理多语言国际化（i18n）。它动态加载、管理并切换不同的 `Language` 实例，
 * 允许根据当前的语言代码获取翻译。该类还可以监听语言文件的变化并自动重新加载它们。
 *
 * This class provides methods to:
 * - Load and switch between languages.
 * - Retrieve translations for keys in the active language.
 * - Reload individual languages or all languages at once.
 *
 * 该类提供以下方法：
 * - 加载和切换语言。
 * - 获取当前语言的翻译。
 * - 重新加载单个语言或一次性重新加载所有语言。
 *
 * @example
 * // Initialize I18n with English as the default language
 * // 使用英语作为默认语言初始化 I18n
 * const i18n = new I18n<{ greeting: string }>("./languages", "en", true);
 *
 * // or await for initialization:
 * // 或者等待初始化：
 * const i18n = await createI18n<{ greeting: string }>("./languages", "en", true);
 *
 * // Access translations in the current language
 * // 访问当前语言的翻译
 * console.log(i18n.get().greeting);
 * // "Hello" (if `en.json` exists with { "greeting": "Hello" })
 * // "Hello"（如果 `en.json` 存在并包含 { "greeting": "Hello" }）
 *
 * // Switch language to French
 * // 切换语言为法语
 * i18n.switchLanguage("fr");
 * console.log(i18n.get().greeting);
 * // "Bonjour" (if `fr.json` exists with { "greeting": "Bonjour" })
 * // "Bonjour"（如果 `fr.json` 存在并包含 { "greeting": "Bonjour" }）
 *
 * // Use the `translate` method to dynamically replace placeholders in translations
 * // 使用 `translate` 方法动态替换翻译中的占位符
 * const translated = i18n.translate("greeting", ["Alice"]);
 * console.log(translated); // "Hello, Alice!" (or equivalent in the active language)
 * // "Hello, Alice!"（或活动语言中的等效翻译）
 *
 * // Reload the French language file
 * // 重新加载法语语言文件
 * await i18n.reloadLanguage("fr");
 *
 * // Reload all languages
 * // 重新加载所有语言
 * await i18n.reloadAllLanguages();
 */
export class I18n<T extends { [key: string]: string }> {
    #languages: Map<string, Language<T>> = new Map()
    /**
     * Creates an instance of the `I18n` class and initializes it automatically.
     * 创建并自动初始化 `I18n` 类的实例。
     *
     * @param path - The directory path where language files are stored 语言文件存储的目录路径
     * @param localLangCode - The initial language code to use 初始语言代码
     * @param watchFile - Whether to watch language files for changes (default: false) 是否监听语言文件变化（默认值：false）
     *  If true, the files will be watched for changes and the language files will be reloaded when modified, added, or deconsted.
     *  如果为 true，文件将被监听，当文件被修改、添加或删除时，语言文件将被重新加载。
     * @param defaultValue - The default language translations (default: empty object) 默认语言翻译（默认值：空对象）
     * @param afterInit - A callback function to be executed after the i18n is initialized 在 i18n 初始化后执行的回调函数
     */
    constructor(
        public readonly path: string,
        public localLangCode: string,
        public readonly watchFile: boolean = false,
        public readonly defaultValue: T = {} as T,
        afterInit: () => void = () => {}
    ) {
        ;(async () => {
            await this.loadAllLanguages()
            afterInit()
        })()
    }

    /**
     * Loads all language files from the specified directory and adds them to the languages map.
     * 从指定目录加载所有语言文件，并将它们添加到语言映射中。
     */
    async loadAllLanguages() {
        const langFiles = await fs.readdir(this.path)
        for (const langFile of langFiles) {
            await this.loadLanguage(path.parse(langFile).name)
        }
    }

    /**
     * Loads a single language file by its code and adds it to the languages map.
     * 根据语言代码加载单个语言文件并将其添加到语言映射中。
     *
     * @param langCode - The language code to load
     * 要加载的语言代码
     */
    loadLanguage(langCode: string): Promise<void>

    /**
     * Loads a `Language` instance and adds it to the languages map.
     * 加载 `Language` 实例并将其添加到语言映射中。
     *
     * @param lang - The `Language` instance to load
     * 要加载的 `Language` 实例
     */
    loadLanguage(lang: Language<T>): void

    loadLanguage(value: any): any {
        // implement for string
        // 实现字符串类型的处理
        if (typeof value === "string") {
            return createLanguage(
                path.resolve(this.path, `${value}.json`),
                this.watchFile,
                this.defaultValue
            ).then((lang) => this.#languages.set(value, lang))
        }

        // implement for Language<T>
        // 实现 `Language<T>` 类型的处理
        this.#languages.set(path.parse(value.path).name, value)
    }

    /**
     * Switches the current active language to the specified language code.
     * 将当前活动语言切换到指定的语言代码。
     *
     * @param langCode - The language code to switch to
     * 要切换到的语言代码
     */
    switchLanguage(langCode: string) {
        if (this.#languages.has(langCode)) {
            this.localLangCode = langCode
        }
    }

    /**
     * Returns the translations for the current active language or the specified language code.
     * 返回当前活动语言或指定语言代码的翻译。
     *
     * @param langCode - The language code to fetch translations for (optional, defaults to `localLangCode`)
     * 要获取翻译的语言代码（可选，默认为 `localLangCode`）
     * @returns The `Language` instance for the specified language
     * 返回指定语言的 `Language` 实例
     * @throws Error if the language code does not exist
     * 如果语言代码不存在则抛出错误
     */
    get(langCode?: string) {
        const lang = this.#languages.get(langCode || this.localLangCode)
        if (!lang) {
            throw new Error(
                `Language '${lang}' not found. Please load it first.`
            )
        }
        return lang
    }

    /**
     * Returns the translations for the current active language or the specified language code.
     * 返回当前活动语言或指定语言代码的翻译。
     *
     * @param langCode - The language code to fetch translations for (optional, defaults to `localLangCode`)
     * langCode - 要获取翻译的语言代码（可选，默认为 `localLangCode`）
     * @returns The `Language` instance for the specified language
     * 返回指定语言的 `Language` 实例
     * @throws Error if the language code does not exist
     * 如果语言代码不存在则抛出错误
     */
    translate(key: keyof T, data: any[], langCode?: string) {
        const lang = langCode || this.localLangCode
        if (!this.#languages.has(lang)) {
            return key
        }
        return this.get(lang).translate(key, data)
    }

    /**
     * Unloads the specified language and removes it from the languages map.
     * 卸载指定的语言并从语言映射中移除。
     *
     * @param langCode - The language code to unload 要卸载的语言代码
     */
    async unloadLanguage(langCode: string) {
        const lang = this.#languages.get(langCode)
        if (lang) {
            await lang.unload()
            this.#languages.delete(langCode)
        }
    }

    /**
     * Reloads the specified language and updates its translations.
     * 
     * 重新加载指定的语言并更新其翻译。
     *
     * @param langCode - The language code to reload
     * @param langCode - 要重新加载的语言代码
     */
    async reloadLanguage(langCode: string) {
        await this.unloadLanguage(langCode)
        await this.loadLanguage(langCode)
    }

    /**
     * Reloads all languages and updates their translations.
     * 
     * 重新加载所有语言并更新它们的翻译。
     */
    async reloadAllLanguages() {
        for (const lang of this.#languages.keys()) {
            await this.reloadLanguage(lang)
        }
    }
}

/**
 * Creates an instance of the `I18n` class and initializes it automatically.
 * 
 * 创建并自动初始化 `I18n` 类的实例。
 *
 * @param path - The directory path where language files are stored 语言文件存储的目录路径
 * @param localLangCode - The initial language code to use 初始语言代码
 * @param watchFile - Whether to watch language files for changes (default: false) 是否监听语言文件变化（默认值：false）
 *  If true, the files will be watched for changes and the language files will be reloaded when modified, added, or deconsted.
 *  如果为 true，文件将被监听，当文件被修改、添加或删除时，语言文件将被重新加载。
 * @param defaultValue - The default language translations (default: empty object) 默认语言翻译（默认值：空对象）
 * @param afterInit - A callback function to be executed after the i18n is initialized 在 i18n 初始化后执行的回调函数
 * @returns The initialized `I18n` instance 已初始化的 `I18n` 实例
 */
export async function createI18n<T extends { [key: string]: string }>(
    path: string,
    localLangCode: string,
    watchFile: boolean = false,
    defaultValue: T = {} as T
) {
    return new Promise<I18n<T>>((resolve, _) => {
        const i18n = new I18n<T>(
            path,
            localLangCode,
            watchFile,
            defaultValue,
            () => {
                resolve(i18n)
            }
        )
    })
}
