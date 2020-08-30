class App {
  constructor() {
    this.remoteStreamArr = []
    this.initInfo();
    this.bindEvent();
  }
  // 发起视频请求
  sendRequest() {
    this.join();
  }

  // 1加入房间
  async join() {
    //      创建连接
    const {
      sdkAppId,
      userSig
    } = genTestUserSig(this.userId)
    this.sdkAppId = sdkAppId
    this.userSig = userSig

    this.client = TRTC.createClient({
      mode: 'rtc',
      sdkAppId: this.sdkAppId,
      userId: this.userId,
      userSig: this.userSig
    })

    //      加入房间

    this.client.join({
      roomId: this.roomId
    }).then(async () => {
      console.log(`@@@加入房间${this.roomId}成功`);

      await this.createLocalStream()
      await this.createRemoteStream()

    }).catch(error => {
      console.error('@@@Join room failed: ' + error);
    });

  }


  // 2发布本地流
  createLocalStream() {
    //      创建本地流
    this.localStream = TRTC.createStream({
      audio: true,
      video: true
    })
    //      初始化
    this.localStream.initialize().catch(error => {
      console.error('@@@failed initialize localStream ' + error);

    }).then(() => {
      console.log('@@@初始化本地流成功');
      this.localStream.play('local_stream');

      //      发布
      this.client.publish(this.localStream).then(() => {
        // 本地流发布成功
        console.log(`@@@本地流发布成功`);
      });
    })
  }

  // 3订阅远端流
  createRemoteStream() {
    //      监听流添加
    this.client.on('stream-added', event => {
      const remoteStream = event.stream;

      //      客户端订阅远端流
      this.client.subscribe(remoteStream, {
        audio: true,
        video: true
      }).catch(e => {
        console.error('failed to subscribe remoteStream', e);
      });
    });

    //      监听远端流已订阅
    this.client.on('stream-subscribed', event => {
      //      播放远端流
      const remoteStream = event.stream;
      const id = remoteStream.getId()

      console.log('远端流已订阅', id);
      this.remoteStreamArr.push(id)

      $('#remoteBox').append($('<div id="remote_stream_' + id + '"></div>'))
      remoteStream.play('remote_stream_' + id)
    })

  }

  unPublish() {
    return new Promise((resolve, reject) => {
      // 取消发布本地流
      this.client.unpublish(this.localStream).then(() => {
        // 取消发布本地流成功
        console.log('取消发布本地流成功');
        resolve();
      }).catch(e => {
        console.log('取消发布本地流失败');
        reject();
      })
    })

  }

  // 离开房间
  async leave() {
    await this.unPublish();
    this.client.leave().then(() => {
      // leaving room success
      console.log('离开房间');
    }).catch(error => {
      console.error('leaving room failed: ' + error);
    });
  }

  // 绑定发起视频通话按钮事件
  bindEvent() {
    const _this = this;
    $('#sendBtn').on('click', function () {
      _this.sendRequest()
    })

    $('#leaveRoom').on('click', function () {
      _this.leave();
    })
  }
  initInfo() {
    let roomId = this.query('roomId');
    let userId = this.query('userId');

    function randomUser() {
      return 'user_' + parseInt(Math.random() * 100000000)
    }

    function randomRoom() {
      return parseInt(Math.random() * 100000)
    }


    if (roomId) {
      $('#roomId').val(roomId);
    } else {
      roomId = randomRoom()
      $('#roomId').val(roomId)
    }
    if (userId) {
      $('#userId').val(userId);
    } else {
      userId = randomUser()
      $('#userId').val(userId)
    }

    this.userId = userId
    this.roomId = roomId
  }
  query(name) {
    const match = window.location.search.match(new RegExp('(\\?|&)' + name + '=([^&]*)(&|$)'));
    return !match ? '' : decodeURIComponent(match[2]);
  }
}

$(function () {
  const app = new App()
})