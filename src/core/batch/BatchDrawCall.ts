import { Topology } from '@pixi/constants.js';

import type { BLEND_MODES } from '@pixi/constants.js';
import type { BatchTextureArray } from './BatchTextureArray.js';

/**
 * Used by the batcher to draw batches.
 * Each one of these contains all information required to draw a bound geometry.
 * @memberof PIXI
 */
export class BatchDrawCall
{
    texArray: BatchTextureArray;
    type: Topology;
    blend: BLEND_MODES;
    start: number;
    size: number;

    /** Data for uniforms or custom webgl state. */
    data: any;

    constructor()
    {
        this.texArray = null;
        this.blend = 0;
        this.type = 'triangle-list';

        this.start = 0;
        this.size = 0;

        this.data = null;
    }
}
