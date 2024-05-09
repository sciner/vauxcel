import { EventEmitter, uid } from '@pixi/utils/index.js';

import type { COMPARE_FUNCTION, SCALE_MODE, WRAP_MODE } from '@pixi/constants.js';

const idHash: Record<string, number> = Object.create(null);

/**
 * This takes a shader string and maps it to a resource id.
 * This is a little different than regular resource ids as these ids
 * are not unique to the resource. But must not overlap with other (non sampler) resources Ids.
 * @param value - the string to turn into a resource id
 * @returns a unique resource id
 */
function createResourceIdFromString(value: string): number
{
    const id = idHash[value];

    if (id === undefined)
    {
        idHash[value] = uid();
    }

    return id;
}

export interface TextureStyleOptions extends Partial<TextureStyle>
{
    /** setting this will set wrapModeU,wrapModeV and wrapModeW all at once! */
    wrapMode?: WRAP_MODE;
    /** specifies the {{GPUAddressMode|address modes}} for the texture width, height, and depth coordinates, respectively. */
    wrapModeU?: WRAP_MODE;
    /** specifies the {{GPUAddressMode|address modes}} for the texture width, height, and depth coordinates, respectively. */
    wrapModeV?: WRAP_MODE;
    /** Specifies the {{GPUAddressMode|address modes}} for the texture width, height, and depth coordinates, respectively. */
    wrapModeW?: WRAP_MODE;

    /** setting this will set magFilter,minFilter and mipmapFilter all at once!  */
    scaleMode?: SCALE_MODE;

    /** specifies the sampling behavior when the sample footprint is smaller than or equal to one texel. */
    magFilter?: SCALE_MODE;
    /** specifies the sampling behavior when the sample footprint is larger than one texel. */
    minFilter?: SCALE_MODE;
    /** specifies behavior for sampling between mipmap levels. */
    mipmapFilter?: SCALE_MODE;

    /** specifies the minimum and maximum levels of detail, respectively, used internally when sampling a texture. */
    lodMinClamp?: number;
    /** Specifies the minimum and maximum levels of detail, respectively, used internally when sampling a texture. */
    lodMaxClamp?: number;
    /**
     * When provided the sampler will be a comparison sampler with the specified
     * {@link GPUCompareFunction}.
     * Note: Comparison samplers may use filtering, but the sampling results will be
     * implementation-dependent and may differ from the normal filtering rules.
     */
    compare?: COMPARE_FUNCTION;
    /**
     * Specifies the maximum anisotropy value clamp used by the sampler.
     * Note: Most implementations support {@link GPUSamplerDescriptor#maxAnisotropy} values in range
     * between 1 and 16, inclusive. The used value of {@link GPUSamplerDescriptor#maxAnisotropy} will
     * be clamped to the maximum value that the platform supports.
     *
     * setting this to anything higher than 1 will set scale modes to 'linear'
     */
    maxAnisotropy?: number;
}

/**
 * A texture style describes how a texture should be sampled by a shader.
 * @memberof rendering
 */
