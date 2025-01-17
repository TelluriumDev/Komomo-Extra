import * as chokidar from "chokidar"
import * as fs from "fs"

export class Config<T extends object> {
    #fileWatcher: chokidar.FSWatcher | undefined

    #proxyHandler: ProxyHandler<T> = {
        get: (target, key) => {
            if (key === "__isProxied") {
                return true
            }
            let ret = Reflect.get(target, key)
            return typeof ret === "object"
                ? new Proxy(ret as object, this.#proxyHandler)
                : ret
        },

        set: (target, key, newValue) => {
            let result = Reflect.set(target, key, newValue)
            if (!this.#reAssigning) {
                this.save()
            }
            return result
        },
    }

    #lastSaveTime: number = -1

    #reAssigning: boolean = false

    constructor(
        public readonly path: string,
        public config: T,
        public readonly watchFile: boolean = false
    ) {
        this.#init()
    }

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
                console.log("added")
                this.load()
            })
            .on("unlink", (path, stats) => {
                console.log("deleted")
                this.load()
            })
    }

    #init() {
        this.load()
        if (this.watchFile && !this.#fileWatcher) {
            this.#registerFileWatcher()
        }
    }

    load() {
        if (fs.existsSync(this.path)) {
            let configDataStr: string = fs
                .readFileSync(this.path, { encoding: "utf8" })
                .replace(/\/\/.*|\/\*[^]*?\*\//g, "")
            try {
                let configData = JSON.parse(configDataStr)
                if ((this.config as any).__isProxied) {
                    this.#reAssigning = true
                    console.log(
                        "reassigning",
                        this.#lastSaveTime,
                        fs.statSync(this.path).mtime.getTime()
                    )
                    Object.assign(this.config, configData)
                    this.#reAssigning = false
                    return
                }
                console.log("proxying")
                this.config = new Proxy(configData, this.#proxyHandler)
            } catch {
                console.warn("Occurred an error while initializing a Config.")
                let newPath = this.path + "_old"
                fs.renameSync(this.path, newPath)
            }
        }
        this.save()
    }

    save(indentation: number = 4) {
        let configData = JSON.stringify(this.config, null, indentation)
        fs.writeFileSync(this.path, configData)
        this.#lastSaveTime = fs.statSync(this.path).mtime.getTime()
    }

    async unload() {
        if (this.#fileWatcher) {
            await this.#fileWatcher.close()
            this.#fileWatcher = undefined
        }
        this.config = {} as T
    }

    reload() {
        this.unload().finally(() => this.#init())
    }

    get() {
        return this.config
    }
}
