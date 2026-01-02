import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== 路径处理（ESM 必须） ===== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===== Azure 配置（从环境变量读取） ===== */
const AZURE_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_REGION = process.env.AZURE_SPEECH_REGION;

if (!AZURE_KEY || !AZURE_REGION) {
  console.error("❌ 缺少 AZURE_SPEECH_KEY 或 AZURE_SPEECH_REGION");
}

/* ===== 中间件 ===== */
app.use(cors());

// 允许直接 POST WAV 音频
app.use(
  express.raw({
    type: "audio/wav",
    limit: "10mb"
  })
);

// ✅ 关键：托管前端网页 / manifest / icon
app.use(express.static(__dirname));

/* ===== 发音测评接口 ===== */
app.post("/assess", async (req, res) => {
  try {
    const text = req.query.text;
    const audioBuffer = req.body;

    if (!text) {
      return res.status(400).json({ error: "缺少 text 参数" });
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ error: "音频为空" });
    }

    const endpoint = `https://${AZURE_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US`;

    const pronunciationConfig = {
      ReferenceText: text,
      GradingSystem: "HundredMark",
      Granularity: "Phoneme",       // ✅ 音素级
      Dimension: "Comprehensive",   // Accuracy / Fluency / Completeness
      EnableMiscue: true
    };

    const azureRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_KEY,
        "Content-Type": "audio/wav",
        "Accept": "application/json",
        "Pronunciation-Assessment": Buffer.from(
          JSON.stringify(pronunciationConfig)
        ).toString("base64")
      },
      body: audioBuffer
    });

    const result = await azureRes.json();

    if (!azureRes.ok) {
      console.error("Azure Error:", result);
      return res.status(500).json({
        error: "Azure 返回错误",
        detail: result
      });
    }

    // ✅ 原样返回 Azure 结果（前端用真实数据）
    res.json(result);

  } catch (err) {
    console.error("❌ /assess error:", err);
    res.status(500).json({ error: "服务器异常" });
  }
});

/* ===== 启动服务 ===== */
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
