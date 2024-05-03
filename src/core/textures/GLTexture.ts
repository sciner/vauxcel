import { FORMATS, GL_TYPES } from '@pixi/constants.js';

/**
 * Internal texture for WebGL context.
 * @memberof PIXI
 */
export class GLTexture
{
    /** The WebGL texture. */
    public texture: WebGLTexture;

    /** Width of texture that was used in texImage2D. */
    public width: number;

    /** Height of texture that was used in texImage2D. */
    public height: number;

    /** Height of texture that was used in texImage3D. */
    public depth: number;

    /** Whether mip levels has to be generated. */
    public mipmap: boolean;

    /** WrapMode copied from baseTexture. */
    public wrapMode: number;

    /** GL Texture format */
    public format: number;

    /** GL Texture type */
    public type: number;

    /** GL Texture internal format */
    public internalFormat: number;

    /** Type of sampler corresponding to this texture. See {@link PIXI.SAMPLER_TYPES} */
    public samplerType: number;

    public dataLength: number;

    /** Texture contents dirty flag. */
    dirtyId: number;

    /** Texture style dirty flag. */
    dirtyStyleId: number;

    constructor(texture: WebGLTexture)
    {
        this.texture = texture;
        this.width = -1;
        this.height = -1;
        this.depth = 1;
        this.dirtyId = -1;
        this.dirtyStyleId = -1;
        this.mipmap = false;
        this.wrapMode = 33071;
        this.type = GL_TYPES.UNSIGNED_BYTE;
        this.internalFormat = FORMATS.RGBA;
        this.dataLength = 0;

        this.samplerType = 0;
    }
}
