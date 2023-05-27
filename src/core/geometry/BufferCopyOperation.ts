import { PoolItem } from '@vaux/utils/pool/Pool';
import { Buffer } from './Buffer';
import type { Renderer } from '../Renderer';

export class BufferCopyOperation implements PoolItem
{
    src: number;
    dst: number;
    count: number;

    reset()
    {
        this.src = 0;
        this.dst = 0;
        this.count = 0;
    }
}

export interface IBufferCopier
{
    doCopy(renderer: Renderer, src: Buffer, target: Buffer, copies: Array<BufferCopyOperation>, strideBytes: number): void;
}
