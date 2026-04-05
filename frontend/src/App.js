import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, Lock, AlertTriangle, Activity } from 'lucide-react';
import './index.css';

function App() {
  const [appState, setAppState] = useState('loading'); 
  const [pin, setPin] = useState('');
  const [pinSetup, setPinSetup] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isProtectionActive, setIsProtectionActive] = useState(true); // Add this line
  const [stats, setStats] = useState({ 
    scanned: 0, 
    blocked: 0,
    blockedVideos: 0
  });

  // Load data on mount
  useEffect(() => {
    checkFirstRun();
    loadStats();
    checkProtectionState(); // Add this line
  }, []);

  function checkFirstRun() {
    if (window.chrome && window.chrome.storage) {
      window.chrome.storage.sync.get(['pin', 'setupComplete'], (result) => {
        if (!result.setupComplete) {
          // First time - show PIN setup
          setAppState('setup');
        } else {
          // Already set up - show dashboard
          if (result.pin) {
            setPin(result.pin);
          }
          setAppState('dashboard');
        }
      });
    }
  }

  function loadStats() {
    if (window.chrome && window.chrome.storage) {
      window.chrome.storage.local.get(
        ['scannedCount', 'blockedCount', 'blockedVideos'], 
        (result) => {
          setStats({
            scanned: result.scannedCount || 0,
            blocked: result.blockedCount || 0,
            blockedVideos: result.blockedVideos || 0
          });
        }
      );
    }
  }

  function checkProtectionState() {
    if (window.chrome && window.chrome.storage) {
      window.chrome.storage.local.get(['protectionActive'], (result) => {
        // Default to true if it hasn't been set yet
        setIsProtectionActive(result.protectionActive !== false);
      });
    }
  }

  // PIN Setup Screen
  function handleSetupPin() {
    if (pinSetup.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }

    if (pinSetup !== pinConfirm) {
      setPinError('PINs do not match');
      return;
    }

    if (window.chrome && window.chrome.storage) {
      window.chrome.storage.sync.set({ 
        pin: pinSetup,
        setupComplete: true 
      }, () => {
        setPin(pinSetup);
        setPinError('');
        setPinSetup('');
        setPinConfirm('');
        setAppState('dashboard');
      });
    }
  }

  // Pause Protection - requires PIN
  function handlePauseClick() {
    setAppState('pin-prompt');
    setPinInput('');
    setPinError('');
  }

  // Verify PIN to pause
 // Verify PIN to pause
  function verifyPinToPause() {
    if (pinInput === pin) {
      if (window.chrome && window.chrome.storage) {
        window.chrome.storage.local.set({ protectionActive: false }, () => {
          setIsProtectionActive(false); // Update React state here
          setPinInput('');
          setPinError('');
          setAppState('dashboard');
          alert('⚠️ Protection paused. App will close.');
        });
      } else {
        // Fallback for testing outside of Chrome extension environment
        setIsProtectionActive(false);
        setAppState('dashboard');
      }
    } else {
      setPinError('❌ Incorrect PIN');
      setPinInput('');
    }
  }

  // Add function to turn protection back on
  function handleEnableProtection() {
    if (window.chrome && window.chrome.storage) {
      window.chrome.storage.local.set({ protectionActive: true }, () => {
        setIsProtectionActive(true);
      });
    } else {
      setIsProtectionActive(true); // Fallback
    }
  }

  // ============================================
  // PIN SETUP SCREEN (First time only)
  // ============================================
  if (appState === 'setup') {
    return (
      <div className="w-[380px] min-h-[600px] bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 flex flex-col items-center justify-center text-white">
        <div className="text-center">
          <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <Lock className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold mb-2">SafeSurf Kids</h1>
          <p className="text-indigo-100 mb-8">Set up Parental PIN</p>

          <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm mb-6">
            <input
              type="password"
              placeholder="Enter PIN (4+ digits)"
              value={pinSetup}
              onChange={(e) => {
                setPinSetup(e.target.value);
                setPinError('');
              }}
              className="w-full p-3 border-2 border-white rounded-lg mb-3 text-center text-2xl tracking-widest bg-white/20 text-white placeholder-indigo-200"
              maxLength="6"
            />

            <input
              type="password"
              placeholder="Confirm PIN"
              value={pinConfirm}
              onChange={(e) => {
                setPinConfirm(e.target.value);
                setPinError('');
              }}
              className="w-full p-3 border-2 border-white rounded-lg mb-4 text-center text-2xl tracking-widest bg-white/20 text-white placeholder-indigo-200"
              maxLength="6"
            />

            {pinError && (
              <div className="bg-red-500 text-white p-3 rounded mb-4 text-sm font-bold">
                {pinError}
              </div>
            )}

            <button
              onClick={handleSetupPin}
              className="w-full py-3 bg-white text-indigo-600 font-bold rounded-lg hover:bg-gray-50 transition"
            >
              Set PIN & Continue
            </button>
          </div>

          <div className="text-xs text-indigo-200 text-center">
            <p>🛡️ Your PIN will be required to pause protection</p>
            <p className="mt-2">Keep it safe and don't share it with your child!</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // PIN PROMPT (When user tries to pause)
  // ============================================
  if (appState === 'pin-prompt') {
    return (
      <div className="w-[380px] min-h-[400px] bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-2xl w-full">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Lock className="w-6 h-6 text-indigo-600" /> Parent PIN Required
          </h2>
          
          <p className="text-gray-600 text-sm mb-6">
            Enter your PIN to pause protection
          </p>

          <input
            type="password"
            placeholder="Enter PIN"
            value={pinInput}
            onChange={(e) => {
              setPinInput(e.target.value);
              setPinError('');
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') verifyPinToPause();
            }}
            className="w-full p-4 border-2 border-gray-300 rounded-lg mb-4 text-3xl tracking-widest text-center"
            maxLength="6"
            autoFocus
          />

          {pinError && (
            <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm font-bold border border-red-200">
              {pinError}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                setAppState('dashboard');
                setPinInput('');
                setPinError('');
              }}
              className="flex-1 py-3 bg-gray-300 text-gray-800 font-bold rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
            
            <button
              onClick={verifyPinToPause}
              className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700"
            >
              Unlock
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN DASHBOARD
  // ============================================
  return (
    <div className="w-[380px] min-h-[600px] bg-gradient-to-br from-slate-50 to-blue-50 p-4 font-sans">
      
     {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className={`${isProtectionActive ? 'bg-indigo-600' : 'bg-red-500'} p-2 rounded-lg transition-colors`}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">SafeSurf Kids</h1>
            <p className={`text-xs font-bold ${isProtectionActive ? 'text-green-600' : 'text-red-500'}`}>
              {isProtectionActive ? '🔒 PROTECTION ACTIVE' : '⚠️ PROTECTION PAUSED'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Status Card */}
      <div className={`relative rounded-2xl p-6 mb-6 shadow-lg transition-colors ${isProtectionActive ? 'bg-gradient-to-br from-indigo-600 to-indigo-700' : 'bg-gradient-to-br from-red-500 to-orange-500'}`}>
        {isProtectionActive && (
          <div className="absolute top-4 right-4 animate-pulse">
            <Activity className="w-5 h-5 text-indigo-300" />
          </div>
        )}
        
        <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
          {isProtectionActive ? <Shield className="w-10 h-10 text-white" /> : <AlertTriangle className="w-10 h-10 text-white" />}
        </div>
        
        <h2 className="text-2xl font-bold mb-1 text-center text-white">
          {isProtectionActive ? '✅ You are Protected' : '⚠️ Protection Paused'}
        </h2>
        <p className={`text-sm text-center ${isProtectionActive ? 'text-indigo-100' : 'text-red-100'}`}>
          {isProtectionActive ? 'Claude AI is scanning all content' : 'Content scanning is currently disabled'}
        </p>

        {/* Toggle Button */}
        {isProtectionActive ? (
          <button 
            onClick={handlePauseClick}
            className="mt-6 w-full py-3 rounded-xl font-bold bg-white text-indigo-600 hover:bg-gray-50 transition-transform active:scale-95"
          >
            ⏸ Pause Protection
          </button>
        ) : (
          <button 
            onClick={handleEnableProtection}
            className="mt-6 w-full py-3 rounded-xl font-bold bg-white text-red-600 hover:bg-gray-50 transition-transform active:scale-95 shadow-md"
          >
            ▶️ Enable Protection
          </button>
        )}
        
        <div className={`mt-4 bg-white/10 p-3 rounded text-xs text-center ${isProtectionActive ? 'text-indigo-100' : 'text-red-100'}`}>
          {isProtectionActive ? '🔐 PIN required to pause' : '🛡️ Click to resume scanning instantly'}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-green-100">
          <p className="text-gray-400 text-xs font-bold uppercase">Images Scanned</p>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-2xl font-bold text-gray-800">
              {stats.scanned - stats.blocked}
            </span>
            <Activity className="w-4 h-4 text-green-500 mb-1" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-red-100">
          <p className="text-gray-400 text-xs font-bold uppercase">Blocked</p>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-2xl font-bold text-gray-800">{stats.blocked}</span>
            <AlertTriangle className="w-4 h-4 text-red-500 mb-1" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-purple-100">
          <p className="text-gray-400 text-xs font-bold uppercase">Videos Blocked</p>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-2xl font-bold text-gray-800">{stats.blockedVideos}</span>
            <AlertTriangle className="w-4 h-4 text-purple-500 mb-1" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-blue-100">
          <p className="text-gray-400 text-xs font-bold uppercase">Total Scanned</p>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-2xl font-bold text-gray-800">{stats.scanned}</span>
            <CheckCircle className="w-4 h-4 text-blue-500 mb-1" />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-800 mb-3">Active Features</h3>
        <div className="space-y-2 text-xs text-gray-600">
          <p>✅ Image detection & blocking</p>
          <p>✅ Video detection analysis</p>
          <p>✅ Offensive text highlighting</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          Powered by gemini-2.5-flash • Version 2.0
        </p>
      </div>
    </div>
  );
}

export default App;
