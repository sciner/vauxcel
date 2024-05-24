const renderer = new PIXI.Renderer({
    width: 800, height: 600, backgroundColor: 0x1099bb, resolution: window.devicePixelRatio || 1,
    hello: true,
});
const stage = new PIXI.Container();
const ticker = new PIXI.Ticker();
ticker.add(() => {
    renderer.render(stage);
}, PIXI.UPDATE_PRIORITY.LOW);

ticker.start();
document.body.appendChild(renderer.view);

const buf1 = new PIXI.Buffer(new Float32Array([-100, -100, // x, y
    100, -100, // x, y
    100, 100]));

const geometry = new PIXI.Geometry({
    attributes: {
        aVertexPosition: {
            buffer: buf1,
            format: 'float32x2'
        },
        aColor: {
            buffer: [1, 0, 0, // r, g, b
                0, 1, 0, // r, g, b
                0, 0, 1], // r, g, b
            format: 'float32x3'
        },
        aUvs: {
            buffer: [0, 0, // u, v
                1, 0, // u, v
                1, 1], // u, v
            format: 'float32x2'
        }
    }
})

const vertexSrc = `#version 300 es
precision highp float;

in vec2 aVertexPosition;
in vec3 aColor;
in vec2 aUvs;

uniform mat3 translationMatrix;
uniform mat3 projectionMatrix;

out vec2 vUvs;
out vec3 vColor;

void main() {

    vUvs = aUvs;
    vColor = aColor;
    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);

}`;

const fragmentSrc = `#version 300 es
precision highp float;

in vec3 vColor;
in vec2 vUvs;

uniform highp isampler3D uSampler3;
out vec4 outColor;

void main() {
    ivec4 tst = texelFetch(uSampler3, ivec3(0,0, round(vUvs.y *2.0 - 0.5)), 0);
    outColor=vec4(tst)/255.0;
}
`;

const tex3d = new PIXI.Buffer3DSource({
    format: 'rgba32sint',
    width: 1, height: 1, depth: 1, useSubRegions: true, scaleMode: 'nearest', alphaMode: 0,
    copyOnResize: true});

const layout1 = { offset: { x: 0, y: 0, z: 0 }, size: { width: 1, height: 1, depth: 1}};
const tex_region1 = new PIXI.Texture3D({ source: tex3d, label: 'tex3d #1', layout: layout1})
const layout2 = { offset: { x: 0, y: 0, z: 1 }, size: { width: 1, height: 1, depth: 1}};
const tex_region2 = new PIXI.Texture3D({ source: tex3d, label: 'tex3d #2', layout: layout2})

const shader = PIXI.Shader.from(vertexSrc, fragmentSrc, { uSampler3: tex3d });

const triangle = new PIXI.Mesh(geometry, shader);

triangle.position.set(400, 300);
triangle.scale.set(2);

stage.addChild(triangle);

ticker.add((delta) => {
    triangle.rotation += 0.01;
});


let upload = 0;
setInterval(() => {
    if (upload == 0) {
        tex_region1.update(new Int32Array([255, 0, 0, 255]));
        tex3d.update();
        upload++;
    } else if (upload == 1) {
        tex3d.resize3D(1, 1, 2);
        tex_region2.update(new Int32Array([0, 255, 255, 255]));
        tex3d.update();
        upload++;
    }
}, 500);
