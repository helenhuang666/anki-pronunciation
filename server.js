import "dotenv/config";
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import sdk from "microsoft-cognitiveservices-speech-sdk";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = process.env.PORT || 10000;

// ===== 修复 __dirname（ESM 必需）=====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== 中间件 (调整顺序防止冲突) =====
app.use(cors());

// 首先解析 JSON，因为 TTS 需要
app.use(express.json());

// 原有的 express.raw 已被替换为 multer 中间件处理具体的上传接口

app.use(express.static(__dirname));

// ===== 前端页面（关键！）=====
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ===== PWA 文件 =====
app.get("/manifest.json", (req, res) => {
  res.sendFile(path.join(__dirname, "manifest.json"));
});

// ===== TTS 接口 (生成音素发音 - 使用 SDK) =====
app.post("/tts", async (req, res) => {
  let synthesizer = null;
  try {
    const { ssml } = req.body;

    // 强制打印，确保请求到达
    console.log("[TTS-GATE] Request received. Body keys:", Object.keys(req.body || {}));

    if (!ssml) {
      console.error("[TTS-GATE] SSML missing in body");
      return res.status(400).json({ error: "Missing SSML" });
    }

    // 严格修剪 Key 和 Region 的不可见字符（常见问题！）
    const AZURE_KEY = (process.env.AZURE_KEY || "").trim();
    const AZURE_REGION = (process.env.AZURE_REGION || "").trim();

    console.log(`[TTS-DEBUG] Region: ${AZURE_REGION}, Key len: ${AZURE_KEY.length}`);

    if (!AZURE_KEY || !AZURE_REGION) {
      return res.status(500).json({ error: "Azure config missing" });
    }

    const speechConfig = sdk.SpeechConfig.fromSubscription(AZURE_KEY, AZURE_REGION);
    // 使用 Christopher (美式男声)
    speechConfig.speechSynthesisVoiceName = "en-US-ChristopherNeural";
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm;

    synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

    const speakSsml = () => {
      return new Promise((resolve, reject) => {
        synthesizer.speakSsmlAsync(
          ssml,
          result => { resolve(result); },
          err => { reject(err); }
        );
      });
    };

    console.log("[TTS-DEBUG] Starting synthesis...");
    const result = await speakSsml();

    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
      console.log("[TTS-DEBUG] Synthesis Success. Data size:", result.audioData.byteLength);
      const audioBuffer = Buffer.from(result.audioData);
      res.set("Content-Type", "audio/wav");
      res.send(audioBuffer);
    } else {
      let details = result.errorDetails || "No details";
      console.error("[TTS-DEBUG] Synthesis Failed. Reason:", result.reason, "Details:", details);
      res.status(400).json({
        error: "TTS Failed",
        reason: result.reason,
        details: details
      });
    }

  } catch (e) {
    console.error("[TTS-DEBUG] Fatal Catch:", e);
    res.status(500).json({ error: "Server Error", msg: e.message });
  } finally {
    if (synthesizer) synthesizer.close();
  }
});

