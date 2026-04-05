/* content.js - SIMPLIFIED (Protection ON by default) */
console.log("🛡️ SafeSurf Active - Images | Videos | Text Detection");

// PROTECTION IS ALWAYS ON
let protectionActive = true;

const processedImages = new Set();
const processedVideos = new Set();
const imageQueue = [];
const videoQueue = [];
let isProcessing = false;

// Offensive words for text highlighting
const OFFENSIVE_WORDS = {
  severe: ['kill', 'murder', 'suicide', 'rape', 'abuse', 'porn', 'sex', 'drugs', 'hate'],
  moderate: ['bitch', 'damn', 'hell', 'slut', 'whore', 'bastard', 'ass', 'crap'],
  mild: ['sucks', 'stupid', 'dumb', 'idiot', 'loser', 'jerk', 'piss']
};

// ============================================
// 1. IMAGE DETECTION
// ============================================
const imageObserver = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.tagName === 'IMG') queueImage(node);
      if (node.querySelectorAll) node.querySelectorAll('img').forEach(queueImage);
    });
  });
});

imageObserver.observe(document.body, { childList: true, subtree: true });
document.querySelectorAll('img').forEach(queueImage);

function queueImage(img) {
  if (img.width < 100 || img.height < 100) return;
  if (processedImages.has(img.src)) return;
  
  img.style.filter = "blur(15px) grayscale(100%)";
  img.style.transition = "filter 0.5s";
  
  imageQueue.push(img);
  processedImages.add(img.src);
  
  if (!isProcessing) processQueue();
}

async function processQueue() {
  if (imageQueue.length === 0 && videoQueue.length === 0) {
    isProcessing = false;
    return;
  }
  
  isProcessing = true;
  
  // Process images first
  if (imageQueue.length > 0) {
    const img = imageQueue[0];
    try {
      await analyzeImage(img);
      imageQueue.shift();
    } catch (err) {
      console.error("Image error:", err.message);
      img.style.filter = "none";
      imageQueue.shift();
    }
  }
  // Then videos
  else if (videoQueue.length > 0) {
    const video = videoQueue[0];
    try {
      await analyzeVideoFrame(video);
      videoQueue.shift();
    } catch (err) {
      console.error("Video error:", err.message);
      videoQueue.shift();
    }
  }

  setTimeout(processQueue, 2000);
}

async function analyzeImage(img) {
  // 1. Convert image to Base64 using Canvas
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width || 100;
  canvas.height = img.naturalHeight || img.height || 100;
  const ctx = canvas.getContext('2d');
  
  let base64Data;
  try {
    ctx.drawImage(img, 0, 0);
    // Extract the base64 string, removing the "data:image/jpeg;base64," prefix
    base64Data = canvas.toDataURL('image/jpeg').split(',')[1];
  } catch (err) {
    throw new Error("Canvas tainted by CORS - cannot scan this specific image.");
  }

  // 2. Send the Base64 data to the server
  const response = await fetch('http://localhost:3002/api/analyze-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      image: base64Data, // Changed from imageUrl to image
      mimeType: "image/jpeg" 
    })
  });

  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`);
  }

  const data = await response.json();

  // 3. Handle the server's response
  if (data.result && data.result.isSafe === false) {
    blockImage(img, data.result.reason || 'unsafe');
    updateStats('blocked');
  } else {
    img.style.filter = "none";
    updateStats('scanned');
  }
}

function blockImage(img, category) {
  img.style.opacity = "0.3";
  img.style.border = "3px solid #FF4444";
  
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(255, 68, 68, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 14px;
    z-index: 9999;
  `;
  overlay.innerHTML = `🛑 ${category.toUpperCase()} - BLOCKED`;
  
  img.parentElement.style.position = 'relative';
  img.parentElement.appendChild(overlay);
}

// ============================================
// 2. VIDEO DETECTION
// ============================================
const videoObserver = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.tagName === 'VIDEO') queueVideo(node);
      if (node.querySelectorAll) node.querySelectorAll('video').forEach(queueVideo);
    });
  });
});

videoObserver.observe(document.body, { childList: true, subtree: true });
document.querySelectorAll('video').forEach(queueVideo);

