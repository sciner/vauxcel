import { Color } from '@pixi/color/Color.js';
import { MSAA_QUALITY } from '@pixi/constants.js';
import { Framebuffer } from '../framebuffer/Framebuffer.js';
import { TextureSource } from '../textures/sources/TextureSource';

import type { ColorSource } from '@pixi/color/Color.js';
import type { MaskData } from '../mask/MaskData.js';
import type { TextureSourceOptions } from '../textures/sources/TextureSource.js';

export interface BaseRenderTexture extends PixiMixins.BaseRenderTexture, TextureSource {}

/**
 * A BaseRenderTexture is a special texture that allows any PixiJS display object to be rendered to it.
 *
 * __Hint__: All DisplayObjects (i.e. Sprites) that render to a BaseRenderTexture should be preloaded
 * otherwise black rectangles will be drawn instead.
 *
 * A BaseRenderTexture takes a snapshot of any Display Object given to its render method. The position
 * and rotation of the given Display Objects is ignored. For example:
 * @example
 * import { autoDetectRenderer, BaseRenderTexture, RenderTexture, Sprite } from 'pixi.js';
 *
 * const renderer = autoDetectRenderer();
 * const baseRenderTexture = new BaseRenderTexture({ width: 800, height: 600 });
 * const renderTexture = new RenderTexture(baseRenderTexture);
 * const sprite = Sprite.from('spinObj_01.png');
 *
 * sprite.position.x = 800 / 2;
 * sprite.position.y = 600 / 2;
 * sprite.anchor.x = 0.5;
 * sprite.anchor.y = 0.5;
 *
 * renderer.render(sprite, { renderTexture });
 *
 * // The Sprite in this case will be rendered using its local transform.
 * // To render this sprite at 0,0 you can clear the transform
 * sprite.setTransform();
 *
 * const baseRenderTexture = new BaseRenderTexture({ width: 100, height: 100 });
 * const renderTexture = new RenderTexture(baseRenderTexture);
 *
 * renderer.render(sprite, { renderTexture }); // Renders to center of RenderTexture
 * @memberof PIXI
 */
export class BaseRenderTexture extends TextureSource
{
    public _clear: Color;

    /**
     * The framebuffer of this base texture.
     * @readonly
     */
    public framebuffer: Framebuffer;

    /** The data structure for the stencil masks. */
    maskStack: Array<MaskData>;

    /** The data structure for the filters. */
    filterStack: Array<any>;

    /**
     * @param options
     * @param {number} [options.width=100] - The width of the base render texture.
     * @param {number} [options.height=100] - The height of the base render texture.
     * @param {PIXI.SCALE_MODES} [options.scaleMode=PIXI.BaseTexture.defaultOptions.scaleMode] - See {@link PIXI.SCALE_MODES}
     *   for possible values.
     * @param {number} [options.resolution=PIXI.settings.RESOLUTION] - The resolution / device pixel ratio
     *   of the texture being generated.
     * @param {PIXI.MSAA_QUALITY} [options.multisample=PIXI.MSAA_QUALITY.NONE] - The number of samples of the frame buffer.
     */
    constructor(options: TextureSourceOptions)
    {
        options.width = options.width ?? 100;
        options.height = options.height ?? 100;
        options.glMutableSize = options.glMutableSize ?? true;

        super(options);

        // Set defaults
        this.autoGenerateMipmaps = false;

        this._clear = new Color([0, 0, 0, 0]);
        this.framebuffer = new Framebuffer(this.pixelWidth, this.pixelHeight)
            .addColorTexture(0, this);

        // TODO - could this be added the systems?
        this.maskStack = [];
        this.filterStack = [{}];
    }

    /** Color when clearning the texture. */
    set clearColor(value: ColorSource)
    {
        this._clear.setValue(value);
    }
    get clearColor(): ColorSource
    {
        return this._clear.value;
    }

    /**
     * Color object when clearning the texture.
     * @readonly
     * @since 7.2.0
     */
    get clear(): Color
    {
        return this._clear;
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
     * Resizes the BaseRenderTexture.
     * @param desiredWidth - The desired width to resize to.
     * @param desiredHeight - The desired height to resize to.
     */
    resize(desiredWidth: number, desiredHeight: number): boolean
    {
        if (super.resize(desiredWidth, desiredHeight))
        {
            this.framebuffer.resize(this.pixelWidth, this.pixelHeight);

            return true;
        }

        return false;
    }

    /**
     * Frees the texture and framebuffer from WebGL memory without destroying this texture object.
     * This means you can still use the texture later which will upload it to GPU
     * memory again.
     * @fires PIXI.BaseTexture#dispose
     */
    unload(): void
    {
        this.framebuffer.dispose();

        super.unload();
    }

    /** Destroys this texture. */
    destroy(): void
    {
        super.destroy();

        this.framebuffer.destroyDepthTexture();
        this.framebuffer = null;
    }
}
