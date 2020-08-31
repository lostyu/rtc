/* global $ TRTC */
/* eslint-disable require-jsdoc */

// preset before starting RTC
class Presetting {
  init() {
    // populate userId/roomId/privMap
    $("#userId").val("user_" + parseInt(Math.random() * 100000000));
    $("#roomId").val("6969");
    const roomId = this.query("roomId");
    const userId = this.query("userId");
    if (roomId) {
      $("#roomId").val(roomId);
    }
    if (userId) {
      $("#userId").val(userId);
    }
  }

  query(name) {
    const match = window.location.search.match(
      new RegExp("(\\?|&)" + name + "=([^&]*)(&|$)")
    );
    return !match ? "" : decodeURIComponent(match[2]);
  }

  login(share, callback) {
    let userId = $("#userId").val();
    if (share) {
      userId = "share_" + parseInt(Math.random() * 100000000);
    }
    const { sdkAppId, userSig } = genTestUserSig(userId);
    const roomId = $("#roomId").val();
    callback({
      sdkAppId,
      userId,
      userSig,
      roomId,
    });
    // $.ajax({
    //   type: "POST",
    //   url: fetchUrl,
    //   dataType: "json",
    //   data: JSON.stringify({
    //     pwd: "12345678",
    //     appid: parseInt(sdkAppId),
    //     roomnum: parseInt(roomId),
    //     privMap: 255,
    //     identifier: userId,
    //     accounttype: accountType,
    //   }),
    //   success: function (json) {
    //     if (json && json.errorCode === 0) {
    //       const userSig = json.data.userSig;
    //       const privateMapKey = json.data.privMapEncrypt;
    //       callback({
    //         sdkAppId,
    //         userId,
    //         userSig,
    //         roomId,
    //         privateMapKey,
    //       });
    //     } else {
    //       console.error("got invalid json:" + json);
    //     }
    //   },
    //   error: function (err) {
    //     console.error("failed to retreive userSig");
    //   },
    // });
  }
}

// check if browser is compatible with TRTC
TRTC.checkSystemRequirements().then((result) => {
  if (!result) {
    alert(
      "Your browser is not compatible with TRTC! Recommend to use Chrome M72+"
    );
  }
});

// setup logging stuffs
TRTC.Logger.setLogLevel(TRTC.Logger.LogLevel.DEBUG);
TRTC.Logger.enableUploadLog();

TRTC.getDevices()
  .then((devices) => {
    devices.forEach((item) => {
      console.log(
        "device: " + item.kind + " " + item.label + " " + item.deviceId
      );
    });
  })
  .catch((error) => console.error("getDevices error observed " + error));

class RtcClient {
  constructor(options) {
    this.sdkAppId_ = options.sdkAppId;
    this.userId_ = options.userId;
    this.userSig_ = options.userSig;
    this.roomId_ = options.roomId;
    this.privateMapKey_ = options.privateMapKey;

    this.isJoined_ = false;
    this.isPublished_ = false;
    this.localStream_ = null;
    this.remoteStreams_ = [];
    this.checkSpeakingInterval_ = -1;
  }

  updateParams(options) {
    if (
      typeof options.userId !== "undefined" &&
      typeof options.userSig !== "undefined"
    ) {
      this.userId_ = options.userId;
      this.userSig_ = options.userSig;
    }
    if (typeof options.roomId !== "undefined") {
      this.roomId_ = options.roomId;
    }
  }

