import { BUFFER_TYPE, ENV } from '@vaux/constants';
import { extensions, ExtensionType } from '@vaux/extensions';
import { settings } from '@vaux/settings';

import type { DRAW_MODES } from '@vaux/constants';
import type { ExtensionMetadata } from '@vaux/extensions';
import type { Dict } from '@vaux/utils';
import type { IRenderingContext } from '../IRenderer';
import type { Renderer } from '../Renderer';
import type { Program } from '../shader/Program';
import type { Shader } from '../shader/Shader';
import type { ISystem } from '../system/ISystem';
import type { Geometry } from './Geometry';
import type { GLBuffer } from './GLBuffer';
import { GeometryPerGL } from './Geometry';
import { Buffer } from './Buffer';
import { BufferCopyOperation, IBufferCopier } from '@vaux/core/geometry/BufferCopyOperation';

const byteSizeMap: {[key: number]: number} = { 5126: 4, 5123: 2, 5121: 1 };

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
    protected _activeVao: WebGLVertexArrayObject;

    /** Cache for all geometries by id, used in case renderer gets destroyed or for profiling. */
    readonly managedGeometries: {[key: number]: Geometry};

    /** Renderer that owns this {@link GeometrySystem}. */
    private renderer: Renderer;

    /** @param renderer - The renderer this System works for. */
    constructor(renderer: Renderer)
    {
        this.renderer = renderer;
        this._activeGeometry = null;
        this._activeVao = null;

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

        const vao = glGeom.bySignature[shader.program.id] || this.initGeometryVao(geometry, shader, glGeom);

        this._activeGeometry = geometry;

        if (this._activeVao !== vao)
        {
            this._activeVao = vao;

            if (this.hasVao)
            {
                gl.bindVertexArray(vao);
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
     * @param geometry - Instance of geometry to to generate Vao for.
     * @param shader - Instance of the shader.
     * @param incRefCount - Increment refCount of all geometry buffers.
     */
    protected initGeometryVao(geometry: Geometry, shader: Shader, glGeom: GeometryPerGL): WebGLVertexArrayObject
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

        let vao = glGeom.bySignature[signature];

        if (vao)
        {
            // this will give us easy access to the vao
            glGeom.bySignature[program.id] = vao;

            return vao;
        }

        if (geometry.attributeDirty)
        {
            this.checkAttributes(geometry, program);
        }

        // @TODO: We don't know if VAO is supported.
        vao = gl.createVertexArray();

        gl.bindVertexArray(vao);

        // TODO - maybe make this a data object?
        // lets wait to see if we need to first!

        this.activateVao(geometry, program);
        this.addRefBuffers(geometry, glGeom);

        // add it to the cache!
        if (glGeom.lastProgram)
        {
            glGeom.hasSecondInstance = true;
        }
        glGeom.bySignature[program.id] = vao;
        glGeom.bySignature[signature] = vao;
        glGeom.lastVao = vao;
        glGeom.lastProgram = program;
        glGeom.lastSignature = signature;

        gl.bindVertexArray(null);
        bufferSystem.unbind(BUFFER_TYPE.ARRAY_BUFFER);

        return vao;
    }

    checkAttributes(geometry: Geometry, program: Program)
    {
        if (!geometry.attributeDirty)
        {
            return;
        }

        geometry.attributeDirty = false;
        const buffers = geometry.buffers;
        const attributes = geometry.attributes;
        const tempStride: Dict<number> = {};
        const tempStart: Dict<number> = {};

        for (const j in buffers)
        {
            tempStride[j] = 0;
            tempStart[j] = 0;
        }

        for (const j in attributes)
        {
            if (!attributes[j].size && program.attributeData[j])
            {
                attributes[j].size = program.attributeData[j].size;
            }
            else if (!attributes[j].size)
            {
                console.warn(`PIXI Geometry attribute '${j}' size cannot be determined (likely the bound shader does not have the attribute)`);  // eslint-disable-line
            }

            const bufIndex = attributes[j].buffer;

            tempStride[bufIndex] += attributes[j].size * byteSizeMap[attributes[j].type];
            geometry.bufferStride[bufIndex] = tempStride[bufIndex];
        }

        for (const j in attributes)
        {
            const attribute = attributes[j];
            const attribSize = attribute.size;

            if (attribute.stride === undefined)
            {
                if (tempStride[attribute.buffer] === attribSize * byteSizeMap[attribute.type])
                {
                    attribute.stride = 0;
                }
                else
                {
                    attribute.stride = tempStride[attribute.buffer];
                }
            }

            if (attribute.start === undefined)
            {
                attribute.start = tempStart[attribute.buffer];

                tempStart[attribute.buffer] += attribSize * byteSizeMap[attribute.type];
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
        const vao = glGeom.lastVao;

        gl.bindVertexArray(vao);
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
            if (old[sig] === vao)
            {
                glGeom.bySignature[sig] = vao;
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

                    if (this._activeVao === vao)
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
    swapAndCopyBuffer(geometry: Geometry, bufInd: number, newBuffer: Buffer, copier: IBufferCopier = this.copier)
    {
        const oldBuffer = geometry.buffers[bufInd];
        const stride = geometry.bufferStride[bufInd];

        geometry.swapBuffer(bufInd, newBuffer);

        if (stride && oldBuffer.byteLength)
        {
            const bco = new BufferCopyOperation();

            bco.count = oldBuffer.byteLength / stride;
            copier.doCopy(this.renderer, oldBuffer, newBuffer, [bco], stride);
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
            const buffer = buffers[attribute.buffer];
            const glBuffer = buffer._glBuffers[CONTEXT_UID];

            if (program.attributeData[j])
            {
                if (!glBuffer || lastBuffer !== glBuffer)
                {
                    bufferSystem.bind(buffer);
                    lastBuffer = buffer._glBuffers[CONTEXT_UID];
                }

                const location = program.attributeData[j].location;

                // TODO introduce state again
                // we can optimise this for older devices that have no VAOs
                gl.enableVertexAttribArray(location);

                if (attribute.int) {
                    gl.vertexAttribIPointer(location,
                        attribute.size,
                        attribute.type || gl.INT,
                        attribute.stride,
                        attribute.start);
                }
                else {
                    gl.vertexAttribPointer(location,
                        attribute.size,
                        attribute.type || gl.FLOAT,
                        attribute.normalized,
                        attribute.stride,
                        attribute.start);
                }

                if (attribute.instance)
                {
                    // TODO calculate instance count based of this...
                    if (this.hasInstance)
                    {
                        gl.vertexAttribDivisor(location, attribute.divisor);
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
     * @param type - The type primitive to render.
     * @param size - The number of elements to be rendered. If not specified, all vertices after the
     *  starting vertex will be drawn.
     * @param start - The starting vertex in the geometry to start drawing from. If not specified,
     *  drawing will start from the first vertex.
     * @param instanceCount - The number of instances of the set of elements to execute. If not specified,
     *  all instances will be drawn.
     */
    draw(type: DRAW_MODES, size?: number, start?: number, instanceCount?: number): this
    {
        const { gl } = this;
        const geometry = this._activeGeometry;

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
                    gl.drawElementsInstanced(type, size || geometry.indexBuffer.data.length, glType, (start || 0) * byteSize, instanceCount || 1);
                    /* eslint-enable max-len */
                }
                else
                {
                    /* eslint-disable max-len */
                    gl.drawElements(type, size || geometry.indexBuffer.data.length, glType, (start || 0) * byteSize);
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
            gl.drawArraysInstanced(type, start, size || geometry.getSize(), instanceCount || 1);
        }
        else
        {
            gl.drawArrays(type, start, size || geometry.getSize());
        }

        return this;
    }

    /** Unbind/reset everything. */
    public unbind(): void
    {
        this.gl.bindVertexArray(null);
        this._activeVao = null;
        this._activeGeometry = null;
    }

    destroy(): void
    {
        this.renderer = null;
    }
}

extensions.add(GeometrySystem);
