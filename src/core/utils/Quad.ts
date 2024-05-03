import { Geometry } from '../geometry/Geometry.js';

/**
 * Helper class to create a quad
 * @memberof PIXI
 */
export class Quad extends Geometry
{
    constructor()
    {
        super({
            attributes: {
                aVertexPosition: {
                    buffer: new Float32Array([
                        0, 0,
                        1, 0,
                        1, 1,
                        0, 1,
                    ]),
                    format: 'float32x2',
                }
            },
            indexBuffer: [0, 1, 3, 2]
        });
    }
}