  async join() {
    if (this.isJoined_) {
      console.warn("duplicate RtcClient.join() observed");
      return;
    }
    // create a client for RtcClient
    this.client_ = TRTC.createClient({
      mode: "rtc",
      sdkAppId: this.sdkAppId_,
      userId: this.userId_,
      userSig: this.userSig_,
    });

    this.handleEvents();

    try {
      // join the room
      await this.client_.join({ roomId: this.roomId_ });
      console.log("join room success");
      this.isJoined_ = true;

      // 鑷畾涔夎棰戦噰闆�
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { width: 640, height: 480, frameRate: 15 },
        });
      } catch (e) {
        console.error("failed to getUserMedia");
        return;
      }

      const audioSource = stream.getAudioTracks()[0];
      const videoSource = stream.getVideoTracks()[0];

      // create a local stream with audio/video from microphone/camera
      this.localStream_ = TRTC.createStream({
        audioSource,
        videoSource,
      });
      this.localStream_.setVideoProfile("480p");
      try {
        // initialize the local stream and the stream will be populated with audio/video
        await this.localStream_.initialize();
        console.log("initialize local stream success");

        this.localStream_.on("player-state-changed", (event) => {
          console.log(`local stream ${event.type} player is ${event.state}`);
        });

        // play the localStream within 'local-stream' div
        this.localStream_.play("local_stream");

        // publish the local stream
        await this.publish();
      } catch (e) {
        console.error("failed to initialize local stream - " + e);
      }
    } catch (e) {
      console.error("join room failed! " + e);
    }
  }

  async leave() {
    if (!this.isJoined_) {
      console.warn("leave() - please join() firstly");
      return;
    }
    // ensure the local stream is unpublished before leaving.
    await this.unpublish();

    // leave the room
    await this.client_.leave();

    this.localStream_.stop();
    this.localStream_.close();
    this.localStream_ = null;
    this.isJoined_ = false;
  }

  async publish() {
    if (!this.isJoined_) {
      console.warn("publish() - please join() firstly");
      return;
    }
    if (this.isPublished_) {
      console.warn("duplicate RtcClient.publish() observed");
      return;
    }
    try {
      await this.client_.publish(this.localStream_);
    } catch (e) {
      console.error("failed to publish local stream " + e);
      this.isPublished_ = false;
    }

    this.isPublished_ = true;
  }

  async unpublish() {
    if (!this.isJoined_) {
      console.warn("unpublish() - please join() firstly");
      return;
    }
    if (!this.isPublished_) {
      console.warn("RtcClient.unpublish() called but not published yet");
      return;
    }

    await this.client_.unpublish(this.localStream_);
    this.isPublished_ = false;
  }

  handleEvents() {
    this.client_.on("error", (err) => {
      console.error(err);
      alert(err);
    });
    this.client_.on("client-banned", (err) => {
      console.error("client has been banned for " + err);
      alert(err);
    });
    // fired when a remote peer is joining the room
    this.client_.on("peer-join", (evt) => {
      const userId = evt.userId;
      console.log("peer-join " + userId);
    });
    // fired when a remote peer is leaving the room
    this.client_.on("peer-leave", (evt) => {
      const userId = evt.userId;
      console.log("peer-leave " + userId);
    });

    // fired when a remote stream is added
    this.client_.on("stream-added", (evt) => {
      const remoteStream = evt.stream;
      const id = remoteStream.getId();
      const userId = remoteStream.getUserId();
      console.log(
        `remote stream added: [${userId}] ID: ${id} type: ${remoteStream.getType()}`
      );
      console.log("subscribe to this remote stream");
      this.client_.subscribe(remoteStream);
    });
    // fired when a remote stream has been subscribed
    this.client_.on("stream-subscribed", (evt) => {
      const remoteStream = evt.stream;
      const id = remoteStream.getId();
      this.remoteStreams_.push(remoteStream);
      addView(id);
      // remoteStream.play(id);
      // use customized renderer
      if (remoteStream.hasAudio()) {
        updateAudio(id, remoteStream.getAudioTrack());
      }
      if (remoteStream.hasVideo()) {
        updateVideo(id, remoteStream.getVideoTrack());
      }
      console.log("stream-subscribed ID: ", id);
    });
    // fired when the remote stream is removed, e.g. the remote user called Client.unpublish()
    this.client_.on("stream-removed", (evt) => {
      const remoteStream = evt.stream;
      const id = remoteStream.getId();
      // remoteStream.stop();
      this.remoteStreams_ = this.remoteStreams_.filter((stream) => {
        return stream.getId() !== id;
      });
      removeView(id);
      console.log(`stream-removed ID: ${id}  type: ${remoteStream.getType()}`);
    });

    this.client_.on("stream-updated", (evt) => {
      const remoteStream = evt.stream;
      const id = remoteStream.getId();
      console.log(
        "type: " +
          remoteStream.getType() +
          " stream-updated hasAudio: " +
          remoteStream.hasAudio() +
          " hasVideo: " +
          remoteStream.hasVideo()
      );

      // use customized renderer
      updateAudio(id, remoteStream.getAudioTrack());
      updateVideo(id, remoteStream.getVideoTrack());
    });

    this.client_.on("mute-audio", (evt) => {
      console.log(evt.userId + " mute audio");
    });
    this.client_.on("unmute-audio", (evt) => {
      console.log(evt.userId + " unmute audio");
    });
    this.client_.on("mute-video", (evt) => {
      console.log(evt.userId + " mute video");
    });
    this.client_.on("unmute-video", (evt) => {
      console.log(evt.userId + " unmute video");
    });

    this.client_.on("connection-state-changed", (evt) => {
      console.log(
        `RtcClient state changed to ${evt.state} from ${evt.prevState}`
      );
    });
  }

  startCheckSpeaking() {
    this.checkSpeakingInterval_ = setInterval(() => {
      if (this.localStream_) {
        const level = this.localStream_.getAudioLevel();
        if (level >= 0.1) {
          console.warn(
            `user ${this.localStream_.getUserId()} is speaking w/ volume: ${level}`
          );
        }
      }
      this.remoteStreams_.forEach((stream) => {
        const level = stream.getAudioLevel();
        if (level >= 0.1) {
          console.warn(
            `user ${stream.getUserId()} is speaking w/ volume: ${level}`
          );
        }
      });
    }, 200);
  }

  stopCheckSpeaking() {
    if (this.checkSpeakingInterval_ !== -1) {
      clearInterval(this.checkSpeakingInterval_);
      this.checkSpeakingInterval_ = -1;
    }
  }

  triggerReconnect(code) {
    this.client_.triggerReconnectForTest(code);
  }
}

