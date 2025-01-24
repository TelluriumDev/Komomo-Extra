import * as chokidar from "chokidar"
import fs from "fs-extra"
import path from "path"

/**
 * @template T type of config
 *
 * @description
 * The `Config` class provides a way to read, write, and watch a configuration file.
 * It supports automatic reloading when the file is changed, as well as saving the
 * configuration back to the file whenever modifications are made.
 *
 * This class uses a Proxy to enable reactive configuration updates and ensure
 * changes are automatically saved. It also watches the configuration file for changes
 * and reloads the configuration when the file is updated or deleted.
 *
 * // Define a configuration type
 * interface AppConfig {
 *     username: string;
 *     theme: string;
 * }
 *
 * // Create an instance of the Config class
 * const config = new Config<AppConfig>("config.json", {
 *     username: "user123",
 *     theme: "dark"
 * }, true);
 *
 * let configData = config.get();
 * // Access and modify the configuration
 * console.log(configData.username); // "user123"
 * configData.username = "newUser"; // Updates the configuration and saves it automatically
 *
 * // Reload configuration after changes
 * config.reload();
 *
 * @example
 * // Watching for changes:
 * const configWithWatch = new Config<AppConfig>("config.json", {
 *     username: "user123",
 *     theme: "light"
 * }, true); // Will automatically reload configuration on file change
 * @example
 * // Asynchronous initialization:
 * async function setup() {
 *     const config = await Config.createConfig("config.json", { username: "guest", theme: "dark" }, true);
 * // Tip: It's recommended to use `createConfig` to ensure the configuration is fully initialized before accessing it.
 *     console.log(config.get().username); // Will print "guest" after initialization is complete
 * }
 * setup();
 *
 */
export class Config<T extends object> {
    /** File watcher instance for watching the config file changes */
    #fileWatcher: chokidar.FSWatcher | undefined

    /** Timestamp of the last save operation */
    #lastSaveTime: number = -1

    /** Flag to prevent unnecessary recursive saving during config reassignment */
    #reAssigning: boolean = false

    /** The default configuration object that holds the initial configuration values */
    #defaultConfig: T

    /**
     * Creates an instance of the Config class.
     *
     * @param path - The file path to the configuration file
     * @param config - The initial configuration object
     * @param watchFile - Whether to watch the config file for changes (default: false).
     *  If true, the file will be watched for changes and the configuration will be reloaded when the file is modified, added, or deleted.
     * @param initManually - Whether to initialize the configuration manually or let the constructor do it (default: false).
     * If you set this to true, you need to call the `init` method manually.
     */
    constructor(
        public readonly path: string,
        public config: T,
        public readonly watchFile: boolean = false,
        initManually: boolean = false
    ) {
        this.#defaultConfig = config
        if (!initManually) {
            this.init()
        }
    }

    /**
     * Creates an instance of the Config class and initializes it automatically.
     *
     *
     * @param path - The file path to the configuration file
     * @param config - The initial configuration object
     * @param watchFile - Whether to watch the config file for changes (default: false).
     *  If true, the file will be watched for changes and the configuration will be reloaded when the file is modified, added, or deleted.
     * @returns The initialized Config instance
     */
    static async createConfig<T extends object>(
        path: string,
        config: T,
        watchFile = false
    ) {
        let configInstance = new Config<T>(path, config, watchFile, true)
        await configInstance.init()
        return configInstance
    }

