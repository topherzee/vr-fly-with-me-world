import { renderer, xrSession, camera, tiles } from "./vr-test.js";

export function handleCamera() {
  // get the XR camera with a combined frustum for culling
  if (renderer.xr.isPresenting) {
    if (xrSession === null) {
      // We setup XR camera once

      const xrCamera = renderer.xr.getCamera(camera);
      console.log("xrCamera: ", xrCamera);

      //   debugger;

      // remove all cameras so we can use the VR camera instead
      tiles.cameras.forEach((c) => tiles.deleteCamera(c));
      tiles.setCamera(xrCamera);
      console.log("tiles.cameras 2: ", tiles.cameras);

      const leftCam = xrCamera.cameras[0];
      if (leftCam) {
        leftCam.aname = "left xr camera";
        tiles.setResolution(xrCamera, leftCam.viewport.z, leftCam.viewport.w);
      }

      xrSession = renderer.xr.getSession();
    }
  } else {
    // Reset default camera (exiting WebXR session)
    if (xrSession !== null) {
      tiles.cameras.forEach((c) => tiles.deleteCamera(c));

      tiles.setCamera(camera);
      tiles.setResolutionFromRenderer(camera, renderer);

      camera.position.set(0, 1, 0);

      xrSession = null;
    }
  }
}
