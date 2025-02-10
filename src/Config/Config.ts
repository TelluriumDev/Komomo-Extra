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
 * `Config` 类提供了一种读取、写入和监听配置文件的方法。
 * 它支持在文件更改时自动重新加载，并且每当配置被修改时都会将配置保存回文件。
 * 
 * This class uses a Proxy to enable reactive configuration updates and ensure
 * changes are automatically saved. It also watches the configuration file for changes
 * and reloads the configuration when the file is updated or deleted.
 * 
 * 该类使用 Proxy 来实现响应式的配置更新，确保配置更改会被自动保存。
 * 它还会监听配置文件的变化，当文件被更新或删除时，自动重新加载配置。
 *
 * // Define a configuration type
 * // 定义配置类型
 * interface AppConfig {
 *     username: string;
 *     theme: string;
 * }
 *
 * // Create an instance of the Config class
 * // 创建 `Config` 类的实例
 * const config = new Config<AppConfig>("config.json", {
 *     username: "user123",
 *     theme: "dark"
 * }, true);
 *
 * let configData = config.get();
 * // Access and modify the configuration
 * // 访问和修改配置
 * console.log(configData.username); // "user123"
 * configData.username = "newUser"; // Updates the configuration and saves it automatically 更新配置并自动保存
 *
 * // Reload configuration after changes
 * // 配置修改后重新加载
 * config.reload();
 *
 * @example
 * // Watching for changes:
 * const configWithWatch = new Config<AppConfig>("config.json", {
 *     username: "user123",
 *     theme: "light"
 * }, true); // Will automatically reload configuration on file change 文件变化时自动重新加载配置
 * @example
 * // Asynchronous initialization:
 * // 异步初始化：
 * async function setup() {
 *     const config = await Config.createConfig("config.json", { username: "guest", theme: "dark" }, true);
 * // Tip: It's recommended to use `createConfig` to ensure the configuration is fully initialized before accessing it.
 * // 提示：推荐使用 `createConfig` 确保在访问配置之前配置已完全初始化。
 *     console.log(config.get().username); // Will print "guest" after initialization is complete 初始化完成后将打印 "guest"
 * }
 * setup();
 *
 */
export class Config<T extends object> {
    /** File watcher instance for watching the config file changes */
    /** 用于监听配置文件变化的文件观察器实例 */
    #fileWatcher: chokidar.FSWatcher | undefined

    /** Timestamp of the last save operation */
    /** 上次保存操作的时间戳 */
    #lastSaveTime: number = -1

    /** Flag to prevent unnecessary recursive saving during config reassignment */
    /** 防止在配置重新赋值过程中触发不必要的递归保存的标志 */
    #reAssigning: boolean = false

    /** The default configuration object that holds the initial configuration values */
    /** 存储初始配置值的默认配置对象 */
    #defaultConfig: T

    /**
     * Creates an instance of the Config class.
     * 创建 `Config` 类的实例。
     *
     * @param path - The file path to the configuration file 配置文件的路径
     * @param config - The initial configuration object 初始配置对象
     * @param watchFile - Whether to watch the config file for changes (default: false). 是否监听配置文件变化（默认为 false）。
     *  If true, the file will be watched for changes and the configuration will be reloaded when the file is modified, added, or deleted.
     *  如果为 true，文件将被监听，当文件被修改、添加或删除时，配置将被重新加载。
     * @param afterInit - A callback function to be executed after the config is initialized 配置初始化完成后的回调函数
     */
    constructor(
        public readonly path: string,
        public config: T,
        public readonly watchFile: boolean = false,
        afterInit: () => void = () => {}
    ) {
        this.#defaultConfig = config;
        (async () => {
            
            await this.init()
            afterInit()
        })()
    }

    /**
     * Creates an instance of the Config class and initializes it automatically.
     * 创建并自动初始化 `Config` 类的实例。
     *
     * @param path - The file path to the configuration file 配置文件的路径
     * @param config - The initial configuration object 初始配置对象
     * @param watchFile - Whether to watch the config file for changes (default: false). 是否监听配置文件变化（默认为 false）。
     *  If true, the file will be watched for changes and the configuration will be reloaded when the file is modified, added, or deleted.
     *  如果为 true，文件将被监听，当文件被修改、添加或删除时，配置将被重新加载。
     * @returns The initialized Config instance 已初始化的 `Config` 实例
     */
    static async createConfig<T extends object>(
        path: string,
        config: T,
        watchFile = false
    ) {
        return new Promise<Config<T>>((resolve, _) => {
            let configInstance = new Config<T>(path, config, watchFile, () => {
                resolve(configInstance)
            })
        })
    }

