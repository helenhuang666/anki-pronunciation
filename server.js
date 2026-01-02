// ===== 基础依赖 =====
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

// ===== App 初始化 =====
const app = express();
const PORT = process.env.PORT || 10000;

// ===== 中间件 =====
app.use(cors());

// 接收原始二进制音频（非常重要！）
app.use(express.raw({
  type: ["audio/wav", "application/octet-stream"],
  limit: "10mb"
}));

// ===== 健康检查 =====
app.get("/", (req, res) => {
  res.send("Anki Pronunciation Server is running");
});

// ===== 核心：发音测评接口 =====
app.post("/assess", async (req, res) => {
  try {
    // ===== 1. 参数检查 =====
    const referenceText = req.query.text;
    if (!referenceText) {
      return res.status(400).json({ error: "Missing text" });
    }

    if (!req.body || req.body.length === 0) {
      return res.status(400).json({ error: "Missing audio data" });
    }

    // ===== 2. Azure 环境变量 =====
    const AZURE_KEY = process.env.AZURE_SPEECH_KEY;
    const AZURE_REGION = process.env.AZURE_SPEECH_REGION;

    if (!AZURE_KEY || !AZURE_REGION) {
      return res.status(500).json({ error: "Azure config missing" });
    }

    // ===== 3. Azure 接口地址 =====
    const endpoint =
      `https://${AZURE_REGION}.stt.speech.microsoft.com/` +
      `speech/recognition/conversation/cognitiveservices/v1` +
      `?language=en-US&format=detailed`;

    // ===== 4. Pronunciation Assessment 配置 =====
    const pronunciationConfig = {
      ReferenceText: referenceText,
      GradingSystem: "HundredMark",
      Granularity: "Phoneme",        // 🔴 音素级
      Dimension: "Comprehensive"     // Accuracy / Fluency / Completeness
    };

    const paHeader = Buffer
      .from(JSON.stringify(pronunciationConfig))
      .toString("base64");

    // ===== 5. 向 Azure 发送请求 =====
    const azureRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_KEY,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        "Pronunciation-Assessment": paHeader
      },
      body: req.body
    });

    const rawText = await azureRes.text();

    // 🔴 关键调试日志（你之后可删）
    console.log("====== AZURE RAW RESPONSE ======");
    console.log(rawText);
    console.log("================================");

    // ===== 6. 解析返回 =====
    let json;
    try {
      json = JSON.parse(rawText);
    } catch (e) {
      return res.status(500).json({
        error: "Azure returned non-JSON",
        raw: rawText
      });
    }

    // ===== 7. 返回给前端 =====
    res.json(json);

  } catch (err) {
    console.error("❌ /assess error:", err);
    res.status(500).json({ error: "Assessment failed" });
  }
});

// ===== 启动服务 =====
app.listen(PORT, () => {
  console.log("====================================");
  console.log("Anki Pronunciation Server started");
  console.log(`Listening on port ${PORT}`);
  console.log("AZURE_SPEECH_KEY =", process.env.AZURE_SPEECH_KEY ? "OK" : "MISSING");
  console.log("AZURE_SPEECH_REGION =", process.env.AZURE_SPEECH_REGION);
  console.log("====================================");
});
