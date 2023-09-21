import express from "express";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { createServer } from "http";
import Chatbot from "./chatEngine.js";

dotenv.config();

// Express
const app = express();

app.use(express.static("dist"));

// Socket.io
const server = createServer(app);
const io = new Server(server, {
	cors: {
		origin: "*",
	},
});
// Chatbot
const chatbot = new Chatbot();

io.on("connection", (socket) => {
	console.log(`CONNECTED ${socket.id}`);

	socket.on("disconnect", (reason) => {
		global.localStorage.clear();
		console.log(`DISCONNECTED ${socket.id}: ${reason}`);
	});

	// Initialize the chatbot
	socket.on("init", (settings) => {
		settings = JSON.parse(JSON.stringify(settings));
		try {
			chatbot.initialize(settings);
			socket.emit("responseInit", true);
			console.log(`INITIALIZED ${socket.id}`);
		} catch (err) {
			console.log(err);
			socket.emit("responseInit", false);
			console.log(`INIT FAILED ${socket.id}`);
		}
	});

	socket.on("message", (data) => {
		data = JSON.parse(JSON.stringify(data));
		console.log(`QUESTION (${socket.id}): ${data.question}`);
		async function chat() {
			const response = await chatbot.chat(data.question);
			const speechData = await chatbot.textToSpeech(response);
			console.log(`RESPONSE (${socket.id}): ${response}`);
			console.log(`AUDIO (${socket.id}): ${speechData[0]}`); // speechData[0] is the audio file path
			socket.emit("responseMessage", speechData);
		}
		chat();
	});
});

io.on("disconnect", (socket) => {
	console.log(`DISCONNECTED ${socket.id}`);
	chatbot.close();
});

const port = process.env.PORT || 5000;

server.listen(port, () => {
	console.log("server started at port " + port);
});
