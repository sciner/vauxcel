import type { Rectangle } from '@vaux/math/index.js';

export interface IFilterTarget
{
    filterArea: Rectangle;
    getBounds(skipUpdate?: boolean): Rectangle;
}
