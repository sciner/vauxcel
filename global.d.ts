// core

declare namespace GlobalMixins
{
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface BaseTexture
    {

    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Texture
    {

    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface BaseRenderTexture
    {

    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface IRendererOptions
    {

    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface IRenderableObject
    {

    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Renderer
    {

    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface IRenderer
    {

    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface IRendererPlugins
    {

    }

    interface Settings
    {
        /** @deprecated since 7.1.0 */
        FILTER_RESOLUTION: number;
        /** @deprecated since 7.1.0 */
        FILTER_MULTISAMPLE: import('@sciner/pixi').MSAA_QUALITY;
        /** @deprecated since 7.1.0 */
        SPRITE_MAX_TEXTURES: number;
        /** @deprecated since 7.1.0 */
        SPRITE_BATCH_SIZE: number;
        /** @deprecated since 7.1.0 */
        MIPMAP_TEXTURES: import('@sciner/pixi').MIPMAP_MODES;
        /** @deprecated since 7.1.0 */
        ANISOTROPIC_LEVEL: number;
        /** @deprecated since 7.1.0 */
        WRAP_MODE: import('@sciner/pixi').WRAP_MODES;
        /** @deprecated since 7.1.0 */
        SCALE_MODE: import('@sciner/pixi').SCALE_MODES;
        /** @deprecated since 7.1.0 */
        CAN_UPLOAD_SAME_BUFFER: boolean;
        /** @deprecated since 7.1.0 */
        PRECISION_VERTEX: import('@sciner/pixi').PRECISION,
        /** @deprecated since 7.1.0 */
        PRECISION_FRAGMENT: import('@sciner/pixi').PRECISION,
        /** @deprecated since 7.1.0 */
        GC_MODE: import('@sciner/pixi').GC_MODES,
        /** @deprecated since 7.1.0 */
        GC_MAX_IDLE: number,
        /** @deprecated since 7.1.0 */
        GC_MAX_CHECK_COUNT: number,

        RENDER_OPTIONS: import('@sciner/pixi').IRendererOptions;
        STRICT_TEXTURE_CACHE: boolean;
        PREFER_ENV: import('@sciner/pixi').ENV;
    }
}

// settings

declare namespace GlobalMixins
{
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface ICanvas
    {

    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Settings
    {

    }
}

// utils

declare namespace GlobalMixins
{
    interface Settings
    {
        FAIL_IF_MAJOR_PERFORMANCE_CAVEAT: boolean;
        RETINA_PREFIX: RegExp;
    }
}

// math

declare namespace GlobalMixins
{

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface IPointData
    {
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Point
    {
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface ObservablePoint
    {
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Rectangle
    {
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Transform
    {
    }
}

// ticker

declare namespace GlobalMixins
{
    interface Application
    {
        ticker: import('@sciner/pixi').Ticker;
        stop(): void;
        start(): void;
    }

    interface IApplicationOptions
    {
        autoStart?: boolean;
        sharedTicker?: boolean;
    }

    interface Settings
    {
        /** @deprecated since 7.1.0 */
        TARGET_FPMS: number;
    }
}

// display

declare namespace GlobalMixins
{
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface DisplayObject
    {

    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Container
    {

    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface DisplayObjectEvents
    {

    }

    interface Settings
    {
        /** @deprecated since 7.1.0 */
        SORTABLE_CHILDREN: boolean;
    }
}

// Sprite

declare namespace GlobalMixins
{
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Sprite
    {

    }
}

// mesh

declare namespace GlobalMixins
{
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Mesh
    {

    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface MeshMaterial
    {

    }
}

// BitmapText

declare namespace GlobalMixins
{
    interface IBitmapFontResource
    {
        bitmapFont: import('@sciner/pixi').BitmapFont;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface LoaderResource extends Partial<IBitmapFontResource>
    {

    }

    interface IBitmapFontResourceMetadata
    {
        pageFile: string;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface IResourceMetadata extends Partial<IBitmapFontResourceMetadata>
    {

    }
}

// graphics

declare namespace GlobalMixins
{
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Graphics
    {

    }
}
