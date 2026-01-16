<!DOCTYPE html>
<html lang="zh-CN">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Pronunciation Assessment</title>
  <style>
    /* ===== Global & Layout ===== */
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      height: 100dvh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
      user-select: none;
    }

    /* iOS: 字体+5%, Padding-30% */
    .ios-mode .bar-letter {
      font-size: clamp(14px, 3vw, 20px) !important;
    }

    .ios-mode .bar-ipa {
      font-size: clamp(13px, 2.3vw, 16px) !important;
    }

    .ios-mode .bar-group {
      padding-top: 11px !important;
    }

    /* PC: 宽度-30% */
    .pc-mode .bar-group {
      min-width: 18px !important;
      max-width: 37px !important;
      width: clamp(18px, 4vw, 37px) !important;
    }

    .container {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      min-height: 400px;
      /* 确保 iframe 中有最小高度 */
      overflow-y: auto;
      /* 允许滚动 */
    }

    /* ... omitted styles ... */

    /* ===== Buttons ===== */
    .playback-btn {
      margin-top: 10px;
      padding: 8px 16px;
      background-color: #3A66B8;
      /* 统一主体蓝色 */
      color: white;
      border: none;
      border-radius: 20px;
      font-size: 14px;
      cursor: pointer;
      opacity: 0.9;
      transition: opacity 0.2s;
    }

    .playback-btn:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }

    .playback-btn:active {
      opacity: 0.7;
    }

    /* ===== Target Word & IPA ===== */
    #target-word {
      font-size: 32px;
      font-weight: 600;
      color: #3A66B8;
      /* 主体深蓝色 */
      margin-bottom: 4px;
      text-align: center;
      margin-top: 20px;
    }

    #target-ipa {
      font-size: 18px;
      color: #888;
      font-family: "Lucida Sans Unicode", "Arial Unicode MS", sans-serif;
      margin-bottom: 20px;
      min-height: 24px;
    }

    /* ===== Total Score & Stars ===== */
    .score-header {
      text-align: center;
      margin-bottom: auto;
      transition: opacity 0.3s;
    }

    .total-score {
      font-size: 51px;
      /* 64px * 0.8 */
      font-weight: 500;
      color: #3A66B8;
      /* 新锐蓝色 */
      line-height: 1;
    }

    .score-unit {
      font-size: 19px;
      /* 24px * 0.8 */
      margin-left: 4px;
    }

    .stars {
      font-size: 22px;
      /* 28px * 0.8 */
      color: #3A66B8;
      margin-top: 12px;
      margin-bottom: 4px;
      letter-spacing: 4px;
    }

    .stars .gray {
      color: #e0e0e0;
    }

    /* ===== Phoneme Bars ===== */
    .bars-container {
      display: flex;
      justify-content: center;
      gap: 5px;
      /* 间隔缩小 30%+ (原 8px -> 5px) */
      margin-bottom: 20px;
      flex-wrap: nowrap;
      /* 强制单行显示 */
      width: 100%;
      overflow-x: auto;
      /* 允许横向滚动 */
    }

    .bar-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 26px;
      /* 加大 5% (约 25px -> 26px) */
      max-width: 53px;
      /* 加大 5% (约 50px -> 53px) */
      width: clamp(26px, 5.3vw, 53px);
      /* 自适应宽度 */
      flex-shrink: 1;
      /* 允许缩小 */
      background-color: #e1f5fe;
      border-top-left-radius: 18px;
      border-top-right-radius: 18px;
      border-bottom-left-radius: 4px;
      border-bottom-right-radius: 4px;
      padding-top: 16px;
      position: relative;
      cursor: pointer;
      transition: transform 0.1s;
    }

    .bar-group:active {
      transform: scale(0.95);
    }

    .bar-letter {
      font-size: clamp(13px, 2.7vw, 19px);
      /* 加大 5% (约 12px-18px -> 13px-19px) */
      color: #3A66B8;
      margin-bottom: 4px;
      font-weight: 500;
      word-break: break-all;
      /* 允许字母换行 */
    }

    .bar-ipa {
      font-size: clamp(12px, 2.1vw, 15px);
      /* 加大 5% (约 11px-14px -> 12px-15px) */
      color: #555;
      margin-bottom: 10px;
      font-family: "Lucida Sans Unicode", "Arial Unicode MS", sans-serif;
    }

    .bar-score {
      width: 100%;
      text-align: center;
      color: white;
      padding: 6px 0;
      font-size: 12px;
      font-weight: 600;
      border-radius: 4px;
      margin-top: auto;
      /* Push to bottom */
    }

    /* Colors based on score (Semantics kept red/yellow/green for clarity) */
    .bg-good {
      background-color: #81c784;
    }

    /* Green */
    .bg-fair {
      background-color: #ffb74d;
    }

    /* Orange */
    .bg-poor {
      background-color: #e57373;
    }

    /* Red */

    /* ===== Bottom Controls ===== */
    .controls {
      padding: 0 20px 40px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      background: white;
      padding-bottom: max(50px, env(safe-area-inset-bottom));
      flex-shrink: 0;
      transform: translateY(0%);
      /* 下移 10% (从 -10% 回复) */
    }

    .btn-row {
      display: flex;
      align-items: center;
      gap: 30px;
      /* 增大按钮间距 */
      margin-bottom: 20px;
    }

    #tip-box {
      width: 90%;
      background: #f1f8ff;
      padding: 8px;
      /* 内边距缩小 50% (原 16px) */
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.8;
      color: #01579b;
      margin: 10px auto;
      /* 边距缩小 50% (原 20px) */
      border: 1px solid #3A66B8;
      text-align: center;
      display: none;
      box-shadow: 0 4px 12px rgba(58, 102, 184, 0.1);
    }



    .mic-button {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background-color: #3A66B8;
      /* 统一主体深蓝色 */
      border: none;
      display: flex;
      justify-content: center;
      align-items: center;
      box-shadow: 0 4px 10px rgba(58, 102, 184, 0.4);
      cursor: pointer;
      transition: all 0.2s;
      -webkit-tap-highlight-color: transparent;
    }

    .mic-button svg {
      width: 36px;
      height: 36px;
      fill: white;
    }

    .mic-button.recording {
      background-color: #ff5252;
      /* Red when recording */
      box-shadow: 0 0 0 6px rgba(255, 82, 82, 0.3);
      animation: pulse 1.5s infinite;
    }

    .status-text {
      margin-top: 12px;
      color: #333;
      font-size: 15px;
      font-weight: 500;
      min-height: 20px;
    }

    @keyframes pulse {
      0% {
        transform: scale(1);
      }

      50% {
        transform: scale(1.05);
      }

      100% {
        transform: scale(1);
      }
    }
  </style>
