export interface IPointData extends PixiMixins.IPointData
{
    x: number;
    y: number;
}

export interface IPointData3D extends IPointData
{
    z: number;
}

/**
 * Common interface for points. Both Point and ObservablePoint implement it
 * @memberof PIXI
 * @interface IPointData
 */

/**
 * X coord
 * @memberof PIXI.IPointData#
 * @member {number} x
 */

/**
 * Y coord
 * @memberof PIXI.IPointData#
 * @member {number} y
 */
