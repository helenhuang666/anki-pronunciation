import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.raw({ type: "audio/wav", limit: "10mb" }));

/**
 * Azure Pronunciation Assessment
 */
app.post("/assess", async (req, res) => {
  try {
    const text = req.query.text;
    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    const speechKey = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION;

    const endpoint = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`;

    const pronConfig = {
      ReferenceText: text,
      GradingSystem: "HundredMark",
      Granularity: "Phoneme",        // ⭐ 关键：音素级
      EnableMiscue: true
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": speechKey,
        "Content-Type": "audio/wav",
        "Pronunciation-Assessment": Buffer.from(
          JSON.stringify(pronConfig)
        ).toString("base64")
      },
      body: req.body
    });

    const data = await response.json();

    if (!data.NBest || !data.NBest.length) {
      return res.status(200).json({ error: "No speech detected" });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Assessment failed" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
