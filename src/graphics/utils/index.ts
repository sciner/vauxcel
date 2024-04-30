/**
 * Generalized convenience utilities for Graphics.
 * @namespace graphicsUtils
 * @memberof PIXI
 */

// for type only
import { buildCircle } from './buildCircle.js';
import { buildPoly } from './buildPoly.js';
import { buildRectangle } from './buildRectangle.js';
import { buildRoundedRectangle } from './buildRoundedRectangle.js';
import { SHAPES } from '@vaux/core/index.js';

import type { BatchPart } from './BatchPart.js';
import type { IShapeBuildCommand } from './IShapeBuildCommand.js';
import type { BatchDrawCall } from '@vaux/core/index.js';

export * from './ArcUtils.js';
export * from './BatchPart.js';
export * from './BezierUtils.js';
export * from './buildCircle.js';
export * from './buildLine.js';
export * from './buildPoly.js';
export * from './buildRectangle.js';
export * from './buildRoundedRectangle.js';
export * from './QuadraticUtils.js';

/**
 * Map of fill commands for each shape type.
 * @memberof PIXI.graphicsUtils
 * @member {object} FILL_COMMANDS
 */
export const FILL_COMMANDS: Record<SHAPES, IShapeBuildCommand> = {
    [SHAPES.POLY]: buildPoly,
    [SHAPES.CIRC]: buildCircle,
    [SHAPES.ELIP]: buildCircle,
    [SHAPES.RECT]: buildRectangle,
    [SHAPES.RREC]: buildRoundedRectangle,
};

/**
 * Batch pool, stores unused batches for preventing allocations.
 * @memberof PIXI.graphicsUtils
 * @member {Array<PIXI.graphicsUtils.BatchPart>} BATCH_POOL
 */
export const BATCH_POOL: Array<BatchPart> = [];

/**
 * Draw call pool, stores unused draw calls for preventing allocations.
 * @memberof PIXI.graphicsUtils
 * @member {Array<PIXI.BatchDrawCall>} DRAW_CALL_POOL
 */
export const DRAW_CALL_POOL: Array<BatchDrawCall> = [];
