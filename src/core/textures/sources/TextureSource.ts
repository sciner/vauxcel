import { ALPHA_MODES } from '@pixi/constants.js';
import { definedProps, EventEmitter, isPow2, uid } from '@pixi/utils/index.js';
import { TypedArray } from '../../geometry/Buffer.js';
import { GLTexture } from '../GLTexture.js';
import { TextureStyle, TextureStyleOptions } from '../TextureStyle.js';

import type {
    SCALE_MODE,
    TEXTURE_DIMENSIONS,
    TEXTURE_FORMATS,
    TEXTURE_VIEW_DIMENSIONS,
    WRAP_MODE,
} from '@pixi/constants.js';
import type { GLTextureUploader } from '../uploaders/GLTextureUploader.js';

/**
 * options for creating a new TextureSource
 * @memberof rendering
 */
export interface TextureSourceOptions<T extends Record<string, any> = any> extends TextureStyleOptions
{
    /**
     * the resource that will be upladed to the GPU. This is where we get our pixels from
     * eg an ImageBimt / Canvas / Video etc
     */
    resource?: T;
    /**
     * in case we have buffer data
     */
    data?: TypedArray;
    /** the pixel width of this texture source. This is the REAL pure number, not accounting resolution */
    width?: number;
    /** the pixel height of this texture source. This is the REAL pure number, not accounting resolution */
    height?: number;
    /**
     * depth for 2d-array and 3d textures
     */
    depth?: number;
    /** the resolution of the texture. */
    resolution?: number;
    /** the format that the texture data has */
    format?: TEXTURE_FORMATS;
    /**
     * Used by internal textures
     * @ignore
     */
    sampleCount?: number;
    /**
     * Only really affects RenderTextures.
     * Should we use antialiasing for this texture. It will look better, but may impact performance as a
     * Blit operation will be required to resolve the texture.
     */
    antialias?: boolean;
    /** how many dimensions does this texture have? currently v8 only supports 2d */
    dimension?: TEXTURE_DIMENSIONS;
    viewDimension?: TEXTURE_VIEW_DIMENSIONS;
    /** The number of mip levels to generate for this texture. this is  overridden if autoGenerateMipmaps is true */
    mipLevelCount?: number;
    /**
     * Should we auto generate mipmaps for this texture? This will automatically generate mipmaps
     * for this texture when uploading to the GPU. Mipmapped textures take up more memory, but
     * can look better when scaled down.
     *
     * For performance reasons, it is recommended to NOT use this with RenderTextures, as they are often updated every frame.
     * If you do, make sure to call `updateMipmaps` after you update the texture.
     */
    autoGenerateMipmaps?: boolean;
    /** the alpha mode of the texture */
    alphaMode?: ALPHA_MODES;
    /** optional label, can be used for debugging */
    label?: string;
    /** If true, the Garbage Collector will unload this texture if it is not used after a period of time */
    autoGarbageCollect?: boolean;

    glMutableSize?: boolean;
    copyOnResize?: boolean;
}

/**
 * A TextureSource stores the information that represents an image.
 * All textures have require TextureSource, which contains information about the source.
 * Therefore you can have many textures all using a single TextureSource (eg a sprite sheet)
 *
 * This is an class is extended depending on the source of the texture.
 * Eg if you are using an an image as your resource, then an ImageSource is used.
 * @memberof rendering
 * @typeParam T - The TextureSource's Resource type.
 */
