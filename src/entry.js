/**
 * entry.js
 *
 * This is the first file loaded. It sets up the Renderer,
 * Scene and Camera. It also starts the render loop and
 * handles window resizes.
 *
 */

const apiKey = `${process.env.API_GOOGLE_TILES}`;

const ENABLE_TILES = true;
let MAX_TILE_DEPTH = 50; //20 is minimal
// const MAX_TILE_DEPTH = 25; //20 is minimal

const ONLY_LOAD_TILES_IN_VR = false;
let in_vr = false;

// Haltingen
const LAT = 47.6202117;
const LON = 7.6083925;
const START_Y = 500;
const START_X = -800; //1000;
const START_Z = 1500;
const CAM_FAR_DISTANCE = 2000;

//Chilchbalm
// const LAT = 46.5256157;
// const LON = 7.8256429;
// const START_Y = 3000;
// const START_X = 0; //1000;
// const START_Z = 0;
// const CAM_FAR_DISTANCE = 8000;

const CAM_VELOCITY = -0.03;

const STOP_LOADING_AFTER_X_SECONDS = 30;

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
import { Sky } from "three/addons/objects/Sky.js";

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

let sky, sun;

let xrSession = null;
const tasks = [];

const DEFAULT_COLOR_MODE = NONE;
const IS_DISPLAY_BOX_BOUNDS = false;

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
    CAM_FAR_DISTANCE
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

  // const cubeNorth = new THREE.Mesh(geometryCube, material2);
  // cubeNorth.position.set(START_X, START_Y, START_Z - 7 * s);
  // scene.add(cubeNorth);
  // const cubeWest = new THREE.Mesh(geometryCube, material2);
  // cubeWest.position.set(START_X, START_Y, START_Z - 20 * s);
  // scene.add(cubeWest);
  // const cubeEast = new THREE.Mesh(geometryCube, material2);
  // cubeEast.position.set(START_X, START_Y, START_Z - 40 * s);
  // scene.add(cubeEast);
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

  initSky();
  initControllers();

  window.addEventListener("resize", onWindowResize);
}

function initControllers() {
  controller1 = renderer.xr.getController(0);
  // controller1.addEventListener("selectstart", onSelectStart);
  // controller1.addEventListener("selectend", onSelectEnd);
  camGroup.add(controller1);

  controller2 = renderer.xr.getController(1);
  // controller2.addEventListener("selectstart", onSelectStart);
  // controller2.addEventListener("selectend", onSelectEnd);
  camGroup.add(controller2);

  const controllerModelFactory = new XRControllerModelFactory();

  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(
    controllerModelFactory.createControllerModel(controllerGrip1)
  );
  camGroup.add(controllerGrip1);

  controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip2.add(
    controllerModelFactory.createControllerModel(controllerGrip2)
  );
  camGroup.add(controllerGrip2);
}

function onWindowResize() {
  console.log("onWindowResize");

  camera.updateProjectionMatrix();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function handleTasks() {
  for (let t = 0, l = tasks.length; t < l; t++) {
    tasks[t]();
  }
  tasks.length = 0;
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

    scene.add(tiles.group);

    tiles.setLatLonToYUp(LAT * MathUtils.DEG2RAD, LON * MathUtils.DEG2RAD);

    tiles.maxDepth = MAX_TILE_DEPTH;

    const loader = new GLTFLoader(tiles.manager);
    loader.setDRACOLoader(dracoLoader);
    tiles.manager.addHandler(/\.gltf$/, loader);

    // tiles.setResolution(camera, 5, 5);
    tiles.setCamera(camera);
    tiles.setResolutionFromRenderer(camera, renderer);

    // We define a custom scheduling callback to handle also active WebXR sessions
    const tilesSchedulingCB = (func) => {
      tasks.push(func);
    };

    // We set our scheduling callback for tiles downloading and parsing
    tiles.downloadQueue.schedulingCallback = tilesSchedulingCB;
    tiles.parseQueue.schedulingCallback = tilesSchedulingCB;

    tiles.lruCache.maxSize = 1200;
    tiles.lruCache.minSize = 900;
  }
}

