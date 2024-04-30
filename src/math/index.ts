/*
 * Math classes and utilities mixed into PIXI namespace.
 */

import { Circle } from './shapes/Circle.js';
import { Ellipse } from './shapes/Ellipse.js';
import { Polygon } from './shapes/Polygon.js';
import { Rectangle } from './shapes/Rectangle.js';
import { RoundedRectangle } from './shapes/RoundedRectangle.js';

export * from './groupD8.js';
export * from './IPoint.js';
export * from './IPointData.js';
export * from './Matrix.js';
export * from './ObservablePoint.js';
export * from './Point.js';
export * from './Transform.js';

export { Circle };
export { Ellipse };
export { Polygon };
export { Rectangle };
export { RoundedRectangle };

export * from './const.js';

/**
 * Complex shape type
 * @memberof PIXI
 */
export type IShape = Circle | Ellipse | Polygon | Rectangle | RoundedRectangle;

/**
 * @memberof PIXI
 */
export interface ISize
{
    width: number;
    height: number;
}

export interface ISize3D
{
    width: number;
    height: number;
    depth: number;
}
