import type { GLTexture } from '../GLTexture.js';
import type { TextureSource } from '../sources/TextureSource.js';

export interface GLTextureUploader
{
    id: string;
    upload(source: TextureSource, glTexture: GLTexture, gl: WebGL2RenderingContext, webGLVersion: number): void;
    storage?(source: TextureSource, glTexture: GLTexture, gl: WebGL2RenderingContext): void;
    copyTex?(source: TextureSource, glTexture: GLTexture, gl: WebGL2RenderingContext, copyFrom: GLTexture): void;
}
