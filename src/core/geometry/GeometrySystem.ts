import { BUFFER_TYPE, ENV, Topology } from '@pixi/constants.js';
import { extensions, ExtensionType } from '@pixi/extensions.js';
import { settings } from '@pixi/settings/index.js';
import { Buffer } from './Buffer.js';
import { BufferCopyOperation, IBufferCopier } from './BufferCopyOperation.js';
import { GeometryPerGL, GeometryPerShader } from './Geometry.js';
import { getAttributeInfoFromFormat } from './utils/getAttributeInfoFromFormat.js';
import { getGlTypeFromFormat } from './utils/getGlTypeFromFormat.js';

import type { ExtensionMetadata } from '@pixi/extensions.js';
import type { Dict } from '@pixi/utils/index.js';
import type { IRenderingContext } from '../IRenderer.js';
import type { Renderer } from '../Renderer.js';
import type { Program } from '../shader/Program.js';
import type { Shader } from '../shader/Shader.js';
import type { ISystem } from '../system/ISystem.js';
import type { Geometry } from './Geometry.js';

export const topologyToGlMap = {
    'point-list': 0x0000,
    'line-list': 0x0001,
    'line-strip': 0x0003,
    'triangle-list': 0x0004,
    'triangle-strip': 0x0005
};

/**
 * System plugin to the renderer to manage geometry.
 * @memberof PIXI
 */
export class GeometrySystem implements ISystem
{
    /** @ignore */
    static extension: ExtensionMetadata = {
        type: ExtensionType.RendererSystem,
        name: 'geometry',
    };

    /**
     * `true` if we has `*_vertex_array_object` extension.
     * @readonly
     */
    public hasVao: boolean;

    /**
     * `true` if has `ANGLE_instanced_arrays` extension.
     * @readonly
     */
    public hasInstance: boolean;

    /**
     * instance for copy handler, used for swapAndCopyBuffer
     */
    public copier: IBufferCopier;

    /**
     * `true` if support `gl.UNSIGNED_INT` in `gl.drawElements` or `gl.drawElementsInstanced`.
     * @readonly
     */
    public canUseUInt32ElementIndex: boolean;

    protected CONTEXT_UID: number;
    protected gl: IRenderingContext;
    protected _activeGeometry: Geometry;
    protected _activeGPS: GeometryPerShader;
    protected _activeBB: Buffer;

    /** Cache for all geometries by id, used in case renderer gets destroyed or for profiling. */
    readonly managedGeometries: {[key: number]: Geometry};

    /** Renderer that owns this {@link GeometrySystem}. */
    private renderer: Renderer;

    /** @param renderer - The renderer this System works for. */
    constructor(renderer: Renderer)
    {
        this.renderer = renderer;
        this._activeGeometry = null;
        this._activeGPS = null;
        this._activeBB = null;

        this.hasVao = true;
        this.hasInstance = true;
        this.canUseUInt32ElementIndex = false;
        this.managedGeometries = {};
    }

    /** Sets up the renderer context and necessary buffers. */
    protected contextChange(): void
    {
        this.disposeAll(true);

        const gl = this.gl = this.renderer.gl;
        const context = this.renderer.context;

        this.CONTEXT_UID = this.renderer.CONTEXT_UID;

        // webgl2
        if (context.webGLVersion !== 2)
        {
            // webgl 1!
            let nativeVaoExtension = this.renderer.context.extensions.vertexArrayObject;

            if (settings.PREFER_ENV === ENV.WEBGL_LEGACY)
            {
                nativeVaoExtension = null;
            }

            if (nativeVaoExtension)
            {
                gl.createVertexArray = (): WebGLVertexArrayObject =>
                    nativeVaoExtension.createVertexArrayOES();

                gl.bindVertexArray = (vao): void =>
                    nativeVaoExtension.bindVertexArrayOES(vao);

                gl.deleteVertexArray = (vao): void =>
                    nativeVaoExtension.deleteVertexArrayOES(vao);
            }
            else
            {
                this.hasVao = false;
                gl.createVertexArray = (): WebGLVertexArrayObject =>
                    null;

                gl.bindVertexArray = (): void =>
                    null;

                gl.deleteVertexArray = (): void =>
                    null;
            }
        }

        if (context.webGLVersion !== 2)
        {
            const instanceExt = gl.getExtension('ANGLE_instanced_arrays');

            if (instanceExt)
            {
                gl.vertexAttribDivisor = (a, b): void =>
                    instanceExt.vertexAttribDivisorANGLE(a, b);

                gl.drawElementsInstanced = (a, b, c, d, e): void =>
                    instanceExt.drawElementsInstancedANGLE(a, b, c, d, e);

                gl.drawArraysInstanced = (a, b, c, d): void =>
                    instanceExt.drawArraysInstancedANGLE(a, b, c, d);
            }
            else
            {
                this.hasInstance = false;
            }
        }

        this.canUseUInt32ElementIndex = context.webGLVersion === 2 || !!context.extensions.uint32ElementIndex;
    }

