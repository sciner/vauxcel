import { BufferCopyOperation, IBufferCopier } from './BufferCopyOperation';
import { Buffer } from './Buffer';
import { Renderer } from '../Renderer';
import { Program } from '../shader/Program';
import { Shader } from '../shader/Shader';

const vertex = `#version 300 es
precision highp float;
precision highp int;

in vec4 a_silly1;
in vec4 a_silly2;
in vec4 a_silly3;
in vec4 a_silly4;

out vec4 v_silly1;
out vec4 v_silly2;
out vec4 v_silly3;
out vec4 v_silly4;

void main() {
    v_silly1 = a_silly1;
    v_silly2 = a_silly2;
    v_silly3 = a_silly3;
    v_silly4 = a_silly4;
    gl_PointSize = 0.0;
    gl_Position = vec4(-2.0, -2.0, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;

out vec4 outColor;

void main() {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`;

export class TFBufferCopier implements IBufferCopier
{
    strideBytes = 64;
    program = new Program(vertex, fragment, 'silly tf', {
        transformFeedbackVaryings: {
            names: ['v_silly1', 'v_silly2', 'v_silly3', 'v_silly4'],
            bufferMode: 'interleaved'
        }
    });
    shader = new Shader(this.program);
    tf: Record<number, WebGLTransformFeedback>;

    doCopy(renderer: Renderer, src: Buffer, target: Buffer, copies: Array<BufferCopyOperation>, strideBytes: number): void
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
            tf = this.tf[CONTEXT_UID] = gl.createTransformFeedback();
        }

        for (let i = 0; i < copies.length; i++)
        {
            const op = copies[i];

            gl.bindBufferRange(gl.TRANSFORM_FEEDBACK_BUFFER, 0, target._glBuffers[CONTEXT_UID],
                op.dst * strideBytes, op.count * strideBytes);
            gl.beginTransformFeedback(gl.POINTS);
            gl.drawArrays(gl.POINTS, op.src * strideBytes / this.strideBytes, op.count * strideBytes / this.strideBytes);
            gl.endTransformFeedback();
        }
    }
}
