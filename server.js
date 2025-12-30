import express from "express";
import cors from "cors";
import sdk from "microsoft-cognitiveservices-speech-sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// ⚠️ 接收二进制音频（非常关键）
app.use(express.raw({ type: "*/*", limit: "10mb" }));

// 提供 index.html
app.use(express.static(__dirname));

app.post("/assess", async (req, res) => {
  console.log("=== /assess called ===");
  console.log("Content-Type:", req.headers["content-type"]);
  console.log("Body length:", req.body?.length);
  
  try {
    const referenceText = req.query.text;
    if (!referenceText) {
      return res.status(400).json({ error: "No reference text" });
    }

    // 保存音频
    const audioPath = path.join(__dirname, "input.wav");
    fs.writeFileSync(audioPath, req.body);

    // Azure config
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.AZURE_KEY,
      process.env.AZURE_REGION
    );

    speechConfig.speechRecognitionLanguage = "en-US";

    // Pronunciation config
    const pronConfig = new sdk.PronunciationAssessmentConfig(
      referenceText,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme,
      true
    );

    const audioConfig = sdk.AudioConfig.fromWavFileInput(
      fs.readFileSync(audioPath)
    );

    const recognizer = new sdk.SpeechRecognizer(
      speechConfig,
      audioConfig
    );

    pronConfig.applyTo(recognizer);

    recognizer.recognizeOnceAsync(
      result => {
        recognizer.close();

        if (result.reason !== sdk.ResultReason.RecognizedSpeech) {
          return res.status(500).json({ error: "Recognition failed" });
        }

        res.json(JSON.parse(result.json));
      },
      err => {
        recognizer.close();
        res.status(500).json({ error: err.toString() });
      }
    );
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