    /**
     * Binds geometry so that is can be drawn. Creating a Vao if required
     * @param geometry - Instance of geometry to bind.
     * @param shader - Instance of shader to use vao for.
     */
    bind(geometry?: Geometry, shader?: Shader): void
    {
        shader = shader || this.renderer.shader.shader;

        const { gl, CONTEXT_UID } = this;

        // not sure the best way to address this..
        // currently different shaders require different VAOs for the same geometry
        // Still mulling over the best way to solve this one..
        // will likely need to modify the shader attribute locations at run time!
        let glGeom = geometry.glVertexArrayObjects[CONTEXT_UID];

        if (!glGeom)
        {
            this.managedGeometries[geometry.id] = geometry;
            geometry.disposeRunner.add(this);
            geometry.glVertexArrayObjects[CONTEXT_UID] = glGeom = new GeometryPerGL(CONTEXT_UID);
        }
        else
            if (glGeom.bufRefCount === 0)
            {
                this.regenVao(geometry, glGeom);
            }

        const gps = glGeom.bySignature[shader.program.id] || this.initGeometryVao(geometry, shader, glGeom);

        this._activeGeometry = geometry;

        if (this._activeGPS !== gps)
        {
            this._activeGPS = gps;

            if (this.hasVao)
            {
                gl.bindVertexArray(gps.vao);
            }
            else
            {
                this.activateVao(geometry, shader.program);
            }
        }

        // TODO - optimise later!
        // don't need to loop through if nothing changed!
        // maybe look to add an 'autoupdate' to geometry?
        this.updateBuffers();
        this._activeBB = null;
    }

    /** Reset and unbind any active VAO and geometry. */
    reset(): void
    {
        this.unbind();
    }

    /** Update buffers of the currently bound geometry. */
    updateBuffers(): void
    {
        const geometry = this._activeGeometry;

        const bufferSystem = this.renderer.buffer;

        for (let i = 0; i < geometry.buffers.length; i++)
        {
            const buffer = geometry.buffers[i];

            bufferSystem.update(buffer);
        }
    }

    /**
     * Check compatibility between a geometry and a program
     * @param geometry - Geometry instance.
     * @param program - Program instance.
     */
    protected checkCompatibility(geometry: Geometry, program: Program): void
    {
        // geometry must have at least all the attributes that the shader requires.
        const geometryAttributes = geometry.attributes;
        const shaderAttributes = program.attributeData;

        for (const j in shaderAttributes)
        {
            if (!geometryAttributes[j])
            {
                throw new Error(`shader and geometry incompatible, geometry missing the "${j}" attribute`);
            }
        }
    }

    /**
     * Takes a geometry and program and generates a unique signature for them.
     * @param geometry - To get signature from.
     * @param program - To test geometry against.
     * @returns - Unique signature of the geometry and program
     */
    protected getSignature(geometry: Geometry, program: Program): string
    {
        const attribs = geometry.attributes;
        const shaderAttributes = program.attributeData;

        const strings = ['g', geometry.id];

        for (const i in attribs)
        {
            if (shaderAttributes[i])
            {
                strings.push(i, shaderAttributes[i].location);
            }
        }

        return strings.join('-');
    }