    /**
     * Registers a file watcher to automatically reload the configuration
     * when the file is modified, added, or deleted.
     */
    #registerFileWatcher() {
        this.#fileWatcher = chokidar
            .watch(this.path, {
                persistent: true,
                alwaysStat: true,
                awaitWriteFinish: {
                    stabilityThreshold: 500,
                    pollInterval: 100,
                },
                ignoreInitial: true,
            })
            .on("change", (path, stats) => {
                if ((stats as fs.Stats).mtime.getTime() > this.#lastSaveTime) {
                    console.log("changed")
                    this.load()
                }
            })
            .on("add", (path, stats) => {
                if ((stats as fs.Stats).mtime.getTime() > this.#lastSaveTime) {
                    console.log("added")
                    this.load()
                }
            })
            .on("unlink", (path, stats) => {
                console.log("deleted")
                this.load()
            })
    }

    /**
     * Initializes the config by loading it from the file and setting up file watching if necessary.
     */
    async init() {
        await this.load()
        if (this.watchFile && !this.#fileWatcher) {
            this.#registerFileWatcher()
        }
    }

    /**
     * Loads the configuration from the specified file.
     * If the file does not exist, it creates an empty config file.
     * In case of an error, it attempts to rename the old configuration file.
     */
    async load() {
        let proxyHandler: ProxyHandler<T> = {
            /**
             * Intercepts `get` operations on the configuration object.
             * If the requested property is an object, it wraps it in a Proxy for further nesting.
             *
             * @param target - The target configuration object
             * @param key - The property key to access
             * @returns The value of the property, wrapped in a Proxy if it is an object
             */
            get: (target, key) => {
                if (key === "__isProxied") {
                    return true
                }
                let ret = Reflect.get(target, key)
                return typeof ret === "object"
                    ? new Proxy(ret as object, proxyHandler)
                    : ret
            },

            /**
             * Intercepts `set` operations on the configuration object.
             * Automatically saves the configuration after each update unless it is being reassigned during the `load` process.
             *
             * @param target - The target configuration object
             * @param key - The property key to set
             * @param newValue - The new value to assign
             * @returns `true` if the property was successfully set
             */
            set: (target, key, newValue) => {
                let result = Reflect.set(target, key, newValue)
                if (!this.#reAssigning) {
                    this.save()
                }
                return result
            },
        }

        if (await fs.pathExists(this.path)) {
            try {
                let configData = await fs.readJSON(this.path, { throws: true })
                if ((this.config as any).__isProxied) {
                    this.#reAssigning = true
                    Object.assign(this.config, configData)
                    this.#reAssigning = false
                    return
                }
                this.config = new Proxy(
                    Object.assign({}, this.config, configData),
                    proxyHandler
                )
            } catch {
                console.warn("Occurred an error while initializing a Config.")
                let newPath = this.path + "_old"
                await fs.rename(this.path, newPath)
            }
        } else {
            await fs.ensureFile(this.path)
        }
        await this.save()
    }

    /**
     * Saves the current configuration object to the file.
     *
     * @param indentation - The number of spaces to use for indentation (default: 4)
     */
    async save(indentation: number = 4) {
        await fs.writeJSON(this.path, this.config, { spaces: indentation })
        this.#lastSaveTime = (await fs.stat(this.path)).mtime.getTime()
    }

    /**
     * Unloads the current configuration and stops watching the file for changes.
     */
    async unload() {
        if (this.#fileWatcher) {
            await this.#fileWatcher.close()
            this.#fileWatcher = undefined
        }
        this.config = this.#defaultConfig as T
    }

    /**
     * Reloads the configuration by unloading and then reinitializing it.
     */
    async reload() {
        await this.unload()
        await this.init()
    }

    /**
     * Returns a proxy that wraps the current configuration object, enabling reactive access and updates.
     *
     * @returns A proxy for the configuration object
     */
    get() {
        return new Proxy(this.config, {
            get: (target, key) => {
                return Reflect.get(this.config, key)
            },
            set: (target, key, newValue) => {
                return Reflect.set(this.config, key, newValue)
            },
        })
    }
}

/**
 * @template T type of language dictionary (key-value pairs for translations)
 *
 * @description
 * The `Language` class extends the `Config` class and provides a way to manage
 * language files for internationalization (i18n). It can watch the language file
 * for changes and reload the translations when the file is updated.
 *
 * This class allows accessing and translating keys dynamically. If the translation
 * key is missing, it will return the key itself. It also supports replacing placeholders
 * in translations with data values.
 *
 * @example
 * const language = new Language<{ [key: string]: string }>("en.json", true, { greeting: "Hello, {0}!" });
 * const translated = language.translate("greeting", ["John"]); // "Hello, John!"
 */
