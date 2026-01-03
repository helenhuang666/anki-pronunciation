
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 10000;

// ===== 修复 __dirname（ESM 必需）=====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== 中间件 =====
app.use(cors());
app.use(express.static(__dirname));
app.use(express.raw({
  type: "*/*", // allow any type just to be safe and capture the body
  limit: "10mb"
}));
app.use(express.json());

// ===== 前端页面（关键！）=====
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ===== PWA 文件 =====
app.get("/manifest.json", (req, res) => {
  res.sendFile(path.join(__dirname, "manifest.json"));
});

// ===== TTS 接口 (生成音素发音) =====
app.post("/tts", async (req, res) => {
  try {
    const { ssml } = req.body;
    if (!ssml) {
      return res.status(400).json({ error: "Missing SSML" });
    }

    const AZURE_KEY = process.env.AZURE_SPEECH_KEY;
    const AZURE_REGION = process.env.AZURE_SPEECH_REGION;

    if (!AZURE_KEY || !AZURE_REGION) {
      return res.status(500).json({ error: "Azure config missing" });
    }

    const endpoint = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const azureRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "riff-16khz-16bit-mono-pcm",
        "User-Agent": "AnkiPronunciation"
      },
      body: ssml
    });

    if (!azureRes.ok) {
      const errText = await azureRes.text();
      console.error("TTS Azure Error:", errText);
      return res.status(azureRes.status).send(errText);
    }

    const arrayBuffer = await azureRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.set("Content-Type", "audio/wav");
    res.send(buffer);

  } catch (e) {
    console.error("TTS ERROR:", e);
    res.status(500).json({ error: "TTS failed" });
  }
});

// ===== 发音测评接口 =====
app.post("/assess", async (req, res) => {
  try {
    const text = req.query.text;
    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    const AZURE_KEY = process.env.AZURE_SPEECH_KEY;
    const AZURE_REGION = process.env.AZURE_SPEECH_REGION;

    if (!AZURE_KEY || !AZURE_REGION) {
      return res.status(500).json({ error: "Azure config missing" });
    }

    const endpoint =
      `https://${AZURE_REGION}.stt.speech.microsoft.com/` +
      `speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`;

    const paConfig = {
      ReferenceText: text,
      GradingSystem: "HundredMark",
      Granularity: "Phoneme",
      Dimension: "Comprehensive"
    };

    const paHeader = Buffer
      .from(JSON.stringify(paConfig))
      .toString("base64");

    console.log(`[ASSESS] Received request for '${text}', body size: ${req.body ? req.body.length : 0}`);

    if (req.body instanceof Buffer === false) {
      console.log("[ASSESS] Warning: req.body is not a Buffer");
    }

    const azureRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_KEY,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        "Pronunciation-Assessment": paHeader,
        "Accept": "application/json;text/xml"
      },
      body: req.body
    });

    const textRes = await azureRes.text();
    console.log(`[ASSESS] Azure status: ${azureRes.status}`);
    // console.log(`[ASSESS] Azure response: ${textRes}`); // Uncomment for full debug

    if (!azureRes.ok) {
      return res.status(azureRes.status).json({ error: "Azure Error", details: textRes });
    }

    let json;
    try {
      json = JSON.parse(textRes);
    } catch (e) {
      console.error("[ASSESS] Failed to parse Azure JSON response", textRes);
      return res.status(500).json({ error: "Invalid Azure Response", raw: textRes });
    }

    res.json(json);

  } catch (e) {
    console.error("ASSESS ERROR:", e);
    res.status(500).json({ error: "Assessment failed" });
  }
});

// ===== 启动 =====
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
