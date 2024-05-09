import { ExtensionMetadata, ExtensionType } from '../../../extensions.js';
import { TextureSource, TextureSourceOptions } from './TextureSource.js';

export type ImageResource =
ImageBitmap
| HTMLCanvasElement
| OffscreenCanvas
| VideoFrame
| HTMLImageElement
| HTMLVideoElement;

export class ImageSource extends TextureSource<ImageResource>
{
    public static extension: ExtensionMetadata = ExtensionType.TextureSource;
    public uploadMethodId = 'image';

    constructor(options: TextureSourceOptions<ImageResource>)
    {
        if (options.resource && (globalThis.HTMLImageElement && options.resource instanceof HTMLImageElement))
        {
            throw new Error('Use createImageBitmap instead of using ImageSource manually');
        }

        super(options);

        this.autoGarbageCollect = true;
    }

    public static test(resource: any): resource is ImageResource
    {
        return (globalThis.HTMLImageElement && resource instanceof HTMLImageElement)
        || (typeof ImageBitmap !== 'undefined' && resource instanceof ImageBitmap);
    }
}
