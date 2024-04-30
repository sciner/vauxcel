import type { GraphicsData } from '../GraphicsData.js';
import type { GraphicsGeometry } from '../GraphicsGeometry.js';

export interface IShapeBuildCommand
{
    build(graphicsData: GraphicsData): void;
    triangulate(graphicsData: GraphicsData, target: GraphicsGeometry): void;
}
