import { Renderer, RenderTexture } from '@vaux/core/index.js';
import { Matrix, Rectangle } from '@vaux/math/index.js';
import { settings } from '@vaux/settings/index.js';

import type { LayerPass } from './LayerPass.js';

/**
 * This manages the render-texture a {@link Layer} renders into.
 *
 * This is used internally by {@link Layer#render}.
 * @memberof PIXI.layers
 */
export class LayerTextureCache
{
    constructor(public layer: LayerPass) {}

    private renderTexture: RenderTexture = null;
    private doubleBuffer: Array<RenderTexture> = null;
    private currentBufferIndex = 0;
    _tempRenderTarget: RenderTexture = null;
    _tempRenderTargetSource = new Rectangle();
    _tempRenderTargetDestination = new Rectangle();
    _tempTransform: Matrix = null;

    private init(renderer?: Renderer): void
    {
        if (!this.layer.useRenderTexture)
        {
            return;
        }

        const size = this.calcSize(renderer);

        this.renderTexture = RenderTexture.create(size);

        if (this.layer.useDepth)
        {
            this.renderTexture.framebuffer.enableDepth();
        }

        if (this.layer.useDoubleBuffer)
        {
            this.doubleBuffer = [
                RenderTexture.create(size),
                RenderTexture.create(size)
            ];

            if (this.layer.useDepth)
            {
                this.doubleBuffer[0].framebuffer.enableDepth();
                this.doubleBuffer[1].framebuffer.enableDepth();
            }
        }
    }

    calcSize(renderer?: Renderer): {width: number, height: number, resolution: number}
    {
        const size = this.layer.screenSize || renderer?.screen;
        const width = size?.width || 100;
        const height = size?.height || 100;
        const resolution = renderer ? renderer.resolution : settings.RESOLUTION;

        return { width, height, resolution };
    }

    /** See {@link Layer#getRenderTexture}. */
    getRenderTexture(): RenderTexture
    {
        if (!this.renderTexture)
        {
            this.init();
        }

        return this.renderTexture;
    }

    /** Prepares the layer's render-texture and set it as the render-target. */
    pushTexture(renderer: Renderer): void
    {
        // TODO: take not screen, but offset screen, in case there's matrix transform
        const screen = renderer.screen;
        const layer = this.layer;

        if (layer.useRenderTexture && !this.renderTexture)
        {
            this.init(renderer);
        }

        const rt = this.renderTexture;
        const db = this.doubleBuffer;

        if (rt && !layer.screenSize)
        {
            const sz = this.calcSize(renderer);

            if (rt.width !== sz.width
                || rt.height !== sz.height
                || rt.baseTexture.resolution !== sz.resolution)
            {
                rt.baseTexture.resolution = renderer.resolution;
                rt.resize(screen.width, screen.height);

                if (db)
                {
                    db[0].baseTexture.resolution = renderer.resolution;
                    db[0].resize(screen.width, screen.height);
                    db[1].baseTexture.resolution = renderer.resolution;
                    db[1].resize(screen.width, screen.height);
                }
            }
        }

        if (db)
        {
            db[0].framebuffer.multisample = rt.framebuffer.multisample;
            db[1].framebuffer.multisample = rt.framebuffer.multisample;
        }

        this._tempRenderTarget = renderer.renderTexture.current;
        this._tempRenderTargetSource.copyFrom(renderer.renderTexture.sourceFrame);
        this._tempRenderTargetDestination.copyFrom(renderer.renderTexture.destinationFrame);

        if (layer.useTransform)
        {
            this._tempTransform = renderer.projection.transform;
            renderer.projection.transform = layer.transform;
        }

        renderer.batch.flush();

        if (layer.useDoubleBuffer)
        {
            // double-buffer logic
            let buffer = db[this.currentBufferIndex];

            if (!(buffer.baseTexture as any)._glTextures[renderer.CONTEXT_UID])
            {
                renderer.renderTexture.bind(buffer, undefined, undefined);
                renderer.texture.bind(buffer);
                if (layer.bgColor)
                {
                    renderer.renderTexture.clear(layer.bgColor);
                }
            }
            renderer.texture.unbind(rt.baseTexture);
            (rt.baseTexture as any)._glTextures = (buffer.baseTexture as any)._glTextures;
            (rt.baseTexture as any).framebuffer = (buffer.baseTexture as any).framebuffer;

            buffer = db[1 - this.currentBufferIndex];
            renderer.renderTexture.bind(buffer, undefined, undefined);
        }
        else
        {
            // simple logic
            renderer.renderTexture.bind(rt, undefined, undefined);
        }

        // fix for filters
        const filterStack = renderer.filter.defaultFilterStack;

        if (filterStack.length > 1)
        {
            filterStack[filterStack.length - 1].renderTexture = renderer.renderTexture.current;
        }
    }

    /** Flushes the renderer and restores the old render-target. */
    popTexture(renderer: Renderer): void
    {
        renderer.batch.flush();
        renderer.framebuffer.blit();
        // switch filters back
        const filterStack = renderer.filter.defaultFilterStack;
        const { layer } = this;

        if (filterStack.length > 1)
        {
            filterStack[filterStack.length - 1].renderTexture = this._tempRenderTarget;
        }
        renderer.renderTexture.bind(this._tempRenderTarget,
            this._tempRenderTargetSource, this._tempRenderTargetDestination);
        this._tempRenderTarget = null;

        const rt = this.renderTexture;
        const db = this.doubleBuffer;

        if (layer.useDoubleBuffer)
        {
            renderer.texture.unbind(rt.baseTexture);
            this.currentBufferIndex = 1 - this.currentBufferIndex;

            const buffer = db[this.currentBufferIndex];

            (rt.baseTexture as any)._glTextures = (buffer.baseTexture as any)._glTextures;
            (rt.baseTexture as any).framebuffer = (buffer.baseTexture as any).framebuffer;
        }

        if (layer.useTransform)
        {
            renderer.projection.transform = this._tempTransform;
            this._tempTransform = null;
        }
    }

    /** Destroy the texture-cache. Set {@link Layer.textureCache} to {@code null} after destroying it! */
    destroy(): void
    {
        if (this.renderTexture)
        {
            this.renderTexture.destroy();
            if (this.doubleBuffer)
            {
                this.doubleBuffer[0].destroy(true);
                this.doubleBuffer[1].destroy(true);
            }
        }
    }
}