    /**
     * Registers a file watcher to automatically reload the configuration
     * when the file is modified, added, or deleted.
     * 
     * 注册文件监听器，自动在文件修改、添加或删除时重新加载配置。
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
                    this.load()
                }
            })
            .on("add", (path, stats) => {
                if ((stats as fs.Stats).mtime.getTime() > this.#lastSaveTime) {
                    this.load()
                }
            })
            .on("unlink", (path, stats) => {
                this.load()
            })
    }

    /**
     * Initializes the config by loading it from the file and setting up file watching if necessary.
     *
     * 通过从文件加载配置并在必要时设置文件监视来初始化配置。
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
     * 
     * 从指定文件加载配置。如果文件不存在，它将创建一个空的配置文件。
     * 如果发生错误，它会尝试重命名旧的配置文件。
     */
    async load() {
        let proxyHandler: ProxyHandler<T> = {
            /**
             * Intercepts get operations on the configuration object.
             * If the requested property is an object, it wraps it in a Proxy for further nesting.
             * 
             * 拦截对配置对象的 `get` 操作。如果请求的属性是一个对象，则将其包装在 Proxy 中以进一步嵌套。
             *
             * @param target - The target configuration object 目标配置对象
             * @param key - The property key to access 要访问的属性键
             * @returns The value of the property, wrapped in a Proxy if it is an object 返回属性值，如果是对象，则包装成 Proxy
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
             * Intercepts set operations on the configuration object.
             * Automatically saves the configuration after each update unless it is being reassigned during the load process.
             * 
             * 拦截对配置对象的 `set` 操作。每次更新后自动保存配置，除非在加载过程中重新赋值。
             *
             * @param target - The target configuration object 目标配置对象
             * @param key - The property key to set 要设置的属性键
             * @param newValue - The new value to assign 要赋值的新值
             * @returns true if the property was successfully set 如果属性设置成功，则返回 `true`
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
     * 将当前配置保存到指定的文件。
     *
     * @param indentation - The number of spaces to use for indentation (default: 4)
     * 格式化 json 时首行缩进的空格数（默认：4）
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
     * Reloads the configuration from the file.
     *
     * 从文件重新加载配置。
     */
    async reload() {
        await this.unload()
        await this.init()
    }

    /**
     * Returns a proxy that wraps the current configuration object, enabling reactive access and updates.
     * 返回一个包装当前配置对象的代理，启用响应式访问和更新。
     *
     * @returns A proxy for the configuration object
     * @returns 配置对象的代理
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
 * const language = await Language.createLanguage<{ [key: string]: string }>("en.json", true, { greeting: "Hello, {0}!" });
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
     * Creates an instance of the `Language` class and initializes it automatically.
     * 创建并自动初始化 `Language` 类的实例。
     *
     * @param path - The file path to the language file
     * @param watchFile - Whether to watch the language file for changes (default: false)
     * @param defaultValue - The default translations for the language
     * @returns The initialized `Language` instance
     * @returns 已初始化的 `Language` 实例
     */
    static async createLanguage<T extends { [key: string]: string }>(
        path: string,
        watchFile = false,
        defaultValue: T = {} as T
    ) {
        return new Promise<Language<T>>((resolve, _) => {
            let language = new Language<T>(path, watchFile, defaultValue, () => {
                resolve(language)
            })
        })
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
            let old = `{${i}}`
            result = result.split(old).join(data[i] as string)
        }
        return result
    }
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
 * const i18n = await I18n.createI18n<{ greeting: string }>("./languages", "en", true);
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
     *  If true, the files will be watched for changes and the language files will be reloaded when modified, added, or deleted.
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
        (async () => {
            await this.loadAllLanguages()
            afterInit()
        })()
    }

    /**
     * Creates an instance of the `I18n` class and initializes it automatically.
     * 创建并自动初始化 `I18n` 类的实例。
     *
     * @param path - The directory path where language files are stored 语言文件存储的目录路径
     * @param localLangCode - The initial language code to use 初始语言代码
     * @param watchFile - Whether to watch language files for changes (default: false) 是否监听语言文件变化（默认值：false）
     *  If true, the files will be watched for changes and the language files will be reloaded when modified, added, or deleted.
     *  如果为 true，文件将被监听，当文件被修改、添加或删除时，语言文件将被重新加载。
     * @param defaultValue - The default language translations (default: empty object) 默认语言翻译（默认值：空对象）
     * @param afterInit - A callback function to be executed after the i18n is initialized 在 i18n 初始化后执行的回调函数
     * @returns The initialized `I18n` instance 已初始化的 `I18n` 实例
     */
    static async createI18n<T extends { [key: string]: string }>(
        path: string,
        localLangCode: string,
        watchFile: boolean = false,
        defaultValue: T = {} as T
    ) {
        return new Promise<I18n<T>>((resolve, _) => {
            let i18n = new I18n<T>(path, localLangCode, watchFile, defaultValue, () => {
                resolve(i18n)
            })
        })
    }

    /**
     * Loads all language files from the specified directory and adds them to the languages map.
     * 从指定目录加载所有语言文件，并将它们添加到语言映射中。
     */
    async loadAllLanguages() {
        let langFiles = await fs.readdir(this.path)
        for (let langFile of langFiles) {
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
            return Language.createLanguage(
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
        let lang = this.#languages.get(langCode || this.localLangCode)
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
        let lang = langCode || this.localLangCode
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
        let lang = this.#languages.get(langCode)
        if (lang) {
            await lang.unload()
            this.#languages.delete(langCode)
        }
    }

    /**
     * Reloads the specified language and updates its translations.
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
     * 重新加载所有语言并更新它们的翻译。
     */
    async reloadAllLanguages() {
        for (let lang of this.#languages.keys()) {
            await this.reloadLanguage(lang)
        }
    }
}
