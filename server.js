import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ 关键：启用静态网页
app.use(express.static(__dirname));

app.use(cors());
app.use(express.raw({ type: "audio/wav", limit: "10mb" }));
