import { TextureAsync } from '@pixi/assets/index.js';
import { Color, Matrix, Program, Shader, TextureMatrix } from '@pixi/core/index.js';

import type { ColorSource, Texture, utils } from '@pixi/core/index.js';

const fragment = `#version 100

varying vec2 vTextureCoord;
uniform vec4 uColor;

uniform sampler2D uSampler;

void main(void)
{
    gl_FragColor = texture2D(uSampler, vTextureCoord) * uColor;
}
`;

const vertex = `#version 100

attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform mat3 uTextureMatrix;

varying vec2 vTextureCoord;

void main(void)
{
    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);

    vTextureCoord = (uTextureMatrix * vec3(aTextureCoord, 1.0)).xy;
}
`;

export interface IMeshMaterialOptions
{
    alpha?: number;
    tint?: ColorSource;
    pluginName?: string;
    program?: Program;
    uniforms?: utils.Dict<unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MeshMaterial extends PixiMixins.MeshMaterial {}

/**
 * Slightly opinionated default shader for PixiJS 2D objects.
 * @memberof PIXI
 */
export class MeshMaterial extends Shader
{
    /**
     * TextureMatrix instance for this Mesh, used to track Texture changes.
     * @readonly
     */
    public readonly uvMatrix: TextureMatrix;

    /**
     * `true` if shader can be batch with the renderer's batch system.
     * @default true
     */
    public batchable: boolean;

    /**
     * Renderer plugin for batching.
     * @default 'batch'
     */
    public pluginName: string;

    // Internal-only properties
    _tintRGB: number;

    /**
     * Only do update if tint or alpha changes.
     * @private
     * @default false
     */
    private _colorDirty: boolean;
    private _alpha: number;
    private _tintColor: Color;

    /**
     * @param uSampler - Texture that material uses to render.
     * @param options - Additional options
     * @param {number} [options.alpha=1] - Default alpha.
     * @param {PIXI.ColorSource} [options.tint=0xFFFFFF] - Default tint.
     * @param {string} [options.pluginName='batch'] - Renderer plugin for batching.
     * @param {PIXI.Program} [options.program=0xFFFFFF] - Custom program.
     * @param {object} [options.uniforms] - Custom uniforms.
     */
    constructor(uSampler: Texture, options?: IMeshMaterialOptions)
    {
        const uniforms = {
            uSampler,
            alpha: 1,
            uTextureMatrix: Matrix.IDENTITY,
            uColor: new Float32Array([1, 1, 1, 1]),
        };

        // Set defaults
        options = Object.assign({
            tint: 0xFFFFFF,
            alpha: 1,
            pluginName: 'batch',
        }, options);

        if (options.uniforms)
        {
            Object.assign(uniforms, options.uniforms);
        }

        super(options.program || Program.from(vertex, fragment), uniforms);

        this._colorDirty = false;

        this.uvMatrix = new TextureMatrix(uSampler);
        this.batchable = options.program === undefined;
        this.pluginName = options.pluginName;

        this._tintColor = new Color(options.tint);
        this._tintRGB = this._tintColor.toLittleEndianNumber();
        this._colorDirty = true;
        this.alpha = options.alpha;
    }

    /** Reference to the texture being rendered. */
    get texture(): Texture
    {
        return this.uniforms.uSampler;
    }
    set texture(value: Texture)
    {
        if (value instanceof TextureAsync)
        {
            value.setTo(this);

            return;
        }

        if (this.uniforms.uSampler !== value)
        {
            if (!this.uniforms.uSampler.source.alphaMode !== !value.source.alphaMode)
            {
                this._colorDirty = true;
            }

            this.uniforms.uSampler = value;
            this.uvMatrix.texture = value;
        }
    }

    /**
     * This gets automatically set by the object using this.
     * @default 1
     */
    set alpha(value: number)
    {
        if (value === this._alpha) return;

        this._alpha = value;
        this._colorDirty = true;
    }
    get alpha(): number
    {
        return this._alpha;
    }

    /**
     * Multiply tint for the material.
     * @default 0xFFFFFF
     */
    set tint(value: ColorSource)
    {
        if (value === this.tint) return;

        this._tintColor.setValue(value);
        this._tintRGB = this._tintColor.toLittleEndianNumber();
        this._colorDirty = true;
    }
    get tint(): ColorSource
    {
        return this._tintColor.value;
    }

    /**
     * Get the internal number from tint color
     * @ignore
     */
    get tintValue(): number
    {
        return this._tintColor.toNumber();
    }

    /** Gets called automatically by the Mesh. Intended to be overridden for custom {@link PIXI.MeshMaterial} objects. */
    public update(): void
    {
        if (this._colorDirty)
        {
            this._colorDirty = false;
            const baseTexture = this.texture.source;
            const applyToChannels = (baseTexture.alphaMode as unknown as boolean);

            Color.shared
                .setValue(this._tintColor)
                .premultiply(this._alpha, applyToChannels)
                .toArray(this.uniforms.uColor);
        }
        if (this.uvMatrix.update())
        {
            this.uniforms.uTextureMatrix = this.uvMatrix.mapCoord;
        }
    }

    textureAsync: TextureAsync = null;
}
