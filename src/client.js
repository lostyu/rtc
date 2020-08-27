import TRTC from "trtc-js-sdk";
import GenerateTestUserSig from "./lib/GenerateTestUserSig";

class Client {
  constructor(userId, roomId) {
    this.userId = userId;
    this.roomId = roomId;

    const { sdkAppId, userSig } = GenerateTestUserSig(userId);

    this.userSig = userSig;
    this.sdkAppId = sdkAppId;

    // 创建本地音视频流
    this.localStream = null;
  }

  // 初始化client
  init() {
    this.client = TRTC.createClient({
      mode: "rtc",
      sdkAppId: this.sdkAppId,
      userSig: this.userSig,
      userId: this.userId,
    });
  }

  // 加入房间
  join() {
    this.client
      .join({ roomId: this.roomId })
      .then(() => {
        console.log("进房成功");

        this.createLocalStream();
        this.initLocalStream();
        // this.publishLocalStream();
      })
      .catch((error) => {
        console.error(error);
        console.log("进房失败");
      });
  }

  // 创建本地音视频流
  createLocalStream() {
    this.localStream = TRTC.createStream({
      userId: this.userId,
      audio: true,
      video: true,
    });
  }

  // 初始化本地音视频流
  initLocalStream() {
    this.localStream
      .initialize()
      .then(() => {
        console.log("初始化本地流成功");
        this.localStream.play("local_stream", {
          objectFit: "contain",
          muted: true,
        });
      })
      .catch((error) => {
        console.error("初始化本地流失败 " + error);
      });
  }

  // 发布本地音视频流
  publishLocalStream() {
    this.client
      .publish(this.localStream)
      .then(() => {
        console.log("本地流发布成功");
      })
      .catch((error) => {
        console.error("本地流发布失败 " + error);
      });
  }
}

export default Client;
