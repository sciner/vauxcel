import './settings.js';

/**
 * @namespace PIXI
 */

/**
 * String of the current PIXI version.
 * @memberof PIXI
 */
export const VERSION = '$_VERSION';

// Export dependencies
export * from '@pixi/color/index.js';
export * from '@pixi/constants.js';
export * from '@pixi/extensions.js';
export * from '@pixi/math/index.js';
export * from '@pixi/runner.js';
export * from '@pixi/settings/index.js';
export * from '@pixi/ticker/index.js';
export * as utils from '@pixi/utils/index.js';

// Export core
export * from './autoDetectRenderer.js';
export * from './background/BackgroundSystem.js';
export * from './batch/BatchDrawCall.js';
export * from './batch/BatchGeometry.js';
export * from './batch/BatchRenderer.js';
export * from './batch/BatchShaderGenerator.js';
export * from './batch/BatchSystem.js';
export * from './batch/BatchTextureArray.js';
export * from './batch/ObjectRenderer.js';
export * from './context/ContextSystem.js';
export * from './filters/Filter.js';
export * from './filters/FilterState.js';
export * from './filters/FilterSystem.js';
export * from './filters/IFilterTarget.js';
export * from './filters/spriteMask/SpriteMaskFilter.js';
export * from './fragments.js';
export * from './framebuffer/Framebuffer.js';
export * from './framebuffer/FramebufferSystem.js';
export * from './framebuffer/GLFramebuffer.js';
export * from './framebuffer/MultisampleSystem.js';
export * from './geometry/Attribute.js';
export * from './geometry/Buffer.js';
export * from './geometry/BufferCopyOperation.js';
export * from './geometry/BufferSystem.js';
export * from './geometry/Geometry.js';
export * from './geometry/GeometrySystem.js';
export * from './geometry/ViewableBuffer.js';
export * from './IRenderer.js';
export * from './IRenderer.js';
export * from './mask/MaskData.js';
export * from './mask/MaskSystem.js';
export * from './mask/ScissorSystem.js';
export * from './mask/StencilSystem.js';
export * from './plugin/PluginSystem.js';
export * from './plugin/PluginSystem.js';
export * from './projection/ProjectionSystem.js';
export * from './render/ObjectRendererSystem.js';
export * from './Renderer.js';
export * from './renderTexture/BaseRenderTexture.js';
export * from './renderTexture/GenerateTextureSystem.js';
export * from './renderTexture/GenerateTextureSystem.js';
export * from './renderTexture/RenderTexture.js';
export * from './renderTexture/RenderTexturePool.js';
export * from './renderTexture/RenderTextureSystem.js';
export * from './shader/GLProgram.js';
export * from './shader/Program.js';
export * from './shader/Shader.js';
export * from './shader/ShaderSystem.js';
export * from './shader/UniformGroup.js';
export * from './shader/utils/checkMaxIfStatementsInShader.js';
export * from './shader/utils/generateProgram.js';
export * from './shader/utils/generateUniformBufferSync.js';
export * from './shader/utils/getTestContext.js';
export * from './shader/utils/uniformParsers.js';
export * from './shader/utils/unsafeEvalSupported.js';
export * from './startup/StartupSystem.js';
export * from './state/State.js';
export * from './state/StateSystem.js';
export * from './system/ISystem.js';
export * from './systems.js';
export * from './textures/GLTexture.js';
export * from './textures/sources/index.js';
export * from './textures/Texture.js';
export * from './textures/TextureGCSystem.js';
export * from './textures/TextureMatrix.js';
export * from './textures/TextureSystem.js';
export * from './textures/TextureUvs.js';
export * from './textures/uploaders/index.js';
export * from './transformFeedback/TransformFeedback.js';
export * from './transformFeedback/TransformFeedbackSystem.js';
export * from './utils/Quad.js';
export * from './utils/QuadUv.js';
export * from './view/ViewSystem.js';