function handleCamera() {
  // get the XR camera with a combined frustum for culling
  if (renderer.xr.isPresenting) {
    if (xrSession === null) {
      // We setup XR camera once
      console.log("handleCamera: set XR Camera");
      in_vr = true;
      timeEnteredVR = new Date().getTime();

      if (ONLY_LOAD_TILES_IN_VR) {
        reinstantiateTiles();
      }
      // We setup XR camera once

      const xrCamera = renderer.xr.getCamera(camera);
      console.log("xrCamera: ", xrCamera);

      // remove all cameras so we can use the VR camera instead
      tiles.cameras.forEach((c) => tiles.deleteCamera(c));
      tiles.setCamera(xrCamera);
      console.log("tiles.cameras: ", tiles.cameras);

      const leftCam = xrCamera.cameras[0];
      if (leftCam) {
        leftCam.aname = "left xr camera";
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

let xPos = 0;
let lastTimeMS = 0;
let timeEnteredVR = 0;

function render(timeMS) {
  flyMotion(timeMS);

  grid.visible = params.displayGrid;

  // We check for tiles camera setup (default and XR sessions)
  handleCamera();

  let secondsInVR = (new Date().getTime() - timeEnteredVR) / 1000;
  // console.log("secondsInVR:", secondsInVR);
  if (
    in_vr &&
    STOP_LOADING_AFTER_X_SECONDS > 0 &&
    secondsInVR > STOP_LOADING_AFTER_X_SECONDS
  ) {
    // return;
    // tiles.maxDepth = 20;
  } else {
    handleTasks();
  }

  // We handle pending tasks

  if (!ONLY_LOAD_TILES_IN_VR || in_vr) {
    // update options
    tiles.displayBoxBounds = params.displayBoxBounds;
    tiles.colorMode = parseFloat(params.colorMode);

    camera.updateMatrixWorld();
    if (ENABLE_TILES) {
      if (!tiles) return;

      camera.updateMatrixWorld();

      tiles.update();

      handleControls();

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

function handleControls() {
  const session = renderer.xr.getSession();
  let i = 0;
  let handedness, buttons, axes;

  if (session) {
    for (const source of session.inputSources) {
      if (source && source.handedness) {
        handedness = source.handedness; //left or right controllers
      }
      if (!source.gamepad) continue;
      const controller = renderer.xr.getController(i++);
      // const old = prevGamePads.get(source);
      const data = {
        handedness: handedness,
        buttons: source.gamepad.buttons.map((b) => b.value),
        axes: source.gamepad.axes.slice(0),
      };
      //process data accordingly to create 'events'

      if (data.axes) {
        controlAmplifier = -(data.axes[3] - 1);
        if (controlAmplifier > 1) {
          controlAmplifier *= 5;
        }
      }
      // console.log("amp", controlAmplifier.toFixed(2), " axes:", data.axes);
      // console.log("amp", controlAmplifier.toFixed(2));
    }
  }
}
var controlAmplifier = 1;

var renderLoop = 0;
var boost = 0;
var boostVel = 0.5;

const MASS = 40.0;
var TOTAL = START_Y + 1000;

var startHeight = 0;

var upDownEffect = 0;

function flyMotion(timeMS) {
  // console.log(timeMS);
  const frameMS = timeMS - lastTimeMS;
  lastTimeMS = timeMS;
  // xPos += frameMS * CAM_VELOCITY;

  // update cam

  // camGroup.position.set(START_X + time, START_Y, START_Z);
  //camGroup.position.set(START_X + xPos, START_Y, START_Z);

  function conservationOfEnergy(height) {
    TOTAL += boost * 5; //brings in the joysticks - forward and back.
    //console.log("TOTAL:" + TOTAL)

    var PE = height; // * 0.1;
    var energy = TOTAL - PE;
    if (energy < 0.0001) {
      energy = 0.0001;
    }
    var velocity = Math.sqrt((2 * energy) / MASS);
    //console.log("vel:" + velocity)
    if (velocity < 0) {
      velocity = 0;
    }
    return velocity;
  }

  function getVelocityFromHeight(height) {
    height -= startHeight;

    //height = 100.0 + height;
    let vel = conservationOfEnergy(height);
    return vel;
  }

  function getVelocityFromThumbStick() {
    boostVel += boost / 10;
    return boostVel;
  }

  // var forward = new THREE.Vector3(0, 0, 1);
  var direction = new THREE.Vector3(0, 0, 1);

  camera.getWorldDirection(direction);

  // console.log(
  //   "direction: ",
  //   direction.x.toFixed(3),
  //   direction.y.toFixed(3),
  //   direction.z.toFixed(3)
  // );

  //var direction = camera.getWorldDirection(forward);
  direction.normalize();

  var height = camGroup.position.y;
  // height = 10;
  var vel = getVelocityFromHeight(height);
  //Set a maximum velocity.
  // vel = Math.min(vel, 4);

  vel = vel * controlAmplifier;

  let metersPerSecond = vel;
  let kilometersPerHour = metersPerSecond * 3.6;
  console.log("kph", kilometersPerHour.toFixed(1));

  let metersInThisFrame = (vel * frameMS) / 1000;

  // console.log("vel: ", vel.toFixed(4));

  // var increment = direction.scale(vel);
  var increment = direction.multiplyScalar(metersInThisFrame);

  //DISABLE // Way to freeze the motion!
  // camera.position.addInPlace(increment);

  camGroup.position.add(increment);

  // console.log(
  //   "increment: ",
  //   increment.x.toFixed(3),
  //   increment.y.toFixed(3),
  //   increment.z.toFixed(3),
  //   "camGroup ",
  //   camGroup.position.x.toFixed(3),
  //   camGroup.position.y.toFixed(3),
  //   camGroup.position.z.toFixed(3)
  // );
}

function initSky() {
  // Add Sky
  sky = new Sky();
  sky.scale.setScalar(450000);
  scene.add(sky);

  sun = new THREE.Vector3();

  /// GUI

  const effectController = {
    turbidity: 1,
    rayleigh: 1,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    elevation: 1,
    azimuth: 180,
    exposure: renderer.toneMappingExposure,
  };

  function guiChanged() {
    const uniforms = sky.material.uniforms;
    uniforms["turbidity"].value = effectController.turbidity;
    uniforms["rayleigh"].value = effectController.rayleigh;
    uniforms["mieCoefficient"].value = effectController.mieCoefficient;
    uniforms["mieDirectionalG"].value = effectController.mieDirectionalG;

    const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
    const theta = THREE.MathUtils.degToRad(effectController.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);

    uniforms["sunPosition"].value.copy(sun);

    renderer.toneMappingExposure = effectController.exposure;
    renderer.render(scene, camera);
  }

  // const gui = new GUI();

  // gui.add(effectController, "turbidity", 0.0, 20.0, 0.1).onChange(guiChanged);
  // gui.add(effectController, "rayleigh", 0.0, 4, 0.001).onChange(guiChanged);
  // gui
  //   .add(effectController, "mieCoefficient", 0.0, 0.1, 0.001)
  //   .onChange(guiChanged);
  // gui
  //   .add(effectController, "mieDirectionalG", 0.0, 1, 0.001)
  //   .onChange(guiChanged);
  // gui.add(effectController, "elevation", 0, 90, 0.1).onChange(guiChanged);
  // gui.add(effectController, "azimuth", -180, 180, 0.1).onChange(guiChanged);
  // gui.add(effectController, "exposure", 0, 1, 0.0001).onChange(guiChanged);

  guiChanged();
}
