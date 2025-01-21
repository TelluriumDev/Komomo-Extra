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
 */
export class Config<T extends object> {
    /** File watcher instance for watching the config file changes */
    #fileWatcher: chokidar.FSWatcher | undefined

    /** Proxy handler for the configuration object to enable reactive updates */
    #proxyHandler: ProxyHandler<T> = {
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
                ? new Proxy(ret as object, this.#proxyHandler)
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
                    this.#proxyHandler
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

export class Language<T extends { [key: string]: string }> extends Config<T> {
    constructor(
        path: string,
        watchFile: boolean = false,
        defaultValue: T = {} as T,
        initManually: boolean = false
    ) {
        super(path, defaultValue, watchFile, initManually)
    }
    static async createLanguage<T extends { [key: string]: string }>(
        path: string,
        watchFile = false,
        defaultValue: T = {} as T
    ) {
        let langInstance = new Language<T>(path, watchFile, defaultValue, true)
        await langInstance.init()
        return langInstance
    }
    translate(key: string, data: any[]) {
        let result = this.get()[key]
        if (!result) {
            return key
        }
        for (let i = 0; i < data.length; i++) {
            let old = `{${data[i]}}`
            result = result.split(old).join(data[i])
        }
    }
}

export class I18n<T extends { [key: string]: string }> {
    #languages: Map<string, Language<T>> = new Map()
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
    async loadAllLanguages() {
        let langFiles = await fs.readdir(this.path)
        for (let langFile of langFiles) {
            await this.loadLanguage(path.parse(langFile).name)
        }
    }
    async loadLanguage(langCode: string) {
        this.#languages.set(
            langCode,
            await Language.createLanguage(
                path.resolve(this.path, `${langCode}.json`),
                this.watchFile,
                this.defaultValue
            )
        )
    }
    switchLanguage(langCode: string) {
        if (this.#languages.has(langCode)) {
            this.localLangCode = langCode
        }
    }
    get(langCode?: string) {
        let lang = this.#languages.get(langCode || this.localLangCode)
        if (!lang) {
            throw new Error(
                `Language '${lang}' not found. Please load it first.`
            )
        }
        return new Proxy(lang.get(), {
            get: (target, key) => {
                return Reflect.get(lang.get(), key)
            },
            set: (target, key, newValue) => {
                return Reflect.set(lang.get(), key, newValue)
            },
        })
    }
    async unloadLanguage(langCode: string) {
        let lang = this.#languages.get(langCode)
        if (lang) {
            await lang.unload()
            this.#languages.delete(langCode)
        }
    }
    async reloadLanguage(langCode: string) {
        await this.unloadLanguage(langCode)
        await this.loadLanguage(langCode)
    }
    async reloadAllLanguages() {
        for (let lang of this.#languages.keys()) {
            await this.reloadLanguage(lang)
        }
    }
}
