class App {
  constructor() {
    this.isJoined = false;
    this.isPublished = false;
    this.localStream = null;

    this.remoteStreamArr = [];
    this.initInfo();
    this.bindEvent();
  }

  async api_createRoom(userId, roomId) {
    const res = await $.get("http://localhost:3000/api/getRoom", { roomId });
    if (res.length === 0) {
      await $.get("http://localhost:3000/api/createRoom", { userId, roomId });
    }
  }

  // toggle room
  toggleRoom() {
    $(".wrap").hide();
    $(".room").show();
    $(".room").css("display", "flex");
  }

  // 1加入房间
  async join() {
    if (this.isJoined) {
      console.log("已经加入房间，不能重复加入房间");
      return;
    }

    //      创建连接
    const { sdkAppId, userSig } = genTestUserSig(this.userId);
    this.sdkAppId = sdkAppId;
    this.userSig = userSig;

    this.client = TRTC.createClient({
      mode: "rtc",
      sdkAppId: this.sdkAppId,
      userId: this.userId,
      userSig: this.userSig,
    });

    // 绑定事件
    this.handleEvents();

    try {
      await this.client.join({ roomId: this.roomId });
      console.log("加入房间成功");
      this.isJoined = true;

      this.localStream = TRTC.createStream({
        video: true,
        audio: true,
      });
      // this.localStream.setVideoProfile("1080p");

      try {
        await this.localStream.initialize();
        console.log("initialize local stream success");

        // 初始化视频成功，请求接口创建房间
        this.api_createRoom(this.userId, this.roomId);
        this.toggleRoom();

        this.localStream.on("player-state-changed", (event) => {
          console.log(`local stream ${event.type} player is ${event.state}`);
        });
        this.localStream.play("local_stream");

        await this.publish();
      } catch (e) {
        console.error("failed to initialize local stream - " + e);
      }
    } catch (e) {
      console.error("join room failed!", e);
    }
  }

  // 离开房间
  async leave() {
    if (!this.isJoined) {
      console.warn("leave() - please join() firstly");
      return;
    }
    // ensure the local stream is unpublished before leaving.
    await this.unpublish();

    // leave the room
    await this.client.leave();

    this.localStream.stop();
    this.localStream.close();
    this.localStream = null;
    this.isJoined = false;
  }

  async publish() {
    if (!this.isJoined) {
      console.warn("publish() - please join() firstly");
      return;
    }
    if (this.isPublished) {
      console.warn("duplicate RtcClient.publish() observed");
      return;
    }
    try {
      await this.client.publish(this.localStream);
    } catch (e) {
      console.error("failed to publish local stream " + e);
      this.isPublished = false;
    }

    this.isPublished = true;
  }

  async unpublish() {
    if (!this.isJoined) {
      console.warn("unpublish() - please join() firstly");
      return;
    }
    if (!this.isPublished) {
      console.warn("RtcClient.unpublish() called but not published yet");
      return;
    }

    await this.client.unpublish(this.localStream);
    this.isPublished = false;
  }

  addView(id) {
    $("#remoteBox").append($('<div id="remote_stream_' + id + '"></div>'));
  }

  removeView(id) {
    if ($("#" + id)[0]) {
      $("#" + id).remove();
    }
  }

  recordTime() {}

  // 监听事件
  handleEvents() {
    this.client.on("error", (err) => {
      console.error(err);
      alert(err);
    });
    this.client.on("client-banned", (err) => {
      console.error("client has been banned for " + err);
      alert(err);
    });
    // fired when a remote peer is joining the room
    this.client.on("peer-join", (evt) => {
      const userId = evt.userId;
      console.log("peer-join " + userId);
    });
    // fired when a remote peer is leaving the room
    this.client.on("peer-leave", (evt) => {
      const userId = evt.userId;
      console.log("peer-leave " + userId);
    });

    // fired when a remote stream is added
    this.client.on("stream-added", (evt) => {
      const remoteStream = evt.stream;
      const id = remoteStream.getId();
      const userId = remoteStream.getUserId();
      console.log(
        `remote stream added: [${userId}] ID: ${id} type: ${remoteStream.getType()}`
      );
      console.log("subscribe to this remote stream");
      this.client.subscribe(remoteStream);
    });
    // fired when a remote stream has been subscribed
    this.client.on("stream-subscribed", (evt) => {
      const remoteStream = evt.stream;
      const id = remoteStream.getId();
      this.remoteStreamArr.push(remoteStream);
      this.addView(id);
      remoteStream.play("remote_stream_" + id + "");
      // use customized renderer
      // if (remoteStream.hasAudio()) {
      //   updateAudio(id, remoteStream.getAudioTrack());
      // }
      // if (remoteStream.hasVideo()) {
      //   updateVideo(id, remoteStream.getVideoTrack());
      // }
      console.log("stream-subscribed ID: ", id);
    });
    // fired when the remote stream is removed, e.g. the remote user called Client.unpublish()
    this.client.on("stream-removed", (evt) => {
      const remoteStream = evt.stream;
      const id = remoteStream.getId();
      // remoteStream.stop();
      this.remoteStreamArr = this.remoteStreamArr.filter((stream) => {
        return stream.getId() !== id;
      });
      this.removeView("remote_stream_" + id);
      console.log(`stream-removed ID: ${id}  type: ${remoteStream.getType()}`);
    });

    this.client.on("stream-updated", (evt) => {
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
      // updateAudio(id, remoteStream.getAudioTrack());
      // updateVideo(id, remoteStream.getVideoTrack());
    });

    this.client.on("mute-audio", (evt) => {
      console.log(evt.userId + " mute audio");
    });
    this.client.on("unmute-audio", (evt) => {
      console.log(evt.userId + " unmute audio");
    });
    this.client.on("mute-video", (evt) => {
      console.log(evt.userId + " mute video");
    });
    this.client.on("unmute-video", (evt) => {
      console.log(evt.userId + " unmute video");
    });

    this.client.on("connection-state-changed", (evt) => {
      console.log(
        `RtcClient state changed to ${evt.state} from ${evt.prevState}`
      );
    });
  }

  // 绑定发起视频通话按钮事件
  bindEvent() {
    const _this = this;
    $("#join").on("click", function () {
      _this.join();
    });
    $("#publish").on("click", function () {
      _this.publish();
    });
    $("#unpublish").on("click", function () {
      _this.unpublish();
    });
    $("#leave").on("click", function () {
      _this.leave();
    });
  }

  initInfo() {
    let roomId = this.query("roomId");
    let userId = this.query("userId");

    function randomUser() {
      return "user_" + parseInt(Math.random() * 100000000);
    }

    function randomRoom() {
      return parseInt(Math.random() * 100000);
    }

    if (roomId) {
      $("#roomId").val(roomId);
    } else {
      roomId = randomRoom();
      $("#roomId").val(roomId);
    }
    if (userId) {
      $("#userId").val(userId);
    } else {
      userId = randomUser();
      $("#userId").val(userId);
    }

    this.userId = userId;
    this.roomId = roomId;
  }

  query(name) {
    const match = window.location.search.match(
      new RegExp("(\\?|&)" + name + "=([^&]*)(&|$)")
    );
    return !match ? "" : decodeURIComponent(match[2]);
  }
}

$(function () {
  const app = new App();
});
