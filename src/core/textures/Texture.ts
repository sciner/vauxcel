import { ALPHA_MODES } from '@pixi/constants.js';
import { Rectangle } from '@pixi/math/index.js';
import { EventEmitter, NOOP, uid } from '@pixi/utils/index.js';
import { BufferImageSource } from './sources/BufferSource';
import { TextureSource } from './sources/TextureSource.js';
import { TextureMatrix } from './TextureMatrix.js';
import { TextureUvs } from './TextureUvs.js';

import type { TextureResourceOrOptions } from './utils/textureFrom.js';

/**
 * Stores the width of the non-scalable borders, for example when used with {@link scene.NineSlicePlane} texture.
 * @memberof rendering
 */
export interface TextureBorders
{
    /** left border in pixels */
    left: number;
    /** top border in pixels */
    top: number;
    /** right border in pixels */
    right: number;
    /** bottom border in pixels */
    bottom: number;
}

/**
 * The UVs data structure for a texture.
 * @memberof rendering
 */
export type UVs = {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    x3: number;
    y3: number;
};

/**
 * The options that can be passed to a new Texture
 * @memberof rendering
 */
export interface TextureOptions
{
    /** the underlying texture data that this texture will use  */
    source?: TextureSource;
    /** optional label, for debugging */
    label?: string;
    /** The rectangle frame of the texture to show */
    frame?: Rectangle;
    /** The area of original texture */
    orig?: Rectangle;
    /** Trimmed rectangle of original texture */
    trim?: Rectangle;
    /** Default anchor point used for sprite placement / rotation */
    defaultAnchor?: { x: number; y: number };
    /** Default borders used for 9-slice scaling {@link NineSlicePlane}*/
    defaultBorders?: TextureBorders;
    /** indicates how the texture was rotated by texture packer. See {@link groupD8} */
    rotate?: number;
}

export interface BindableTexture
{
    source: TextureSource;
}

export type TextureSourceLike = TextureSource | TextureResourceOrOptions | string;

/**
 * A texture stores the information that represents an image or part of an image.
 *
 * A texture must have a loaded resource passed to it to work. It does not contain any
 * loading mechanisms.
 *
 * The Assets class can be used to load an texture from a file. This is the recommended
 * way as it will handle the loading and caching for you.
 *
 * ```js
 *
 * const texture = await Asset.load('assets/image.png');
 *
 * // once Assets has loaded the image it will be available via the from method
 * const sameTexture = Texture.from('assets/image.png');
 * // another way to acces the texture once loaded
 * const sameAgainTexture = Asset.get('assets/image.png');
 *
 * const sprite1 = new Sprite(texture);
 *
 * ```
 *
 * It cannot be added to the display list directly; instead use it as the texture for a Sprite.
 * If no frame is provided for a texture, then the whole image is used.
 *
 * You can directly create a texture from an image and then reuse it multiple times like this :
 *
 * ```js
 * import { Sprite, Texture } from 'pixi.js';
 *
 * const texture = await Asset.load('assets/image.png');
 * const sprite1 = new Sprite(texture);
 * const sprite2 = new Sprite(texture);
 * ```
 *
 * If you didn't pass the texture frame to constructor, it enables `noFrame` mode:
 * it subscribes on baseTexture events, it automatically resizes at the same time as baseTexture.
 * @memberof rendering
 * @class
 */
