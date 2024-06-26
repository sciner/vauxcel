import { BUFFER_TYPE } from '@pixi/constants.js';
import { Runner } from '@pixi/runner.js';

import type { GLBuffer } from './GLBuffer.js';

let UID = 0;
/* eslint-disable max-len */

/**
 * Marks places in PixiJS where you can pass Float32Array, UInt32Array, any typed arrays, and ArrayBuffer.
 *
 * Same as ArrayBuffer in typescript lib, defined here just for documentation.
 * @memberof PIXI
 */
export interface IArrayBuffer extends ArrayBuffer // eslint-disable-line @typescript-eslint/no-empty-interface
{
}

/** All the various typed arrays that exist in js */
// eslint-disable-next-line max-len
export type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array;

export type BufferOption = Buffer | TypedArray | number[];
/**
 * A wrapper for data so that it can be used and uploaded by WebGL
 * @memberof PIXI
 */
export class Buffer
{
    /**
     * The data in the buffer, as a typed array
     * @type {PIXI.IArrayBuffer}
     */
    public data: TypedArray;

    public _dataInt32: TypedArray = null;

    /**
     * Instead of data, you can specify byte length
     * might be 0 if data is specified
     */
    public byteLength: number;

    /**
     * The type of buffer this is, one of:
     * + ELEMENT_ARRAY_BUFFER - used as an index buffer
     * + ARRAY_BUFFER - used as an attribute buffer
     * + UNIFORM_BUFFER - used as a uniform buffer (if available)
     */
    public type: BUFFER_TYPE;

    public static: boolean;
    public id: number;
    disposeRunner: Runner;

    /**
     * A map of renderer IDs to webgl buffer
     * @private
     * @type {Object<number, GLBuffer>}
     */
    _glBuffers: {[key: number]: GLBuffer};
    _updateID: number;

    /**
     * @param {PIXI.IArrayBuffer} data - the data to store in the buffer.
     * @param _static - `true` for static buffer
     * @param index - `true` for index buffer
     */
    constructor(data?: IArrayBuffer, _static = true, index = false)
    {
        this.data = data as TypedArray || null;

        this.byteLength = 0;
        this._glBuffers = {};
        this._updateID = 0;

        this.index = index;
        this.static = _static;
        this.id = UID++;

        this.disposeRunner = new Runner('disposeBuffer');
    }

    // TODO could explore flagging only a partial upload?
    /**
     * Flags this buffer as requiring an upload to the GPU.
     * @param {PIXI.IArrayBuffer|number[]} [data] - the data to update in the buffer.
     */
    update(data?: IArrayBuffer | Array<number>): void
    {
        if (data && data !== this.data)
        {
            this._dataInt32 = null;
        }
        if (data instanceof Array)
        {
            data = new Float32Array(data);
        }
        this.data = (data as TypedArray) || this.data;
        this._updateID++;
    }

    get dataInt32()
    {
        if (!this._dataInt32)
        {
            this._dataInt32 = new Int32Array((this.data as any).buffer);
        }

        return this._dataInt32;
    }

    /** Disposes WebGL resources that are connected to this geometry. */
    dispose(): void
    {
        this.disposeRunner.emit(this, false);
    }

    /** Destroys the buffer. */
    destroy(): void
    {
        this.dispose();

        this.data = null;
    }

    /**
     * Flags whether this is an index buffer.
     *
     * Index buffers are of type `ELEMENT_ARRAY_BUFFER`. Note that setting this property to false will make
     * the buffer of type `ARRAY_BUFFER`.
     *
     * For backwards compatibility.
     */
    set index(value: boolean)
    {
        this.type = value ? BUFFER_TYPE.ELEMENT_ARRAY_BUFFER : BUFFER_TYPE.ARRAY_BUFFER;
    }

    get index(): boolean
    {
        return this.type === BUFFER_TYPE.ELEMENT_ARRAY_BUFFER;
    }

    /**
     * Helper function that creates a buffer based on an array or TypedArray
     * @param {ArrayBufferView | number[]} data - the TypedArray that the buffer will store. If this is a regular Array it will be converted to a Float32Array.
     * @returns - A new Buffer based on the data provided.
     */
    static from(data: IArrayBuffer | number[]): Buffer
    {
        if (data instanceof Array)
        {
            data = new Float32Array(data);
        }

        return new Buffer(data);
    }
}

export function ensureIsBuffer(buffer: BufferOption, index: boolean): Buffer
{
    if (!(buffer instanceof Buffer))
    {
        // let usage: number = index ? BufferUsage.INDEX : BufferUsage.VERTEX;

        // its an array!
        if (buffer instanceof Array)
        {
            if (index)
            {
                buffer = new Uint32Array(buffer);
            }
            else
            {
                buffer = new Float32Array(buffer);
            }
        }

        buffer = new Buffer(buffer, true, index);
    }

    return buffer;
}