export class TextureStyle extends EventEmitter<{
    change: TextureStyle,
    destroy: TextureStyle,
}>
{
    public _resourceType = 'textureSampler';
    public _touched = 0;
    private _sharedResourceId: number;

    /** default options for the style */
    public static readonly defaultOptions: TextureStyleOptions = {
        wrapMode: 'clamp-to-edge',
        scaleMode: 'linear'
    };

    /** */
    public wrapModeU?: WRAP_MODE;
    /** */
    public wrapModeV?: WRAP_MODE;
    /** Specifies the {{GPUAddressMode|address modes}} for the texture width, height, and depth coordinates, respectively. */
    public wrapModeW?: WRAP_MODE;
    /** Specifies the sampling behavior when the sample footprint is smaller than or equal to one texel. */
    public magFilter?: SCALE_MODE;
    /** Specifies the sampling behavior when the sample footprint is larger than one texel. */
    public minFilter?: SCALE_MODE;
    /** Specifies behavior for sampling between mipmap levels. */
    public mipmapFilter?: SCALE_MODE;
    /** */
    public lodMinClamp?: number;
    /** Specifies the minimum and maximum levels of detail, respectively, used internally when sampling a texture. */
    public lodMaxClamp?: number;
    /**
     * When provided the sampler will be a comparison sampler with the specified
     * {@link GPUCompareFunction}.
     * Note: Comparison samplers may use filtering, but the sampling results will be
     * implementation-dependent and may differ from the normal filtering rules.
     */
    public compare?: COMPARE_FUNCTION;
    /**
     * Specifies the maximum anisotropy value clamp used by the sampler.
     * Note: Most implementations support {@link GPUSamplerDescriptor#maxAnisotropy} values in range
     * between 1 and 16, inclusive. The used value of {@link GPUSamplerDescriptor#maxAnisotropy} will
     * be clamped to the maximum value that the platform supports.
     * @internal
     * @ignore
     */
    public _maxAnisotropy?: number = 1;

    /**
     * @param options - options for the style
     */
    constructor(options: TextureStyleOptions = {})
    {
        super();

        options = { ...TextureStyle.defaultOptions, ...options };

        this.wrapMode = options.wrapMode;

        this.wrapModeU = options.wrapModeU ?? this.wrapModeU;
        this.wrapModeV = options.wrapModeV ?? this.wrapModeV;
        this.wrapModeW = options.wrapModeW ?? this.wrapModeW;

        this.scaleMode = options.scaleMode;

        this.magFilter = options.magFilter ?? this.magFilter;
        this.minFilter = options.minFilter ?? this.minFilter;
        this.mipmapFilter = options.mipmapFilter ?? this.mipmapFilter;

        this.lodMinClamp = options.lodMinClamp;
        this.lodMaxClamp = options.lodMaxClamp;

        this.compare = options.compare;

        this.maxAnisotropy = options.maxAnisotropy ?? 1;
    }

    set wrapMode(value: WRAP_MODE)
    {
        this.wrapModeU = value;
        this.wrapModeV = value;
        this.wrapModeW = value;
    }

    /** setting this will set wrapModeU,wrapModeV and wrapModeW all at once! */
    get wrapMode(): WRAP_MODE
    {
        return this.wrapModeU;
    }

    set scaleMode(value: SCALE_MODE)
    {
        this.magFilter = value;
        this.minFilter = value;
        this.mipmapFilter = value;
    }

    /** setting this will set magFilter,minFilter and mipmapFilter all at once!  */
    get scaleMode(): SCALE_MODE
    {
        return this.magFilter;
    }

    /** Specifies the maximum anisotropy value clamp used by the sampler. */
    set maxAnisotropy(value: number)
    {
        this._maxAnisotropy = Math.min(value, 16);

        if (this._maxAnisotropy > 1)
        {
            this.scaleMode = 'linear';
        }
    }

    get maxAnisotropy(): number
    {
        return this._maxAnisotropy;
    }

    // TODO - move this to WebGL?
    get _resourceId(): number
    {
        return this._sharedResourceId || this._generateResourceId();
    }

    public update()
    {
        // manage the resource..
        this.emit('change', this);
        this._sharedResourceId = null;
        this.gpu_updateID = this.updateID;
    }

    private _generateResourceId(): number
    {
        // eslint-disable-next-line max-len
        const bigKey = `${this.wrapModeU}-${this.wrapModeV}-${this.wrapModeW}-${this.magFilter}-${this.minFilter}-${this.mipmapFilter}-${this.lodMinClamp}-${this.lodMaxClamp}-${this.compare}-${this._maxAnisotropy}`;

        this._sharedResourceId = createResourceIdFromString(bigKey);

        return this._resourceId;
    }

    /** Destroys the style */
    public destroy()
    {
        this.emit('destroy', this);

        this.removeAllListeners();
    }

    updateID = 0;
    gpu_updateID = -1;

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
}
