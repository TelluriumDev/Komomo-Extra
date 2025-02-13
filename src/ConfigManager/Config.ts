import * as chokidar from "chokidar"
import fs from "fs-extra"

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
 * @example
 * // Define a configuration type
 * // 定义配置类型
 * interface AppConfig {
 *     username: string;
 *     theme: string;
 * }
 *
 * // Create an instance of the Config class
 * // 创建 `Config` 类的实例
 * const config = createConfig<AppConfig>("config.json", {
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
 * // Asynchronous initialization:
 * // 异步初始化：
 * async function setup() {
 *     const config = await createConfig(
 *      "config.json", {
 *      username: "guest",
 *      theme: "dark" },
 *      true // Will automatically reload configuration on file change 文件变化时自动重新加载配置
 *      );
 * // Tip: It's recommended to use `createConfig` to ensure the configuration is fully initialized before accessing it.
 * // 提示：推荐使用 `createConfig` 确保在访问配置之前配置已完全初始化。
 *     console.log(config.get().username); // Will print "guest" after initialization is complete 初始化完成后将打印 "guest"
 * }
 * setup();
 *
 */
export class Config<T extends object> {
    /** File watcher instance for watching the config file changes
     *
     * 用于监听配置文件变化的文件观察器实例
     */
    #fileWatcher: chokidar.FSWatcher | undefined

    /** Timestamp of the last save operation
     *
     * 上次保存操作的时间戳
     */
    #lastSaveTime: number = -1

    /** Flag to prevent unnecessary recursive saving during config reassignment
     *
     * 防止在配置重新赋值过程中触发不必要的递归保存的标志
     */
    #reAssigning: boolean = false

    /** The default configuration object that holds the initial configuration values
     *
     *存储初始配置值的默认配置对象
     */
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
        this.#defaultConfig = config
        ;(async () => {
            await this.init()
            afterInit()
        })()
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
     *
     * 卸载当前配置并停止监听文件变化。
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
     *
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
 * Creates an instance of the Config class and initializes it automatically.
 *
 * 创建并自动初始化 `Config` 类的实例。
 *
 * @param path - The file path to the configuration file 配置文件的路径
 * @param config - The initial configuration object 初始配置对象
 * @param watchFile - Whether to watch the config file for changes (default: false). 是否监听配置文件变化（默认为 false）。
 *  If true, the file will be watched for changes and the configuration will be reloaded when the file is modified, added, or deleted.
 *  如果为 true，文件将被监听，当文件被修改、添加或删除时，配置将被重新加载。
 * @returns The initialized Config instance 已初始化的 `Config` 实例
 */
export async function createConfig<T extends object>(
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