// ===== 发音测评接口 =====
app.post("/assess", upload.single('audio'), async (req, res) => {
  // 1. 顶级日志：确认请求是否到达
  console.info(`>>> [REQUEST-ENTRY] ${new Date().toISOString()} | IP: ${req.ip} | Word: ${req.body ? req.body.word : 'N/A'}`);
  console.info(`>>> [HEADERS] type: ${req.headers['content-type']}, length: ${req.headers['content-length']}`);

  let recognizer = null;
  try {
    const text = (req.body && req.body.word) || req.query.text;
    if (!text) {
      console.error("[ASSESS-SDK] Text missing in both body and query");
      return res.status(400).json({ success: false, message: "Missing word/text" });
    }


    const audioBuffer = req.file ? req.file.buffer : null;
    if (!audioBuffer) {
      console.error("[ASSESS-SDK] Audio file missing");
      return res.status(400).json({ success: false, message: "Audio file missing" });
    }

    const AZURE_KEY = (process.env.AZURE_KEY || "").trim();
    const AZURE_REGION = (process.env.AZURE_REGION || "").trim();

    // 探测格式
    const isWav = audioBuffer.length > 4 && audioBuffer.toString('ascii', 0, 4) === 'RIFF';
    console.info(`[ASSESS] Input: ${audioBuffer.length} bytes, isWav: ${isWav}, Mime: ${req.file.mimetype}`);

    if (!isWav) {
      console.warn("[ASSESS] Warning: Received non-WAV audio. Azure Node.js SDK prefers PCM/WAV headerless.");
    }

    // 将音频推送到 Azure Stream (强制使用 PCM 格式定义)
    const format = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
    const pushStream = sdk.AudioInputStream.createPushStream(format);

    // 如果包含 WAV 头且后端无法直读，我们剥离头信息；否则全量写入
    if (isWav && audioBuffer.length > 44) {
      pushStream.write(audioBuffer.slice(44));
    } else {
      pushStream.write(audioBuffer);
    }
    pushStream.close();

    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
    const speechConfig = sdk.SpeechConfig.fromSubscription(AZURE_KEY, AZURE_REGION);

    // 2. Configure Assessment
    speechConfig.speechRecognitionLanguage = "en-US";
    speechConfig.outputFormat = sdk.OutputFormat.Detailed; // REQUEST Detailed JSON

    const pronunciationAssessmentConfig = new sdk.PronunciationAssessmentConfig(
      text,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme,
      true // enableMiscue
    );
    // Request IPA instead of default USPhonetic
    pronunciationAssessmentConfig.phoneticAlphabet = "IPA";

    recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    pronunciationAssessmentConfig.applyTo(recognizer);

    // 3. Recognize
    recognizer.recognizeOnceAsync(
      (result) => {
        // Log basic result info
        // console.log(`[ASSESS-SDK] Reason: ${result.reason}`);

        let jsonStr = result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult);

        if (result.reason === sdk.ResultReason.Canceled) {
          const cancellation = sdk.CancellationDetails.fromResult(result);
          console.error(`[ASSESS-SDK] CANCELED: ${cancellation.reason}, ErrorDetails: ${cancellation.errorDetails}`);
          return res.status(500).json({ success: false, message: cancellation.errorDetails || "Recognition canceled" });
        }

        if (!jsonStr) {
          console.warn("[ASSESS-SDK] No JSON string in response. Reason:", result.reason);
          return res.status(400).json({
            success: false,
            message: "No recognition match found. Please try again.",
            status: result.reason
          });
        }

        try {
          const json = JSON.parse(jsonStr);

          // --- 数据适配逻辑 ---
          // 提取 AccuracyScore
          const nBest = json.NBest && json.NBest[0];
          const pronunciationScore = nBest ? nBest.PronunciationAssessment.AccuracyScore : 0;

          // 提取 Phonemes (IPA 格式)
          const words = nBest && nBest.Words;
          const firstWord = words && words[0];
          const phonemes = (firstWord && firstWord.Phonemes) ? firstWord.Phonemes : [];

          // 打印转换后的数据概览
          console.log(`[ASSESS-SUCCESS] Score: ${pronunciationScore}, Phonemes count: ${phonemes.length}`);

          // 返回前端期待的格式
          res.json({
            success: true,
            pronunciation: pronunciationScore,
            phonemes: phonemes.map(p => ({
              Phoneme: p.Phoneme,
              AccuracyScore: p.PronunciationAssessment.AccuracyScore
            }))
          });

        } catch (e) {
          console.error("[ASSESS-SDK] JSON Parse/Adapt Failed", e);
          res.status(500).json({ success: false, message: "Invalid data structure from Azure" });
        }

        recognizer.close();
        recognizer = null;
      },
      (err) => {
        console.error("[ASSESS-SDK] Error: " + err);
        res.status(500).json({ success: false, message: "SDK Internal Error: " + err });
        if (recognizer) {
          recognizer.close();
          recognizer = null;
        }
      }
    );

  } catch (e) {
    console.error("ASSESS ERROR:", e);
    if (recognizer) {
      recognizer.close();
    }
    res.status(500).json({ error: "Assessment failed" });
  }
});

// ===== 启动 =====
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
  const key = process.env.AZURE_KEY;
  const region = process.env.AZURE_REGION;
  console.log("Azure Region:", region || "(missing)");
  console.log("Azure Key:", key ? "(set)" : "(missing)");

  if (!key || !region) {
    console.warn("WARNING: Azure Speech credentials are NOT set. /assess and /tts will fail.");
  }
});
