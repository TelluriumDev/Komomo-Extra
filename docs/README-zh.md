<!-- markdownlint-disable MD033 -->

# Komomo-Extra

为 LeviLamina 上的 KomomoJS 模组提供的扩展库

[English](https://github.com/TelluriumDev/Komomo-Extra/) | 简体中文

## 介绍 🚀

此库为 KomomoJS 模组提供了额外的功能，具体包括：

- 方便地处理 JSON 配置文件
- 使用语言字典轻松翻译文本（i18n）
- ...

## 使用 🛠️

<details open>
<summary>作为 Levilamina 模组安装 Komomo-Extra</summary>

### 作为 Levilamina 模组安装 🎮

- 使用 lip 安装 Komomo-Extra 模组：

   ```bash
   lip install github.com/TelluriumDev/Komomo-Extra
   ```

- 然后在你的模组中导入它：

   ```js
   import * as KomomoExtra from "./KomomoExtra/index.js";
   ```

   你也可以使用

   ```js
   import { ... } from "./KomomoExtra/index.js";
   ```

   来导入特定的函数。

</details>

<details open>
<summary>作为 npm 包安装 Komomo-Extra</summary>

### 作为 npm 包安装 📦

- 在你的项目目录中运行以下命令，将该仓库作为 npm 包引入：

   ```bash
   npm i komomo-extra
   ```

- 然后以类似的方式在你的模组中导入它：

   ```js
   import * as KomomoExtra from "komomo-extra"
   ```

   你也可以使用

   ```js
   import { ... } from "komomo-extra";
   ```

   来导入特定的函数。

</details>

别忘了在你的 `manifest.json` 中添加 `KomomoExtra` 以确保它正常工作：

```jsonc
{
// manifest.json
//...
   "dependencies": [
         {
            "name": "Komomo-Extra"
      }
   ]
//...
}
```

## 联系我们 📞

- 在 GitHub 上描述你的问题或建议：[issues](https://github.com/TelluriumDev/Komomo-Extra/issues/new)

- 通过电子邮件与我们联系：

  - TelluriumDev（公共邮箱）：<contact@komomo.top>
  - 私人邮箱：<heyhey123@komomo.top>

- 加入我们的 QQ 群：825998853

## 构建 🏗️

你可以通过在项目目录中的终端运行以下命令来构建该库：

```bash
git clone https://github.com/TelluriumDev/Komomo-Extra.git
cd Komomo-Extra
npm i
git clone https://github.com/TelluriumDev/KomomoHelperLib.git
npx gulp build
```

如果你想将其构建为插件，可以运行 `npx gulp plugin` 替代 `npx gulp build`。

然后，构建输出将导出到 `/dist/KomomoExtra` 文件夹。

## 许可证 📜

本仓库使用 [CC0-1.0](https://github.com/TelluriumDev/Komomo-Extra/blob/main/LICENSE) 许可证发布。

欢迎提交 PR 或建议！🥵
