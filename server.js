import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.raw({ type: "audio/wav", limit: "10mb" }));

/* ✅ 关键：暴露静态文件 */
app.use(express.static("./"));

/* ====== 发音测评接口（你原来已有的） ====== */
app.post("/assess", async (req, res) => {
  try {
    // ⚠️ 这里只是示例，你保持你原来能跑通的 Azure 逻辑
    res.json({
      NBest: [
        {
          PronunciationAssessment: {
            AccuracyScore: 85,
            FluencyScore: 80,
            CompletenessScore: 90
          }
        }
      ]
    });
  } catch (e) {
    res.status(500).json({ error: "assessment failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
