import { ArrayResource } from './ArrayResource.js';
import { INSTALLED } from './autoDetectResource.js';
import { BufferResource } from './BufferResource.js';
import { CanvasResource } from './CanvasResource.js';
import { CubeResource } from './CubeResource.js';
import { ImageBitmapResource } from './ImageBitmapResource.js';
import { ImageResource } from './ImageResource.js';
import { SVGResource } from './SVGResource.js';
import { VideoResource } from './VideoResource.js';

export * from './BaseImageResource.js';
export * from './Resource.js';

INSTALLED.push(
    ImageBitmapResource,
    ImageResource,
    CanvasResource,
    VideoResource,
    SVGResource,
    BufferResource,
    CubeResource,
    ArrayResource
);

export * from './AbstractMultiResource.js';
export * from './ArrayResource.js';
export * from './autoDetectResource.js';
export * from './Buffer3DResource.js';
export * from './BufferResource.js';
export * from './CanvasResource.js';
export * from './CubeResource.js';
export * from './ImageBitmapResource.js';
export * from './ImageResource.js';
export * from './SVGResource.js';
export * from './VideoResource.js';