function addView(id) {
  if (!$("#" + id)[0]) {
    $("<div/>", {
      id,
      class: "video-view",
    }).appendTo("#video_grid");
  }

  const div = document.createElement("div");
  div.setAttribute("id", "player_" + id);
  div.setAttribute(
    "style",
    "width: 100%; height: 100%; position: relative; background-color: black; overflow: hidden;"
  );
  document.getElementById(id).appendChild(div);
}

function removeView(id) {
  if ($("#" + id)[0]) {
    $("#" + id).remove();
  }
}

function updateVideo(id, track) {
  const videoId = "video_" + id;
  const playerId = "player_" + id;
  let element = document.getElementById(videoId);
  if (!track) {
    if (element) document.getElementById(playerId).removeChild(element);
    return;
  }
  if (!element) {
    element = document.createElement("video");
    element.setAttribute("id", videoId);
    element.setAttribute(
      "style",
      `width: 100%; height: 100%; position: absolute; transform: rotateY(0); object-fit: cover`
    );
    element.setAttribute("autoplay", "autoplay");
    element.setAttribute("playsinline", "playsinline");
    document.getElementById(playerId).appendChild(element);
  }
  const mediaStream = new MediaStream();
  mediaStream.addTrack(track);
  element.srcObject = null;
  element.srcObject = mediaStream;
}

function updateAudio(id, track) {
  const audioId = "audio_" + id;
  const playerId = "player_" + id;
  let element = document.getElementById(audioId);
  if (!track) {
    if (element) document.getElementById(playerId).removeChild(element);
    return;
  }
  if (!element) {
    element = document.createElement("audio");
    element.setAttribute("id", audioId);
    element.setAttribute("autoplay", "autoplay");
    element.setAttribute("playsinline", "playsinline");
    document.getElementById(playerId).appendChild(element);
  }
  const mediaStream = new MediaStream();
  mediaStream.addTrack(track);
  element.srcObject = null;
  element.srcObject = mediaStream;
}

let rtc = null;
const presetting = new Presetting();

// initialize sdkAppId/userId/userSig stuffs
(function login() {
  presetting.init();
  presetting.login(false, (options) => {
    rtc = new RtcClient(options);
  });
})();

// setup button event handlers

$("#userId").on("change", function (e) {
  e.preventDefault();
  console.log("userId changed");
  presetting.login(false, (options) => {
    rtc.updateParams(options);
  });
});
$("#roomId").on("change", function (e) {
  e.preventDefault();
  console.log("roomId changed " + e.target.value);
  rtc.updateParams({ roomId: e.target.value });
});

$("#join").on("click", function (e) {
  e.preventDefault();
  console.log("join");
  rtc.join();
  rtc.startCheckSpeaking();
});

$("#publish").on("click", function (e) {
  e.preventDefault();
  console.log("publish");
  rtc.publish();
});

$("#unpublish").on("click", function (e) {
  e.preventDefault();
  console.log("unpublish");
  rtc.unpublish();
});

$("#leave").on("click", function (e) {
  e.preventDefault();
  console.log("leave");
  rtc.leave();
  rtc.stopCheckSpeaking();
});

$("#settings").on("click", function (e) {
  e.preventDefault();
  $("#settings").toggleClass("btn-raised");
  $("#setting-collapse").collapse();
});

// populate camera options
TRTC.getCameras().then((devices) => {
  devices.forEach((device) => {
    $("<option/>", {
      value: device.deviceId,
      text: device.label,
    }).appendTo("#cameraId");
  });
});

// populate microphone options
TRTC.getMicrophones().then((devices) => {
  devices.forEach((device) => {
    $("<option/>", {
      value: device.deviceId,
      text: device.label,
    }).appendTo("#microphoneId");
  });
});

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
