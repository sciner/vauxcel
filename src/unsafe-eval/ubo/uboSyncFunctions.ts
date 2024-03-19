/**
 * This file is auto generated by scripts/utils/autoGenerateUnsafeEvalFunctions.ts
 * Do not edit manually - or you will be sad.
 */

import type { UNIFORM_TYPES } from '../../rendering/renderers/shared/shader/types';

export type UboUploadFunction = (name: string, data: Float32Array, offset: number, uv: any, v: any) => void;
export const uboParserFunctions: UboUploadFunction[] = [
    (name: string, data: Float32Array, offset: number, uv: any, _v: any): void =>
    {
        const matrix = uv[name].toArray(true);

        data[offset] = matrix[0];
        data[offset + 1] = matrix[1];
        data[offset + 2] = matrix[2];
        data[offset + 4] = matrix[3];
        data[offset + 5] = matrix[4];
        data[offset + 6] = matrix[5];
        data[offset + 8] = matrix[6];
        data[offset + 9] = matrix[7];
        data[offset + 10] = matrix[8];
    },
    (name: string, data: Float32Array, offset: number, uv: any, v: any): void =>
    {
        v = uv[name];
        data[offset] = v.x;
        data[offset + 1] = v.y;
        data[offset + 2] = v.width;
        data[offset + 3] = v.height;
    },
    (name: string, data: Float32Array, offset: number, uv: any, v: any): void =>
    {
        v = uv[name];
        data[offset] = v.x;
        data[offset + 1] = v.y;
    },
    (name: string, data: Float32Array, offset: number, uv: any, v: any): void =>
    {
        v = uv[name];
        data[offset] = v.red;
        data[offset + 1] = v.green;
        data[offset + 2] = v.blue;
        data[offset + 3] = v.alpha;
    },
    (name: string, data: Float32Array, offset: number, uv: any, v: any): void =>
    {
        v = uv[name];
        data[offset] = v.red;
        data[offset + 1] = v.green;
        data[offset + 2] = v.blue;
    },
];
export const uboSingleFunctionsWGSL: Record<UNIFORM_TYPES | string, UboUploadFunction> = {
    f32: (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        data[offset] = v;
    },
    i32: (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        data[offset] = v;
    },
    'vec2<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        data[offset] = v[0];
        data[offset + 1] = v[1];
    },
    'vec3<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 2] = v[2];
    },
    'vec4<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 2] = v[2];
        data[offset + 3] = v[3];
    },
    'mat2x2<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 2] = v[2];
        data[offset + 3] = v[3];
    },
    'mat3x3<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 2] = v[2];
        data[offset + 4] = v[3];
        data[offset + 5] = v[4];
        data[offset + 6] = v[5];
        data[offset + 8] = v[6];
        data[offset + 9] = v[7];
        data[offset + 10] = v[8];
    },
    'mat4x4<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        for (let i = 0; i < 16; i++)
        {
            data[offset + i] = v[i];
        }
    },
    'mat3x2<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        for (let i = 0; i < 6; i++)
        {
            data[offset + (((i / 3) | 0) * 4) + (i % 3)] = v[i];
        }
    },
    'mat4x2<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        for (let i = 0; i < 8; i++)
        {
            data[offset + (((i / 4) | 0) * 4) + (i % 4)] = v[i];
        }
    },
    'mat2x3<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        for (let i = 0; i < 6; i++)
        {
            data[offset + (((i / 2) | 0) * 4) + (i % 2)] = v[i];
        }
    },
    'mat4x3<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        for (let i = 0; i < 12; i++)
        {
            data[offset + (((i / 4) | 0) * 4) + (i % 4)] = v[i];
        }
    },
    'mat2x4<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        for (let i = 0; i < 8; i++)
        {
            data[offset + (((i / 2) | 0) * 4) + (i % 2)] = v[i];
        }
    },
    'mat3x4<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        for (let i = 0; i < 12; i++)
        {
            data[offset + (((i / 3) | 0) * 4) + (i % 3)] = v[i];
        }
    },
};
export const uboSingleFunctionsSTD40: Record<UNIFORM_TYPES | string, UboUploadFunction> = {
    f32: (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        data[offset] = v;
    },
    i32: (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        data[offset] = v;
    },
    'vec2<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        data[offset] = v[0];
        data[offset + 1] = v[1];
    },
    'vec3<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 2] = v[2];
    },
    'vec4<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 2] = v[2];
        data[offset + 3] = v[3];
    },
    'mat2x2<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 4] = v[2];
        data[offset + 5] = v[3];
    },
    'mat3x3<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 2] = v[2];
        data[offset + 4] = v[3];
        data[offset + 5] = v[4];
        data[offset + 6] = v[5];
        data[offset + 8] = v[6];
        data[offset + 9] = v[7];
        data[offset + 10] = v[8];
    },
    'mat4x4<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        for (let i = 0; i < 16; i++)
        {
            data[offset + i] = v[i];
        }
    },
    'mat3x2<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        for (let i = 0; i < 6; i++)
        {
            data[offset + (((i / 3) | 0) * 4) + (i % 3)] = v[i];
        }
    },
    'mat4x2<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        for (let i = 0; i < 8; i++)
        {
            data[offset + (((i / 4) | 0) * 4) + (i % 4)] = v[i];
        }
    },
    'mat2x3<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        for (let i = 0; i < 6; i++)
        {
            data[offset + (((i / 2) | 0) * 4) + (i % 2)] = v[i];
        }
    },
    'mat4x3<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        for (let i = 0; i < 12; i++)
        {
            data[offset + (((i / 4) | 0) * 4) + (i % 4)] = v[i];
        }
    },
    'mat2x4<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        for (let i = 0; i < 8; i++)
        {
            data[offset + (((i / 2) | 0) * 4) + (i % 2)] = v[i];
        }
    },
    'mat3x4<f32>': (_name: string, data: Float32Array, offset: number, _uv: any, v: any): void =>
    {
        for (let i = 0; i < 12; i++)
        {
            data[offset + (((i / 3) | 0) * 4) + (i % 3)] = v[i];
        }
    },
};
