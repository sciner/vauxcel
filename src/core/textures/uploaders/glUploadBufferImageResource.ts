import type { GLTexture } from '../GLTexture.js';
import type { TextureSource } from '../sources/TextureSource.js';
import type { GLTextureUploader } from './GLTextureUploader.js';

export const glUploadBufferImageResource = {

    id: 'image',

    upload(source: TextureSource, glTexture: GLTexture, gl: WebGL2RenderingContext)
    {
        if (glTexture.width === source.width || glTexture.height === source.height)
        {
            gl.texSubImage2D(
                gl.TEXTURE_2D,
                0,
                0,
                0,
                glTexture.format,
                glTexture.type,
                source.resource
            );
        }
        else
        {
            gl.texImage2D(
                glTexture.target,
                0,
                glTexture.internalFormat,
                source.width,
                source.height,
                0,
                glTexture.format,
                glTexture.type,
                source.resource
            );
        }

        glTexture.width = source.width;
        glTexture.height = source.height;
    }
} as GLTextureUploader;

