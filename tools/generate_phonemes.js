import sdk from "microsoft-cognitiveservices-speech-sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AZURE_KEY = (process.env.AZURE_KEY || "").trim();
const AZURE_REGION = (process.env.AZURE_REGION || "").trim();
const OUTPUT_DIR = "/Users/easttai/echo_memory/Chatgptpwa/audio/phoneme";

if (!AZURE_KEY || !AZURE_REGION) {
    console.error("Error: AZURE_KEY or AZURE_REGION not found in environment.");
    process.exit(1);
}

const phonemes = [
    // 元音
    { key: "i", ipa: "i", context: "phoneme" },
    { key: "ɪ", ipa: "ɪ", context: "phoneme" },
    { key: "e", ipa: "e", context: "phoneme" },
    { key: "æ", ipa: "æ", context: "phoneme" },
    { key: "ɑ", ipa: "ɑ", context: "phoneme" },
    { key: "ɔ", ipa: "ɔ", context: "phoneme" },
    { key: "ʊ", ipa: "ʊ", context: "phoneme" },
    { key: "u", ipa: "u", context: "phoneme" },
    { key: "ʌ", ipa: "ʌ", context: "phoneme" },
    { key: "ə", ipa: "ə", context: "phoneme" },
    { key: "ɜ", ipa: "ɜ", context: "phoneme" },
    { key: "aɪ", ipa: "aɪ", context: "phoneme" },
    { key: "eɪ", ipa: "eɪ", context: "phoneme" },
    { key: "ɔɪ", ipa: "ɔɪ", context: "phoneme" },
    { key: "aʊ", ipa: "aʊ", context: "phoneme" },
    { key: "oʊ", ipa: "oʊ", context: "phoneme" },
    { key: "ɪə", ipa: "ɪə", context: "phoneme" },
    { key: "eə", ipa: "eə", context: "phoneme" },
    { key: "ʊə", ipa: "ʊə", context: "phoneme" },

    // 辅音
    { key: "p", ipa: "p", context: "phoneme" },
    { key: "b", ipa: "b", context: "phoneme" },
    { key: "t", ipa: "t", context: "phoneme" },
    { key: "d", ipa: "d", context: "phoneme" },
    { key: "k", ipa: "k", context: "phoneme" },
    { key: "g", ipa: "g", context: "phoneme" },
    { key: "f", ipa: "f", context: "phoneme" },
    { key: "v", ipa: "v", context: "phoneme" },
    { key: "θ", ipa: "θ", context: "phoneme" },
    { key: "ð", ipa: "ð", context: "phoneme" },
    { key: "s", ipa: "s", context: "phoneme" },
    { key: "z", ipa: "z", context: "phoneme" },
    { key: "ʃ", ipa: "ʃ", context: "phoneme" },
    { key: "ʒ", ipa: "ʒ", context: "phoneme" },
    { key: "h", ipa: "h", context: "phoneme" },
    { key: "m", ipa: "m", context: "phoneme" },
    { key: "n", ipa: "n", context: "phoneme" },
    { key: "ŋ", ipa: "ŋ", context: "phoneme" },
    { key: "w", ipa: "w", context: "phoneme" },
    { key: "j", ipa: "j", context: "phoneme" },
    { key: "tʃ", ipa: "tʃ", context: "phoneme" },
    { key: "dʒ", ipa: "dʒ", context: "phoneme" },
    { key: "tr", ipa: "tr", context: "phoneme" },
    { key: "dr", ipa: "dr", context: "phoneme" },
    { key: "ts", ipa: "ts", context: "phoneme" },
    { key: "dz", ipa: "dz", context: "phoneme" },

    // 同位音特制
    { key: "l_light", ipa: "l", context: "light" },
    { key: "l_dark", ipa: "l", context: "ball" },
    { key: "r", ipa: "r", context: "red" },
    { key: "r_final", ipa: "r", context: "car" }
];

async function generatePhoneme(item) {
    const speechConfig = sdk.SpeechConfig.fromSubscription(AZURE_KEY, AZURE_REGION);
    speechConfig.speechSynthesisVoiceName = "en-US-ChristopherNeural";
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

    // 针对辅音使用包装词以获得更自然的共鸣，并调整语速和音调
    // 按照用户要求，音量提升至 +500% (注：SSML 协议本身限制 max 为 +100% 或具体 dB 值，
    // 我们将尝试使用 +10dB 叠加 volume="x-loud" 来实现极致响度)
    const isConsonant = !"aeiouɪæɑɔʊʌəɜ".includes(item.ipa);
    const rate = "0%"; // 恢复自然语速
    const pitch = "0%"; // 恢复自然音调

    // 为了让同位音产生本质区别，我们甚至可以使用带上下文的发音，然后截取（或者利用 Azure 对包装词的感知）
    const ssml = `
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
  <voice name="en-US-ChristopherNeural">
    <prosody volume="+100.00%" rate="${rate}" pitch="${pitch}">
       <phoneme alphabet="ipa" ph="${item.ipa}"> ${item.context} </phoneme>
    </prosody>
  </voice>
</speak>`;

    return new Promise((resolve, reject) => {
        synthesizer.speakSsmlAsync(
            ssml,
            result => {
                if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                    const filePath = path.join(OUTPUT_DIR, `${item.key}.mp3`);
                    fs.writeFileSync(filePath, Buffer.from(result.audioData));
                    console.log(`Successfully generated: ${item.key}.mp3`);
                    synthesizer.close();
                    resolve();
                } else {
                    const errDetails = result.errorDetails || "Unknown error";
                    synthesizer.close();
                    reject(`Failed for ${item.key}: ${errDetails}`);
                }
            },
            err => {
                synthesizer.close();
                reject(err);
            }
        );
    });
}

async function run() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    for (const item of phonemes) {
        try {
            await generatePhoneme(item);
            // 稍微间隔一下，避免请求过快
            await new Promise(r => setTimeout(r, 200));
        } catch (err) {
            console.error(err);
        }
    }
}

run();