    /**
     * Creates or gets Vao with the same structure as the geometry and stores it on the geometry.
     * If vao is created, it is bound automatically. We use a shader to infer what and how to set up the
     * attribute locations.
     * @param geometry - Instance of geometry to generate Vao for.
     * @param shader - Instance of the shader.
     * @param glGeom - geometry-gl object
     */
    protected initGeometryVao(geometry: Geometry, shader: Shader, glGeom: GeometryPerGL): GeometryPerShader
    {
        const gl = this.gl;
        const CONTEXT_UID = this.CONTEXT_UID;
        const bufferSystem = this.renderer.buffer;
        const program = shader.program;

        if (!program.glPrograms[CONTEXT_UID])
        {
            this.renderer.shader.generateProgram(shader);
        }

        this.checkCompatibility(geometry, program);

        const signature = this.getSignature(geometry, program);

        let gps = glGeom.bySignature[signature];

        if (gps)
        {
            // this will give us easy access to the vao
            glGeom.bySignature[program.id] = gps;

            return gps;
        }

        if (geometry.attributeDirty)
        {
            this.checkAttributes(geometry);
        }

        // @TODO: We don't know if VAO is supported.
        gps = new GeometryPerShader(gl.createVertexArray());

        gl.bindVertexArray(gps.vao);

        // TODO - maybe make this a data object?
        // lets wait to see if we need to first!

        this.activateVao(geometry, program);
        this.addRefBuffers(geometry, glGeom);

        // add it to the cache!
        if (glGeom.lastProgram)
        {
            glGeom.hasSecondInstance = true;
        }
        glGeom.bySignature[program.id] = gps;
        glGeom.bySignature[signature] = gps;
        glGeom.lastGPS = gps;
        glGeom.lastProgram = program;
        glGeom.lastSignature = signature;

        gl.bindVertexArray(null);
        bufferSystem.unbind(BUFFER_TYPE.ARRAY_BUFFER);

        return gps;
    }

    checkAttributes(geometry: Geometry)
    {
        if (!geometry.attributeDirty)
        {
            return;
        }

        geometry.attributeDirty = false;
        const buffers = geometry.buffers;
        const attributes = geometry.attributes;
        const temp_stride: Dict<number> = {};
        const temp_offset: Dict<number> = {};

        for (const j in buffers)
        {
            temp_stride[j] = 0;
            temp_offset[j] = 0;
        }

        for (const j in attributes)
        {
            const bufIndex = attributes[j].buffer_index;
            const attr_info = getAttributeInfoFromFormat(attributes[j].format);

            temp_stride[bufIndex] += attr_info.stride;
            geometry.bufferStride[bufIndex] = temp_stride[bufIndex];
        }

        for (const j in attributes)
        {
            const attribute = attributes[j];
            const attr_info = getAttributeInfoFromFormat(attributes[j].format);

            if (attribute.stride === undefined)
            {
                if (temp_stride[attribute.buffer_index] === attr_info.stride)
                {
                    attribute.stride = 0;
                }
                else
                {
                    attribute.stride = temp_stride[attribute.buffer_index];
                }
            }

            if (attribute.offset === undefined)
            {
                attribute.offset = temp_offset[attribute.buffer_index];

                temp_offset[attribute.buffer_index] += attr_info.stride;
            }
        }
    }

    regenVao(geometry: Geometry, glGeom: GeometryPerGL)
    {
        if (glGeom.bufRefCount > 0)
        {
            return;
        }

        const { gl } = this.renderer;
        const gps = glGeom.lastGPS;

        gl.bindVertexArray(gps.vao);
        this.activateVao(geometry, glGeom.lastProgram);
        this.addRefBuffers(geometry, glGeom);
        if (!glGeom.hasSecondInstance)
        {
            return;
        }

        const old = glGeom.bySignature;

        glGeom.hasSecondInstance = false;
        glGeom.bySignature = {};
        for (const sig in old)
        {
            if (old[sig] === gps.vao)
            {
                glGeom.bySignature[sig] = new GeometryPerShader(gps.vao);
                continue;
            }
            if (sig[0] === 'g')
            {
                gl.deleteVertexArray(glGeom.bySignature[sig]);
            }
        }
    }

    addRefBuffers(geometry: Geometry, glGeom: GeometryPerGL)
    {
        if (glGeom.bufRefCount > 0)
        {
            return;
        }

        const bufferSystem = this.renderer?.buffer;
        const buffers = geometry.buffers;

        glGeom.bufRefCount++;
        for (let i = 0; i < buffers.length; i++)
        {
            const buffer = buffers[i];

            if (!buffer._glBuffers[glGeom.CONTEXT_UID])
            {
                bufferSystem.bind(buffer);
            }
            buffer._glBuffers[glGeom.CONTEXT_UID].refCount++;
        }
    }

