#version 300 es

in vec2 vTextureCoord;
in lowp vec4 vColor;
in float vTextureId;

uniform sampler2D uSamplers[%count%];

out vec4 outColor;

void main(void){
    vec4 color;
    %forloop%
    outColor = color * vColor;
}
