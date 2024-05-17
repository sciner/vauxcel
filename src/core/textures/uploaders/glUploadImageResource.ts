import { ALPHA_MODES } from '@pixi/constants';

import type { GLTexture } from '../GLTexture.js';
import type { CanvasSource } from '../sources/CanvasSource.js';
import type { ImageSource } from '../sources/ImageSource.js';
import type { GLTextureUploader } from './GLTextureUploader';

export const glUploadImageResource: GLTextureUploader = {

    id: 'image',

    storage(source: ImageSource | CanvasSource, glTexture: GLTexture, gl: WebGL2RenderingContext)
    {
        const w = glTexture.width = source.pixelWidth;
        const h = glTexture.height = source.pixelHeight;

        gl.texStorage2D(glTexture.target, source.mipLevelCount, glTexture.internalFormat, w, h);
    },

    upload(source: ImageSource | CanvasSource, glTexture: GLTexture, gl: WebGL2RenderingContext, webGLVersion: number)
    {
        const premultipliedAlpha = source.alphaMode === ALPHA_MODES.PREMULTIPLY_ON_UPLOAD;

        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultipliedAlpha);

        const glWidth = glTexture.width;
        const glHeight = glTexture.height;

        const textureWidth = source.pixelWidth;
        const textureHeight = source.pixelHeight;

        const resourceWidth = source.resourceWidth;
        const resourceHeight = source.resourceHeight;

        if (resourceWidth < textureWidth || resourceHeight < textureHeight)
        {
            if (glWidth !== textureWidth || glHeight !== textureHeight)
            {
                gl.texImage2D(
                    glTexture.target,
                    0,
                    glTexture.internalFormat,
                    textureWidth,
                    textureHeight,
                    0,
                    glTexture.format,
                    glTexture.type,
                    null
                );
            }

            if (webGLVersion === 2)
            {
                gl.texSubImage2D(
                    gl.TEXTURE_2D,
                    0,
                    0,
                    0,
                    resourceWidth,
                    resourceHeight,
                    glTexture.format,
                    glTexture.type,
                    source.resource as TexImageSource
                );
            }
            else
            {
                gl.texSubImage2D(
                    gl.TEXTURE_2D,
                    0,
                    0,
                    0,
                    glTexture.format,
                    glTexture.type,
                    source.resource as TexImageSource
                );
            }
        }
        else if (glWidth === textureWidth && glHeight === textureHeight)
        {
            gl.texSubImage2D(
                gl.TEXTURE_2D,
                0,
                0,
                0,
                glTexture.format,
                glTexture.type,
                source.resource as TexImageSource
            );
        }
        else if (webGLVersion === 2)
        {
            gl.texImage2D(
                glTexture.target,
                0,
                glTexture.internalFormat,
                textureWidth,
                textureHeight,
                0,
                glTexture.format,
                glTexture.type,
                source.resource as TexImageSource
            );
        }
        else
        {
            gl.texImage2D(
                glTexture.target,
                0,
                glTexture.internalFormat,
                glTexture.format,
                glTexture.type,
                source.resource as TexImageSource
            );
        }

        glTexture.width = textureWidth;
        glTexture.height = textureHeight;
    }
};
