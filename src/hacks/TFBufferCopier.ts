import { Buffer, BufferCopyOperation, Geometry, IBufferCopier, Program, Renderer, Shader } from '@vaux/core/index.js';

const fragment = `#version 300 es
precision highp float;

out vec4 outColor;

void main() {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`;

function genVertex(elemSize: number, elemCount: number)
{
    let code = `#version 300 es
precision highp float;
precision highp int;
`;

    for (let i = 1; i <= elemCount; i++)
    {
        code += `in vec${elemSize} a_silly${i};\n`;
    }
    for (let i = 1; i <= elemCount; i++)
    {
        code += `out vec${elemSize} v_silly${i};\n`;
    }
    code += `void main() {`;
    for (let i = 1; i <= elemCount; i++)
    {
        code += `v_silly${i} = a_silly${i};\n`;
    }
    code += `
    gl_PointSize = 0.0;
    gl_Position = vec4(-2.0, -2.0, 0.0, 1.0);
}
`;

    return code;
}

function genAttribs(geom: Geometry, buf: Buffer, elemSize: number, elemCount: number)
{
    for (let i = 1; i <= elemCount; i++)
    {
        geom.addAttribute(`a_silly${i}`, buf, elemSize);
    }
}

function genVaryings(elemCount: number): string[]
{
    const res: string[] = [];

    for (let i = 1; i <= elemCount; i++)
    {
        res.push(`v_silly${i}`);
    }

    return res;
}

export class TFBufferCopier implements IBufferCopier
{
    strideFloats: number;
    strideBytes: number;
    elemCount = 0;
    elemSize = 0;
    program : Program = null;
    shader: Shader = null;
    tf: Record<number, WebGLTransformFeedback> = {};

    geom: Geometry;
    tempBuffer: Buffer;

    constructor(strideFloats = 16)
    {
        this.strideFloats = strideFloats;
        this.strideBytes = 4 * strideFloats;
        this.initProgram();
        this.initGeom();
    }

    initProgram()
    {
        const { strideFloats } = this;
        let elemSize = 4;

        while (elemSize > 1 && strideFloats % elemSize > 0)
        {
            elemSize--;
        }

        this.elemSize = elemSize;
        this.elemCount = strideFloats / this.elemSize;

        const vertex = genVertex(this.elemSize, this.elemCount);
        const tfNames = genVaryings(this.elemCount);

        this.program = new Program({ vertex, fragment, name: 'silly tf' }, {
            transformFeedbackVaryings: {
                names: tfNames,
                bufferMode: 'interleaved'
            }
        });

        this.shader = new Shader(this.program);
    }

    initGeom()
    {
        this.tempBuffer = new Buffer(new Float32Array());
        this.geom = new Geometry();
        genAttribs(this.geom, this.tempBuffer, this.elemSize, this.elemCount);
    }

    doCopy(renderer: Renderer, src: Buffer, target: Buffer, strideBytes: number,
        copies: Array<BufferCopyOperation>, copyCount = copies.length): void
    {
        // TODO: pooled array here!
        if (strideBytes % this.strideBytes !== 0)
        {
            return;
        }
        // const shader = this.shader;
        const gl = renderer.gl;
        const CONTEXT_UID = renderer.CONTEXT_UID;
        let tf = this.tf[CONTEXT_UID];

        if (!tf)
        {
            tf = (this.tf[CONTEXT_UID] = gl.createTransformFeedback());
        }

        if (!target._glBuffers[CONTEXT_UID])
        {
            renderer.buffer.bind(target);
            renderer.buffer.update(target);
        }

        this.geom.swapBuffer(0, src);
        renderer.shader.bind(this.shader);
        renderer.geometry.bind(this.geom);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
        for (let i = 0; i < copyCount; i++)
        {
            const op = copies[i];

            gl.bindBufferRange(gl.TRANSFORM_FEEDBACK_BUFFER, 0, target._glBuffers[CONTEXT_UID].buffer,
                op.dst * strideBytes, op.count * strideBytes);
            gl.beginTransformFeedback(gl.POINTS);
            gl.drawArrays(gl.POINTS, op.src * strideBytes / this.strideBytes, op.count * strideBytes / this.strideBytes);
            gl.endTransformFeedback();
        }
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
        renderer.geometry.unbind();
        this.geom.swapBuffer(0, this.tempBuffer);
    }
}
