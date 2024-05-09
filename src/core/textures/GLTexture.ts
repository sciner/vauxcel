import { GL_FORMATS, GL_TARGETS, GL_TYPES } from '@pixi/constants.js';

/**
 * Internal texture for WebGL context.
 * @memberof PIXI
 */
export class GLTexture
{
    public target: GL_TARGETS;
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

    constructor(texture: WebGLTexture)
    {
        this.texture = texture;
        this.width = -1;
        this.height = -1;
        this.depth = -1;
        this.mipmap = false;
        this.wrapMode = 33071;
        this.type = GL_TYPES.UNSIGNED_BYTE;
        this.internalFormat = GL_FORMATS.RGBA;
        this.dataLength = 0;
        this.target = GL_TARGETS.TEXTURE_2D;

        this.samplerType = 0;
    }
}
