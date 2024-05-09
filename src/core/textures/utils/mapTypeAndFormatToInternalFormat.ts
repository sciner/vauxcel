import { GL_FORMATS, GL_TYPES } from '@pixi/constants.js';

/**
 * Returns a lookup table that maps each type-format pair to a compatible internal format.
 * @memberof PIXI
 * @function mapTypeAndFormatToInternalFormat
 * @private
 * @param {WebGLRenderingContext} gl - The rendering context.
 * @returns Lookup table.
 */
export function mapTypeAndFormatToInternalFormat(gl: WebGLRenderingContextBase):
{ [type: number]: { [format: number]: number } }
{
    let table;

    if ('WebGL2RenderingContext' in globalThis && gl instanceof globalThis.WebGL2RenderingContext)
    {
        table = {
            [GL_TYPES.UNSIGNED_BYTE]: {
                [GL_FORMATS.RGBA]: gl.RGBA8,
                [GL_FORMATS.RGB]: gl.RGB8,
                [GL_FORMATS.RG]: gl.RG8,
                [GL_FORMATS.RED]: gl.R8,
                [GL_FORMATS.RGBA_INTEGER]: gl.RGBA8UI,
                [GL_FORMATS.RGB_INTEGER]: gl.RGB8UI,
                [GL_FORMATS.RG_INTEGER]: gl.RG8UI,
                [GL_FORMATS.RED_INTEGER]: gl.R8UI,
                [GL_FORMATS.ALPHA]: gl.ALPHA,
                [GL_FORMATS.LUMINANCE]: gl.LUMINANCE,
                [GL_FORMATS.LUMINANCE_ALPHA]: gl.LUMINANCE_ALPHA,
            },
            [GL_TYPES.BYTE]: {
                [GL_FORMATS.RGBA]: gl.RGBA8_SNORM,
                [GL_FORMATS.RGB]: gl.RGB8_SNORM,
                [GL_FORMATS.RG]: gl.RG8_SNORM,
                [GL_FORMATS.RED]: gl.R8_SNORM,
                [GL_FORMATS.RGBA_INTEGER]: gl.RGBA8I,
                [GL_FORMATS.RGB_INTEGER]: gl.RGB8I,
                [GL_FORMATS.RG_INTEGER]: gl.RG8I,
                [GL_FORMATS.RED_INTEGER]: gl.R8I,
            },
            [GL_TYPES.UNSIGNED_SHORT]: {
                [GL_FORMATS.RGBA_INTEGER]: gl.RGBA16UI,
                [GL_FORMATS.RGB_INTEGER]: gl.RGB16UI,
                [GL_FORMATS.RG_INTEGER]: gl.RG16UI,
                [GL_FORMATS.RED_INTEGER]: gl.R16UI,
                [GL_FORMATS.DEPTH_COMPONENT]: gl.DEPTH_COMPONENT16,
            },
            [GL_TYPES.SHORT]: {
                [GL_FORMATS.RGBA_INTEGER]: gl.RGBA16I,
                [GL_FORMATS.RGB_INTEGER]: gl.RGB16I,
                [GL_FORMATS.RG_INTEGER]: gl.RG16I,
                [GL_FORMATS.RED_INTEGER]: gl.R16I,
            },
            [GL_TYPES.UNSIGNED_INT]: {
                [GL_FORMATS.RGBA_INTEGER]: gl.RGBA32UI,
                [GL_FORMATS.RGB_INTEGER]: gl.RGB32UI,
                [GL_FORMATS.RG_INTEGER]: gl.RG32UI,
                [GL_FORMATS.RED_INTEGER]: gl.R32UI,
                [GL_FORMATS.DEPTH_COMPONENT]: gl.DEPTH_COMPONENT24,
            },
            [GL_TYPES.INT]: {
                [GL_FORMATS.RGBA_INTEGER]: gl.RGBA32I,
                [GL_FORMATS.RGB_INTEGER]: gl.RGB32I,
                [GL_FORMATS.RG_INTEGER]: gl.RG32I,
                [GL_FORMATS.RED_INTEGER]: gl.R32I,
            },
            [GL_TYPES.FLOAT]: {
                [GL_FORMATS.RGBA]: gl.RGBA32F,
                [GL_FORMATS.RGB]: gl.RGB32F,
                [GL_FORMATS.RG]: gl.RG32F,
                [GL_FORMATS.RED]: gl.R32F,
                [GL_FORMATS.DEPTH_COMPONENT]: gl.DEPTH_COMPONENT32F,
            },
            [GL_TYPES.HALF_FLOAT]: {
                [GL_FORMATS.RGBA]: gl.RGBA16F,
                [GL_FORMATS.RGB]: gl.RGB16F,
                [GL_FORMATS.RG]: gl.RG16F,
                [GL_FORMATS.RED]: gl.R16F,
            },
            [GL_TYPES.UNSIGNED_SHORT_5_6_5]: {
                [GL_FORMATS.RGB]: gl.RGB565,
            },
            [GL_TYPES.UNSIGNED_SHORT_4_4_4_4]: {
                [GL_FORMATS.RGBA]: gl.RGBA4,
            },
            [GL_TYPES.UNSIGNED_SHORT_5_5_5_1]: {
                [GL_FORMATS.RGBA]: gl.RGB5_A1,
            },
            [GL_TYPES.UNSIGNED_INT_2_10_10_10_REV]: {
                [GL_FORMATS.RGBA]: gl.RGB10_A2,
                [GL_FORMATS.RGBA_INTEGER]: gl.RGB10_A2UI,
            },
            [GL_TYPES.UNSIGNED_INT_10F_11F_11F_REV]: {
                [GL_FORMATS.RGB]: gl.R11F_G11F_B10F,
            },
            [GL_TYPES.UNSIGNED_INT_5_9_9_9_REV]: {
                [GL_FORMATS.RGB]: gl.RGB9_E5,
            },
            [GL_TYPES.UNSIGNED_INT_24_8]: {
                [GL_FORMATS.DEPTH_STENCIL]: gl.DEPTH24_STENCIL8,
            },
            [GL_TYPES.FLOAT_32_UNSIGNED_INT_24_8_REV]: {
                [GL_FORMATS.DEPTH_STENCIL]: gl.DEPTH32F_STENCIL8,
            },
        };
    }
    else
    {
        table = {
            [GL_TYPES.UNSIGNED_BYTE]: {
                [GL_FORMATS.RGBA]: gl.RGBA,
                [GL_FORMATS.RGB]: gl.RGB,
                [GL_FORMATS.ALPHA]: gl.ALPHA,
                [GL_FORMATS.LUMINANCE]: gl.LUMINANCE,
                [GL_FORMATS.LUMINANCE_ALPHA]: gl.LUMINANCE_ALPHA,
            },
            [GL_TYPES.UNSIGNED_SHORT_5_6_5]: {
                [GL_FORMATS.RGB]: gl.RGB,
            },
            [GL_TYPES.UNSIGNED_SHORT_4_4_4_4]: {
                [GL_FORMATS.RGBA]: gl.RGBA,
            },
            [GL_TYPES.UNSIGNED_SHORT_5_5_5_1]: {
                [GL_FORMATS.RGBA]: gl.RGBA,
            },
        };
    }

    return table;
}
