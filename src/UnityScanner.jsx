// ============================================================
// UnityScanner.jsx
// React component that embeds Unity WebGL for camera/AR steps
// Drop this into the main BuddyWork app
// ============================================================

import { useEffect, useRef, useState, useCallback } from "react";

// Unity WebGL build files (Anthony builds these)
const UNITY_BUILD_URL = "/unity-build";
const UNITY_CONFIG = {
  dataUrl: `${UNITY_BUILD_URL}/Build/ShelfScanner.data`,
  frameworkUrl: `${UNITY_BUILD_URL}/Build/ShelfScanner.framework.js`,
  codeUrl: `${UNITY_BUILD_URL}/Build/ShelfScanner.wasm`,
  streamingAssetsUrl: `${UNITY_BUILD_URL}/StreamingAssets`,
};

// The Unity GameObject that has ShelfScanner.cs attached
const SCANNER_OBJECT = "ShelfScannerManager";

export default function UnityScanner({ 
  isActive,       // true when React wants Unity to show
  onScanComplete, // callback: (results) => void
  onProgress,     // callback: (progress 0-100) => void
  command,        // "startCamera" | "beginScan" | "stopCamera"
}) {
  const canvasRef = useRef(null);
  const unityRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  // ---- Load Unity WebGL instance ----
  useEffect(() => {
    if (!isActive || loaded) return;

    const script = document.createElement("script");
    script.src = `${UNITY_BUILD_URL}/Build/ShelfScanner.loader.js`;
    script.onload = async () => {
      try {
        const instance = await window.createUnityInstance(
          canvasRef.current,
          UNITY_CONFIG,
          (progress) => setLoadProgress(Math.round(progress * 100))
        );
        unityRef.current = instance;

        // Also expose globally so the jslib bridge can find it
        window.unityInstance = instance;
        setLoaded(true);
      } catch (err) {
        console.error("Unity load failed:", err);
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [isActive]);

  // ---- Send commands from React to Unity ----
  useEffect(() => {
    if (!loaded || !unityRef.current || !command) return;

    const unity = unityRef.current;

    switch (command) {
      case "startCamera":
        unity.SendMessage(SCANNER_OBJECT, "StartCamera");
        break;
      case "beginScan":
        unity.SendMessage(SCANNER_OBJECT, "BeginScan");
        break;
      case "stopCamera":
        unity.SendMessage(SCANNER_OBJECT, "StopCamera");
        break;
    }
  }, [command, loaded]);

  // ---- Listen for results from Unity ----
  useEffect(() => {
    const handleResults = (e) => {
      if (onScanComplete) {
        onScanComplete(e.detail);
      }
    };

    const handleProgress = (e) => {
      if (onProgress) {
        onProgress(Math.round(e.detail.progress * 100));
      }
    };

    window.addEventListener("buddywork-scan-results", handleResults);
    window.addEventListener("buddywork-scan-progress", handleProgress);

    return () => {
      window.removeEventListener("buddywork-scan-results", handleResults);
      window.removeEventListener("buddywork-scan-progress", handleProgress);
    };
  }, [onScanComplete, onProgress]);

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => {
      if (unityRef.current) {
        unityRef.current.SendMessage(SCANNER_OBJECT, "StopCamera");
        unityRef.current.Quit();
      }
    };
  }, []);

  if (!isActive) return null;

  return (
    <div style={{
      width: "100%",
      borderRadius: 16,
      overflow: "hidden",
      background: "#1E1E1E",
      position: "relative",
    }}>
      {/* Unity WebGL canvas */}
      <canvas
        ref={canvasRef}
        id="unity-canvas"
        style={{
          width: "100%",
          height: 280,
          display: "block",
        }}
      />

      {/* Loading overlay */}
      {!loaded && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1E1E1E",
          gap: 12,
        }}>
          <span style={{ fontSize: 36 }}>📷</span>
          <span style={{
            color: "#5A9E8F",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "'Nunito', sans-serif",
          }}>
            Loading camera... {loadProgress}%
          </span>
          <div style={{
            width: "60%",
            height: 6,
            borderRadius: 3,
            background: "#333",
            overflow: "hidden",
          }}>
            <div style={{
              width: `${loadProgress}%`,
              height: "100%",
              borderRadius: 3,
              background: "#5A9E8F",
              transition: "width 0.2s ease",
            }} />
          </div>
        </div>
      )}
    </div>
  );
}


// ============================================================
// USAGE IN MAIN BUDDYWORK APP
// ============================================================
//
// import UnityScanner from "./UnityScanner";
//
// // In your component:
// const [unityCommand, setUnityCommand] = useState(null);
// const [scanResults, setScanResults] = useState(null);
// const [scanProgress, setScanProgress] = useState(0);
//
// // When user reaches camera step:
// setUnityCommand("startCamera");
//
// // When user taps "Scan now":
// setUnityCommand("beginScan");
//
// // When leaving scan steps:
// setUnityCommand("stopCamera");
//
// <UnityScanner
//   isActive={step === "camera" || step === "scanning" || step === "results"}
//   command={unityCommand}
//   onScanComplete={(results) => {
//     setScanResults(results);
//     setStep("results");
//   }}
//   onProgress={(p) => setScanProgress(p)}
// />
