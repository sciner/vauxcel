import { MSAA_QUALITY } from '@pixi/constants.js';
import { Runner } from '@pixi/runner.js';
import { TextureSource } from '../textures/sources/TextureSource';

import type { GLFramebuffer } from './GLFramebuffer.js';

/**
 * A framebuffer can be used to render contents off of the screen. {@link PIXI.BaseRenderTexture} uses
 * one internally to render into itself. You can attach a depth or stencil buffer to a framebuffer.
 *
 * On WebGL 2 machines, shaders can output to multiple textures simultaneously with GLSL 300 ES.
 * @memberof PIXI
 */
export class Framebuffer
{
    /** Width of framebuffer in pixels. */
    public width: number;

    /** Height of framebuffer in pixels. */
    public height: number;

    /**
     * Desired number of samples for antialiasing. 0 means AA should not be used.
     *
     * Experimental WebGL2 feature, allows to use antialiasing in individual renderTextures.
     * Antialiasing is the same as for main buffer with renderer `antialias: true` options.
     * Seriously affects GPU memory consumption and GPU performance.
     * @example
     * import { MSAA_QUALITY } from 'pixi.js';
     *
     * renderTexture.framebuffer.multisample = MSAA_QUALITY.HIGH;
     * // ...
     * renderer.render(myContainer, { renderTexture });
     * renderer.framebuffer.blit(); // Copies data from MSAA framebuffer to texture
     * @default PIXI.MSAA_QUALITY.NONE
     */
    public multisample: MSAA_QUALITY;

    stencil: boolean;
    depth: boolean;
    dirtyId: number;
    dirtyFormat: number;
    dirtySize: number;
    depthTexture: TextureSource;
    colorTextures: Array<TextureSource>;
    glFramebuffers: {[key: string]: GLFramebuffer};
    disposeRunner: Runner;

    /**
     * @param width - Width of the frame buffer
     * @param height - Height of the frame buffer
     */
    constructor(width: number, height: number)
    {
        this.width = Math.round(width);
        this.height = Math.round(height);

        if (!this.width || !this.height)
        {
            throw new Error('Framebuffer width or height is zero');
        }

        this.stencil = false;
        this.depth = false;

        this.dirtyId = 0;
        this.dirtyFormat = 0;
        this.dirtySize = 0;

        this.depthTexture = null;
        this.colorTextures = [];

        this.glFramebuffers = {};

        this.disposeRunner = new Runner('disposeFramebuffer');
        this.multisample = MSAA_QUALITY.NONE;
    }

    /**
     * Reference to the colorTexture.
     * @readonly
     */
    get colorTexture(): TextureSource
    {
        return this.colorTextures[0];
    }

    /**
     * Add texture to the colorTexture array.
     * @param index - Index of the array to add the texture to
     * @param texture - Texture to add to the array
     */
    addColorTexture(index = 0, texture?: TextureSource): this
    {
        // TODO add some validation to the texture - same width / height etc?
        this.colorTextures[index] = texture || new TextureSource({
            scaleMode: 'nearest',
            resolution: 1,
            width: this.width,
            height: this.height,
        });

        this.dirtyId++;
        this.dirtyFormat++;

        return this;
    }

    /**
     * Add a depth texture to the frame buffer.
     * @param texture - Texture to add.
     */
    addDepthTexture(texture?: TextureSource): this
    {
        this.depthTexture = texture || new TextureSource({
            scaleMode: 'nearest',
            resolution: 1,
            width: this.width,
            height: this.height,
            format: 'depth32float',
        });

        this.dirtyId++;
        this.dirtyFormat++;

        return this;
    }

    /** Enable depth on the frame buffer. */
    enableDepth(): this
    {
        this.depth = true;

        this.dirtyId++;
        this.dirtyFormat++;

        return this;
    }

    /** Enable stencil on the frame buffer. */
    enableStencil(): this
    {
        this.stencil = true;

        this.dirtyId++;
        this.dirtyFormat++;

        return this;
    }

    /**
     * Resize the frame buffer
     * @param width - Width of the frame buffer to resize to
     * @param height - Height of the frame buffer to resize to
     */
    resize(width: number, height: number): boolean
    {
        width = Math.round(width);
        height = Math.round(height);

        if (!width || !height)
        {
            throw new Error('Framebuffer width and height must not be zero');
        }

        if (width === this.width && height === this.height) return false;

        this.width = width;
        this.height = height;

        this.dirtyId++;
        this.dirtySize++;

        for (let i = 0; i < this.colorTextures.length; i++)
        {
            const texture = this.colorTextures[i];
            const resolution = texture.resolution;

            // take into account the fact the texture may have a different resolution..
            texture.resize(width / resolution, height / resolution);
        }

        if (this.depthTexture)
        {
            const resolution = this.depthTexture.resolution;

            this.depthTexture.resize(width / resolution, height / resolution);
        }

        return true;
    }

    /** Disposes WebGL resources that are connected to this geometry. */
    dispose(): void
    {
        this.disposeRunner.emit(this, false);
    }

    /** Destroys and removes the depth texture added to this framebuffer. */
    destroyDepthTexture(): void
    {
        if (this.depthTexture)
        {
            this.depthTexture.destroy();
            this.depthTexture = null;

            ++this.dirtyId;
            ++this.dirtyFormat;
        }
    }
}
