import { Matrix } from '@pixi/math/index.js';
import { Texture } from '../../textures/Texture.js';
import { Filter } from '../Filter.js';

import type { CLEAR_MODES } from '@pixi/constants.js';
import type { Point } from '@pixi/math/index.js';
import type { Dict } from '@pixi/utils/index.js';
import type { IMaskTarget } from '../../mask/MaskData.js';
import type { RenderTexture } from '../../renderTexture/RenderTexture.js';
import type { FilterSystem } from '../FilterSystem.js';

const fragment = `#version 100

varying vec2 vMaskCoord;
varying vec2 vTextureCoord;

uniform sampler2D uSampler;
uniform sampler2D mask;
uniform float alpha;
uniform float npmAlpha;
uniform vec4 maskClamp;

void main(void)
{
    float clip = step(3.5,
        step(maskClamp.x, vMaskCoord.x) +
        step(maskClamp.y, vMaskCoord.y) +
        step(vMaskCoord.x, maskClamp.z) +
        step(vMaskCoord.y, maskClamp.w));

    vec4 original = texture2D(uSampler, vTextureCoord);
    vec4 masky = texture2D(mask, vMaskCoord);
    float alphaMul = 1.0 - npmAlpha * (1.0 - masky.a);

    original *= (alphaMul * masky.r * alpha * clip);

    gl_FragColor = original;
}
`;

const vertex = `#version 100

attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat3 projectionMatrix;
uniform mat3 otherMatrix;

varying vec2 vMaskCoord;
varying vec2 vTextureCoord;

void main(void)
{
    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);

    vTextureCoord = aTextureCoord;
    vMaskCoord = ( otherMatrix * vec3( aTextureCoord, 1.0)  ).xy;
}
`;

export interface ISpriteMaskTarget extends IMaskTarget
{
    _texture: Texture;
    worldAlpha: number;
    anchor: Point;
}

export interface ISpriteMaskFilter extends Filter
{
    maskSprite: IMaskTarget;
}

/**
 * This handles a Sprite acting as a mask, as opposed to a Graphic.
 *
 * WebGL only.
 * @memberof PIXI
 */
export class SpriteMaskFilter extends Filter
{
    /** @private */
    _maskSprite: IMaskTarget;

    /** Mask matrix */
    maskMatrix: Matrix;

    /**
     * @param {PIXI.Sprite} sprite - The target sprite.
     */
    constructor(sprite: IMaskTarget);

    /**
     * @param vertexSrc - The source of the vertex shader.
     * @param fragmentSrc - The source of the fragment shader.
     * @param uniforms - Custom uniforms to use to augment the built-in ones.
     */
    constructor(vertexSrc?: string, fragmentSrc?: string, uniforms?: Dict<any>);

    /** @ignore */
    constructor(vertexSrc?: string | IMaskTarget, fragmentSrc?: string, uniforms?: Dict<any>)
    {
        let sprite = null;

        if (typeof vertexSrc !== 'string' && fragmentSrc === undefined && uniforms === undefined)
        {
            sprite = vertexSrc as IMaskTarget;
            vertexSrc = undefined;
            fragmentSrc = undefined;
            uniforms = undefined;
        }

        super(vertexSrc as string || vertex, fragmentSrc || fragment, uniforms);

        this.maskSprite = sprite;
        this.maskMatrix = new Matrix();
    }

    /**
     * Sprite mask
     * @type {PIXI.DisplayObject}
     */
    get maskSprite(): IMaskTarget
    {
        return this._maskSprite;
    }

    set maskSprite(value: IMaskTarget)
    {
        this._maskSprite = value;

        if (this._maskSprite)
        {
            this._maskSprite.renderable = false;
        }
    }

    /**
     * Applies the filter
     * @param filterManager - The renderer to retrieve the filter from
     * @param input - The input render target.
     * @param output - The target to output to.
     * @param clearMode - Should the output be cleared before rendering to it.
     */
    apply(filterManager: FilterSystem, input: RenderTexture, output: RenderTexture, clearMode: CLEAR_MODES): void
    {
        const maskSprite = this._maskSprite as ISpriteMaskTarget;
        const tex = maskSprite._texture;

        if (!tex || tex === Texture.EMPTY)
        {
            return;
        }
        const tm = tex.textureMatrix;

        tm.update();

        this.uniforms.npmAlpha = tex.source.alphaMode > 0;
        this.uniforms.mask = tex;
        // get _normalized sprite texture coords_ and convert them to _normalized atlas texture coords_ with `prepend`
        this.uniforms.otherMatrix = filterManager.calculateSpriteMatrix(this.maskMatrix, maskSprite)
            .prepend(tm.mapCoord);
        this.uniforms.alpha = maskSprite.worldAlpha;
        this.uniforms.maskClamp = tm.uClampFrame;

        filterManager.applyFilter(this, input, output, clearMode);
    }
}
