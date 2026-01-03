import "dotenv/config";
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import sdk from "microsoft-cognitiveservices-speech-sdk";

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

// ===== TTS 接口 (生成音素发音 - 使用 SDK) =====
app.post("/tts", async (req, res) => {
  let synthesizer = null;
  try {
    const { ssml } = req.body;
    if (!ssml) {
      return res.status(400).json({ error: "Missing SSML" });
    }

    const AZURE_KEY = process.env.AZURE_KEY;
    const AZURE_REGION = process.env.AZURE_REGION;

    console.log(`[TTS-DEBUG] Region: ${AZURE_REGION}, Key len: ${AZURE_KEY ? AZURE_KEY.length : 0}`);
    console.log(`[TTS-DEBUG] SSML payload: ${ssml}`);

    if (!AZURE_KEY || !AZURE_REGION) {
      return res.status(500).json({ error: "Azure config missing" });
    }

    const speechConfig = sdk.SpeechConfig.fromSubscription(AZURE_KEY, AZURE_REGION);
    // 强制使用 Jenny，且设置输出格式
    speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural";
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm;

    synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

    // 封装为 Promise 确保能 catch 到异步错误并打印
    const speakSsml = () => {
      return new Promise((resolve, reject) => {
        synthesizer.speakSsmlAsync(
          ssml,
          result => { resolve(result); },
          err => { reject(err); }
        );
      });
    };

    const result = await speakSsml();

    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
      console.log("[TTS-DEBUG] Synthesis Success. Data size:", result.audioData.byteLength);
      const audioBuffer = Buffer.from(result.audioData);
      res.set("Content-Type", "audio/wav");
      res.send(audioBuffer);
    } else {
      let details = result.errorDetails || "No details provided by Azure";
      console.error("[TTS-DEBUG] Synthesis Failed. Reason:", result.reason, "Details:", details);
      res.status(400).json({
        error: "TTS Failed",
        reason: result.reason,
        details: details
      });
    }

  } catch (e) {
    console.error("[TTS-DEBUG] Unexpected Catch:", e);
    res.status(500).json({ error: "Server Internal Error", msg: e.message });
  } finally {
    if (synthesizer) {
      synthesizer.close();
    }
  }
});

// ===== 发音测评接口 =====
app.post("/assess", async (req, res) => {
  let recognizer = null;
  try {
    const text = req.query.text;
    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    const AZURE_KEY = process.env.AZURE_KEY;
    const AZURE_REGION = process.env.AZURE_REGION;

    if (!AZURE_KEY || !AZURE_REGION) {
      return res.status(500).json({ error: "Azure config missing" });
    }

    console.log(`[ASSESS-SDK] Request for '${text}', body size: ${req.body ? req.body.length : 0}`);

    if (!(req.body instanceof Buffer)) {
      return res.status(400).json({ error: "Body must be a buffer" });
    }

    // 1. Setup Audio Stream
    const pushStream = sdk.AudioInputStream.createPushStream();
    pushStream.write(req.body);
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
    // Explicitly set dimension to Comprehensive to get proper scores
    // Note: The JS SDK constructor usually sets this default, but we rely on the config object.

    recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    pronunciationAssessmentConfig.applyTo(recognizer);

    // 3. Recognize
    recognizer.recognizeOnceAsync(
      (result) => {
        // Log basic result info
        // console.log(`[ASSESS-SDK] Reason: ${result.reason}`);

        let jsonStr = result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult);

        if (!jsonStr) {
          // Fallback if no JSON (e.g. Canceled/NoMatch without JSON)
          // We construct a mock response to allow frontend to see the error
          return res.json({
            RecognitionStatus: result.reason === sdk.ResultReason.RecognizedSpeech ? "Success" : result.errorDetails || "NoMatch",
            NBest: []
          });
        }

        try {
          const json = JSON.parse(jsonStr);
          res.json(json);
        } catch (e) {
          console.error("[ASSESS-SDK] JSON Parse Failed", e);
          res.status(500).json({ error: "Invalid JSON from SDK" });
        }

        recognizer.close();
        recognizer = null;
      },
      (err) => {
        console.error("[ASSESS-SDK] Error: " + err);
        res.status(500).json({ error: "SDK Error: " + err });
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
