import { Config } from "./Config/Config.js"
import * as fs from "fs"

let defaultConfig = {
    age: 24,
    id: 114514,
    userName: "XiaoMing",
    friend: {
        name_: "xiaoHong",
    },
}

let path = "./config.json"

let config = new Config<typeof defaultConfig>(
    path,
    defaultConfig,
    true //监控配置文件并自动更新
)
let configData: typeof defaultConfig = config.get()
console.log(configData)
//{ age: 24, id: 114514, userName: 'XiaoMing', friend: { name_: 'xiaoHong' } }

configData.friend.name_ = "XiaoGang"
console.log(configData)
//{ age: 24, id: 114514, userName: 'XiaoMing', friend: { name_: 'XiaoGang' } }

let text = JSON.parse(
    fs.readFileSync(path, { encoding: "utf8" })
) as typeof defaultConfig
text.userName = "XiaoHong"
fs.writeFileSync(path, JSON.stringify(text, null, 4))
config.load()
console.log(configData)
//{ age: 24, id: 114514, userName: 'XiaoHong', friend: { name_: 'XiaoGang' } }
