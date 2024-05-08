import { ENV } from '@pixi/constants.js';
import { settings } from '@pixi/settings/index.js';
import { BackgroundSystem, ContextSystem, StartupSystem, ViewSystem } from './systems.js';

/**
 * The maximum support for using WebGL. If a device does not
 * support WebGL version, for instance WebGL 2, it will still
 * attempt to fallback support to WebGL 1. If you want to
 * explicitly remove feature support to target a more stable
 * baseline, prefer a lower environment.
 * @static
 * @name PREFER_ENV
 * @memberof PIXI.settings
 * @type {number}
 * @default PIXI.ENV.WEBGL2
 */
settings.PREFER_ENV = ENV.WEBGL2;

/**
 * If set to `true`, *only* Textures and BaseTexture objects stored
 * in the caches ({@link PIXI.utils.TextureCache TextureCache} and
 * {@link PIXI.utils.BaseTextureCache BaseTextureCache}) can be
 * used when calling {@link PIXI.Texture.from Texture.from} or
 * {@link PIXI.BaseTexture.from BaseTexture.from}.
 * Otherwise, these `from` calls throw an exception. Using this property
 * can be useful if you want to enforce preloading all assets with
 * {@link PIXI.Assets Loader}.
 * @static
 * @name STRICT_TEXTURE_CACHE
 * @memberof PIXI.settings
 * @type {boolean}
 * @default false
 */
settings.STRICT_TEXTURE_CACHE = false;

/**
 * The default render options if none are supplied to {@link PIXI.Renderer}
 * or {@link PIXI.CanvasRenderer}.
 * @static
 * @name RENDER_OPTIONS
 * @memberof PIXI.settings
 * @type {PIXI.IRendererOptions}
 */
settings.RENDER_OPTIONS = {
    ...ContextSystem.defaultOptions,
    ...BackgroundSystem.defaultOptions,
    ...ViewSystem.defaultOptions,
    ...StartupSystem.defaultOptions,
};
