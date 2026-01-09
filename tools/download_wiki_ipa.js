import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { execSync } from 'child_process';

const OUTPUT_DIR = '/Users/easttai/echo_memory/Chatgptpwa/audio/phoneme';

// Wikimedia Commons IPA 音频映射 (文件名 -> 本地 Key)
// 注意：Wikimedia 的音频多为 .ogg，我们需要下载后转码为 .mp3
const IPA_MAPPING = {
    // 元音
    "Close_front_unrounded_vowel.ogg": "i",
    "Near-close_near-front_unrounded_vowel.ogg": "ɪ",
    "Close-mid_front_unrounded_vowel.ogg": "e",
    "Open-front_unrounded_vowel.ogg": "æ",
    "Open_back_unrounded_vowel.ogg": "ɑ",
    "Open-mid_back_rounded_vowel.ogg": "ɔ",
    "Near-close_near-back_rounded_vowel.ogg": "ʊ",
    "Close_back_rounded_vowel.ogg": "u",
    "Open-mid_back_unrounded_vowel.ogg": "ʌ",
    "Mid-central_vowel.ogg": "ə",
    "Open-mid_central_unrounded_vowel.ogg": "ɜ",

    // 辅音
    "Voiceless_bilabial_plosive.ogg": "p",
    "Voiced_bilabial_plosive.ogg": "b",
    "Voiceless_alveolar_plosive.ogg": "t",
    "Voiced_alveolar_plosive.ogg": "d",
    "Voiceless_velar_plosive.ogg": "k",
    "Voiced_velar_plosive.ogg": "g",
    "Voiceless_labiodental_fricative.ogg": "f",
    "Voiced_labiodental_fricative.ogg": "v",
    "Voiceless_dental_fricative.ogg": "θ",
    "Voiced_dental_fricative.ogg": "ð",
    "Voiceless_alveolar_fricative.ogg": "s",
    "Voiced_alveolar_fricative.ogg": "z",
    "Voiceless_palato-alveolar_sibilant.ogg": "ʃ",
    "Voiced_palato-alveolar_sibilant.ogg": "ʒ",
    "Voiceless_glottal_fricative.ogg": "h",
    "Bilabial_nasal.ogg": "m",
    "Alveolar_nasal.ogg": "n",
    "Velar_nasal.ogg": "ŋ",
    "Voiced_labial-velar_approximant.ogg": "w",
    "Palatal_approximant.ogg": "j",

    // 同位音区分 (Wiki 对 Dark L 等有专门条目)
    "Alveolar_lateral_approximant.ogg": "l_light",
    "Velarized_alveolar_lateral_approximant.ogg": "l_dark",
    "Alveolar_approximant.ogg": "r",
    "Voiced_alveolar_tap.ogg": "r_final" // tap 更接近词尾弱化的 R 情况
};

// Wikimedia URL 构造工具
function getWikiUrl(filename) {
    // 注意：Wikimedia 的 URL 需要根据文件名的 MD5 前两位构造路径
    // 简化起见，我们直接使用 commons.wikimedia.org 的 API 获取直链或尝试直接下载
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${filename}`;
}

async function downloadAndConvert() {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    for (const [wikiFile, localKey] of Object.entries(IPA_MAPPING)) {
        const url = getWikiUrl(wikiFile);
        const tempOgg = path.join(OUTPUT_DIR, `temp_${localKey}.ogg`);
        const finalMp3 = path.join(OUTPUT_DIR, `${localKey}.mp3`);

        console.log(`Downloading ${wikiFile} for ${localKey}...`);
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
            const buffer = await response.arrayBuffer();
            fs.writeFileSync(tempOgg, Buffer.from(buffer));

            // 使用 ffmpeg 转码为 mp3 (假设系统已安装 ffmpeg)
            // 并顺便增加 10dB 的音量增益
            console.log(`Converting and boosting volume for ${localKey}...`);
            execSync(`ffmpeg -y -i "${tempOgg}" -filter:a "volume=10dB" "${finalMp3}"`, { stdio: 'ignore' });

            fs.unlinkSync(tempOgg);
            console.log(`Processed ${localKey}.mp3 successfully.`);
            
            // 增加延时以避开 429 限流
            await new Promise(r => setTimeout(r, 2000));
        } catch (err) {
            console.error(`Error processing ${localKey}:`, err.message);
        }
    }
}

downloadAndConvert();