    /**
     * Disposes geometry.
     * @param geometry - Geometry with buffers. Only VAO will be disposed
     * @param [contextLost=false] - If context was lost, we suppress deleteVertexArray
     */
    disposeGeometry(geometry: Geometry, contextLost?: boolean): void
    {
        if (!this.managedGeometries[geometry.id])
        {
            return;
        }

        delete this.managedGeometries[geometry.id];

        const vaos = geometry.glVertexArrayObjects[this.CONTEXT_UID];
        const gl = this.gl;
        const buffers = geometry.buffers;
        const bufferSystem = this.renderer?.buffer;

        geometry.disposeRunner.remove(this);

        if (!vaos)
        {
            return;
        }

        // bufferSystem may have already been destroyed..
        // if this is the case, there is no need to destroy the geometry buffers...
        // they already have been!
        if (bufferSystem)
        {
            for (let i = 0; i < buffers.length; i++)
            {
                const buf = buffers[i]._glBuffers[this.CONTEXT_UID];

                // my be null as context may have changed right before the dispose is called
                if (buf)
                {
                    buf.refCount -= vaos.bufRefCount;
                    if (buf.refCount === 0 && !contextLost)
                    {
                        bufferSystem.dispose(buffers[i], contextLost);
                    }
                }
            }
        }

        if (!contextLost)
        {
            for (const vaoId in vaos)
            {
                // delete only signatures, everything else are copies
                if (vaoId[0] === 'g')
                {
                    const vao = vaos.bySignature[vaoId];

                    if (this._activeGPS === vao)
                    {
                        this.unbind();
                    }
                    gl.deleteVertexArray(vao);
                }
            }
        }

        delete geometry.glVertexArrayObjects[this.CONTEXT_UID];
    }

    /**
     * swaps buffer to new one, saves contents
     * @param geometry
     * @param bufInd
     * @param newBuffer
     * @param copier
     */
    swapAndCopyBuffer(geometry: Geometry, bufInd: number, newBuffer: Buffer, copier: IBufferCopier = this.copier): void
    {
        const oldBuffer = geometry.buffers[bufInd];
        // TODO : find out whether its instanced buffer!
        const stride = geometry.getInstanceBufferStride(bufInd);

        this._activeBB = null;
        geometry.swapBuffer(bufInd, newBuffer);

        if (stride && oldBuffer.byteLength)
        {
            const bco = new BufferCopyOperation();

            bco.count = oldBuffer.byteLength / stride;
            copier.doCopy(this.renderer, oldBuffer, newBuffer, stride, [bco]);
        }
    }

    /**
     * Dispose all WebGL resources of all managed geometries.
     * @param [contextLost=false] - If context was lost, we suppress `gl.delete` calls
     */
    disposeAll(contextLost?: boolean): void
    {
        const all: Array<any> = Object.keys(this.managedGeometries);

        for (let i = 0; i < all.length; i++)
        {
            this.disposeGeometry(this.managedGeometries[all[i]], contextLost);
        }
    }

    /**
     * Activate vertex array object.
     * @param geometry - Geometry instance.
     * @param program - Shader program instance.
     */
    protected activateVao(geometry: Geometry, program: Program): void
    {
        const gl = this.gl;
        const CONTEXT_UID = this.CONTEXT_UID;
        const bufferSystem = this.renderer.buffer;
        const buffers = geometry.buffers;
        const attributes = geometry.attributes;

        if (geometry.indexBuffer)
        {
            // first update the index buffer if we have one..
            bufferSystem.bind(geometry.indexBuffer);
        }

        let lastBuffer = null;

        // add a new one!
        for (const j in attributes)
        {
            const attribute = attributes[j];
            const buffer = buffers[attribute.buffer_index];
            const glBuffer = buffer._glBuffers[CONTEXT_UID];

            const program_attrib = program.attributeData[j];

            if (program_attrib)
            {
                if (!glBuffer || lastBuffer !== glBuffer)
                {
                    bufferSystem.bind(buffer);
                    lastBuffer = buffer._glBuffers[CONTEXT_UID];
                }

                const location = program_attrib.location;
                const attr_info = getAttributeInfoFromFormat(attribute.format);
                const type = getGlTypeFromFormat(attribute.format);

                // TODO introduce state again
                // we can optimise this for older devices that have no VAOs
                gl.enableVertexAttribArray(location);

                if (attribute.format.substring(1, 4) === 'int')
                {
                    gl.vertexAttribIPointer(location,
                        attr_info.size,
                        type,
                        attribute.stride,
                        attribute.offset);
                }
                else
                {
                    gl.vertexAttribPointer(location,
                        attr_info.size,
                        type,
                        attr_info.normalised,
                        attribute.stride,
                        attribute.offset);
                }

                if (attribute.instance)
                {
                    // TODO calculate instance count based of this...
                    if (this.hasInstance)
                    {
                        gl.vertexAttribDivisor(location, 1);
                    }
                    else
                    {
                        throw new Error('geometry error, GPU Instancing is not supported on this device');
                    }
                }
            }
        }
    }

