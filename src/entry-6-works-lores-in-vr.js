/**
 * entry.js
 *
 * This is the first file loaded. It sets up the Renderer,
 * Scene and Camera. It also starts the render loop and
 * handles window resizes.
 *
 */

const ENABLE_TILES = true;
// const MAX_TILE_DEPTH = 28; //20 is minimal
const MAX_TILE_DEPTH = 50; //20 is minimal

const START_Y = 400;
const START_X = 0;
const START_Z = -600;

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
// import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

import {
  GeoUtils,
  WGS84_ELLIPSOID,
  GoogleTilesRenderer,
} from "3d-tiles-renderer";
// import { GeoUtils } from "3d-tiles-renderer";
// import { GoogleTilesRenderer } from "3d-tiles-renderer";

// import * as THREE from 'three';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from "three/addons/webxr/VRButton.js";
// import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

let container;
let camera, scene, renderer;
let controller1, controller2;
let controllerGrip1, controllerGrip2;

let tiles;

let raycaster;

const intersected = [];
const tempMatrix = new THREE.Matrix4();

let controls, group;

const apiKey = "AIzaSyAVwHAZdAPZWeS2UiVPCNSEyGRks0qPozM";

const params = {
  apiKey: apiKey,
  reload: reinstantiateTiles,
};

init();
animate();

function reinstantiateTiles() {
  localStorage.setItem("googleApiKey", params.apiKey);

  if (ENABLE_TILES) {
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

    // tiles.setLatLonToYUp(
    //   35.6586 * MathUtils.DEG2RAD,
    //   139.7454 * MathUtils.DEG2RAD
    // ); // Tokyo Tower

    // tiles.setLatLonToYUp(
    //   47.6202117 * MathUtils.DEG2RAD,
    //   7.6083925 * MathUtils.DEG2RAD
    // ); // Haltingen

    tiles.setLatLonToYUp(
      46.5256157 * MathUtils.DEG2RAD,
      7.8256429 * MathUtils.DEG2RAD
    ); // Chilchbalm, Switzerland

    tiles.maxDepth = MAX_TILE_DEPTH;
  }

  // ,,13.84z

  // 47.6202117,7.6083925

  // Note the DRACO compression files need to be supplied via an explicit source.
  // We use unpkg here but in practice should be provided by the application.
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/"
  );

  if (ENABLE_TILES) {
    const loader = new GLTFLoader(tiles.manager);
    loader.setDRACOLoader(dracoLoader);

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
    // tiles.setLatLonToYUp(
    //   35.6586 * MathUtils.DEG2RAD,
    //   139.7454 * MathUtils.DEG2RAD
    // ); // Tokyo Tower

    tiles.setLatLonToYUp(
      47.6202117 * MathUtils.DEG2RAD,
      7.6083925 * MathUtils.DEG2RAD
    ); // Haltingen

    // tiles.setLatLonToYUp(
    //   46.5256157 * MathUtils.DEG2RAD,
    //   7.8256429 * MathUtils.DEG2RAD
    // ); // Chilchbalm, Switzerland

    tiles.maxDepth = MAX_TILE_DEPTH;

    tiles.manager.addHandler(/\.gltf$/, loader);
    scene.add(tiles.group);

    tiles.setResolutionFromRenderer(camera, renderer);
    // tiles.setResolution(camera, 5, 5);
    tiles.setCamera(camera);
  }
}

let camGroup;

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x808080);

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );
  // camera.position.set(0, 1.6, 3);
  // camera.position.set(1e3, 1e3, 1e3).multiplyScalar(0.5);
  // camera.position.set(START_X, START_Y, START_Z);

  camGroup = new THREE.Group();
  camGroup.add(camera);
  camGroup.position.set(START_X, START_Y, START_Z);
  scene.add(camGroup);

  controls = new OrbitControls(camera, container);
  controls.target.set(0, START_Y, 0);
  controls.update();

  const s = 100;

  const geometryCube = new THREE.BoxGeometry(s, s, s);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const cube = new THREE.Mesh(geometryCube, material);
  cube.position.set(0, s * 2, 0);

  scene.add(cube);

  //

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  document.body.appendChild(VRButton.createButton(renderer));

  // controllers

  controller1 = renderer.xr.getController(0);
  controller1.addEventListener("selectstart", onSelectStart);
  controller1.addEventListener("selectend", onSelectEnd);
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  controller2.addEventListener("selectstart", onSelectStart);
  controller2.addEventListener("selectend", onSelectEnd);
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

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onSelectStart(event) {
  const controller = event.target;

  const intersections = getIntersections(controller);

  if (intersections.length > 0) {
    const intersection = intersections[0];

    const object = intersection.object;
    object.material.emissive.b = 1;
    controller.attach(object);

    controller.userData.selected = object;
  }

  controller.userData.targetRayMode = event.data.targetRayMode;
}

function onSelectEnd(event) {
  const controller = event.target;

  if (controller.userData.selected !== undefined) {
    const object = controller.userData.selected;
    object.material.emissive.b = 0;
    group.attach(object);

    controller.userData.selected = undefined;
  }
}

function getIntersections(controller) {
  controller.updateMatrixWorld();

  tempMatrix.identity().extractRotation(controller.matrixWorld);

  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  // return raycaster.intersectObjects(group.children, false);
}

function intersectObjects(controller) {
  // Do not highlight in mobile-ar

  if (controller.userData.targetRayMode === "screen") return;

  // Do not highlight when already selected

  if (controller.userData.selected !== undefined) return;

  const line = controller.getObjectByName("line");
  const intersections = getIntersections(controller);

  // if (intersections.length > 0) {
  //   const intersection = intersections[0];

  //   const object = intersection.object;
  //   object.material.emissive.r = 1;
  //   intersected.push(object);

  //   line.scale.z = intersection.distance;
  // } else {
  //   line.scale.z = 5;
  // }
}

function cleanIntersected() {
  while (intersected.length) {
    const object = intersected.pop();
    object.material.emissive.r = 0;
  }
}

//

function animate() {
  renderer.setAnimationLoop(render);
}
let time = 0;
function render() {
  cleanIntersected();

  intersectObjects(controller1);
  intersectObjects(controller2);

  if (ENABLE_TILES) {
    if (!tiles) return;

    controls.update();

    // update options
    tiles.setResolutionFromRenderer(camera, renderer);
    // tiles.setResolution(camera, 5, 5);
    tiles.setCamera(camera);

    // update tiles
    //camera.position.set(START_X, START_Y, START_Z);
    time--;

    camGroup.position.set(START_X + time, START_Y, START_Z);

    camera.updateMatrixWorld();
    tiles.update();

    // console.log("Camera: " + camera.position.y);
  }

  renderer.render(scene, camera);
}
