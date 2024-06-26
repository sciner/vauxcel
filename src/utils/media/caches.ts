import type { Program, Texture, TextureSource } from '@pixi/core/index.js';

/**
 * @todo Describe property usage
 * @static
 * @name ProgramCache
 * @memberof PIXI.utils
 * @type {Record<string, Program>}
 */
export const ProgramCache: {[key: string]: Program} = {};

/**
 * @todo Describe property usage
 * @static
 * @name TextureCache
 * @memberof PIXI.utils
 * @type {Record<string, Texture>}
 */
export const TextureCache: {[key: string]: Texture} = Object.create(null);

/**
 * @todo Describe property usage
 * @static
 * @name BaseTextureCache
 * @memberof PIXI.utils
 * @type {Record<string, TextureSource>}
 */
export const BaseTextureCache: {[key: string]: TextureSource} = Object.create(null);

/**
 * Destroys all texture in the cache
 * @memberof PIXI.utils
 * @function destroyTextureCache
 */
export function destroyTextureCache(): void
{
    let key;

    for (key in TextureCache)
    {
        TextureCache[key].destroy();
    }
    for (key in BaseTextureCache)
    {
        BaseTextureCache[key].destroy();
    }
}

/**
 * Removes all textures from cache, but does not destroy them
 * @memberof PIXI.utils
 * @function clearTextureCache
 */
export function clearTextureCache(): void
{
    let key;

    for (key in TextureCache)
    {
        delete TextureCache[key];
    }
    for (key in BaseTextureCache)
    {
        delete BaseTextureCache[key];
    }
}
