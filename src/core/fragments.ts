/**
 * Default vertex shader
 * @memberof PIXI
 * @member {string} defaultVertex
 */

/**
 * Default filter vertex shader
 * @memberof PIXI
 * @member {string} defaultFilterVertex
 */

// NOTE: This black magic is so that @microsoft/api-extractor does not complain! This explicitly specifies the types
// of defaultVertex, defaultFilterVertex.
const defaultVertex = `#version 100

attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat3 projectionMatrix;

varying vec2 vTextureCoord;

void main(void)
{
    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
    vTextureCoord = aTextureCoord;
}
`;
const defaultFilterVertex = `#version 100

attribute vec2 aVertexPosition;

uniform mat3 projectionMatrix;

varying vec2 vTextureCoord;

uniform vec4 inputSize;
uniform vec4 outputFrame;

vec4 filterVertexPosition( void )
{
    vec2 position = aVertexPosition * max(outputFrame.zw, vec2(0.)) + outputFrame.xy;

    return vec4((projectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aVertexPosition * (outputFrame.zw * inputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`;

export { defaultFilterVertex, defaultVertex };
