import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

/* ========= 基础设置 ========= */
const app = express();
app.use(cors());
app.use(express.raw({ type: "*/*", limit: "10mb" }));

/* ========= 解决 __dirname（ESM 必需） ========= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ========= 托管静态网页（index.html） ========= */
app.use(express.static(__dirname));

/* ========= Azure 配置（只写在这里！） ========= */
const SPEECH_KEY = process.env.AZURE_KEY;
const REGION = process.env.AZURE_REGION;

/* ========= 发音测评接口 ========= */
app.post("/assess", async (req, res) => {
  try {
    const text = req.query.text;

    const url =
      `https://${REGION}.stt.speech.microsoft.com/` +
      `speech/recognition/conversation/cognitiveservices/v1` +
      `?language=en-US`;

    const pronConfig = {
      ReferenceText: text,
      GradingSystem: "HundredMark",
      Granularity: "Phoneme",
      EnableMiscue: true
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": SPEECH_KEY,
        "Content-Type": "audio/mp4",
        "Pronunciation-Assessment":
          Buffer.from(JSON.stringify(pronConfig)).toString("base64")
      },
      body: req.body
    });

    const data = await response.json();
    res.json(data);
  } catch (e) {
    console.error("Azure error:", e);
    res.status(500).json({ error: "Azure assessment failed" });
  }
});

/* ========= 启动服务 ========= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
