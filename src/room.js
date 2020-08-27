import "./assets/css/room.less";
import Client from "./client";

const userId = "tony";
const roomId = 500;

const ct = new Client(userId, roomId);

ct.init();

ct.join();
