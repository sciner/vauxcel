import { Buffer } from '../geometry/Buffer.js';
import { Geometry } from '../geometry/Geometry.js';

export class BatchGeometryProto extends Geometry
{
    constructor()
    {
        super({
            vertexBuffer: new Buffer(null, true, false),
            attributes: {
                aVertexPosition: 'float32x2',
                aTextureCoord: 'float32x2',
                aColor: 'unorm8x4',
                aTextureId: 'float32'
            },
            indexBuffer: new Buffer(null, true, true)
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
