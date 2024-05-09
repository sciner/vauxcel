import { GL_TARGETS, SAMPLER_TYPES } from '@pixi/constants.js';
import { extensions, ExtensionType } from '@pixi/extensions.js';
import { GLTexture } from './GLTexture.js';
import { TextureSource } from './sources/index.js';
import { BindableTexture, Texture } from './Texture.js';
import {
    GLTextureUploader, glUploadBufferImageResource, glUploadImageResource
} from './uploaders/index.js';
import { applyStyleParams } from './utils/applyStyleParams.js';
import { mapFormatToGlFormat } from './utils/mapFormatToGlFormat.js';
import { mapFormatToGlInternalFormat } from './utils/mapFormatToGlInternalFormat.js';
import { mapFormatToGlType } from './utils/mapFormatToGlType.js';
import { mapInternalFormatToSamplerType } from './utils/mapInternalFormatToSamplerType.js';

import type { ExtensionMetadata } from '@pixi/extensions.js';
import type { IRenderingContext } from '../IRenderer.js';
import type { Renderer } from '../Renderer.js';
import type { ISystem } from '../system/ISystem.js';

export const glUploadUnknown: GLTextureUploader = {
    id: 'unknown',
    upload(source: TextureSource, glTexture: GLTexture, gl: WebGL2RenderingContext): void
    {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, source.pixelWidth, source.pixelHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
};

/**
 * System plugin to the renderer to manage textures.
 * @memberof PIXI
 */
export class TextureSystem implements ISystem
{
    /** @ignore */
    static extension: ExtensionMetadata = {
        type: ExtensionType.RendererSystem,
        name: 'texture',
    };

    /**
     * Bound textures.
     * @readonly
     */
    public boundTextures: TextureSource[];

    /**
     * List of managed textures.
     * @readonly
     */
    public managedTextures: Array<TextureSource>;

    /** Whether glTexture with int/uint sampler type was uploaded. */
    protected hasIntegerTextures: boolean;
    protected CONTEXT_UID: number;
    protected gl: IRenderingContext;
    protected formats: Record<string, number>;
    protected internalFormats: Record<string, number>;
    protected types: Record<string, number>;
    protected samplerTypes: Record<number, SAMPLER_TYPES>;
    protected webGLVersion: number;

    /**
     * BaseTexture value that shows that we don't know what is bound.
     * @readonly
     */
    protected unknownTexture: TextureSource;

    /**
     * Did someone temper with textures state? We'll overwrite them when we need to unbind something.
     * @private
     */
    protected _unknownBoundTextures: boolean;

    /**
     * Current location.
     * @readonly
     */
    _activeTextureLocation: number;

    private renderer: Renderer;

    private readonly _uploads: Record<string, GLTextureUploader> = {
        unknown: glUploadUnknown,
        image: glUploadImageResource,
        buffer: glUploadBufferImageResource,
    };

    /**
     * @param renderer - The renderer this system works for.
     */
    constructor(renderer: Renderer)
    {
        this.renderer = renderer;

        // TODO set to max textures...
        this.boundTextures = [];
        this._activeTextureLocation = -1;
        this.managedTextures = [];

        this._unknownBoundTextures = false;
        this.unknownTexture = new TextureSource();

        this.hasIntegerTextures = false;
    }

    /** Sets up the renderer context and necessary buffers. */
    contextChange(): void
    {
        const gl = this.gl = this.renderer.gl;

        this.CONTEXT_UID = this.renderer.CONTEXT_UID;

        this.webGLVersion = this.renderer.context.webGLVersion;

        this.internalFormats = mapFormatToGlInternalFormat(gl);
        this.formats = mapFormatToGlFormat(gl);
        this.types = mapFormatToGlType(gl);
        this.samplerTypes = mapInternalFormatToSamplerType(gl);

        const maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);

        this.boundTextures.length = maxTextures;

        for (let i = 0; i < maxTextures; i++)
        {
            this.boundTextures[i] = null;
        }

        // TODO move this.. to a nice make empty textures class..
        for (let i = 0; i < this.boundTextures.length; i++)
        {
            this.bind(null, i);
        }
    }

    /** Resets texture location and bound textures Actual `bind(null, i)` calls will be performed at next `unbind()` call */
    reset(): void
    {
        this._unknownBoundTextures = true;
        this.hasIntegerTextures = false;
        this._activeTextureLocation = -1;

        for (let i = 0; i < this.boundTextures.length; i++)
        {
            this.boundTextures[i] = this.unknownTexture;
        }
    }

    /**
     * Ensures that current boundTextures all have FLOAT sampler type,
     * see {@link PIXI.SAMPLER_TYPES} for explanation.
     * @param maxTextures - number of locations to check
     */
    ensureSamplerType(maxTextures: number): void
    {
        const { boundTextures, hasIntegerTextures, CONTEXT_UID } = this;

        if (!hasIntegerTextures)
        {
            return;
        }

        for (let i = maxTextures - 1; i >= 0; --i)
        {
            const tex = boundTextures[i];

            if (tex)
            {
                const glTexture = tex._glTextures[CONTEXT_UID];

                if (!glTexture || glTexture.samplerType !== SAMPLER_TYPES.FLOAT)
                {
                    this.unbind(tex);
                }
            }
        }
    }

    initTextureType(source: TextureSource, glTexture: GLTexture): void
    {
        glTexture.format = this.formats[source.format];
        glTexture.type = this.types[source.format];
        glTexture.internalFormat = this.internalFormats[source.format];
        glTexture.samplerType = this.samplerTypes[glTexture.internalFormat] ?? SAMPLER_TYPES.FLOAT;

        switch (source.viewDimension)
        {
            case '2d-array': glTexture.target = GL_TARGETS.TEXTURE_2D_ARRAY; break;
            case '3d': glTexture.target = GL_TARGETS.TEXTURE_3D; break;
        }
    }

    public getGlSource(source: TextureSource): GLTexture
    {
        return source._glTextures[this.CONTEXT_UID] || this._initSource(source, this.getSourceUploader(source));
    }

    public initSource(source: TextureSource)
    {
        this.bind(source);
    }

    public bind(texture: BindableTexture, location = 0)
    {
        if (texture)
        {
            this.bindSource(texture.source, location);
        }
        else
        {
            this.bindSource(null, location);
        }
    }

    public bindSource(source: TextureSource, location = 0): void
    {
        const gl = this.gl;

        if (source)
        {
            source.touched = this.renderer.textureGC.count;
            source._glLastBindLocation = location;
        }

        if (this.boundTextures[location] !== source)
        {
            this.boundTextures[location] = source;
            this._activateLocation(location);

            source = source || Texture.EMPTY.source;

            // bind texture and source!
            const glTexture = this.getGlSource(source);

            if (glTexture.samplerType !== SAMPLER_TYPES.FLOAT)
            {
                this.hasIntegerTextures = true;
            }

            gl.bindTexture(glTexture.target, glTexture.texture);
        }
    }

    public unbind(texture: BindableTexture): void
    {
        const source = texture.source;
        const boundTextures = this.boundTextures;
        const gl = this.gl;

        for (let i = 0; i < boundTextures.length; i++)
        {
            if (boundTextures[i] === source)
            {
                this._activateLocation(i);

                const glTexture = this.getGlSource(source);

                gl.bindTexture(glTexture.target, null);
                boundTextures[i] = null;
            }
        }
    }

    private _activateLocation(location: number): void
    {
        if (this._activeTextureLocation !== location)
        {
            this._activeTextureLocation = location;
            this.gl.activeTexture(this.gl.TEXTURE0 + location);
        }
    }

    private _initSourceInner(source: TextureSource): GLTexture
    {
        const gl = this.gl;

        const glTexture = new GLTexture(gl.createTexture());

        this.initTextureType(source, glTexture);

        if (source.autoGenerateMipmaps && source.isPowerOfTwo)
        {
            const biggestDimension = Math.max(source.width, source.height);

            source.mipLevelCount = Math.floor(Math.log2(biggestDimension)) + 1;
        }

        source._glTextures[this.CONTEXT_UID] = glTexture;

        return glTexture;
    }

    private _initSource(source: TextureSource, uploader: GLTextureUploader): GLTexture
    {
        const gl = this.gl;
        const glTexture = this._initSourceInner(source);

        if (!this.managedTextures.includes(source))
        {
            source.on('update', this.onSourceUpdate, this);
            source.on('resize', this.onSourceResize, this);
            source.on('styleChange', this.onStyleChange, this);
            source.on('destroy', this.onSourceDestroy, this);
            source.on('unload', this.onSourceUnload, this);
            source.on('updateMipmaps', this.onUpdateMipmaps, this);

            this.managedTextures.push(source);
        }

        gl.bindTexture(glTexture.target, glTexture.texture);
        if (uploader.storage)
        {
            uploader.storage(source, glTexture, gl);
        }
        this._updateSource(source, uploader);
        this.onStyleChange(source);

        return glTexture;
    }

    private _updateSource(source: TextureSource, uploader: GLTextureUploader): GLTexture
    {
        const gl = this.gl;

        const glTexture = this.getGlSource(source);

        if (source._glLastBindLocation >= 0)
        {
            this._activateLocation(source._glLastBindLocation);
        }

        gl.bindTexture(glTexture.target, glTexture.texture);

        this.boundTextures[this._activeTextureLocation] = source;

        uploader.upload(source, glTexture, gl, this.renderer.context.webGLVersion);

        if (source.autoGenerateMipmaps && source.mipLevelCount > 1)
        {
            this.onUpdateMipmaps(source, false);
        }

        return glTexture;
    }

    protected onStyleChange(source: TextureSource): void
    {
        const gl = this.gl;

        const glTexture = this.getGlSource(source);

        if (source._glLastBindLocation >= 0)
        {
            this._activateLocation(source._glLastBindLocation);
        }

        gl.bindTexture(glTexture.target, glTexture.texture);

        this.boundTextures[this._activeTextureLocation] = source;

        applyStyleParams(
            source.style,
            gl,
            source.mipLevelCount > 1,
            null,
            'texParameteri',
            glTexture.target,
            // will force a clamp to edge if the texture is not a power of two
            !source.isPowerOfTwo
        );
    }

    protected onSourceUnload(source: TextureSource): void
    {
        const glTexture = source._glTextures[this.CONTEXT_UID];

        if (!glTexture) return;

        this.unbind(source);
        delete source._glTextures[this.CONTEXT_UID];

        this.gl.deleteTexture(glTexture.texture);
    }

    protected onSourceUpdate(source: TextureSource): void
    {
        this._updateSource(source, this.getSourceUploader(source));
    }

    getSourceUploader(source: TextureSource): GLTextureUploader
    {
        return source.glUploader || this._uploads[source.uploadMethodId];
    }

    protected onSourceResize(source: TextureSource): void
    {
        const old_tex = source._glTextures[this.CONTEXT_UID];
        const uploader = this.getSourceUploader(source);

        if (!old_tex || !uploader || !uploader.storage)
        {
            this.onSourceUpdate(source);

            return;
        }

        const gl = this.gl;

        delete source._glTextures[this.CONTEXT_UID];

        if (!source.copyOnResize)
        {
            gl.deleteTexture(old_tex.texture);
            this.initSource(source);

            return;
        }

        const glTexture = this._initSourceInner(source);

        this.onStyleChange(source); // also binds texture

        uploader.storage(source, glTexture, gl);
        uploader.copyTex(source, glTexture, gl, old_tex);
        gl.deleteTexture(old_tex.texture);

        if (source.autoGenerateMipmaps && source.mipLevelCount > 1)
        {
            this.onUpdateMipmaps(source, false);
        }
    }

    protected onUpdateMipmaps(source: TextureSource, bind = true): void
    {
        if (bind) this.bindSource(source, 0);

        const glTexture = this.getGlSource(source);

        this.gl.generateMipmap(glTexture.target);
    }

    protected onSourceDestroy(source: TextureSource): void
    {
        source.off('destroy', this.onSourceDestroy, this);
        source.off('update', this.onSourceUpdate, this);
        source.off('resize', this.onSourceResize, this);
        source.off('unload', this.onSourceUnload, this);
        source.off('styleChange', this.onStyleChange, this);
        source.off('updateMipmaps', this.onUpdateMipmaps, this);

        this.managedTextures.splice(this.managedTextures.indexOf(source), 1);

        this.onSourceUnload(source);
    }

    destroy(): void
    {
        this.renderer = null;
    }
}

extensions.add(TextureSystem);