export class Texture extends EventEmitter<{
    update: Texture
    destroy: Texture
}> implements BindableTexture
{
    /**
     * Helper function that creates a returns Texture based on the source you provide.
     * The source should be loaded and ready to go. If not its best to grab the asset using Assets.
     * @param id - String or Source to create texture from
     * @param skipCache - Skip adding the texture to the cache
     * @returns The texture based on the Id provided
     */
    public static from: (id: TextureSourceLike, skipCache?: boolean) => Texture;

    /** label used for debugging */
    public label?: string;
    /** unique id for this texture */
    public uid = uid();
    /**
     * Has the texture been destroyed?
     * @readonly
     */
    public destroyed: boolean;

    public _source: TextureSource;

    /**
     * Indicates whether the texture is rotated inside the atlas
     * set to 2 to compensate for texture packer rotation
     * set to 6 to compensate for spine packer rotation
     * can be used to rotate or mirror sprites
     * See {@link PIXI.groupD8} for explanation
     */
    public readonly rotate: number;
    /** A uvs object based on the given frame and the texture source */
    public readonly uvs = new TextureUvs();
    /**
     * Anchor point that is used as default if sprite is created with this texture.
     * Changing the `defaultAnchor` at a later point of time will not update Sprite's anchor point.
     * @default {0,0}
     */
    public readonly defaultAnchor?: { x: number; y: number };
    /**
     * Default width of the non-scalable border that is used if 9-slice plane is created with this texture.
     * @since 7.2.0
     * @see PIXI.NineSlicePlane
     */
    public readonly defaultBorders?: TextureBorders;
    /**
     * This is the area of the BaseTexture image to actually copy to the Canvas / WebGL when rendering,
     * irrespective of the actual frame size or placement (which can be influenced by trimmed texture atlases)
     */
    public frame = new Rectangle();
    /** This is the area of original texture, before it was put in atlas. */
    public orig: Rectangle;
    /**
     * This is the trimmed area of original texture, before it was put in atlas
     * Please call `updateUvs()` after you change coordinates of `trim` manually.
     */
    public trim: Rectangle;

    /**
     * Does this Texture have any frame data assigned to it?
     *
     * This mode is enabled automatically if no frame was passed inside constructor.
     *
     * In this mode texture is subscribed to baseTexture events, and fires `update` on any change.
     *
     * Beware, after loading or resize of baseTexture event can fired two times!
     * If you want more control, subscribe on baseTexture itself.
     * @example
     * texture.on('update', () => {});
     */
    public noFrame = false;

    private _textureMatrix: TextureMatrix;

    /** is it a texture? yes! used for type checking */
    public readonly isTexture = true;

    /**
     * @param {TextureOptions} param0 - Options for the texture
     */
    constructor({
        source,
        label,
        frame,
        orig,
        trim,
        defaultAnchor,
        defaultBorders,
        rotate
    }: TextureOptions = {})
    {
        super();

        this.label = label;
        this.source = source?.source ?? new TextureSource();

        this.noFrame = !frame;

        if (frame)
        {
            this.frame.copyFrom(frame);
        }
        else
        {
            const { width, height } = this._source;

            this.frame.width = width;
            this.frame.height = height;
        }

        this.orig = orig || this.frame;
        this.trim = trim;

        this.rotate = rotate ?? 0;
        this.defaultAnchor = defaultAnchor;
        this.defaultBorders = defaultBorders;

        this.destroyed = false;

        this.updateUvs();
    }

    set source(value: TextureSource)
    {
        if (this._source)
        {
            this._source.off('resize', this.update, this);
        }

        this._source = value;

        value.on('resize', this.update, this);

        this.emit('update', this);
    }

    /** the underlying source of the texture (equivalent of baseTexture in v7) */
    get source(): TextureSource
    {
        return this._source;
    }

    /** returns a TextureMatrix instance for this texture. By default, that object is not created because its heavy. */
    get textureMatrix()
    {
        if (!this._textureMatrix)
        {
            this._textureMatrix = new TextureMatrix(this);
        }

        return this._textureMatrix;
    }

    /** The width of the Texture in pixels. */
    get width(): number
    {
        return this.orig.width;
    }

    /** The height of the Texture in pixels. */
    get height(): number
    {
        return this.orig.height;
    }

    /** Call this function when you have modified the frame of this texture. */
    public updateUvs()
    {
        this.uvs.set(this.frame, this._source, this.rotate);
    }

    /**
     * Destroys this texture
     * @param destroySource - Destroy the source when the texture is destroyed.
     */
    public destroy(destroySource = false)
    {
        if (this._source)
        {
            if (destroySource)
            {
                this._source.destroy();
                this._source = null;
            }
        }

        this._textureMatrix = null;
        this.destroyed = true;
        this.emit('destroy', this);
        this.removeAllListeners();
    }

    /** call this if you have modified the `texture outside` of the constructor */
    public update(): void
    {
        if (this.noFrame)
        {
            this.frame.width = this._source.width;
            this.frame.height = this._source.height;
        }

        this.updateUvs();
        this.emit('update', this);
    }

    /** an Empty Texture used internally by the engine */
    public static EMPTY: Texture;
    /** a White texture used internally by the engine */
    public static WHITE: Texture;

    castToBaseTexture()
    {
        return this.source;
    }

    _updateID = 0;
}

Texture.EMPTY = new Texture({
    label: 'EMPTY',
    source: new TextureSource({
        label: 'EMPTY',
    })
});

Texture.EMPTY.destroy = NOOP;

Texture.WHITE = new Texture({
    source: new BufferImageSource({
        resource: new Uint8Array([255, 255, 255, 255]),
        width: 1,
        height: 1,
        alphaMode: ALPHA_MODES.PREMULTIPLY_ON_UPLOAD,
        label: 'WHITE',
    }),
    label: 'WHITE',
});

Texture.WHITE.destroy = NOOP;
