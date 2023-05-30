import { Resource } from './Resource';

import type { ISize3D } from '@vaux/math';
import type { Renderer } from '../../Renderer';
import type { BaseTexture } from '../BaseTexture';
import type { GLTexture } from '../GLTexture';
import type { BufferType } from './BufferResource';
import { Runner } from '@vaux/runner';
import { FORMATS, SCALE_MODES, TARGETS } from '@vaux/constants';
import { Texture3D } from '../Texture3D';

export function formatToCount(f: FORMATS)
{
    if (f === FORMATS.RGBA
        || f === FORMATS.RGBA_INTEGER)
    {
        return 4;
    }
    if (f === FORMATS.RG || f === FORMATS.RG_INTEGER)
    {
        return 2;
    }

    return 1;
}

/**
 * Constructor options for BufferResource.
 * @memberof PIXI
 */
export interface IBuffer3DResourceOptions extends ISize3D
{
    depth: number;
    pixelSize?: number;
    useFixedSize?: boolean;
    useSubRegions?: boolean;
}

/**
 * Buffer resource with data of typed array.
 * @memberof PIXI
 */
export class Buffer3DResource extends Resource
{
    /** The data of this resource. */
    public data: BufferType;

    public depth: number;
    public pixelSize: number;
    public useFixedSize: boolean;
    public useSubRegions: boolean;
    protected onResize3D: Runner;

    public regionsToUpdate: Array<Texture3D> = [];

    /**
     * @param source - Source buffer
     * @param options - Options
     * @param {number} options.width - Width of the texture
     * @param {number} options.height - Height of the texture
     * @param {1|2|4|8} [options.unpackAlignment=4] - The alignment of the pixel rows.
     */
    constructor(source: BufferType, options: IBuffer3DResourceOptions)
    {
        const { width, height, depth } = options || {};

        if (!width || !height || !depth)
        {
            throw new Error('BufferResource width or height invalid');
        }

        super(width, height);

        this.depth = depth;
        this.pixelSize = options.pixelSize || 1;
        this.useFixedSize = options.useFixedSize ?? true;
        this.useSubRegions = options.useSubRegions ?? false;
        this.onResize3D = new Runner('setRealSize3D');

        this.data = source;
    }

    bind(baseTexture: BaseTexture): void
    {
        this.onResize.add(baseTexture);
        this.onUpdate.add(baseTexture);
        this.onError.add(baseTexture);

        baseTexture.target = TARGETS.TEXTURE_3D;

        // Call a resize immediate if we already
        // have the width and height of the resource
        if (this._width || this._height || this.depth)
        {
            this.onResize3D.emit(this._width, this._height, this.depth, this.pixelSize);
        }
    }

    /**
     * Upload the texture to the GPU.
     * @param renderer - Upload to the renderer
     * @param baseTexture - Reference to parent texture
     * @param glTexture - glTexture
     * @returns - true is success
     */
    upload(renderer: Renderer, baseTexture: BaseTexture, glTexture: GLTexture): boolean
    {
        const gl = renderer.gl;

        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

        const { data, width, height, depth } = this;
        const { target, type, format } = baseTexture;
        const { internalFormat } = glTexture;

        if (this.useFixedSize)
        {
            if (glTexture.dataLength === 0)
            {
                gl.texStorage3D(target, 1, internalFormat,
                    width, height, depth);
                if (data)
                {
                    glTexture.dataLength = data.length;
                }
                else
                {
                    glTexture.dataLength = width * height * depth * formatToCount(format);
                }
            }
            else if (data && glTexture.dataLength !== data.length)
            {
                console.warn('Texture3D resize fail');

                return true;
            }
        }
        if (this.useSubRegions)
        {
            this.uploadSubs(renderer, baseTexture, glTexture);
        }
        else if (data)
        {
            if (glTexture.dataLength !== data.length)
            {
                // SHOULD NOT HAPPEN
                glTexture.dataLength = data.length;
                gl.texImage3D(target, 0, internalFormat,
                    width, height, depth,
                    0, format, type, data);
            }
            else
            {
                gl.texSubImage3D(target, 0, 0, 0, 0,
                    width, height, depth,
                    format, type, data);
            }
        }

        return true;
    }

    uploadSubs(renderer: Renderer, baseTexture: BaseTexture, glTexture: GLTexture)
    {
        const { gl } = renderer;

        const { pixelSize, depth, width, height } = this;
        const { target, type, format } = baseTexture;
        const { internalFormat } = glTexture;

        const sz = width * height * depth * formatToCount(format);

        if (glTexture.dataLength !== sz)
        {
            glTexture.dataLength = sz;
            gl.texImage3D(target, 0, internalFormat,
                width, height, depth,
                0, format, type,
                null);
        }

        for (let i = 0; i < this.regionsToUpdate.length; i++)
        {
            const region = this.regionsToUpdate[i];

            if (!region.dirty)
            {
                continue;
            }
            region.dirty = false;
            if (!region.isEmpty)
            {
                gl.texSubImage3D(target, 0,
                    region.layout.x / pixelSize, region.layout.y / pixelSize, region.layout.z / pixelSize,
                    region.layout.width / pixelSize, region.layout.height / pixelSize, region.layout.depth / pixelSize,
                    format, type, region.data);
                region.data = null;
            }
        }
        this.regionsToUpdate.length = 0;
    }

    style(renderer: Renderer, baseTexture: BaseTexture, _glTexture: GLTexture): boolean
    {
        const { gl } = renderer;
        const target = baseTexture.target;
        const sm = baseTexture.scaleMode === SCALE_MODES.LINEAR ? gl.LINEAR : gl.NEAREST;

        gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, sm);
        gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, sm);
        gl.texParameteri(target, gl.TEXTURE_WRAP_S, baseTexture.wrapMode);
        gl.texParameteri(target, gl.TEXTURE_WRAP_T, baseTexture.wrapMode);
        gl.texParameteri(target, gl.TEXTURE_WRAP_R, baseTexture.wrapMode);

        return true;
    }

    /** Destroy and don't use after this. */
    dispose(): void
    {
        this.data = null;
    }

    /**
     * Used to auto-detect the type of resource.
     * @param {*} source - The source object
     * @returns {boolean} `true` if buffer source
     */
    static test(source: unknown): source is BufferType
    {
        return source === null
            || source instanceof Int8Array
            || source instanceof Uint8Array
            || source instanceof Uint8ClampedArray
            || source instanceof Int16Array
            || source instanceof Uint16Array
            || source instanceof Int32Array
            || source instanceof Uint32Array
            || source instanceof Float32Array;
    }
}
