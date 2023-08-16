import { GLTFLoader } from "./GLTFLoader.js";
const video = document.getElementById("video");

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("/js/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/js/models"),
]).then(startWebcam);

function startWebcam() {
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: false,
    })
    .then((stream) => {
      video.srcObject = stream;
    })
    .catch((error) => {
      console.error(error);
    });
}

// Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.z = 5;

let mesh;
let model;

const loader = new GLTFLoader();
loader.load("../models/scene.gltf", (gltf) => {
  model = gltf.scene;
  model.scale.set(3, 3, 3); // Adjust the scale as necessary
  scene.add(model);
});

video.addEventListener("play", () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);
  faceapi.matchDimensions(canvas, { height: video.height, width: video.width });

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    const resizedDetections = faceapi.resizeResults(detections, {
      height: video.height,
      width: video.width,
    });

    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, resizedDetections); //frame which is around the face
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections); //landmarks

    if (detections && detections.length > 0) {
      const landmarks = detections[0].landmarks;
      const positions = landmarks.positions;

      const noseTip = positions[34];
      const leftEyeRightEnd = positions[40];
      const rightEyeLeftEnd = positions[43];

      const minFaceWidth = 100; // Assuming a face at a farther distance might occupy 100 pixels width
      const maxFaceWidth = 300; // Assuming a close-up face might occupy 300 pixels width
      const currentFaceWidth = detections[0].alignedRect.box.width;

      const leftEyebrowInner = positions[22];
      const rightEyebrowInner = positions[21];

      // Use the average of the inner eyebrows for a more central position on the forehead
      const hatPositionX = (leftEyebrowInner._x + rightEyebrowInner._x) / 2;
      const hatPositionY =
        (leftEyebrowInner._y + rightEyebrowInner._y) / 2 - 10; // Adjust the '-10' as necessary

      // console.log(currentFaceWidth);
      const normalizedWidth =
        (currentFaceWidth - minFaceWidth) / (maxFaceWidth - minFaceWidth);

      const minZ = 0;
      const maxZ = 20;
      const depthZ = (1 - normalizedWidth) * (maxZ - minZ) + minZ;

      const leftEyeToNose = Math.sqrt(
        Math.pow(leftEyeRightEnd._x - noseTip._x, 2) +
          Math.pow(leftEyeRightEnd._y - noseTip._y, 2)
      );
      const rightEyeToNose = Math.sqrt(
        Math.pow(rightEyeLeftEnd._x - noseTip._x, 2) +
          Math.pow(rightEyeLeftEnd._y - noseTip._y, 2)
      );

      const relativeRotation =
        (leftEyeToNose - rightEyeToNose) / (leftEyeToNose + rightEyeToNose);

      // Convert 2D coordinates to 3D space
      const vector = new THREE.Vector3(
        (noseTip._x / window.innerWidth) * 2 - 1,
        -(noseTip._y / window.innerHeight) * 2 + 1,
        0.5
      );

      //(x, y, z) x and y is between range -1 to 1 and calculation for this
      // is different from each other because origin for 2D screen space is
      // at top-left, because of that y values should be inverted

      vector.unproject(camera); //for camera to use in the projection
      //Projects this vector from the camera's normalized device coordinate (NDC) space into world space.

      const dir = vector.sub(camera.position).normalize();
      const distance = -camera.position.z / dir.z;
      const pos = camera.position.clone().add(dir.multiplyScalar(distance));

      // if (!model) {
      //   return; // If the model hasn't been loaded yet, do nothing
      // }
      // model.position.set(pos.x + 3, pos.y, 4 - depthZ);
      // model.rotation.y = relativeRotation * Math.PI;
      // Add or update 3D object

      if (!model) {
        return;
      }
      const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
      scene.add(ambientLight);

      model.position.set(pos.x + 5, pos.y, 6 - depthZ);
      model.rotation.y = relativeRotation * Math.PI;

      // if (!mesh) {
      //   const geometry = new THREE.BoxGeometry(2, 1, 1);
      //   const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      //   mesh = new THREE.Mesh(geometry, material);
      //   scene.add(mesh);
      // }
      // mesh.position.set(pos.x + 5, pos.y, 6 - depthZ);
      // mesh.rotation.y = relativeRotation * Math.PI; // Adjust the scaling factor as needed
    }

    renderer.render(scene, camera);
  }, 100);
});
