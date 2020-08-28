import TRTC from "trtc-js-sdk";

export default function () {
  let cameraId = "";
  let micId = "";
  let speakerId = "";

  // check if browser is compatible with TRTC
  TRTC.checkSystemRequirements().then((result) => {
    if (!result) {
      alert("您的浏览器不兼容此应用！\n建议下载最新版Chrome浏览器");
      window.location.href = "http://www.google.cn/chrome/";
    }
  });

  // setup logging stuffs
  //   TRTC.Logger.setLogLevel(TRTC.Logger.LogLevel.DEBUG);
  //   TRTC.Logger.enableUploadLog();

  TRTC.getDevices()
    .then((devices) => {
      devices.forEach((item) => {
        console.log(
          "device: " + item.kind + " " + item.label + " " + item.deviceId
        );
      });
    })
    .catch((error) => console.error("getDevices error observed " + error));

  // populate camera options
  TRTC.getCameras().then((devices) => {
    devices.forEach((device) => {
      if (!cameraId) {
        cameraId = device.deviceId;
      }
      let div = $("<div></div>");
      div.attr("id", device.deviceId);
      div.html(device.label);
      div.appendTo("#camera-option");
    });
  });

  // populate microphone options
  TRTC.getMicrophones().then((devices) => {
    devices.forEach((device) => {
      if (!micId) {
        micId = device.deviceId;
      }
      let div = $("<div></div>");
      div.attr("id", device.deviceId);
      div.html(device.label);
      div.appendTo("#mic-option");
      console.log("=======================");
      console.log("id", device.deviceId);
      console.log("label", device.label);
      console.log("=======================");
    });
  });

  // 扬声器
  TRTC.getSpeakers().then((devices) => {
    devices.forEach((device) => {
      if (!speakerId) {
        speakerId = device.deviceId;
      }
      //   let div = $("<div></div>");
      //   div.attr("id", device.deviceId);
      //   div.html(device.label);
      //   div.appendTo("#mic-option");
      //   console.log("=======================");
      //   console.log("id", device.deviceId);
      //   console.log("label", device.label);
      //   console.log("=======================");
    });
  });

  return {
    cameraId,
    micId,
    speakerId,
  };
}
