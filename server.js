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
app.use(express.raw({ type: "*/*", limit: "10mb" }));
app.use(express.static(__dirname));

app.post("/assess", async (req, res) => {
  try {
    const referenceText = req.query.text;
    if (!referenceText) {
      return res.status(400).json({ error: "No reference text" });
    }

    const audioPath = path.join(__dirname, "input.wav");
    fs.writeFileSync(audioPath, req.body);

    const speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.AZURE_KEY,
      process.env.AZURE_REGION
    );
    speechConfig.speechRecognitionLanguage = "en-US";

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

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
