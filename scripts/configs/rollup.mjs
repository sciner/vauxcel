import path from 'node:path';
// import rename from '@pixi/rollup-plugin-rename-node-modules';
import esbuild from 'rollup-plugin-esbuild';
import replace from '@rollup/plugin-replace';
import { extensionConfig, packageInfo as pkg } from '../extensionConfig.mjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import { string } from 'rollup-plugin-string';

const compiled = (new Date()).toUTCString().replace(/GMT/g, 'UTC');
const banner = [
    `/*!`,
    ` * ${pkg.name} - v${pkg.version}`,
    ` * Compiled ${compiled}`,
    ` *`,
    ` * ${pkg.name} is licensed under the MIT License.`,
    ` * http://www.opensource.org/licenses/mit-license`,
    ` * `,
    ` * Copyright ${(new Date()).getFullYear()}, ${pkg.author}, All Rights Reserved`,
    ` */`,
].join('\n');

const builtInPackages = {
    '@vaux': 'VAUX',
    'vauxcel': 'VAUX'
};

// External dependencies, not bundled
const external = Object.keys(builtInPackages) // @pixi/*
    .concat(Object.keys(pkg.peerDependencies || {})) // Peer Dependencies
    .concat(Object.keys(pkg.dependencies || {})); // Dependencies

// These are the PixiJS built-in default globals
// for the browser bundle when referencing other core packages
const globals = {
    ...builtInPackages,
    ...extensionConfig.globals,
};

const basePlugins = [
    typescript(),
    resolve(),
    json(),
    string({
        include: [
            '**/*.frag',
            '**/*.vert',
        ],
    }),
    replace({
        preventAssignment: true,
        delimiters: ['__', '__'],
        VERSION: pkg.version,
    }),
];

// Plugins for browser-based bundles
const browserPlugins = [
    ...basePlugins,
    esbuild({ target: 'ES2017', minify: true })
];

// Plugins for module-based output
const modulePlugins = [
    ...basePlugins,
    // rename(),
    esbuild({ target: 'ES2020' })
];

const { source } = extensionConfig;
const basePath = path.dirname(path.join(process.cwd(), source));
const bundle = path.join(process.cwd(), extensionConfig.bundle);
const bundleModule = path.join(process.cwd(), extensionConfig.bundleModule);
const mainDir = path.dirname(path.join(process.cwd(), pkg.main));
const moduleDir = path.dirname(path.join(process.cwd(), pkg.module));
let { namespace } = extensionConfig;
let footer;

// If we're adding to the main PIXI namespace, we need to
// make sure we don't override the PIXI global, so we'll do this
// to insert the output of the extension into the PIXI global
if (namespace === 'PIXI')
{
    namespace = pkg.name.replace(/[^a-z-]/ig, '_').replace(/-/g, '');
    footer = `Object.assign(PIXI, ${namespace});`;
}

export default [
    ...!extensionConfig.environments.includes('node') ? [] : [{
        external,
        input: source,
        plugins: modulePlugins,
        output: [
            {
                dir: mainDir,
                entryFileNames: '[name].js',
                format: 'cjs',
                preserveModules: true,
                preserveModulesRoot: basePath,
                sourcemap: true,
                exports: 'named',
            },
            {
                dir: moduleDir,
                entryFileNames: '[name].mjs',
                format: 'esm',
                preserveModules: true,
                preserveModulesRoot: basePath,
                sourcemap: true,
                exports: 'named',
            }
        ],
    }],
    // Browser bundle (iife)
    ...!extensionConfig.environments.includes('browser') ? [] : [{
        external,
        plugins: browserPlugins,
        input: extensionConfig.bundleSource ?? source,
        treeshake: false,
        output: {
            banner,
            file: bundle,
            format: 'iife',
            name: namespace,
            footer,
            sourcemap: true,
            globals,
            exports: extensionConfig.bundleExports,
        },
    },
    // Module browser bundle (esm)
    {
        external,
        plugins: browserPlugins,
        input: extensionConfig.bundleModuleSource ?? source,
        treeshake: false,
        output: {
            banner,
            file: bundleModule,
            format: 'esm',
            sourcemap: true,
            exports: extensionConfig.bundleModuleExports,
        },
    }],
];