    /**
     * Draws the currently bound geometry.
     * @param topology - The type primitive to render.
     * @param size - The number of elements to be rendered. If not specified, all vertices after the
     *  starting vertex will be drawn.
     * @param start - The starting vertex in the geometry to start drawing from. If not specified,
     *  drawing will start from the first vertex.
     * @param instanceCount - The number of instances of the set of elements to execute. If not specified,
     *  all instances will be drawn.
     */
    draw(topology?: Topology, size?: number, start?: number, instanceCount?: number): this
    {
        const { gl } = this;
        const geometry = this._activeGeometry;
        const gl_draw_mode = topologyToGlMap[geometry.topology || topology];

        if (this._activeGPS.emulateBaseInstance !== 0)
        {
            this.drawBI(gl_draw_mode, size, start, instanceCount, 0);
        }

        // TODO.. this should not change so maybe cache the function?

        if (geometry.indexBuffer)
        {
            const byteSize = geometry.indexBuffer.data.BYTES_PER_ELEMENT;
            const glType = byteSize === 2 ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT;

            if (byteSize === 2 || (byteSize === 4 && this.canUseUInt32ElementIndex))
            {
                if (geometry.instanced)
                {
                    /* eslint-disable max-len */
                    gl.drawElementsInstanced(gl_draw_mode, size || geometry.indexBuffer.data.length, glType, (start || 0) * byteSize, instanceCount || 1);
                    /* eslint-enable max-len */
                }
                else
                {
                    /* eslint-disable max-len */
                    gl.drawElements(gl_draw_mode, size || geometry.indexBuffer.data.length, glType, (start || 0) * byteSize);
                    /* eslint-enable max-len */
                }
            }
            else
            {
                console.warn('unsupported index buffer type: uint32');
            }
        }
        else if (geometry.instanced)
        {
            // TODO need a better way to calculate size..
            gl.drawArraysInstanced(gl_draw_mode, start, size || geometry.getSize(), instanceCount || 1);
        }
        else
        {
            gl.drawArrays(gl_draw_mode, start, size || geometry.getSize());
        }

        return this;
    }

    drawBI(gl_draw_mode: number, size: number, start: number, instanceCount: number, baseInstance = 0)
    {
        const { renderer } = this;
        const { gl } = renderer;
        const { bvbi } = renderer.context.extensions;
        const geometry = this._activeGeometry;
        const gps = this._activeGPS;
        const program = this.renderer.shader.shader.program;

        if (bvbi)
        {
            bvbi.drawArraysInstancedBaseInstanceWEBGL(gl_draw_mode, start, size, instanceCount, baseInstance);
        }
        else
        {
            const attribSync = geometry.getAttributeBaseCallback();

            if (!gps.instLocations)
            {
                gps.instLocations = program.getLocationListByAttributes(geometry.getInstancedAttributeNames());
            }

            if (attribSync.bufSyncCount === 0)
            {
                const bb = attribSync.bufFirstIndex;

                if (this._activeBB !== geometry.buffers[bb])
                {
                    this._activeBB = geometry.buffers[bb];
                    renderer.buffer.bind(this._activeBB);
                }
                if (gps.emulateBaseInstance !== baseInstance)
                {
                    gps.emulateBaseInstance = baseInstance;
                    attribSync.syncFunc(gl, gps.instLocations, baseInstance);
                }
                gl.drawArraysInstanced(gl_draw_mode, start, size, instanceCount);
            }
            else
            {
                const buffers = geometry.buffers;
                const bufferSystem = renderer.buffer;

                if (gps.emulateBaseInstance !== baseInstance)
                {
                    gps.emulateBaseInstance = baseInstance;
                    this._activeBB = attribSync.syncFunc(gl, gps.instLocations, baseInstance,
                        bufferSystem, buffers, this._activeBB);
                }
                gl.drawArraysInstanced(gl_draw_mode, start, size, instanceCount);
            }
        }
    }

