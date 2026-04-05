# Real Time Nudity & Violence Detection_image_video

This project is a Chrome Extension designed to protect teenagers by detecting and filtering nudity and violence in real-time while browsing the web. It utilizes the **Gemini 3 Flash Preview API** for high-speed, accurate image analysis.

## 📂 Project Structure

* **frontend/**: The React application for the extension UI (popup) and the content scripts.
* **backend/**: The Node.js server that acts as a secure bridge to handle API requests to Gemini.

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### 1. Backend Setup (API Server)

The backend handles communication with the Gemini API. You must install **Express** and **CORS**.

1.  Open your terminal and navigate to the backend folder:
    ```bash
    cd backend
    ```

2.  Install the required dependencies:
    ```bash
    npm install express cors dotenv
    ```

3.  Start the server:
    ```bash
    npm run start
    # OR if you haven't defined a script:
    node server.js
    ```

### 2. Frontend Setup (React Extension)

Open a **new** terminal window for the frontend.

1.  Navigate to the frontend folder:
    ```bash
    cd frontend
    ```

2.  Install the core React dependencies & tailwinhd css:
    ```bash
    npm install
    npm install -D tailwindcss@3.4.17 postcss@8.4.33 autoprefixer@10.4.17
    ```

3.  Install the required icon library:
    ```bash
    npm install lucide-react
    ```

---

## 🛠️ Running and Building

### Development Mode (Browser View)
Runs the app in the development mode.
```bash
cd frontend
npm start

Open [http://localhost:3000](http://localhost:3000) to view the popup UI in your browser.

### Build for Chrome (Required for Extension)
To compile the React code into static files that Chrome can understand as an extension:

```bash
cd frontend
npm run build

This command creates a build folder inside frontend/. This folder contains the final extension files.

📦 How to Load in Chrome
Open Google Chrome and navigate to chrome://extensions/.

Toggle Developer mode (top right corner) to ON.

Click the Load unpacked button.

Select the frontend/build folder you just created (do not select the public or src folder).

The extension (with your custom Shield Icon) should now appear in your toolbar!

🔑 Environment Variables
To make the detection work, you need a valid Gemini API key.

Create a file named .env inside the backend/ directory.

Add your API Key:

Extrait de code
GEMINI_API_KEY=your_actual_api_key_here
PORT=3001

## 3. Test the extension
**Open the index.html in order to  test the extension**