export class Language<T extends { [key: string]: string }> extends Config<T> {
    /**
     * Creates an instance of the `Language` class.
     *
     * @param path - The file path to the language file
     * @param watchFile - Whether to watch the language file for changes (default: false)
     * @param defaultValue - The default translations for the language
     * @param initManually - Whether to initialize the language manually or let the constructor do it (default: false)
     */
    constructor(
        path: string,
        watchFile: boolean = false,
        defaultValue: T = {} as T,
        initManually: boolean = false
    ) {
        super(path, defaultValue, watchFile, initManually)
    }

    /**
     * Creates an instance of the `Language` class and initializes it automatically.
     *
     * @param path - The file path to the language file
     * @param watchFile - Whether to watch the language file for changes (default: false)
     * @param defaultValue - The default translations for the language
     * @returns The initialized `Language` instance
     */
    static async createLanguage<T extends { [key: string]: string }>(
        path: string,
        watchFile = false,
        defaultValue: T = {} as T
    ) {
        let langInstance = new Language<T>(path, watchFile, defaultValue, true)
        await langInstance.init()
        return langInstance
    }

    /**
     * Translates a given key with optional placeholders replaced by the provided data.
     *
     * @param key - The translation key to lookup in the language dictionary
     * @param data - An array of data values to replace placeholders in the translation string
     * @returns The translated string with placeholders replaced, or the key itself if no translation is found
     */
    translate(key: keyof T, data: any[]) {
        let result: string = this.get()[key]
        if (!result) {
            return key
        }
        for (let i = 0; i < data.length; i++) {
            let old = `{${data[i]}}`
            result = result.split(old).join(data[i] as string)
        }
    }
}

/**
 * @template T type of language dictionary (key-value pairs for translations)
 *
 * @description
 * The `I18n` class is designed to handle multiple languages for internationalization (i18n).
 * It loads, manages, and switches between various `Language` instances dynamically, allowing
 * translation to be fetched based on the current language code. The class can also watch language
 * files for changes and reload them automatically.
 *
 * This class provides methods to:
 * - Load and switch between languages.
 * - Retrieve translations for keys in the active language.
 * - Reload individual languages or all languages at once.
 *
 * @example
 * // Initialize I18n with English as the default language
 * const i18n = new I18n<{ greeting: string }>("./languages", "en", true);
 *
 * // or await for initialization:
 * const i18n = await I18n.createI18n<{ greeting: string }>("./languages", "en", true);
 *
 * // Access translations in the current language
 * console.log(i18n.get().greeting); // "Hello" (if `en.json` exists with { "greeting": "Hello" })
 *
 * // Switch language to French
 * i18n.switchLanguage("fr");
 * console.log(i18n.get().greeting); // "Bonjour" (if `fr.json` exists with { "greeting": "Bonjour" })
 *
 * // Use the `translate` method to dynamically replace placeholders in translations
 * const translated = i18n.translate("greeting", ["Alice"]);
 * console.log(translated); // "Hello, Alice!" (or equivalent in the active language)
 *
 * // Reload the French language file
 * await i18n.reloadLanguage("fr");
 *
 * // Reload all languages
 * await i18n.reloadAllLanguages();
 */
export class I18n<T extends { [key: string]: string }> {
    #languages: Map<string, Language<T>> = new Map()
    /**
     * Creates an instance of the `I18n` class and initializes it automatically.
     *
     * @param path - The directory path where language files are stored
     * @param localLangCode - The initial language code to use
     * @param watchFile - Whether to watch language files for changes (default: false)
     * @param defaultValue - The default language translations (default: empty object)
     * @param initManually - Whether to initialize the `I18n` instance manually (default: false)
     * @returns The initialized `I18n` instance
     */
    constructor(
        public readonly path: string,
        public localLangCode: string,
        public readonly watchFile: boolean = false,
        public readonly defaultValue: T = {} as T,
        initManually: boolean = false
    ) {
        if (!initManually) {
            this.loadAllLanguages()
        }
    }

