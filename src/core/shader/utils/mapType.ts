import type { Dict } from '@vaux/utils/index.js';

let GL_TABLE: Dict<string> = null;

const GL_TO_GLSL_TYPES: Dict<string> = {
    FLOAT:       'float',
    FLOAT_VEC2:  'vec2',
    FLOAT_VEC3:  'vec3',
    FLOAT_VEC4:  'vec4',

    INT:         'int',
    INT_VEC2:    'ivec2',
    INT_VEC3:    'ivec3',
    INT_VEC4:    'ivec4',

    UNSIGNED_INT:         'uint',
    UNSIGNED_INT_VEC2:    'uvec2',
    UNSIGNED_INT_VEC3:    'uvec3',
    UNSIGNED_INT_VEC4:    'uvec4',

    BOOL:        'bool',
    BOOL_VEC2:   'bvec2',
    BOOL_VEC3:   'bvec3',
    BOOL_VEC4:   'bvec4',

    FLOAT_MAT2:  'mat2',
    FLOAT_MAT3:  'mat3',
    FLOAT_MAT4:  'mat4',

    SAMPLER_2D:              'sampler2D',
    INT_SAMPLER_2D:          'sampler2D',
    UNSIGNED_INT_SAMPLER_2D: 'sampler2D',
    SAMPLER_3D:              'sampler2D',
    INT_SAMPLER_3D:          'sampler2D',
    SAMPLER_2D_SHADOW:         'sampler2D',
    SAMPLER_CUBE:              'samplerCube',
    INT_SAMPLER_CUBE:          'samplerCube',
    UNSIGNED_INT_SAMPLER_CUBE: 'samplerCube',
    SAMPLER_2D_ARRAY:              'sampler2DArray',
    INT_SAMPLER_2D_ARRAY:          'sampler2DArray',
    UNSIGNED_INT_SAMPLER_2D_ARRAY: 'sampler2DArray',
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function mapType(gl: any, type: number): string
{
    if (!GL_TABLE)
    {
        const typeNames = Object.keys(GL_TO_GLSL_TYPES);

        GL_TABLE = {};

        for (let i = 0; i < typeNames.length; ++i)
        {
            const tn = typeNames[i];

            GL_TABLE[gl[tn]] = GL_TO_GLSL_TYPES[tn];
        }
    }

    return GL_TABLE[type];
}
