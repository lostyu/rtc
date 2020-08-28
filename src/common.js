import RtcClient from "./rtc-client";
import ShareClient from "./share-client";
import GenerateTestUserSig from "./lib/GenerateTestUserSig";

let isCamOn = true;
let isMicOn = true;
let isScreenOn = false;
let isJoined = true;
let rtc = null;
let share = null;
let shareUserId = "";
let cameraId = "";
let micId = "";

function query(name) {
  const match = window.location.search.match(
    new RegExp("(\\?|&)" + name + "=([^&]*)(&|$)")
  );
  return !match ? "" : decodeURIComponent(match[2]);
}

function init() {
  // populate userId/roomId
  $("#userId").val("user_" + parseInt(Math.random() * 100000000));
  $("#roomId").val(parseInt(Math.random() * 100000));
  const roomId = query("roomId");
  const userId = query("userId");
  if (roomId) {
    $("#roomId").val(roomId);
  }
  if (userId) {
    $("#userId").val(userId);
  }

  $("#main-video-btns").hide();
  $(".mask").hide();
  // // 绑定进入房间按钮事件
  setBtnClickFuc();
}

function login(share, callback) {
  let userId = $("#userId").val();
  if (share) {
    userId = "share_" + userId;
  }
  const config = GenerateTestUserSig(userId);
  const sdkAppId = config.sdkAppId;
  const userSig = config.userSig;
  const roomId = $("#roomId").val();

  callback({
    sdkAppId,
    userId,
    userSig,
    roomId,
  });
}
function join() {
  rtc.join();
  $("#login-root").hide();
  $("#room-root").show();
  //   $("#header-roomId").html("房间号: " + $("#roomId").val());
  //   $("#member-me")
  //     .find(".member-id")
  //     .html($("#userId").val() + "(我)");
}

function setBtnClickFuc() {
  $("#login-btn").click(() => {
    login(false, (options) => {
      rtc = new RtcClient(options);
      join();
    });

    login(true, (options) => {
      shareUserId = options.userId;
      share = new ShareClient(options);
    });
  });
}

function getCameraId() {
  console.log("selected cameraId: " + cameraId);
  return cameraId;
}

export { init, getCameraId };
