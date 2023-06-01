#version 300 es
precision highp float;

in vec2 aVertexPosition;
in vec2 aTextureCoord;
in vec4 aColor;
in float aTextureId;

uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform vec4 tint;

out vec2 vTextureCoord;
out vec4 vColor;
out float vTextureId;

void main(void){
    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);

    vTextureCoord = aTextureCoord;
    vTextureId = aTextureId;
    vColor = aColor * tint;
}
