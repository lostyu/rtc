async function checkSystemRequirements() {
  const result = await TRTC.checkSystemRequirements();
  if (!result) {
    alert(
      "Your browser is not compatible with TRTC! Recommend to use Chrome M72+"
    );
  }
}

async function getDevices() {
  const devices = await TRTC.getDevices();
  devices.forEach((item) => {
    console.log(
      "device: " + item.kind + " " + item.label + " " + item.deviceId
    );
  });
}

async function getCameras() {
  // populate camera options
  const devices = await TRTC.getCameras();
  devices.forEach((device) => {
    $("<option/>", {
      value: device.deviceId,
      text: device.label,
    }).appendTo("#cameraId");
  });
}

async function getMicrophones() {
  // populate microphone options
  const devices = await TRTC.getMicrophones();
  devices.forEach((device) => {
    $("<option/>", {
      value: device.deviceId,
      text: device.label,
    }).appendTo("#microphoneId");
  });
}

function getCameraId() {
  const selector = document.getElementById("cameraId");
  const cameraId = selector[selector.selectedIndex].value;
  console.log("selected cameraId: " + cameraId);
  return cameraId;
}

function getMicrophoneId() {
  const selector = document.getElementById("microphoneId");
  const microphoneId = selector[selector.selectedIndex].value;
  console.log("selected microphoneId: " + microphoneId);
  return microphoneId;
}

(async () => {
  await checkSystemRequirements();
  await getDevices();
  await getCameras();
  await getMicrophones();
})();
