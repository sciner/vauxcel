import type { Rectangle } from '@pixi/math/index.js';

export interface IFilterTarget
{
    filterArea: Rectangle;
    getBounds(skipUpdate?: boolean): Rectangle;
}