function queueVideo(video) {
  if (processedVideos.has(video.src || video.currentSrc)) return;
  
  processedVideos.add(video.src || video.currentSrc);
  
  const statusDiv = document.createElement('div');
  statusDiv.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    background: #FFA500;
    color: white;
    padding: 8px 12px;
    border-radius: 5px;
    font-size: 12px;
    z-index: 9998;
    font-weight: bold;
  `;
  statusDiv.textContent = '🔍 Scanning...';
  
  video.parentElement.style.position = 'relative';
  video.parentElement.appendChild(statusDiv);
  
  videoQueue.push({
    element: video,
    statusDiv: statusDiv
  });
  
  if (!isProcessing) processQueue();
}

async function analyzeVideoFrame(videoObj) {
  const { element: video, statusDiv } = videoObj;

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  
  const ctx = canvas.getContext('2d');
  
  let base64Data;
  try {
    ctx.drawImage(video, 0, 0);
    // Added safety try/catch here to prevent crashes on tainted video canvases
    base64Data = canvas.toDataURL('image/jpeg').split(',')[1]; 
  } catch (err) {
    statusDiv.style.backgroundColor = '#666';
    statusDiv.textContent = '⚠️ CORS Blocked';
    throw new Error("Video frame extraction failed due to CORS");
  }

  const response = await fetch('http://localhost:3002/api/analyze-image', { // Re-using the image endpoint for the frame
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      image: base64Data, 
      mimeType: "image/jpeg" 
    })
  });

  if (!response.ok) {
    throw new Error("Server error");
  }

  const data = await response.json();

  if (data.result && data.result.isSafe === false) {
    blockVideo(videoObj, data.result.reason);
    updateStats('blockedVideo');
  } 
}

function blockVideo(videoObj, reason) {
  const { element: video, statusDiv } = videoObj;
  
  video.style.display = 'none';
  
  const blocker = document.createElement('div');
  blocker.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #FF4444, #FF6B6B);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    z-index: 9997;
    border-radius: 5px;
  `;
  
  blocker.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 15px;">🛑</div>
    <div style="font-size: 18px; font-weight: bold;">Content Blocked</div>
    <div style="font-size: 12px; margin-top: 10px; opacity: 0.9;">
      ${reason || 'Inappropriate content detected'}
    </div>
  `;
  
  video.parentElement.appendChild(blocker);
  statusDiv.style.backgroundColor = '#FF4444';
  statusDiv.textContent = '🚫 BLOCKED';
}

// ============================================
// 3. TEXT HIGHLIGHTING
// ============================================
function highlightOffensiveText() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let node;
  const nodesToProcess = [];

  while (node = walker.nextNode()) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.parentElement.tagName)) {
      continue;
    }
    
    const text = node.textContent.toLowerCase();
    let hasOffensive = false;

    for (const words of Object.values(OFFENSIVE_WORDS)) {
      if (words.some(word => new RegExp(`\\b${word}\\b`).test(text))) {
        hasOffensive = true;
        break;
      }
    }

    if (hasOffensive) {
      nodesToProcess.push(node);
    }
  }

  nodesToProcess.forEach(node => {
    const span = document.createElement('span');
    let html = node.textContent;

    // Highlight severe words in RED
    OFFENSIVE_WORDS.severe.forEach(word => {
      const regex = new RegExp(`\\b(${word})\\b`, 'gi');
      html = html.replace(regex, 
        `<span style="background-color: #FF4444; color: white; padding: 2px 4px; border-radius: 3px; font-weight: bold;">$1</span>`);
    });

    // Highlight moderate words in ORANGE
    OFFENSIVE_WORDS.moderate.forEach(word => {
      const regex = new RegExp(`\\b(${word})\\b`, 'gi');
      html = html.replace(regex, 
        `<span style="background-color: #FFA500; color: white; padding: 2px 4px; border-radius: 3px; font-weight: bold;">$1</span>`);
    });

    // Highlight mild words in YELLOW
    OFFENSIVE_WORDS.mild.forEach(word => {
      const regex = new RegExp(`\\b(${word})\\b`, 'gi');
      html = html.replace(regex, 
        `<span style="background-color: #FFD700; color: black; padding: 2px 4px; border-radius: 3px; font-weight: bold;">$1</span>`);
    });

    span.innerHTML = html;
    node.parentNode.replaceChild(span, node);
  });
}

document.addEventListener('DOMContentLoaded', highlightOffensiveText);

const textObserver = new MutationObserver(() => {
  clearTimeout(textObserver.timeout);
  textObserver.timeout = setTimeout(highlightOffensiveText, 1000);
});

textObserver.observe(document.body, { childList: true, subtree: true });

// ============================================
// 4. STATS
// ============================================
function updateStats(type) {
  if (!chrome.storage) return;
  
  chrome.storage.local.get(['scannedCount', 'blockedCount', 'blockedVideos'], (res) => {
    let update = {};
    
    if (type === 'scanned') {
      update.scannedCount = (res.scannedCount || 0) + 1;
    } else if (type === 'blocked') {
      update.blockedCount = (res.blockedCount || 0) + 1;
    } else if (type === 'blockedVideo') {
      update.blockedVideos = (res.blockedVideos || 0) + 1;
      update.blockedCount = (res.blockedCount || 0) + 1;
    }
    
    chrome.storage.local.set(update);
  });
}

console.log("✅ Protection active by default");
console.log("✅ Images scanning enabled");
console.log("✅ Videos detection enabled");
console.log("✅ Text highlighting enabled");
