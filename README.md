<!-- markdownlint-disable MD033 -->

# Komomo-Extra

Extra Library for the LeviLamina JavaScript mod with Komomo

English | [简体中文](https://github.com/TelluriumDev/Komomo-Extra/blob/main/docs/README-zh.md)

## Introduction 🚀

This library provides extra features for the LeviLamina JavaScript mod with Komomo, such as:

- Processing JSON configuration files conveniently
- Easily translating text using a language dictionary(i18n)
- ...

## Usage 🛠️

<details open>
<summary>Install Komomo-Extra as a mod</summary>

### Install as a mod 🎮

- Install Komomo-Extra as a mod by lip:

   ```bash
   lip install github.com/TelluriumDev/Komomo-Extra
   ```

- then import it in your mod:

   ```js
   import * as KomomoExtra from "./KomomoExtra/index.js";
   ```

   also you can use

   ```js
   import { ... } from "./KomomoExtra/index.js";
   ```

   to import specific functions.

don't forget to add `KomomoExtra` to your `dependencies` in your `manifest.json` to ensure it works properly:

```jsonc
{
// manifest.json
//...
   "dependencies": [
         {
            "name": "KomomoExtra"
      }
   ]
//...
}
```

</details>

<details open>
<summary>Install Komomo-Extra as a npm package</summary>

### Install as a npm package 📦

- Join this repository as a npm by running the following command in the terminal in your project directory:

   ```bash
   npm i komomo-extra
   ```

- then import it in your mod in a similar way:

   ```js
   import * as KomomoExtra from "komomo-extra"
   ```

   also you can use

   ```js
   import { ... } from "komomo-extra";
   ```

   to import specific functions.

</details>

## Contact Us 📞

- describe your issues or suggestions on github: [issues](https://github.com/TelluriumDev/Komomo-Extra/issues/new)

- communicate with us by email:

  - TelluriumDev(public email): <contact@komomo.top>
  - private email: <heyhey123@komomo.top>

- join our QQ group: 825998853

## Build 🏗️

you can build the library by running the following command in the terminal in your project directory:

```bash
git clone https://github.com/TelluriumDev/Komomo-Extra.git
cd Komomo-Extra
npm i
git clone https://github.com/TelluriumDev/KomomoHelperLib.git
npx gulp build
```

if you want to build it as a plugin, run `npx gulp plugin` instead of `npx gulp build`.

Then, the build output of this repository will be exported to the `/dist/KomomoExtra` folder.

## License 📜

This repository is released under the [CC0-1.0](https://github.com/TelluriumDev/Komomo-Extra/blob/main/LICENSE) license.

PR or suggestions are welcome!🥵
