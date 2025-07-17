import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import path from "path";

import {connectDB} from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import gameRoutes from "./routes/game.route.js"
import { deleteInactiveGames } from "./lib/utils.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT;
const allowedOrigins = ["https://localhost:5173", "https://tycoontactics.github.io"];

app.use(express.json());    
app.use(cookieParser());
app.use(cors({ origin: allowedOrigins, credentials: true }));


app.use("/api/auth", authRoutes);
app.use("/api/game", gameRoutes);

// if (process.env.NODE_ENV==="production"){
//     app.use(express.static(path.join(__dirname, "../client/dist")));
//     app.get("*", (req, res) => {
//         res.sendFile(path.join(__dirname, "../client", "dist", "index.html"));
//     });
// }
server.listen(PORT, () => {
    console.log("server running on", PORT);
    connectDB();
    setInterval(deleteInactiveGames, 23*60*60*1000);
});