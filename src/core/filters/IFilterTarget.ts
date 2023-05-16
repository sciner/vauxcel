import type { Rectangle } from '@vaux/math';

export interface IFilterTarget
{
    filterArea: Rectangle;
    getBounds(skipUpdate?: boolean): Rectangle;
}