    /**
     * Creates an instance of the `I18n` class and initializes it automatically.
     *
     * @param path - The directory path where language files are stored
     * @param localLangCode - The initial language code to use
     * @param watchFile - Whether to watch language files for changes (default: false)
     * @param defaultValue - The default language translations (default: empty object)
     * @returns The initialized `I18n` instance
     */
    static async createI18n<T extends { [key: string]: string }>(
        path: string,
        localLangCode: string,
        watchFile: boolean = false,
        defaultValue: T = {} as T
    ) {
        let i18nInstance = new I18n<T>(
            path,
            localLangCode,
            watchFile,
            defaultValue,
            true
        )
        await i18nInstance.loadAllLanguages()
        return i18nInstance
    }

    /**
     * Loads all language files from the specified directory and adds them to the languages map.
     */
    async loadAllLanguages() {
        let langFiles = await fs.readdir(this.path)
        for (let langFile of langFiles) {
            await this.loadLanguage(path.parse(langFile).name)
        }
    }

    /**
     * Loads a single language file by its code and adds it to the languages map.
     *
     * @param langCode - The language code to load
     */
    loadLanguage(langCode: string): Promise<void>

    /**
     * Loads a `Language` instance and adds it to the languages map.
     *
     * @param lang - The `Language` instance to load
     */
    loadLanguage(lang: Language<T>): void

    loadLanguage(value: any): any {
        // implement for string
        if (typeof value === "string") {
            return Language.createLanguage(
                path.resolve(this.path, `${value}.json`),
                this.watchFile,
                this.defaultValue
            ).then((lang) => this.#languages.set(value, lang))
        }

        // implement for Language<T>
        this.#languages.set(path.parse(value.path).name, value)
    }

    /**
     * Switches the current active language to the specified language code.
     *
     * @param langCode - The language code to switch to
     */
    switchLanguage(langCode: string) {
        if (this.#languages.has(langCode)) {
            this.localLangCode = langCode
        }
    }

    /**
     * Returns the translations for the current active language or the specified language code.
     *
     * @param langCode - The language code to fetch translations for (optional, defaults to `localLangCode`)
     * @returns The `Language` instance for the specified language
     * @throws Error if the language code does not exist
     */
    get(langCode?: string) {
        let lang = this.#languages.get(langCode || this.localLangCode)
        if (!lang) {
            throw new Error(
                `Language '${lang}' not found. Please load it first.`
            )
        }
        return lang
    }

    /**
     * Translates a given key with optional placeholders replaced by the provided data.
     *
     * @param key - The translation key to lookup in the language dictionary
     * @param data - An array of data values to replace placeholders in the translation string
     * @param langCode - The language code to use for translation (optional, defaults to `localLangCode`)
     * @returns The translated string with placeholders replaced, or the key itself if no translation is found
     */
    translate(key: keyof T, data: any[], langCode?: string) {
        let lang = langCode || this.localLangCode
        if (!this.#languages.has(lang)) {
            return key
        }
        return this.get(lang).translate(key, data)
    }

    /**
     * Unloads the specified language and removes it from the languages map.
     *
     * @param langCode - The language code to unload
     */
    async unloadLanguage(langCode: string) {
        let lang = this.#languages.get(langCode)
        if (lang) {
            await lang.unload()
            this.#languages.delete(langCode)
        }
    }

    /**
     * Reloads the specified language and updates its translations.
     *
     * @param langCode - The language code to reload
     */
    async reloadLanguage(langCode: string) {
        await this.unloadLanguage(langCode)
        await this.loadLanguage(langCode)
    }

    /**
     * Reloads all languages and updates their translations.
     */
    async reloadAllLanguages() {
        for (let lang of this.#languages.keys()) {
            await this.reloadLanguage(lang)
        }
    }
}
