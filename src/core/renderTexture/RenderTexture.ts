import { Texture } from '../textures/Texture.js';
import { BaseRenderTexture } from './BaseRenderTexture.js';

import type { MSAA_QUALITY } from '@pixi/constants.js';
import type { Rectangle } from '@pixi/math/index.js';
import type { Framebuffer } from '../framebuffer/Framebuffer.js';
import type { TextureSourceOptions } from '../textures/sources/TextureSource.js';

/**
 * A RenderTexture is a special texture that allows any PixiJS display object to be rendered to it.
 *
 * __Hint__: All DisplayObjects (i.e. Sprites) that render to a RenderTexture should be preloaded
 * otherwise black rectangles will be drawn instead.
 *
 * __Hint-2__: The actual memory allocation will happen on first render.
 * You shouldn't create renderTextures each frame just to delete them after, try to reuse them.
 *
 * A RenderTexture takes a snapshot of any Display Object given to its render method. For example:
 * @example
 * import { autoDetectRenderer, RenderTexture, Sprite } from 'pixi.js';
 *
 * const renderer = autoDetectRenderer();
 * const renderTexture = RenderTexture.create({ width: 800, height: 600 });
 * const sprite = Sprite.from('spinObj_01.png');
 *
 * sprite.position.x = 800 / 2;
 * sprite.position.y = 600 / 2;
 * sprite.anchor.x = 0.5;
 * sprite.anchor.y = 0.5;
 *
 * renderer.render(sprite, { renderTexture });
 *
 * // Note that you should not create a new renderer, but reuse the same one as the rest of the application.
 * // The Sprite in this case will be rendered using its local transform. To render this sprite at 0,0
 * // you can clear the transform
 *
 * sprite.setTransform();
 *
 * const renderTexture = new RenderTexture.create({ width: 100, height: 100 });
 *
 * renderer.render(sprite, { renderTexture });  // Renders to center of RenderTexture
 * @memberof PIXI
 */
export class RenderTexture extends Texture
{
    get baseTexture()
    {
        return this.source as BaseRenderTexture;
    }

    /**
     * Stores `sourceFrame` when this texture is inside current filter stack.
     *
     * You can read it inside filters.
     * @readonly
     */
    public filterFrame: Rectangle | null;

    /**
     * The key for pooled texture of FilterSystem.
     * @see PIXI.RenderTexturePool
     */
    public filterPoolKey: string | number | null;

    /**
     * @param baseRenderTexture - The base texture object that this texture uses.
     * @param frame - The rectangle frame of the texture to show.
     */
    constructor(baseRenderTexture: BaseRenderTexture, frame?: Rectangle)
    {
        super({ source: baseRenderTexture, frame });

        this.filterFrame = null;
        this.filterPoolKey = null;

        this.updateUvs();
    }

    get resolution()
    {
        return this.source.resolution;
    }

    setResolution(resolution: number)
    {
        this.resize(this.width, this.height, resolution);
    }

    /**
     * Shortcut to `this.baseTexture.framebuffer`, saves baseTexture cast.
     * @readonly
     */
    get framebuffer(): Framebuffer
    {
        return (this.source as BaseRenderTexture).framebuffer;
    }

    /**
     * Shortcut to `this.framebuffer.multisample`.
     * @default PIXI.MSAA_QUALITY.NONE
     */
    get multisample(): MSAA_QUALITY
    {
        return this.framebuffer.multisample;
    }

    set multisample(value: MSAA_QUALITY)
    {
        this.framebuffer.multisample = value;
    }

    /**
     * Resizes the render texture.
     * @param width - The new width of the render texture.
     * @param height - The new height of the render texture.
     * @param resolution - The new resolution of the render texture.
     * @returns This texture.
     */
    public resize(width: number, height: number, resolution?: number): this
    {
        this.source.resize(width, height, resolution);

        return this;
    }

    public static create(options: TextureSourceOptions): RenderTexture
    {
        return new RenderTexture(new BaseRenderTexture(options));
    }
}
