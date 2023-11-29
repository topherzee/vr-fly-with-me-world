/**
 * entry.js
 *
 * This is the first file loaded. It sets up the Renderer,
 * Scene and Camera. It also starts the render loop and
 * handles window resizes.
 *
 */

import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  Vector3,
  Raycaster,
} from "three";

import * as THREE from "three";

import { MathUtils } from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

// TODO: Get this to work!
// import { GeoUtils, WGS84_ELLIPSOID, GoogleTilesRenderer } from '../src/index.js';

import {
  GeoUtils,
  WGS84_ELLIPSOID,
  GoogleTilesRenderer,
} from "3d-tiles-renderer";
// import { GeoUtils } from "3d-tiles-renderer";
// import { GoogleTilesRenderer } from "3d-tiles-renderer";

let camera, controls, scene, renderer, tiles;

// const raycaster = new Raycaster();
// raycaster.firstHitOnly = true;
let raycaster;

// const apiKey =
//   localStorage.getItem("googleApiKey") ??
//   "AIzaSyAVwHAZdAPZWeS2UiVPCNSEyGRks0qPozM";

const apiKey = "AIzaSyAVwHAZdAPZWeS2UiVPCNSEyGRks0qPozM";

const params = {
  apiKey: apiKey,
  reload: reinstantiateTiles,
};

//XR STUFF
let controller1, controller2;
let controllerGrip1, controllerGrip2;

init();
animate();

function reinstantiateTiles() {
  localStorage.setItem("googleApiKey", params.apiKey);

  if (tiles) {
    scene.remove(tiles.group);
    tiles.dispose();
    tiles = null;
  }

  tiles = new GoogleTilesRenderer(params.apiKey);
  // tiles.setLatLonToYUp( 35.3606 * MathUtils.DEG2RAD, 138.7274 * MathUtils.DEG2RAD ); // Mt Fuji
  // tiles.setLatLonToYUp( 48.8584 * MathUtils.DEG2RAD, 2.2945 * MathUtils.DEG2RAD ); // Eiffel Tower
  // tiles.setLatLonToYUp( 41.8902 * MathUtils.DEG2RAD, 12.4922 * MathUtils.DEG2RAD ); // Colosseum
  // tiles.setLatLonToYUp( 43.8803 * MathUtils.DEG2RAD, - 103.4538 * MathUtils.DEG2RAD ); // Mt Rushmore
  // tiles.setLatLonToYUp( 36.2679 * MathUtils.DEG2RAD, - 112.3535 * MathUtils.DEG2RAD ); // Grand Canyon
  // tiles.setLatLonToYUp( - 22.951890 * MathUtils.DEG2RAD, - 43.210439 * MathUtils.DEG2RAD ); // Christ the Redeemer
  tiles.setLatLonToYUp(
    35.6586 * MathUtils.DEG2RAD,
    139.7454 * MathUtils.DEG2RAD
  ); // Tokyo Tower

  // tiles.setLatLonToYUp(
  //   47.6202117 * MathUtils.DEG2RAD,
  //   7.6083925 * MathUtils.DEG2RAD
  // ); // Haltingen

  // tiles.setLatLonToYUp(
  //   46.5256157 * MathUtils.DEG2RAD,
  //   7.8256429 * MathUtils.DEG2RAD
  // ); // Chilchbalm, Switzerland

  tiles.maxDepth = 20;

  // ,,13.84z

  // 47.6202117,7.6083925

  // Note the DRACO compression files need to be supplied via an explicit source.
  // We use unpkg here but in practice should be provided by the application.
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/"
  );

  const loader = new GLTFLoader(tiles.manager);
  loader.setDRACOLoader(dracoLoader);

  tiles.manager.addHandler(/\.gltf$/, loader);
  scene.add(tiles.group);

  tiles.setResolutionFromRenderer(camera, renderer);
  tiles.setCamera(camera);
}

function init() {
  scene = new Scene();

  // primary camera view
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setClearColor(0x151c1f);

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);

  document.body.appendChild(VRButton.createButton(renderer));

  // camera = new PerspectiveCamera(
  //   60,
  //   window.innerWidth / window.innerHeight,
  //   100,
  //   1600000
  // );

  camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    100,
    1000
  );

  camera.position.set(1e3, 1e3, 1e3).multiplyScalar(0.5);

  // controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 500;
  // controls.maxDistance = 1000;
  controls.maxDistance = 1e4 * 2;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = (3 * Math.PI) / 8;
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;
  controls.enablePan = false;

  // controllers

  controller1 = renderer.xr.getController(0);
  // controller1.addEventListener("selectstart", onSelectStart);
  // controller1.addEventListener("selectend", onSelectEnd);
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  // controller2.addEventListener("selectstart", onSelectStart);
  // controller2.addEventListener("selectend", onSelectEnd);
  scene.add(controller2);

  const controllerModelFactory = new XRControllerModelFactory();

  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(
    controllerModelFactory.createControllerModel(controllerGrip1)
  );
  scene.add(controllerGrip1);

  controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip2.add(
    controllerModelFactory.createControllerModel(controllerGrip2)
  );
  scene.add(controllerGrip2);

  //

  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);

  const line = new THREE.Line(geometry);
  line.name = "line";
  line.scale.z = 5;

  controller1.add(line.clone());
  controller2.add(line.clone());

  raycaster = new THREE.Raycaster();

  reinstantiateTiles();

  onWindowResize();
  window.addEventListener("resize", onWindowResize, false);

  // GUI
  // const gui = new GUI();
  // gui.width = 300;
  // gui.add(params, "apiKey");
  // gui.add(params, "reload");
  // gui.open();

  // run hash functions
  initFromHash();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.updateProjectionMatrix();
  renderer.setPixelRatio(window.devicePixelRatio);
}

function initFromHash() {
  const hash = window.location.hash.replace(/^#/, "");
  const tokens = hash.split(/,/g).map((t) => parseFloat(t));
  if (tokens.length !== 2 || tokens.findIndex((t) => Number.isNaN(t)) !== -1) {
    return;
  }

  const [lat, lon] = tokens;
  WGS84_ELLIPSOID.getCartographicToPosition(
    lat * MathUtils.DEG2RAD,
    lon * MathUtils.DEG2RAD,
    0,
    controls.target
  );

  tiles.group.updateMatrixWorld();
  controls.target.applyMatrix4(tiles.group.matrixWorld);
}

function animate() {
  requestAnimationFrame(animate);

  if (!tiles) return;

  controls.update();

  // update options
  tiles.setResolutionFromRenderer(camera, renderer);
  tiles.setCamera(camera);

  // update tiles
  camera.updateMatrixWorld();
  tiles.update();

  render();
}

function render() {
  // render primary view
  renderer.render(scene, camera);

  if (tiles) {
    const mat = tiles.group.matrixWorld.clone().invert();
    const vec = camera.position.clone().applyMatrix4(mat);

    const res = {};
    WGS84_ELLIPSOID.getPositionToCartographic(vec, res);

    // document.getElementById("credits").innerText =
    //   GeoUtils.toLatLonString(res.lat, res.lon) +
    //   "\n" +
    //   tiles.getCreditsString();
  }
}