</head>

<body>
  <!-- 核心展示容器 -->

  <div class="container">


    <!-- Header Word & IPA -->
    <div id="target-word">Apple</div>
    <div id="target-ipa"></div>

    <!-- Score Header -->
    <div class="score-header" id="score-header" style="opacity: 0;">
      <div class="total-score" id="main-score">0<span class="score-unit">分</span></div>
      <div class="stars" id="stars">★★★★★</div>
    </div>

    <div id="tip-box"></div>

    <!-- Bars Area -->
    <div class="bars-container" id="bars-container">
      <div style="color:#666; font-size: 16px; margin: 20px; text-align: center; line-height: 1.6;">
        请点击下方麦克风开始录音
      </div>
    </div>
  </div>

  <!-- Bottom Controls -->
  <div class="controls" id="controls-section">
    <div class="btn-row" id="recording-controls">
      <!-- 标准发音按钮 (左) -->
      <button id="stdWordBtn" class="playback-btn" style="background:#3A66B8;">标准发音</button>

      <!-- 核心录音按钮 (中) -->
      <button id="recordBtn" class="mic-button">
        <svg viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path
            d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      </button>

      <!-- 回放发音按钮 (右) -->
      <button id="playbackBtn" class="playback-btn" disabled>我的发音</button>
    </div>
    <div class="status-text" id="status">点击录音</div>
  </div>

  <script>
    // ===== 顶级调试工具 =====
    function logToScreen(msg, type = '') {
      // 日志功能已禁用
    }

    // 初始化自检
    logToScreen("🚀 调试终端激活...");
    logToScreen("📍 当前源: " + window.location.origin);
    logToScreen("📜 参数: " + location.search.substring(0, 100));

    // 握手信号：告诉父窗口，我准备好了！
    function signalReady() {
      logToScreen("📡 发送 IFRAME_READY 握手...");
      window.parent.postMessage({ type: 'IFRAME_READY' }, '*');
    }

    // 延迟 300ms 确保脚本解析完
    signalReady();

    function logDebug(msg) { console.log(msg); }

    let PhonemeTips = {};
    // 兼容性加载
    fetch("./phoneme_tips.js").then(r => r.text()).then(txt => {
      // 简单解析 exports
      const match = txt.match(/PhonemeTips\s*=\s*({[\s\S]*});/);
      if (match) PhonemeTips = eval('(' + match[1] + ')');
      logToScreen("✅ 音标提示库已加载");
    }).catch(e => logToScreen("❌ 提示库加载失败", "err"));

    const params = new URLSearchParams(window.location.search);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAnkiPC = /QtWebEngine/i.test(navigator.userAgent);
    const isExternalControl = params.get('ext_record') === '1';

    // 🔥 外部录音模式：隐藏所有录音控件
    if (isExternalControl) {
      const recordingControls = document.getElementById('recording-controls');
      const statusEl = document.getElementById('status');
      const controlsSection = document.getElementById('controls-section');

      if (recordingControls) recordingControls.style.display = 'none';
      if (statusEl) statusEl.style.display = 'none';
      if (controlsSection) {
        controlsSection.style.display = 'none';
        controlsSection.style.visibility = 'hidden';
      }

      const style = document.createElement('style');
      style.textContent = `
        .controls, #debug-log, .debug-log, #recording-controls, #status { 
          display: none !important; 
          visibility: hidden !important; 
          height: 0 !important; 
          min-height: 0 !important;
          padding: 0 !important; 
          margin: 0 !important; 
          overflow: hidden !important;
        }
      `;
      document.head.appendChild(style);
    }

    if (isIOS) document.body.classList.add("ios-mode");
    if (isAnkiPC) document.body.classList.add("pc-mode");
    document.body.classList.add("loaded");

    const targetWord = decodeURIComponent(params.get("word") || "Apple");
    const userIpa = decodeURIComponent(params.get("phonetic") || params.get("USPhonetic") || params.get("usphonetic") || params.get("us") || params.get("ipa") || "");
    let userAudio = decodeURIComponent(params.get("audio") || params.get("audio_file") || params.get("USAudio") || params.get("usaudio") || "");

    // ===== 🛠️ 关键修复：解析音频 HTML 标签 =====
    let isHtmlTag = false;
    let audioSrcFilename = "";
    if (userAudio && userAudio.includes("<audio")) {
      isHtmlTag = true;
      const srcMatch = userAudio.match(/src=["']([^"']+)["']/);
      if (srcMatch && srcMatch[1]) {
        audioSrcFilename = srcMatch[1];
        userAudio = audioSrcFilename; // 提取文件名作为最终路径
      }
    }

    // 立即显示单词
    const wordEl = document.getElementById("target-word");
    const ipaEl = document.getElementById("target-ipa");
    if (wordEl) wordEl.innerText = targetWord;
    // 修复：确保初始化时不产生双斜杠
    if (ipaEl) {
      if (userIpa) {
        // 强力去重：移除所有已有的斜杠和括号，重新统一包裹
        const pureIpa = userIpa.replace(/[\/\[\]\s]+/g, ' ').trim();
        ipaEl.innerText = `/${pureIpa}/`;
        ipaEl.style.color = "#3A66B8";
      } else {
        ipaEl.innerText = "";
      }
    }

    // ===== 音标工具：Arpabet 强制转标准 IPA =====
    const ARPABET_TO_IPA = {
      "ae": "æ", "ax": "ə", "ah": "ʌ", "aa": "ɑ", "ao": "ɔ", "ih": "ɪ", "eh": "e", "iy": "i", "uh": "ʊ", "uw": "u",
      "er": "ɜːr", "axr": "ər", "ey": "eɪ", "ay": "aɪ", "oy": "ɔɪ", "aw": "aʊ", "ow": "oʊ",
      "p": "p", "b": "b", "t": "t", "d": "d", "k": "k", "g": "g", "f": "f", "v": "v", "th": "θ", "dh": "ð",
      "s": "s", "z": "z", "sh": "ʃ", "zh": "ʒ", "ch": "tʃ", "jh": "dʒ", "m": "m", "n": "n", "ng": "ŋ", "l": "l", "r": "r", "w": "w", "y": "j", "hh": "h"
    };
    function getStandardIpa(pObj) {
      if (pObj.IPA) return pObj.IPA;
      const code = (pObj.Phoneme || "").toLowerCase();
      return ARPABET_TO_IPA[code] || code;
    }

    /* ===== State ===== */
    let recording = false;
    let audioContext = null;
    let recBuffer = [];
    let lastRecordedBlob = null;

    const recordBtn = document.getElementById("recordBtn");
    const playbackBtn = document.getElementById("playbackBtn");
    const stdWordBtn = document.getElementById("stdWordBtn");
    const statusLabel = document.getElementById("status");
    const barsContainer = document.getElementById("bars-container");
    const mainScoreEl = document.getElementById("main-score");
    const scoreHeader = document.getElementById("score-header");
    const starsEl = document.getElementById("stars");
    const tipBox = document.getElementById("tip-box");

    // ===== 英语拼写规则引擎 (核心优化) =====
    const DIGRAPHS = [
      // 元音组合
      "ai", "ay", "ea", "ee", "ei", "ey", "ie", "oa", "oe", "oi", "oo", "ou", "oy", "ui", "au", "aw",
      // 辅音组合
      "ch", "sh", "th", "wh", "ph", "ng", "nk", "ck", "kn", "wr", "gh", "gu",
      "tr", "dr", "ts", "ds",
      // 常见双写
      "pp", "tt", "bb", "dd", "ff", "gg", "mm", "nn", "rr", "ss", "ll", "zz", "cc"
    ];
    // 注意：eau 不再作为 TRIGRAPH，需要特殊处理
    const TRIGRAPHS = ["ght", "tch", "dge", "iou"];

    /* ===== 高精全能型对齐引擎 (Silent Absorber + Multi-Phoneme Merge) ===== */
    function alignLettersToPhonemes(word, phonemes) {
      const letters = word.toLowerCase();
      const pCount = phonemes.length;
      let letterIndex = 0;

      const phObjects = phonemes.map(p => ({
        ipa: getStandardIpa(p),
        score: p.PronunciationAssessment?.AccuracyScore || 0,
        raw: p
      }));

      const finalGroups = [];

      for (let i = 0; i < pCount; i++) {
        let curr = phObjects[i];

        // 0. 跳过非字母字符
        while (letterIndex < letters.length && !/[a-z]/.test(letters[letterIndex])) {
          letterIndex++;
        }
        // 关键修复：即便字母用尽，只要音素还在，就继续循环以由最后条目承载，或输出空位

        let curChar = (letterIndex < letters.length) ? letters[letterIndex] : "";
        let groupLetters = curChar;
        let groupPhonemes = [curr.raw];
        let displayIpa = curr.ipa;
        let ttsIpa = curr.ipa;
        let totalScore = curr.score;
        let phonemeCount = 1;

        // 1. 三字母/多音素合并逻辑
        let nextPh = (i + 1 < pCount) ? phObjects[i + 1] : null;

        // 场景 A: x 字母处理 (x -> /ks/ 或 /gz/)
        if (curChar === 'x' && (curr.ipa === 'k' || curr.ipa === 'g') && nextPh && (nextPh.ipa === 's' || nextPh.ipa === 'z')) {
          groupPhonemes.push(nextPh.raw);
          displayIpa += nextPh.ipa;
          ttsIpa += " " + nextPh.ipa;
          totalScore = (totalScore + nextPh.score) / 2;
          i++;
          nextPh = (i + 1 < pCount) ? phObjects[i + 1] : null;
        }

        // 场景 B: 多音素合并触发器 (如字母 'u' 对应 /j/ + /u:/)
        else if ((curChar === 'u') && (curr.ipa === 'j') && nextPh && (nextPh.ipa === 'u' || nextPh.ipa === 'u:' || nextPh.ipa === 'ʊ')) {
          groupPhonemes.push(nextPh.raw);
          displayIpa += nextPh.ipa;
          ttsIpa += " " + nextPh.ipa;
          totalScore = (totalScore + nextPh.score) / 2;
          i++;
          nextPh = (i + 1 < pCount) ? phObjects[i + 1] : null;
        }

        // 场景 C: 特殊 le 结尾合并为 (ə)l - 但仅当两个音素连续时才合并
        const isLeSuffix = letters.endsWith('le') && (letterIndex >= letters.length - 2);
        // 修改：仅当 ə 和 l 是连续音素时才合并，否则分开处理
        if (isLeSuffix && curr.ipa === "ə" && nextPh && nextPh.ipa === "l") {
          groupPhonemes.push(nextPh.raw);
          displayIpa = `(${curr.ipa})${nextPh.ipa}`;
          ttsIpa = `${curr.ipa} ${nextPh.ipa}`;
          totalScore = (totalScore + nextPh.score) / 2;
          i++;
          nextPh = (i + 1 < pCount) ? phObjects[i + 1] : null;
        }

        // 场景 D: 辅音簇合并 (tr, dr, ts, ds)
        // 规则：tr->/tr/, dr->/dr/, ts->/ts/, ds->/dz/
        const combo = (letterIndex + 1 < letters.length) ? letters.substr(letterIndex, 2) : "";
        let isCluster = false;
        if (combo === "tr" && curr.ipa === "t" && nextPh && nextPh.ipa === "r") isCluster = true;
        else if (combo === "dr" && curr.ipa === "d" && nextPh && nextPh.ipa === "r") isCluster = true;
        else if (combo === "ts" && curr.ipa === "t" && nextPh && (nextPh.ipa === "s" || nextPh.ipa === "z")) isCluster = true;
        else if (combo === "ds" && curr.ipa === "d" && nextPh && (nextPh.ipa === "z" || nextPh.ipa === "s")) isCluster = true;

        if (isCluster) {
          groupPhonemes.push(nextPh.raw);
          displayIpa += nextPh.ipa;
          ttsIpa += " " + nextPh.ipa;
          totalScore = (totalScore + nextPh.score) / 2;
          i++;
          // 更新 nextPh 供后续吸收逻辑判定坐标
          nextPh = (i + 1 < pCount) ? phObjects[i + 1] : null;
        }

        // 2. 字母切割启发式逻辑 (Digraph/Trigraph)
        let chunkSize = 1;
        if (letterIndex + 2 < letters.length && TRIGRAPHS.includes(letters.substr(letterIndex, 3))) chunkSize = 3;
        else if (letterIndex + 1 < letters.length && DIGRAPHS.includes(letters.substr(letterIndex, 2))) chunkSize = 2;

        // 特殊处理：如果已经识别为辅音簇 combo 且刚好在此处，强行扩充 chunkSize
        if (isCluster) chunkSize = 2;
        // 特殊处理：如果 le 被判定为 Suffix 且刚好在此处，强行扩充 chunkSize
        else if (isLeSuffix) chunkSize = letters.length - letterIndex;

        groupLetters = word.substr(letterIndex, chunkSize);
        letterIndex += chunkSize;

        // 3. 静音字母吸收 (Silent Letter Absorber)
        // 核心逻辑：如果后面跟着不发音的字母（如 gh, 中间的 e, 结尾的 e），且它们没有对应的音素，则由当前组吸收
        while (letterIndex < letters.length) {
          let peekChar = letters[letterIndex];

          // 如果是空格或非字母，直接吸收
          if (!/[a-z]/.test(peekChar)) {
            groupLetters += word[letterIndex];
            letterIndex++;
            continue;
          }

          // 特殊静音组合判定：
          // 1. 词尾不发音 e
          // 2. 元音后的 gh (如果下一个音素不是 f (laugh) 或 g)
          // 3. 词中被省略的元音 (如 interesting 中的 e)

          let remainingPh = pCount - (i + 1);
          let nextRealPh = (i + 1 < pCount) ? phObjects[i + 1] : null;

          let isSilentCandidate = false;

          // 场景 A: 结尾 e
          if (peekChar === 'e' && remainingPh === 0) isSilentCandidate = true;

          // 场景 B: 辅音组合中的静音件 (如 gh)
          if (peekChar === 'g' && letters[letterIndex + 1] === 'h') {
            // 如果下一个音素不是 f (laugh) 或 g，则 gh 是静音的
            if (!nextRealPh || (!nextRealPh.ipa.includes('f') && !nextRealPh.ipa.includes('g'))) {
              groupLetters += word.substr(letterIndex, 2);
              letterIndex += 2;
              continue;
            }
          }

          // 场景 C: 词中的弱读/不发音元音 (interesting)
          // 如果当前是元音字母，且原本应该对应音素但现在剩余音素明显不足以匹配后续字母
          if ("aeiou".includes(peekChar) && remainingPh > 0) {
            // 启发式：如果后续字母能完美匹配下一个音素，则当前元音被视为静音吸收
            let nextLetter = letters[letterIndex + 1];
            if (nextLetter && nextRealPh && nextRealPh.ipa.startsWith(nextLetter)) {
              isSilentCandidate = true;
            }
          }

          if (isSilentCandidate) {
            groupLetters += word[letterIndex];
            letterIndex++;
          } else {
            break; // 遇到真正的发音字母，停止吸收
          }
        }

        finalGroups.push({
          letters: groupLetters,
          displayPh: displayIpa,
          ttsIpa: ttsIpa,
          score: totalScore,
          // 注入位置元数据
          isInitial: (i === 0 || (i === 1 && phonemeCount === 2)),
          isFinal: (i >= pCount - 1),
          rawPhoneme: curr.raw.Phoneme.toLowerCase()
        });
      }

      // 最后收尾：吸收末尾残留物
      if (letterIndex < letters.length) {
        finalGroups[finalGroups.length - 1].letters += word.substr(letterIndex);
      }

      return finalGroups;
    }

    /* ===== Render UI ===== */
    function renderResult(nbest) {
      scoreHeader.style.opacity = "1";
      barsContainer.style.display = "flex";
      const acc = Math.round(nbest.PronunciationAssessment.AccuracyScore || 0);
      mainScoreEl.innerHTML = `${acc}<span class="score-unit">分</span>`;

      const starCount = Math.round(acc / 20);
      let starHtml = "";
      for (let i = 0; i < 5; i++) starHtml += i < starCount ? "★" : "<span class='gray'>☆</span>";
      starsEl.innerHTML = starHtml;

      const targetPhonemes = [];
      const displayPhonemesList = [];
      if (nbest.Words && nbest.Words.length > 0) {
        nbest.Words.forEach(w => {
          if (w.Phonemes) {
            targetPhonemes.push(...w.Phonemes);
            w.Phonemes.forEach(p => displayPhonemesList.push(getStandardIpa(p)));
          }
        });
      } else {
        logToScreen("ℹ️ 没有音素详情数据可显示");
      }

      console.log("[DATA] Azure raw phonemes:", targetPhonemes);

      // 只有在用户完全没提供音标参数时，才使用 Azure 合成的音标
      if (!ipaEl.innerText || ipaEl.innerText === "//" || ipaEl.innerText === "") {
        const cleanList = displayPhonemesList.map(p => p.replace(/[\/\[\]\s]+/g, ''));
        ipaEl.innerText = `/${cleanList.join(' ')}/`;
      }

      try {
        let alignedData = [];
        try {
          alignedData = alignLettersToPhonemes(targetWord, targetPhonemes);
        } catch (e) {
          console.warn("[ALIGN] Advanced engine failed, using fallback.", e);
          // 极简兜底：直接按比例平铺（保证音素条绝不消失）
          alignedData = targetPhonemes.map(p => ({
            letters: "?",
            displayPh: getStandardIpa(p),
            ttsIpa: getStandardIpa(p),
            score: p.PronunciationAssessment?.AccuracyScore || 0,
            isFallback: true
          }));
        }

        if (!alignedData || alignedData.length === 0) {
          logDebug("对齐引擎返回空结果，无法渲染", "err");
          return;
        }

        barsContainer.innerHTML = "";
        alignedData.forEach(group => {
          const div = document.createElement("div");
          div.className = "bar-group";
          // 存储元数据供点击时使用
          div.dataset.ph = group.rawPhoneme;
          div.dataset.isInitial = group.isInitial;
          div.dataset.isFinal = group.isFinal;
          div.onclick = () => playPhoneme(group.ttsIpa, group.displayPh, div.dataset);

          const score = Math.round(group.score);
          let colorClass = score >= 80 ? "bg-good" : (score >= 60 ? "bg-fair" : "bg-poor");

          div.innerHTML = `
            <div class="bar-letter">${group.letters}</div>
            <div class="bar-ipa">/${group.displayPh}/</div>
            <div class="bar-score ${colorClass}">${score}</div>
          `;
          barsContainer.appendChild(div);
        });
      } catch (err) {
        console.error("Render Error:", err);
        logDebug(`渲染失败: ${err.message}`, "err");
      }
    }

    /* ===== TTS & Tips ===== */
    async function playPhoneme(ttsIpa, displayPhoneme, meta = {}) {
      const cleanKey = displayPhoneme.replace(/[()]/g, '').trim();

      // 同位音逻辑判定
      let tipKey = cleanKey;
      if (cleanKey === "l") {
        tipKey = meta.isFinal ? "l_dark" : "l_light";
      } else if (cleanKey === "r") {
        tipKey = meta.isFinal ? "r_final" : "r";
      }

      // 显示中文提示
      const tip = PhonemeTips[tipKey] || PhonemeTips[cleanKey] || PhonemeTips[cleanKey.split(' ')[0]];
      if (tip) {
        tipBox.style.display = "block";
        tipBox.innerText = `/${displayPhoneme}/ : ${tip}`;
      }

      // 播放静态音频
      // 这里的音频文件名与 tipKey 保持一致，例如 l_light.mp3, i.mp3 等
      const audioUrl = `/audio/phoneme/${tipKey}.mp3`;

      const audio = new Audio(audioUrl);
      audio.onerror = async () => {
        console.warn(`[AUDIO] 静态音频 ${audioUrl} 未找到，尝试使用 TTS 备份。`);
        // 如果静态资源未准备好，作为开发期过渡，可以暂时保留 TTS 兜底（或直接报错提示）
        await playPhonemeTTS(ttsIpa);
      };

      try {
        await audio.play();
      } catch (err) {
        console.error("Audio playback error", err);
      }
    }

    async function playPhonemeTTS(ttsIpa) {
      try {
        const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
          <voice name="en-US-ChristopherNeural">
            <prosody volume="+30.00%">
              <phoneme alphabet="ipa" ph="${ttsIpa}"> phoneme </phoneme>
            </prosody>
          </voice>
        </speak>`;
        const res = await fetch(window.location.origin + "/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ssml })
        });
        if (res.ok) {
          const blob = await res.blob();
          const audio = new Audio(URL.createObjectURL(blob));
          audio.play();
        }
      } catch (e) { console.error("TTS Backup Error", e); }
    }

    /* ===== Recording Logic (Modern & Resampled) ===== */
    // 适配 PC 端 Anki: 强化识别
    const isWebView = /Anki|WebView|Android.*(wv|.0.0.0)|QtWebEngine/i.test(navigator.userAgent);

    // 🔥 外部录音模式：完全禁用录音按钮
    if (!isExternalControl && recordBtn) {
      recordBtn.onclick = async () => {
        // 适配逻辑：如果是 Android 或 PC 端的 Anki 内嵌环境，执行逃逸跳转
        if (!isIOS && (isWebView || isAnkiPC) && !recording) {
          logDebug("触发环境逃逸跳转 (PC/Android)...");
          statusLabel.innerText = "正在尝试打开外部浏览器...";
          const externalUrl = window.location.href;

          // 尝试多种逃逸方式
          const win = window.open(externalUrl, "_blank");
          if (!win || win.closed || typeof win.closed === 'undefined') {
            // 如果被拦截，引导用户点击
            statusLabel.innerHTML = `<a href="${externalUrl}" target="_blank" style="color:#3A66B8;text-decoration:underline;">录音权限受阻，请点击此处并在浏览器中打开</a>`;
          } else {
            location.href = externalUrl; // 物理重定向作为兜底
            statusLabel.innerText = "请在外部浏览器中操作";
          }
          return;
        }

        if (!recording) {
          await startRecord();
        } else {
          stopRecord();
        }
      };
    }
    async function startRecord() {
      logDebug("正在请求麦克风 (16kHz PCM 直接采样)...");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        if (audioContext.state === 'suspended') await audioContext.resume();

        const input = audioContext.createMediaStreamSource(stream);
        // 4096 对于 16k 采样率约 250ms 一次回调
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        recBuffer = [];

        processor.onaudioprocess = e => {
          if (recording) {
            const channelData = e.inputBuffer.getChannelData(0);
            recBuffer.push(new Float32Array(channelData));
            logDebug(`[Live] 采集音频分片: ${channelData.length} samples`);
          }
        };

        input.connect(processor);
        processor.connect(audioContext.destination);

        recording = true;
        recordBtn.classList.add("recording");
        statusLabel.innerText = "正在录制...";
        logDebug("PCM 直接采集已启动", "ok");

        window.recStream = stream;
        window.recProcessor = processor;
        window.recInput = input;
      } catch (e) {
        logDebug(`初始化失败: ${e.message}`, "err");
        alert("无法启动录音: " + e.message);
      }
    }

    function stopRecord() {
      if (!recording) return;
      logDebug("停止采样，开始构建 WAV...");
      const startTime = Date.now();
      recording = false;
      recordBtn.classList.remove("recording");

      if (window.recProcessor) window.recProcessor.disconnect();
      if (window.recInput) window.recInput.disconnect();
      if (window.recStream) window.recStream.getTracks().forEach(t => t.stop());

      // 合并 PCM 数据并生成 WAV
      const totalLen = recBuffer.reduce((acc, b) => acc + b.length, 0);
      const flatBuffer = new Float32Array(totalLen);
      let offset = 0;
      for (const b of recBuffer) {
        flatBuffer.set(b, offset);
        offset += b.length;
      }

      const wavBlob = encodeWAVFromFloat(flatBuffer);
      lastRecordedBlob = wavBlob;
      playbackBtn.disabled = false;

      logDebug(`本地处理完成: ${Date.now() - startTime}ms`, "ok");
      logDebug(`音频包大小: ${wavBlob.size} bytes`, "ok");

      sendCheck(wavBlob);
      if (audioContext) audioContext.close();
    }

    function encodeWAVFromFloat(samples) {
      const buffer = new ArrayBuffer(44 + samples.length * 2);
      const view = new DataView(buffer);
      writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + samples.length * 2, true);
      writeString(view, 8, 'WAVE');
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, 1, true); // Mono
      view.setUint32(24, 16000, true);
      view.setUint32(28, 32000, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(view, 36, 'data');
      view.setUint32(40, samples.length * 2, true);
      let offset = 44;
      for (let i = 0; i < samples.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
      return new Blob([buffer], { type: 'audio/wav' });
    }

    // 🎤 环境识别与全局状态 (已提升至顶部)

    if (isExternalControl) {
      if (recordBtn) recordBtn.style.display = 'none';
      if (statusLabel) statusLabel.innerText = "等待 Anki 录音...";
    }

    // 👂 全局消息监听器
    window.addEventListener('message', event => {
      const msg = event.data;
      if (!msg || !msg.type) return;

      logToScreen(`📨 收到消息: ${msg.type}`);

      // 1. 接收评测结果 (从 Anki 发送)
      if (msg.type === 'ASSESSMENT_RESULT') {
        logToScreen("✅ 收到评测结果，开始渲染...", "in");
        const payload = msg.payload || msg; // 兼容写法

        // 检查数据结构并适配
        let adaptedData = null;
        if (payload.nbest) {
          adaptedData = payload.nbest;
        } else if (payload.PronunciationAssessment && payload.Words) {
          adaptedData = payload;
        } else if (payload.success === true || payload.pronunciation !== undefined) {
          // 适配简化版的成功返回
          logToScreen("ℹ️ 识别到简化版数据格式");
          adaptedData = {
            PronunciationAssessment: {
              AccuracyScore: payload.pronunciation || payload.score || 0,
              CompletenessScore: 100,
              FluencyScore: 100,
              PronScore: payload.pronunciation || payload.score || 0
            },
            Words: payload.phonemes ? [{
              Word: targetWord,
              PronunciationAssessment: { AccuracyScore: payload.pronunciation || 0 },
              Phonemes: payload.phonemes.map(p => ({
                Phoneme: p.Phoneme || p.phoneme || "?",
                PronunciationAssessment: { AccuracyScore: p.AccuracyScore || p.score || 0 }
              }))
            }] : []
          };
        } else {
          logToScreen("⚠️ 无法识别的数据结构，尝试强制渲染", "err");
          // 万能适配器
          adaptedData = {
            PronunciationAssessment: { AccuracyScore: payload.score || 0 },
            Words: []
          };
        }

        try {
          renderResult(adaptedData);
          logToScreen("🎉 渲染完成");
        } catch (e) {
          logToScreen("❌ 渲染代码崩溃: " + e.message, "err");
        }

        if (statusLabel) statusLabel.style.display = 'none';
      }

      // 2. 接收状态更新 (从 Anki 发送)
      if (msg.type === 'ASSESSMENT_STATUS') {
        const statusText = document.getElementById('status');
        if (statusText && msg.status) {
          statusText.innerText = msg.status;
          logToScreen(`📊 状态更新: ${msg.status}`);
        }
      }

      // 3. 播放Anki音频
      if (msg.type === 'PLAY_ANKI_AUDIO') {
        const audioTags = document.getElementsByTagName('audio');
        for (let i = 0; i < audioTags.length; i++) {
          if (audioTags[i].src.indexOf(msg.filename) !== -1) {
            audioTags[i].currentTime = 0;
            audioTags[i].play();
            break;
          }
        }
      }
    });

    // 按钮事件绑定
    stdWordBtn.onclick = () => {
      if (userAudio) {
        window.parent.postMessage({ type: 'PLAY_ANKI_AUDIO', filename: userAudio }, '*');
        stdWordBtn.style.transform = "scale(0.95)";
        setTimeout(() => stdWordBtn.style.transform = "scale(1)", 150);
      } else {
        fallbackStandardPlay();
      }
    };

    playbackBtn.onclick = () => {
      if (lastRecordedBlob) {
        const audio = new Audio(URL.createObjectURL(lastRecordedBlob));
        audio.play().catch(e => {
          logToScreen(`回放失败: ${e.message}`, "err");
        });
      }
    };

    function fallbackStandardPlay() {
      const currentIpa = ipaEl ? ipaEl.innerText.replace(/[\/\[\]\s]+/g, '').trim() : "";
      if (currentIpa) {
        playPhoneme(currentIpa, targetWord);
      } else {
        playStandardText(targetWord);
      }
    }

    async function playStandardText(text) {
      try {
        const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
          <voice name="en-US-ChristopherNeural">
            <prosody volume="+30.00%">${text}</prosody>
          </voice>
        </speak>`;
        const res = await fetch(window.location.origin + "/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ssml })
        });
        if (res.ok) {
          const blob = await res.blob();
          const audio = new Audio(URL.createObjectURL(blob));
          audio.play();
        }
      } catch (e) {
        console.error("Standard TTS Error", e);
      }
    }

    async function sendCheck(blob) {
      const startTime = Date.now();
      logDebug(`发起请求: /assess (Word: ${targetWord})`);
      try {
        const formData = new FormData();
        formData.append('audio', blob, 'speech.wav');
        formData.append('word', targetWord);

        const res = await fetch('/assess', {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        if (data.success && data.nbest) {
          logDebug("测评成功");
          statusLabel.innerText = "测评完成";
          renderResult(data.nbest);
        } else {
          logDebug("测评失败: " + (data.message || "原因未知"), "err");
        }
      } catch (e) {
        logDebug(`通讯失败: ${e.message}`, "err");
      }
    }

    function writeString(view, offset, string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }

    logDebug("主逻辑已绑定，排障模式就绪", "ok");
  </script>
</body>

</html>
