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

let model;
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

const loader = new GLTFLoader();
loader.load("../models/scene.gltf", (gltf) => {
  model = gltf.scene;
  model.scale.set(15, 15, 15); // Adjust the scale as necessary
  scene.add(model);
});

let previousChinTipX = null;

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
    //faceapi.draw.drawDetections(canvas, resizedDetections); //frame which is around the face
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections); //landmarks

    if (detections && detections.length > 0) {
      console.log("######################");

      console.log("NEW DETECTION");
      const landmarks = detections[0].landmarks;
      const positions = landmarks.positions;

      const noseTip = positions[34];
      const leftEyeRightEnd = positions[40];
      const rightEyeLeftEnd = positions[43];

      const leftCheek = positions[1];
      const rightCheek = positions[15];

      // UPDATE AUGUST 21 //
      const faceCenterX =
        (noseTip._x +
          leftEyeRightEnd._x +
          rightEyeLeftEnd._x +
          leftCheek._x +
          rightCheek._x) /
        5;
      const faceCenterY =
        (noseTip._y +
          leftEyeRightEnd._y +
          rightEyeLeftEnd._y +
          leftCheek._y +
          rightCheek._y) /
        5;
      const chinTip = positions[9];
      previousChinTipX = chinTip._x;

      const currentFaceWidth = detections[0].alignedRect.box.width;
      console.log("Face width", currentFaceWidth);

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

      const noseStart = positions[28];
      console.log("Nose Start", noseStart._y);

      const vector = new THREE.Vector3(
        (faceCenterX / window.innerWidth) * 2 - 1,
        -(faceCenterY / window.innerHeight) * 2 + 1,
        0.5
      );

      vector.unproject(camera);

      if (!model) {
        return;
      }
      const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
      scene.add(ambientLight);
      const maxRotation = 0.5;
      model.rotation.y = Math.min(
        Math.max(relativeRotation * Math.PI, -maxRotation),
        maxRotation
      );
      const y = -0.45 * noseStart._y + 160;
      const roll_angle = 0.35 * y;

      model.position.set(
        0.3 * chinTip._x - 110.5,
        -0.45 * noseStart._y + 0.3213706 * currentFaceWidth + 95,
        0.8427412 * currentFaceWidth - 320.61
      );
      model.scale.set(55, 55, 55);
      model.rotation.x = roll_angle * (Math.PI / 180);
    }

    renderer.render(scene, camera);
  }, 100);
});

// Datas

// X data
//post.x     :          -13                 -8                 0                     9                  12
// Chintip x : 147.74669310711624, 247.09348037975846, 337.8814877712409, 469.4418827744637,554.0936163712155
// Face width: 114.93282858469778

// pos.x     :     -10        -6,7        0           6           10
// Chintip x : 113.2355, 212.962217, 351.167434, 472.538116, 548.345521
// Face width: 143.1208

//pos.x      :     -6           0           6
// Chintip x : 168.412624, 360.637007, 528.340631
// Face width: 216.307

//pos.x      :     -5           0          5
// Chintip x : 195.93598, 359.3411429, 521.32612
// Face width: 248.13337

// Z position DATA
// pos.z: -250
// facewidth = 80.333588975393

// pos.z: -200
// facewidth = 119.9270099401474

// pos.z: -150
// facewidth = 170.72206109315405

// pos.z: -100
// facewidth = 202.7367770677079

// pos.z: -70
// facewidth = 266.0020854960942

// Y DATA
// y = 35;
// facewidth = 237.8443972885609
// nose start = 201.59135519589983

// y = 30;
// facewidth = 193.10808105468752
// nose start = 296.16902957406757

// y = 12;
// facewidth = 123.27753503322603
// nose start = 283.5192069577627
