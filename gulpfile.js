import fs from "fs-extra"
import path from "path"

import gulp from "gulp"
import gts from "gulp-typescript"
import greplace from "gulp-replace"
import gzip from "gulp-zip"
import compile from "gulp-typescript"

const packageJson = fs.readJsonSync("package.json")
const tsConfigJson = fs.readJsonSync("tsconfig.json")

const srcProject = gts.createProject("tsconfig.json")

const distRoot = "./dist"
const distDir = path.join(distRoot, "/KomomoExtra")

function compileTask() {
    return gulp
        .src(tsConfigJson.include, { base: "./src" })
        .pipe(srcProject())
        .pipe(gulp.dest(distDir))
}

async function makeManifest() {
    const manifest = {
        name: "KomomoExtra",
        entry: "index.js",
        type: "KomomoJS",
        description: packageJson.description,
        author: packageJson.author,
        version: packageJson.version,
        dependencies: [
            {
                "name": "Komomo"
            }
        ]
    }
    await fs.ensureDir(distDir)
    await fs.writeJSON(path.join(distDir, "manifest.json"), manifest, { spaces: 4 })
}

async function createPackageJson() {
    await fs.ensureDir(distDir)
    const newPackageJson = Object.assign({}, packageJson)
    newPackageJson.devDependencies = {}
    await fs.writeJSON(path.join(distDir, "package.json"), newPackageJson, { spaces: 4 })
}

function removeLibInfo() {
    return gulp
        .src(path.join(distDir, "index.*"))
        .pipe(greplace(/^\/\/\/ <reference path=".*"\/>/g, ""))
        .pipe(gulp.dest(distDir))
}

function packToZip() {
    return gulp
        .src(path.join(distDir, "/**/*"), { base: "./dist" })
        .pipe(gzip(`KomomoExtra-${packageJson.version}.zip`))
        .pipe(gulp.dest(distRoot))
}

const buildTask = gulp.series([
    compileTask,
    removeLibInfo,
    createPackageJson
])

const packTask = gulp.series([
    makeManifest,
    packToZip
])

const buildPluginTask = gulp.series([
    buildTask,
    packTask
])

export const c = compileTask
export const build = buildTask
export const pack = packTask
export const plugin = buildPluginTask