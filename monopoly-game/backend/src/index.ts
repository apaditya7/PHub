import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { config } from "./config";
import { buildRoutes } from "./server/routes";
import { registerSocket } from "./server/socket";
import { RoomManager } from "./game/rooms";
import { ClientToServerEvents, ServerToClientEvents } from "./types";

const app = express();
app.use(cors(config.cors));
app.use(express.json());
const rooms = new RoomManager();
app.use("/api", buildRoutes(rooms));

const server = http.createServer(app);
const io: Server<ClientToServerEvents, ServerToClientEvents> = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"]
});

console.log("Registering socket handlers...");
registerSocket(io, rooms);

io.on("connection", (socket) => {
  console.log("New socket connection:", socket.id);
});

server.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
  console.log(`Socket.IO ready on ws://localhost:${config.port}`);
});
