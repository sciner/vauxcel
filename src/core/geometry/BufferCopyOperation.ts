import { Buffer } from './Buffer.js';
import { PoolItem } from '@vaux/utils/pool/Pool.js';

import type { Renderer } from '../Renderer.js';

export class BufferCopyOperation implements PoolItem
{
    src = 0;
    dst = 0;
    count = 0;

    reset()
    {
        this.src = 0;
        this.dst = 0;
        this.count = 0;
    }
}

export interface IBufferCopier
{
    doCopy(renderer: Renderer, src: Buffer, target: Buffer, strideBytes: number,
        copies: Array<BufferCopyOperation>, copyCount?: number): void;
}