export class TextureSource<T extends Record<string, any> = any> extends EventEmitter<{
    update: TextureSource;
    unload: TextureSource;
    destroy: TextureSource;
    resize: TextureSource;
    styleChange: TextureSource;
    updateMipmaps: TextureSource;
    error: Error;
}>
{
    /** The default options used when creating a new TextureSource. override these to add your own defaults */
    public static defaultOptions: TextureSourceOptions = {
        resolution: 1,
        format: 'bgra8unorm',
        alphaMode: ALPHA_MODES.PREMULTIPLY_ON_UPLOAD,
        dimension: '2d',
        viewDimension: '2d',
        mipLevelCount: 1,
        autoGenerateMipmaps: false,
        sampleCount: 1,
        depth: 1,
        antialias: false,
        autoGarbageCollect: false,
        glMutableSize: false,
        copyOnResize: false,
    };

    /** unique id for this Texture source */
    public readonly uid = uid();
    /** optional label, can be used for debugging */
    public label: string;

    /**
     * The resource type used by this TextureSource. This is used by the bind groups to determine
     * how to handle this resource.
     * @ignore
     * @internal
     */
    public readonly _resourceType = 'textureSource';
    /**
     * i unique resource id, used by the bind group systems.
     * This can change if the texture is resized or its resource changes
     */
    public _resourceId = uid();
    /**
     * this is how the backends know how to upload this texture to the GPU
     * It changes depending on the resource type. Classes that extend TextureSource
     * should override this property.
     * @ignore
     * @internal
     */
    public uploadMethodId = 'unknown';

    // dimensions
    public _resolution = 1;

    /** the pixel width of this texture source. This is the REAL pure number, not accounting resolution */
    public pixelWidth = 1;
    /** the pixel height of this texture source. This is the REAL pure number, not accounting resolution */
    public pixelHeight = 1;
    /** the pixel depth of this texture source. This is the REAL pure number, not accounting resolution */
    public depth = 1;
    /**
     * the width of this texture source, accounting for resolution
     * eg pixelWidth 200, resolution 2, then width will be 100
     */
    public width = 1;
    /**
     * the height of this texture source, accounting for resolution
     * eg pixelHeight 200, resolution 2, then height will be 100
     */
    public height = 1;

    /**
     * the resource that will be upladed to the GPU. This is where we get our pixels from
     * eg an ImageBimt / Canvas / Video etc
     */
    public resource: T;

    /**
     * The number of samples of a multisample texture. This is always 1 for non-multisample textures.
     * To enable multisample for a texture, set antialias to true
     * @internal
     * @ignore
     */
    public sampleCount = 1;

    /** The number of mip levels to generate for this texture. this is  overridden if autoGenerateMipmaps is true */
    public mipLevelCount = 1;
    /**
     * Should we auto generate mipmaps for this texture? This will automatically generate mipmaps
     * for this texture when uploading to the GPU. Mipmapped textures take up more memory, but
     * can look better when scaled down.
     *
     * For performance reasons, it is recommended to NOT use this with RenderTextures, as they are often updated every frame.
     * If you do, make sure to call `updateMipmaps` after you update the texture.
     */
    public autoGenerateMipmaps = false;
    /** the format that the texture data has */
    public format: TEXTURE_FORMATS;
    /** how many dimensions does this texture have? currently v8 only supports 2d */
    public dimension: TEXTURE_DIMENSIONS;
    public viewDimension: TEXTURE_VIEW_DIMENSIONS;
    /** the alpha mode of the texture */
    public alphaMode: ALPHA_MODES;
    private _style: TextureStyle;

    /**
     * Only really affects RenderTextures.
     * Should we use antialiasing for this texture. It will look better, but may impact performance as a
     * Blit operation will be required to resolve the texture.
     */
    public antialias = false;

    /**
     * Has the source been destroyed?
     * @readonly
     */
    public destroyed: boolean;

    /**
     * Used by automatic texture Garbage Collection, stores last GC tick when it was bound
     * @protected
     */
    public touched = 0;

    /**
     * Used by the batcher to build texture batches. faster to have the variable here!
     * @protected
     */
    public _batchEnabled = -1;
    /**
     * A temporary batch location for the texture batching. Here for performance reasons only!
     * @protected
     */
    public _batchLocation = -1;

    public isPowerOfTwo: boolean;

    /** If true, the Garbage Collector will unload this texture if it is not used after a period of time */
    public autoGarbageCollect: boolean;

    /**
     * used internally to know where a texture came from. Usually assigned by the asset loader!
     * @ignore
     */
    public _sourceOrigin: string;

    /**
     * @param options - options for creating a new TextureSource
     */
    constructor(protected readonly options: TextureSourceOptions<T> = {})
    {
        super();

        options = { ...TextureSource.defaultOptions, ...options };

        this.label = options.label ?? '';
        this.resource = options.resource;
        this.data = options.data;
        this.autoGarbageCollect = options.autoGarbageCollect;
        this._resolution = options.resolution;

        if (options.width)
        {
            this.pixelWidth = options.width * this._resolution;
        }
        else
        {
            this.pixelWidth = this.resource ? (this.resourceWidth ?? 1) : 1;
        }

        if (options.height)
        {
            this.pixelHeight = options.height * this._resolution;
        }
        else
        {
            this.pixelHeight = this.resource ? (this.resourceHeight ?? 1) : 1;
        }

        this.depth = options.depth ?? 1;

        this.width = this.pixelWidth / this._resolution;
        this.height = this.pixelHeight / this._resolution;

        this.format = options.format;
        this.dimension = options.dimension;
        this.viewDimension = options.viewDimension;
        this.mipLevelCount = options.mipLevelCount;
        this.autoGenerateMipmaps = options.autoGenerateMipmaps;
        this.sampleCount = options.sampleCount;
        this.antialias = options.antialias;
        this.alphaMode = options.alphaMode;

        this.glMutableSize = options.glMutableSize;
        this.copyOnResize = options.copyOnResize;

        this.style = new TextureStyle(definedProps(options));

        this.destroyed = false;

        this._refreshPOT();
    }

    /** returns itself */
    get source(): TextureSource
    {
        return this;
    }

    /** the style of the texture */
    get style(): TextureStyle
    {
        return this._style;
    }

    set style(value: TextureStyle)
    {
        if (this.style === value) return;

        this._style?.off('change', this._onStyleChange, this);
        this._style = value;
        this._style?.on('change', this._onStyleChange, this);

        this._onStyleChange();
    }

    /** setting this will set wrapModeU,wrapModeV and wrapModeW all at once! */
    get wrapMode(): WRAP_MODE
    {
        return this._style.wrapMode;
    }

    set wrapMode(value: WRAP_MODE)
    {
        this._style.wrapMode = value;
    }

    /** setting this will set wrapModeU,wrapModeV and wrapModeW all at once! */
    get repeatMode(): WRAP_MODE
    {
        return this._style.wrapMode;
    }

    set repeatMode(value: WRAP_MODE)
    {
        this._style.wrapMode = value;
    }

    /** Specifies the sampling behavior when the sample footprint is smaller than or equal to one texel. */
    get magFilter(): SCALE_MODE
    {
        return this._style.magFilter;
    }

    set magFilter(value: SCALE_MODE)
    {
        this._style.magFilter = value;
    }

    /** Specifies the sampling behavior when the sample footprint is larger than one texel. */
    get minFilter(): SCALE_MODE
    {
        return this._style.minFilter;
    }

    set minFilter(value: SCALE_MODE)
    {
        this._style.minFilter = value;
    }

    /** Specifies behavior for sampling between mipmap levels. */
    get mipmapFilter(): SCALE_MODE
    {
        return this._style.mipmapFilter;
    }

    set mipmapFilter(value: SCALE_MODE)
    {
        this._style.mipmapFilter = value;
    }

    /** Specifies the minimum and maximum levels of detail, respectively, used internally when sampling a texture. */
    get lodMinClamp(): number
    {
        return this._style.lodMinClamp;
    }

    set lodMinClamp(value: number)
    {
        this._style.lodMinClamp = value;
    }

    /** Specifies the minimum and maximum levels of detail, respectively, used internally when sampling a texture. */
    get lodMaxClamp(): number
    {
        return this._style.lodMaxClamp;
    }

    set lodMaxClamp(value: number)
    {
        this._style.lodMaxClamp = value;
    }

    private _onStyleChange()
    {
        this.emit('styleChange', this);
    }

    /** call this if you have modified the texture outside of the constructor */
    public update()
    {
        // update resource...
        if (this.resource)
        {
            const resolution = this._resolution;

            const didResize = this.resize(this.resourceWidth / resolution, this.resourceHeight / resolution);

            // no ned to dispatch the update we resized as that will
            // notify the texture systems anyway
            if (didResize) return;
        }

        this.emit('update', this);

        this.gpu_updateID = this.updateID;
    }

    /** Destroys this texture source */
    public destroy()
    {
        this.destroyed = true;
        this.emit('destroy', this);

        if (this._style)
        {
            this._style.destroy();
            this._style = null;
        }

        this.uploadMethodId = null;
        this.resource = null;
        this.removeAllListeners();
    }

    /**
     * This will unload the Texture source from the GPU. This will free up the GPU memory
     * As soon as it is required fore rendering, it will be re-uploaded.
     */
    public unload()
    {
        this._resourceId = uid();
        // this.emit('change', this);
        this.emit('unload', this);
    }

    /** the width of the resource. This is the REAL pure number, not accounting resolution   */
    public get resourceWidth(): number
    {
        const { resource } = this;

        return resource.naturalWidth || resource.videoWidth || resource.displayWidth || resource.width;
    }

    /** the height of the resource. This is the REAL pure number, not accounting resolution */
    public get resourceHeight(): number
    {
        const { resource } = this;

        return resource.naturalHeight || resource.videoHeight || resource.displayHeight || resource.height;
    }

    /**
     * the resolution of the texture. Changing this number, will not change the number of pixels in the actual texture
     * but will the size of the texture when rendered.
     *
     * changing the resolution of this texture to 2 for example will make it appear twice as small when rendered (as pixel
     * density will have increased)
     */
    get resolution(): number
    {
        return this._resolution;
    }

    set resolution(resolution: number)
    {
        if (this._resolution === resolution) return;

        this._resolution = resolution;

        this.width = this.pixelWidth / resolution;
        this.height = this.pixelHeight / resolution;
    }

    /**
     * Resize the texture, this is handy if you want to use the texture as a render texture
     * @param width - the new width of the texture
     * @param height - the new height of the texture
     * @param resolution - the new resolution of the texture
     * @returns - if the texture was resized
     */
    public resize(width?: number, height?: number, resolution?: number): boolean
    {
        resolution = resolution || this._resolution;
        width = width || this.width;
        height = height || this.height;

        // make sure we work with rounded pixels
        const newPixelWidth = Math.round(width * resolution);
        const newPixelHeight = Math.round(height * resolution);

        this.width = newPixelWidth / resolution;
        this.height = newPixelHeight / resolution;

        this._resolution = resolution;

        if (this.pixelWidth === newPixelWidth && this.pixelHeight === newPixelHeight)
        {
            return false;
        }

        this._refreshPOT();

        this.pixelWidth = newPixelWidth;
        this.pixelHeight = newPixelHeight;

        this.emit('resize', this);

        this._resourceId = uid();
        // this.emit('change', this);

        return true;
    }

    /**
     * Lets the renderer know that this texture has been updated and its mipmaps should be re-generated.
     * This is only important for RenderTexture instances, as standard Texture instances will have their
     * mipmaps generated on upload. You should call this method after you make any change to the texture
     *
     * The reason for this is is can be quite expensive to update mipmaps for a texture. So by default,
     * We want you, the developer to specify when this action should happen.
     *
     * Generally you don't want to have mipmaps generated on Render targets that are changed every frame,
     */
    public updateMipmaps()
    {
        if (this.autoGenerateMipmaps && this.mipLevelCount > 1)
        {
            this.emit('updateMipmaps', this);
        }
    }

    set scaleMode(value: SCALE_MODE)
    {
        this._style.scaleMode = value;
    }

    /** setting this will set magFilter,minFilter and mipmapFilter all at once!  */
    get scaleMode(): SCALE_MODE
    {
        return this._style.scaleMode;
    }

    /**
     * Refresh check for isPowerOfTwo texture based on size
     * @private
     */
    protected _refreshPOT(): void
    {
        this.isPowerOfTwo = isPow2(this.pixelWidth) && isPow2(this.pixelHeight);
    }

    public static test(_resource: any): any
    {
        // this should be overridden by other sources..
        throw new Error('Unimplemented');
    }

    public _glTextures: Record<number, GLTexture> = {};
    glMutableSize: boolean;
    copyOnResize: boolean;
    public glUploader?: GLTextureUploader = undefined;

    updateID = 0;
    gpu_updateID = -1;
    data?: TypedArray = undefined;

    lazyInvalidate()
    {
        this.updateID++;
    }

    lazyUpdate()
    {
        if (this.updateID !== this.gpu_updateID)
        {
            this.update();
        }
    }

    _glLastBindLocation = -1;

    static _globalBatch = 0;
}
