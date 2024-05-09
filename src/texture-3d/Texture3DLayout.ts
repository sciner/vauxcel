import { IPointData3D, ISize3D } from '@pixi/math/index.js';

export interface TextureLayout3DOptions
{
    size: ISize3D;
    offset: IPointData3D;
}

export class Texture3DLayout
{
    width: number;
    height: number;
    depth: number;
    x: number;
    y: number;
    z: number;

    constructor(options: TextureLayout3DOptions)
    {
        this.x = options.offset.x;
        this.y = options.offset.y;
        this.z = options.offset.z;
        this.width = options.size.width;
        this.height = options.size.height;
        this.depth = options.size.depth;
    }
}
