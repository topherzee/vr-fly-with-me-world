/**
 * entry.js
 *
 * This is the first file loaded. It sets up the Renderer,
 * Scene and Camera. It also starts the render loop and
 * handles window resizes.
 *
 */

const apiKey = "AIzaSyAVwHAZdAPZWeS2UiVPCNSEyGRks0qPozM";

const ENABLE_TILES = true;
const MAX_TILE_DEPTH = 50; //20 is minimal
// const MAX_TILE_DEPTH = 25; //20 is minimal

const ONLY_LOAD_TILES_IN_VR = false;
let in_vr = false;

const START_Y = 500;
const START_X = 1000;
const START_Z = -600;

import {
  DirectionalLight,
  AmbientLight,
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  Vector3,
  Raycaster,
  Box3,
  Sphere,
  MathUtils,
  GridHelper,
} from "three";

import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
// import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

import {
  GeoUtils,
  WGS84_ELLIPSOID,
  GoogleTilesRenderer,
  DebugGoogleTilesRenderer,
  NONE,
  SCREEN_ERROR,
  GEOMETRIC_ERROR,
  DISTANCE,
  DEPTH,
  RELATIVE_DEPTH,
  IS_LEAF,
  RANDOM_COLOR,
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

let box, sphere, grid;

let tiles;

let raycaster;

const tempMatrix = new THREE.Matrix4();

let controls, group;

let cameraTopher;
let camGroup;

let xrSession = null;

const DEFAULT_COLOR_MODE = NONE;
const IS_DISPLAY_BOX_BOUNDS = true;

const params = {
  apiKey: apiKey,
  reload: reinstantiateTiles,

  displayBoxBounds: IS_DISPLAY_BOX_BOUNDS,
  colorMode: DEFAULT_COLOR_MODE,
  displayGrid: true,
};

localStorage.setItem("googleApiKey", params.apiKey);

// Note the DRACO compression files need to be supplied via an explicit source.
// We use unpkg here but in practice should be provided by the application.
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(
  "https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/"
);

init();
animate();

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
  camera.aname = "Regular camera";

  cameraTopher = new THREE.PerspectiveCamera(100, 0.75, 0.1, 10000);
  cameraTopher.aname = "Topher Camera";

  // camera.position.set(0, 1.6, 3);

  // camera.position.set(START_X, START_Y, START_Z);

  camGroup = new THREE.Group();
  camGroup.add(camera);
  camGroup.position.set(START_X, START_Y, START_Z);
  scene.add(camGroup);

  // controls = new OrbitControls(camera, container);
  // controls.target.set(0, START_Y, 0);
  // controls.update();

  const s = 100;

  // const START_Y = 400;
  // const START_X = 1000;
  // const START_Z = -600;

  const geometryCube = new THREE.BoxGeometry(s, s, s);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const material2 = new THREE.MeshBasicMaterial({ color: 0x0000ff });
  const cube = new THREE.Mesh(geometryCube, material);
  cube.position.set(0, s * 6, 0);
  scene.add(cube);
  const cube2 = new THREE.Mesh(geometryCube, material);
  cube2.position.set(0, -s, 0);
  scene.add(cube2);
  const cubeNorth = new THREE.Mesh(geometryCube, material2);
  cubeNorth.position.set(START_X, START_Y, START_Z - 7 * s);
  scene.add(cubeNorth);
  const cubeWest = new THREE.Mesh(geometryCube, material2);
  cubeWest.position.set(START_X, START_Y, START_Z - 20 * s);
  scene.add(cubeWest);
  const cubeEast = new THREE.Mesh(geometryCube, material2);
  cubeEast.position.set(START_X, START_Y, START_Z - 40 * s);
  scene.add(cubeEast);
  //
  grid = new GridHelper(10, 10, 0xffffff, 0xffffff);
  grid.material.transparent = true;
  grid.material.opacity = 0.5;
  grid.material.depthWrite = false;
  scene.add(grid);
  // lights
  const dirLight = new DirectionalLight(0xffffff);
  dirLight.position.set(1, 2, 3);
  scene.add(dirLight);
  const ambLight = new AmbientLight(0xffffff, 0.2);
  scene.add(ambLight);
  // GUI
  const gui = new GUI();
  gui.width = 300;
  gui.add(params, "displayGrid");
  gui.add(params, "displayBoxBounds");
  gui.add(params, "colorMode", {
    NONE,
    SCREEN_ERROR,
    GEOMETRIC_ERROR,
    DISTANCE,
    DEPTH,
    RELATIVE_DEPTH,
    IS_LEAF,
    RANDOM_COLOR,
  });
  gui.open();

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  document.body.appendChild(VRButton.createButton(renderer));

  onWindowResize();

  if (!ONLY_LOAD_TILES_IN_VR) {
    reinstantiateTiles();
  }

  // tile set
  box = new Box3();
  sphere = new Sphere();

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  console.log("onWindowResize");
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function reinstantiateTiles() {
  console.log("reinstantiateTiles()");

  if (ENABLE_TILES) {
    if (tiles) {
      scene.remove(tiles.group);
      tiles.dispose();
      tiles = null;
    }

    // tiles = new GoogleTilesRenderer(params.apiKey);
    tiles = new DebugGoogleTilesRenderer(params.apiKey);
    // tiles.maxDebugDistance = 1000000; //DISTANCE
    // tiles.maxDebugDepth = 30;
    // // tiles.errorTarget = 0.1; //does not seem to work.
    // tiles.errorTarget = 50; //does not seem to work.
    // tiles.maxDebugError = 1000;

    tiles.setLatLonToYUp(
      47.6202117 * MathUtils.DEG2RAD,
      7.6083925 * MathUtils.DEG2RAD
    ); // Haltingen
    tiles.maxDepth = MAX_TILE_DEPTH;

    const loader = new GLTFLoader(tiles.manager);
    loader.setDRACOLoader(dracoLoader);
    tiles.manager.addHandler(/\.gltf$/, loader);
    scene.add(tiles.group);

    // tiles.setResolution(camera, 5, 5);
    tiles.setCamera(camera);
    tiles.setResolutionFromRenderer(camera, renderer);
  }
}

function handleCamera() {
  // get the XR camera with a combined frustum for culling
  if (renderer.xr.isPresenting) {
    if (xrSession === null) {
      // We setup XR camera once
      console.log("handleCamera: set XR Camera");

      in_vr = true;

      if (ONLY_LOAD_TILES_IN_VR) {
        reinstantiateTiles();
      }

      const xrCamera = renderer.xr.getCamera();
      console.log("xrCamera: ", xrCamera);
      const leftCam = xrCamera.cameras[0];
      leftCam.aname = "left xr camera";

      // remove all cameras so we can use the VR camera instead
      tiles.cameras.forEach((c) => tiles.deleteCamera(c));
      console.log("tiles.cameras: ", tiles.cameras);

      tiles.setCamera(xrCamera);

      if (leftCam) {
        tiles.setResolution(xrCamera, leftCam.viewport.z, leftCam.viewport.w);
      }

      xrSession = renderer.xr.getSession();
      console.log("xrSession: ", xrSession);
    }
  } else {
    // Reset default camera (exiting WebXR session)
    if (xrSession !== null) {
      console.log("handleCamera: UNSET XR Camera");

      in_vr = false;

      tiles.cameras.forEach((c) => tiles.deleteCamera(c));

      tiles.setCamera(camera);
      tiles.setResolutionFromRenderer(camera, renderer);

      camera.position.set(0, 1, 0);

      xrSession = null;
    }
  }
}

function animate() {
  renderer.setAnimationLoop(render);
}

let time = 0;

function render() {
  grid.visible = params.displayGrid;

  // update tiles
  // time = time - 0.5;

  // camGroup.position.set(START_X + time, START_Y, START_Z);
  camGroup.position.set(START_X + time, START_Y, START_Z);

  // We check for tiles camera setup (default and XR sessions)
  handleCamera();

  if (!ONLY_LOAD_TILES_IN_VR || in_vr) {
    // update options
    tiles.displayBoxBounds = params.displayBoxBounds;
    tiles.colorMode = parseFloat(params.colorMode);

    if (ENABLE_TILES) {
      if (!tiles) return;

      // controls.update();
      // update options
      // tiles.setResolutionFromRenderer(camera, renderer);

      camera.updateMatrixWorld();

      tiles.update();

      //CHECK CAM:
      const xrCamera = renderer.xr.getCamera();

      if (xrCamera.cameras.length > 0) {
        let xrWorldPos = new THREE.Vector3();
        xrCamera.getWorldPosition(xrWorldPos);

        let leftCam = xrCamera.cameras[0];
        let leftCamWorldPos = new THREE.Vector3();
        leftCam.getWorldPosition(leftCamWorldPos);

        let cameraWorldPos = new THREE.Vector3();
        camera.getWorldPosition(cameraWorldPos);

        if (false) {
          console.log(
            "xr: ",
            xrCamera.position.x.toFixed(3),
            ", ",
            xrWorldPos.x.toFixed(3),
            " left: ",
            leftCam.position.x.toFixed(3),
            ", ",
            leftCamWorldPos.x.toFixed(3),
            " cam: ",
            camera.position.x.toFixed(3),
            ", ",
            cameraWorldPos.x.toFixed(3)
          );
        }

        // debugger;
      }

      // console.log("Camera: " + camera.position.y);
    }
  }

  renderer.render(scene, camera);
}
