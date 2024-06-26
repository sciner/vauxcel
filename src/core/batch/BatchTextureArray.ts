import type { TextureSource } from '../textures/sources/TextureSource';

/**
 * Used by the batcher to build texture batches.
 * Holds list of textures and their respective locations.
 * @memberof PIXI
 */
export class BatchTextureArray
{
    /** Inside textures array. */
    public elements: TextureSource[];

    /** Respective locations for textures. */
    public ids: number[];

    /** Number of filled elements. */
    public count: number;

    constructor()
    {
        this.elements = [];
        this.ids = [];
        this.count = 0;
    }

    clear(): void
    {
        for (let i = 0; i < this.count; i++)
        {
            this.elements[i] = null;
        }
        this.count = 0;
    }
}