    multiDrawArraysBVBI(firsts: Int32Array, counts: Int32Array,
        instanceCounts: Int32Array, instanceOffsets: Uint32Array, rangeCount: number): void
    {
        const { renderer } = this;
        const { gl } = renderer;
        const geometry = this._activeGeometry;
        const gps = this._activeGPS;
        const program = this.renderer.shader.shader.program;
        const gl_draw_mode = topologyToGlMap[geometry.topology];

        const { md_bvbi } = renderer.context.extensions;

        if (md_bvbi)
        {
            md_bvbi.multiDrawArraysInstancedBaseInstanceWEBGL(
                gl_draw_mode,
                firsts, 0,
                counts, 0,
                instanceCounts, 0,
                instanceOffsets, 0,
                rangeCount,
            );
        }
        else
        {
            const attribSync = geometry.getAttributeBaseCallback();

            if (!gps.instLocations)
            {
                gps.instLocations = program.getLocationListByAttributes(geometry.getInstancedAttributeNames());
            }

            if (attribSync.bufSyncCount === 0)
            {
                renderer.buffer.bind(geometry.buffers[attribSync.bufFirstIndex]);
                for (let i = 0; i < rangeCount; i++)
                {
                    if (gps.emulateBaseInstance !== instanceOffsets[i])
                    {
                        gps.emulateBaseInstance = instanceOffsets[i];
                        attribSync.syncFunc(gl, gps.instLocations, instanceOffsets[i]);
                    }
                    gl.drawArraysInstanced(gl_draw_mode, 0, counts[i], instanceCounts[i]);
                }
            }
            else
            {
                const buffers = geometry.buffers;
                const bufferSystem = renderer.buffer;

                for (let i = 0; i < rangeCount; i++)
                {
                    if (gps.emulateBaseInstance !== instanceOffsets[i])
                    {
                        gps.emulateBaseInstance = instanceOffsets[i];
                        this._activeBB = attribSync.syncFunc(gl, gps.instLocations, instanceOffsets[i],
                            bufferSystem, buffers, this._activeBB);
                    }
                    gl.drawArraysInstanced(gl_draw_mode, 0, counts[i], instanceCounts[i]);
                }
            }
        }
    }

    multiDrawArraysBVBI_offset(firsts: Int32Array, counts: Int32Array,
        instanceCounts: Int32Array, instanceOffsets: Uint32Array, rangeCount: number, rangeOffset: number): void
    {
        const { renderer } = this;
        const { gl } = renderer;
        const geometry = this._activeGeometry;
        const gps = this._activeGPS;
        const program = this.renderer.shader.shader.program;
        const gl_draw_mode = topologyToGlMap[geometry.topology];

        const { md_bvbi } = renderer.context.extensions;

        if (md_bvbi)
        {
            md_bvbi.multiDrawArraysInstancedBaseInstanceWEBGL(
                gl_draw_mode,
                firsts, rangeOffset,
                counts, rangeOffset,
                instanceCounts, rangeOffset,
                instanceOffsets, rangeOffset,
                rangeCount,
            );
        }
        else
        {
            const attribSync = geometry.getAttributeBaseCallback();

            if (!gps.instLocations)
            {
                gps.instLocations = program.getLocationListByAttributes(geometry.getInstancedAttributeNames());
            }

            if (attribSync.bufSyncCount === 0)
            {
                renderer.buffer.bind(geometry.buffers[attribSync.bufFirstIndex]);
                for (let i = rangeOffset; i < rangeOffset + rangeCount; i++)
                {
                    if (gps.emulateBaseInstance !== instanceOffsets[i])
                    {
                        gps.emulateBaseInstance = instanceOffsets[i];
                        attribSync.syncFunc(gl, gps.instLocations, instanceOffsets[i]);
                    }
                    gl.drawArraysInstanced(gl_draw_mode, 0, counts[i], instanceCounts[i]);
                }
            }
            else
            {
                const buffers = geometry.buffers;
                const bufferSystem = renderer.buffer;

                for (let i = rangeOffset; i < rangeOffset + rangeCount; i++)
                {
                    if (gps.emulateBaseInstance !== instanceOffsets[i])
                    {
                        gps.emulateBaseInstance = instanceOffsets[i];
                        this._activeBB = attribSync.syncFunc(gl, gps.instLocations, instanceOffsets[i],
                            bufferSystem, buffers, this._activeBB);
                    }
                    gl.drawArraysInstanced(gl_draw_mode, 0, counts[i], instanceCounts[i]);
                }
            }
        }
    }

    /** Unbind/reset everything. */
    public unbind(): void
    {
        this.gl.bindVertexArray(null);
        this._activeGPS = null;
        this._activeGeometry = null;
        this._activeBB = null;
    }

    destroy(): void
    {
        this.renderer = null;
    }
}

extensions.add(GeometrySystem);
