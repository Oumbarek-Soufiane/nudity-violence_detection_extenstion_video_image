/* server.js - UPDATED for Full Video Analysis */
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require("@google/generative-ai/server"); 
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Initialize File Manager (Required for video uploads)
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

// Rate limiting tracker
const rateLimitTracker = {};
function checkRateLimit(identifier) {
    const now = Date.now();
    if (!rateLimitTracker[identifier]) {
        rateLimitTracker[identifier] = { count: 0, resetTime: now + 60000 };
    }
    const tracker = rateLimitTracker[identifier];
    if (now > tracker.resetTime) {
        tracker.count = 0;
        tracker.resetTime = now + 60000;
    }
    tracker.count++;
    return tracker.count <= 30;
}

// ============================================
// 1. ANALYZE IMAGE
// ============================================
app.post('/api/analyze-image', async (req, res) => {
    try {
        const clientIP = req.ip;
        if (!checkRateLimit(clientIP)) return res.status(429).json({ error: 'Rate limit exceeded.' });

        let { image, mimeType } = req.body;
        if (!image) return res.status(400).json({ error: 'No image data provided' });

        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview", 
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        });

        const result = await model.generateContent([
            `You are a child safety AI. Analyze this image for content inappropriate for children.
            Respond ONLY with JSON: { "isSafe": boolean, "category": "safe"|"violence"|"nudity", "reason": "string" }`,
            { inlineData: { data: image, mimeType: mimeType || "image/jpeg" } }
        ]);

        const response = await result.response;
        const cleanedText = response.text().replace(/```json|```/g, '').trim();
        res.json({ result: JSON.parse(cleanedText) });
    } catch (error) {
      console.error("❌ GEMINI API ERROR:", error.message); // 👈 ADD THIS LINE
        res.status(500).json({ error: 'Analysis failed', details: error.message });
    }
});

// ============================================
// 2. ANALYZE FULL VIDEO (NEW & IMPROVED)
// ============================================
app.post('/api/analyze-full-video', async (req, res) => {
    try {
        // '..' means "go up one folder", then go into 'frontend'
       const videoPath = path.join(__dirname, '..', 'violence.mp4');
        
        // DEBUG LOGS
        console.log("📂 Server is looking here:", videoPath);
        if (!fs.existsSync(videoPath)) {
            console.error("❌ FILE NOT FOUND at that path!");
            return res.status(404).json({ error: "Video file not found." });
        }

        console.log("📤 Uploading video to Gemini File API...");
        
        // 1. Upload to Gemini File Manager
        const uploadResult = await fileManager.uploadFile(videoPath, {
            mimeType: "video/mp4",
            displayName: "Moderation Test Video",
        });

        // 2. Wait for Processing (Videos must be 'ACTIVE' before analysis)
        let file = await fileManager.getFile(uploadResult.file.name);
        while (file.state === "PROCESSING") {
            process.stdout.write(".");
            await new Promise((resolve) => setTimeout(resolve, 2000));
            file = await fileManager.getFile(uploadResult.file.name);
        }

        if (file.state === "FAILED") throw new Error("Video processing failed.");
        console.log("\n✅ Video ready. Analyzing...");

        // 3. Analyze content with full context
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview",
            safetySettings: [
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        });

        const result = await model.generateContent([
            {
                fileData: {
                    mimeType: uploadResult.file.mimeType,
                    fileUri: uploadResult.file.uri
                }
            },
            `You are a high-security combat-detection AI. Your ONLY job is to find violence. 
            Analyze the movement, audio, and visual transitions. 
            Flag TRUE if you see a raised fist, hitting, weapons, or aggressive falling. 
            Respond ONLY with JSON: { "flagged": boolean, "reason": "string", "severity": "string" }`
        ]);

        const responseText = result.response.text();
        const cleanedText = responseText.replace(/```json|```/g, '').trim();
        
        console.log("🎬 Analysis Complete:", cleanedText);
        res.json(JSON.parse(cleanedText));

    } catch (error) {
        console.error("❌ Video Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// 3. ANALYZE TEXT
// ============================================
app.post('/api/analyze-text', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'No text provided' });

        const OFFENSIVE_WORDS = {
            severe: ['kill', 'murder', 'suicide', 'porn', 'sex'],
            moderate: ['bitch', 'damn', 'hell'],
            mild: ['stupid', 'dumb']
        };

        const foundWords = { severe: [], moderate: [], mild: [] };
        const lowerText = text.toLowerCase();

        for (const [severity, words] of Object.entries(OFFENSIVE_WORDS)) {
            words.forEach(word => {
                const regex = new RegExp(`\\b${word}\\b`, 'gi');
                if (regex.test(lowerText)) foundWords[severity].push(word);
            });
        }

        const hasSevere = foundWords.severe.length > 0;
        res.json({
            flagged: hasSevere || foundWords.moderate.length > 0,
            severity: hasSevere ? 'severe' : 'none',
            shouldBlock: hasSevere
        });
    } catch (error) {
        res.status(500).json({ error: 'Text analysis failed' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running ✅', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`✅ SafeSurf Server running on http://localhost:${PORT}`);
});