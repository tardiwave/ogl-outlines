import {
  Renderer,
  Camera,
  Transform,
  Program,
  Orbit,
  GLTFLoader,
  RenderTarget,
  Post,
  Vec2,
  Vec4,
  Color,
} from "ogl";

import meshVertex from "./shaders/model/model.vert?raw";
import meshFragment from "./shaders/model/model.frag?raw";

import outlineFragment from "./shaders/pass/outline.frag?raw";
import fxaaFragment from "./shaders/pass/fxaa.frag?raw";

let renderer = null;
let gl = null;
let camera = null;
let scene = null;
let program = null;
let controls = null;
let gltf = null;
let model = null;
let canvas = null;
let renderTarget = null;
let outlinePass = null;
let fxaaPass = null;
let postComposite = null;

function createScene() {
  canvas = document.getElementById("webgl");
  renderer = new Renderer({
    dpr: window.devicePixelRatio,
    canvas,
    alpha: true,
  });
  gl = renderer.gl;

  camera = new Camera(gl, { fov: 35 });
  camera.position.set(3.5, 2, 3.5);
  camera.lookAt([0, 0, 0]);
  controls = new Orbit(camera);
  scene = new Transform();
}

function createTarget() {
  renderTarget = new RenderTarget(gl, {
    width: gl.canvas.width,
    height: gl.canvas.height,
    stencil: true,
    depthTexture: true,
  });
}

async function createModel() {
  program = new Program(gl, {
    vertex: meshVertex,
    fragment: meshFragment,
    cullFace: null,
    depthTest: true,
    depthWrite: true,
    uniforms: {
      uIsNormalRender: { value: false },
    },
  });

  model = new Transform();

  gltf = await GLTFLoader.load(gl, "/assets/monkey.glb");

  const gltfScene = gltf.scene || gltf.scenes[0];
  gltfScene.forEach((root) => {
    root.setParent(model);
    root.traverse((node) => {
      if (node.program) {
        node.program = program;
      }
    });
  });

  model.setParent(scene);
  model.position.set(0, 0, 0);
}

function createPostPass() {
  postComposite = new Post(gl);
  outlinePass = postComposite.addPass({
    fragment: outlineFragment,
    uniforms: {
      tNormalMap: { value: renderTarget.texture },
      tDepthMap: { value: renderTarget.depthTexture },
      uCameraNear: { value: camera.near },
      uCameraFar: { value: camera.far },
      uScreenSize: {
        value: new Vec4(
          gl.canvas.width,
          gl.canvas.height,
          1 / gl.canvas.width,
          1 / gl.canvas.height
        ),
      },
      uOutlineColor: { value: new Color("#ffffff") },
      uMultiplierParameters: {
        value: new Vec2(0.9, 20),
      },
    },
  });
  fxaaPass = postComposite.addPass({
    uniforms: {
      uResolution: {
        value: new Vec2(gl.canvas.width, gl.canvas.height),
      },
    },
    fragment: fxaaFragment,
  });
}

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
  renderTarget.setSize(gl.canvas.width, gl.canvas.height);
  postComposite?.resize();

  outlinePass.uniforms.uScreenSize.value.set(
    gl.canvas.width,
    gl.canvas.height,
    1 / gl.canvas.width,
    1 / gl.canvas.height
  );
  fxaaPass?.uniforms.uResolution.value.set(gl.canvas.width, gl.canvas.height);
}

window.addEventListener("resize", resize, { passive: true });

createScene();
createModel();
createTarget();
createPostPass();
resize();

function update() {
  requestAnimationFrame(update);
  controls.update();

  program.uniforms.uIsNormalRender.value = true;
  outlinePass.enabled = false;
  postComposite.targetOnly = true;
  postComposite.render({ scene, camera, target: renderTarget });
  outlinePass.enabled = true;
  postComposite.targetOnly = false;
  program.uniforms.uIsNormalRender.value = false;

  outlinePass.uniforms.tDepthMap.value = renderTarget.depthTexture;
  outlinePass.uniforms.tNormalMap.value = renderTarget.texture;

  postComposite.render({ texture: renderTarget.depthTexture });
}

requestAnimationFrame(update);
