/**
 * entry.js
 *
 * This is the first file loaded. It sets up the Renderer,
 * Scene and Camera. It also starts the render loop and
 * handles window resizes.
 *
 */

import { WebGLRenderer, PerspectiveCamera, Scene, Vector3 } from "three";

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

let container;
let camera, scene, renderer;
let controller1, controller2;
let controllerGrip1, controllerGrip2;

let raycaster;

let tiles;

const intersected = [];
const tempMatrix = new THREE.Matrix4();

let controls, group;

const apiKey =
  localStorage.getItem("googleApiKey") ??
  "AIzaSyAVwHAZdAPZWeS2UiVPCNSEyGRks0qPozM";

const params = {
  apiKey: apiKey,
  reload: reinstantiateTiles,
};

init();
animate();

function reinstantiateTiles() {
  localStorage.setItem("googleApiKey", params.apiKey);

  if (tiles) {
    scene.remove(tiles.group);
    tiles.dispose();
    tiles = null;
  }
  console.log("reinstantiateTiles a");

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

  console.log("reinstantiateTiles b");
}

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x808080);

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    10
  );
  camera.position.set(0, 1.6, 3);

  controls = new OrbitControls(camera, container);
  controls.target.set(0, 1.6, 0);
  controls.update();

  // const floorGeometry = new THREE.PlaneGeometry(4, 4);
  // const floorMaterial = new THREE.MeshStandardMaterial({
  //   color: 0xeeeeee,
  //   roughness: 1.0,
  //   metalness: 0.0,
  // });
  // const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  // floor.rotation.x = -Math.PI / 2;
  // floor.receiveShadow = true;
  // scene.add(floor);

  scene.add(new THREE.HemisphereLight(0x808080, 0x606060));

  const light = new THREE.DirectionalLight(0xffffff);
  light.position.set(0, 6, 0);
  light.castShadow = true;
  light.shadow.camera.top = 2;
  light.shadow.camera.bottom = -2;
  light.shadow.camera.right = 2;
  light.shadow.camera.left = -2;
  light.shadow.mapSize.set(4096, 4096);
  scene.add(light);

  group = new THREE.Group();
  scene.add(group);

  // const geometries = [
  //   new THREE.BoxGeometry(0.2, 0.2, 0.2),
  //   new THREE.ConeGeometry(0.2, 0.2, 64),
  //   new THREE.CylinderGeometry(0.2, 0.2, 0.2, 64),
  //   new THREE.IcosahedronGeometry(0.2, 8),
  //   new THREE.TorusGeometry(0.2, 0.04, 64, 32),
  // ];

  // for (let i = 0; i < 20; i++) {
  //   const geometry = geometries[Math.floor(Math.random() * geometries.length)];
  //   const material = new THREE.MeshStandardMaterial({
  //     color: Math.random() * 0xffffff,
  //     roughness: 0.7,
  //     metalness: 0.0,
  //   });

  //   const object = new THREE.Mesh(geometry, material);

  //   object.position.x = Math.random() * 4 - 2;
  //   object.position.y = Math.random() * 2;
  //   object.position.z = Math.random() * 4 - 2;

  //   object.rotation.x = Math.random() * 2 * Math.PI;
  //   object.rotation.y = Math.random() * 2 * Math.PI;
  //   object.rotation.z = Math.random() * 2 * Math.PI;

  //   object.scale.setScalar(Math.random() + 0.5);

  //   object.castShadow = true;
  //   object.receiveShadow = true;

  //   group.add(object);
  // }

  //

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
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

  console.log("init() reinstantiateTiles");
  //
  reinstantiateTiles();

  // onWindowResize();
  window.addEventListener("resize", onWindowResize);

  // run hash functions
  initFromHash();
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
  tempMatrix.identity().extractRotation(controller.matrixWorld);

  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  return raycaster.intersectObjects(group.children, false);
}

function intersectObjects(controller) {
  // Do not highlight when already selected

  if (controller.userData.selected !== undefined) return;

  const line = controller.getObjectByName("line");
  const intersections = getIntersections(controller);

  if (intersections.length > 0) {
    const intersection = intersections[0];

    const object = intersection.object;
    object.material.emissive.r = 1;
    intersected.push(object);

    line.scale.z = intersection.distance;
  } else {
    line.scale.z = 5;
  }
}

function cleanIntersected() {
  while (intersected.length) {
    const object = intersected.pop();
    object.material.emissive.r = 0;
  }
}

//
function initFromHash() {
  console.log("initFromHash() a");
  const hash = window.location.hash.replace(/^#/, "");
  const tokens = hash.split(/,/g).map((t) => parseFloat(t));
  if (tokens.length !== 2 || tokens.findIndex((t) => Number.isNaN(t)) !== -1) {
    return;
  }

  console.log("initFromHash() b");

  const [lat, lon] = tokens;
  WGS84_ELLIPSOID.getCartographicToPosition(
    lat * MathUtils.DEG2RAD,
    lon * MathUtils.DEG2RAD,
    0,
    controls.target
  );

  tiles.group.updateMatrixWorld();
  controls.target.applyMatrix4(tiles.group.matrixWorld);
  console.log("initFromHash() c");
}

function animate() {
  renderer.setAnimationLoop(render);

  console.log("animate() a");

  if (!tiles) return;

  console.log("animate() b");

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
  cleanIntersected();

  intersectObjects(controller1);
  intersectObjects(controller2);

  renderer.render(scene, camera);

  if (tiles) {
    console.log("render() tiles.");
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
