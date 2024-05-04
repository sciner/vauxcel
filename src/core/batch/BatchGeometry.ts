import { Buffer } from '../geometry/Buffer.js';
import { Geometry } from '../geometry/Geometry.js';

export class BatchGeometryProto extends Geometry
{
    constructor()
    {
        const buf = new Buffer(null, true, false);
        const index_buf = new Buffer(null, true, true);

        super({
            attributes: {
                aVertexPosition: {
                    format: 'float32x2',
                    buffer: buf
                },
                aTextureCoord: {
                    format: 'float32x2',
                    buffer: buf
                },
                aColor: {
                    format: 'unorm8x4',
                    buffer: buf
                },
                aTextureId: {
                    format: 'float32',
                    buffer: buf
                }
            },
            indexBuffer: index_buf
        });
    }

    static inst = new BatchGeometryProto();
}

/**
 * Geometry used to batch standard PIXI content (e.g. Mesh, Sprite, Graphics objects).
 * @memberof PIXI
 */
export class BatchGeometry extends Geometry
{
    /**
     * Buffer used for position, color, texture IDs
     * @protected
     */
    _buffer: Buffer;

    /**
     * Index buffer data
     * @protected
     */
    _indexBuffer: Buffer;

    /**
     * @param {boolean} [_static=false] - Optimization flag, where `false`
     *        is updated every frame, `true` doesn't change frame-to-frame.
     */
    constructor(_static = false)
    {
        const buf = new Buffer(null, _static, false);
        const index_buf = new Buffer(null, _static, true);

        super({
            attributes: {
                aVertexPosition: buf,
            },
            indexBuffer: index_buf,
            proto: BatchGeometryProto.inst
        });

        this._buffer = buf;

        this._indexBuffer = index_buf;
    }
}
