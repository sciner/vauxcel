import { Renderer } from '@pixi/core/index.js';
import { LayerTextureCache } from '@pixi/layers/LayerTextureCache.js';
import { ISize, Matrix } from '@pixi/math/index.js';

export interface ILayerPassOptions
{
    bgColor?: ArrayLike<number>;
    clearDepth?: boolean;
    clearColor?: boolean;
    useDoubleBuffer?: boolean;
    useRenderTexture?: boolean;
    screenSize?: ISize;
    transform?: Matrix;
    useTransform?: boolean;
    useDepth?: boolean;
}

/**
 * alternative to renderer.render()
 */
export class LayerPass
{
    constructor(options: ILayerPassOptions = {})
    {
        this.bgColor = options.bgColor ? new Float32Array(options.bgColor) : new Float32Array([0, 0, 0, 0]);
        this.clearColor = options.clearColor ?? false;
        this.clearDepth = options.clearDepth ?? false;
        this.useDoubleBuffer = options.useDoubleBuffer ?? false;
        this.useRenderTexture = options.useRenderTexture ?? false;
        this.screenSize = options.screenSize || null;
        this.transform = options.transform || null;
        this.useTransform = options.useTransform ?? true;
        this.useDepth = options.useDepth ?? false;

        this.textureCache = new LayerTextureCache(this);
    }

    renderer: Renderer = null;

    useDoubleBuffer: boolean;
    useRenderTexture: boolean;
    useDepth: boolean;
    clearColor: boolean;
    clearDepth: boolean;

    /**
     * preserve transform from previous pass
     */
    preserveTransform: boolean;
    bgColor: Float32Array;
    screenSize: ISize;
    textureCache: LayerTextureCache;
    transform?: Matrix;
    useTransform?: boolean;

    active = false;

    getRenderTexture()
    {
        return this.useRenderTexture ? this.textureCache.getRenderTexture() : null;
    }

    destroy()
    {
        this.textureCache.destroy();
    }
}
