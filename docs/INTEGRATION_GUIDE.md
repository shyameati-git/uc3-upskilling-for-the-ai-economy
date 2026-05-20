# BuddyWork Unity AR Integration Guide

## For Anthony + Team — Hackathon Build Plan

---

## WHAT ANTHONY BUILDS (5 hours)

### Hour 0:00–0:30 — Project Setup
- Create new Unity project (Unity 2022+ LTS)
- Set platform to WebGL
- Import WebCamTexture support
- Create main scene with Canvas + RawImage for camera feed
- Add ShelfScanner.cs to a "ShelfScannerManager" GameObject
- Place BuddyWorkBridge.jslib in Assets/Plugins/WebGL/

### Hour 0:30–1:30 — Camera + Overlay System
- Set up WebCamTexture rendering to RawImage
- Create overlay container (RectTransform) on top of camera feed
- Build 3 prefabs (see below)
- Test camera feed + overlay positioning in Editor

### Hour 1:30–2:30 — Highlight Prefabs
Create these 3 prefabs:

#### Prefab 1: CorrectHighlight
```
GameObject structure:
├── CorrectHighlight (RectTransform)
│   ├── Border (Image, green #5A9E8F, outline only, 3px)
│   ├── CheckIcon (Image, green circle with white checkmark)
│   └── Label (Text, white, bold, shows call number)
```
- Border: Use Image component with "Outline" sprite, color #5A9E8F
- CheckIcon: 24x24, positioned top-right corner
- Label: Positioned bottom-center, font size 14, shadow for readability

#### Prefab 2: MisplacedHighlight  
```
GameObject structure:
├── MisplacedHighlight (RectTransform)
│   ├── Border (Image, yellow #D4920B, outline only, 3px)
│   ├── WarningIcon (Image, yellow triangle with !)
│   ├── Label (Text, white, bold, shows call number)
│   └── PulseAnimation (scales 1.0 → 1.03, 1.5s loop)
```
- Border: Use Image component, color #D4920B
- WarningIcon: 24x24, positioned top-right
- Subtle pulse animation so it draws eye without being jarring

#### Prefab 3: ArrowIndicator
```
GameObject structure:
├── ArrowIndicator (RectTransform)
│   ├── ArrowImage (Image, yellow downward arrow)
│   ├── Label (Text, "move here", yellow, bold)
│   └── BounceAnimation (ArrowBounce.cs, 8px, 2s)
```

### Hour 2:30–3:30 — OCR Integration Point

For the hackathon demo, two approaches ranked by feasibility:

#### Approach A: Simulated OCR (SAFEST for 5 hours)
- Use pre-taken photos of a shelf
- Hardcode book positions and call numbers
- ShelfScanner.cs already has this path in ScanSequence()
- Camera shows real feed, but detections are simulated
- This still demos the full AR overlay experience

#### Approach B: Real OCR (STRETCH GOAL)
- Shyameati's vision pipeline runs server-side
- Unity captures frame → sends to API → receives detections
- Add this method to ShelfScanner.cs:

```csharp
// Capture current camera frame and send to OCR API
private IEnumerator CaptureAndSendFrame()
{
    // Grab pixels from webcam
    Texture2D snap = new Texture2D(
        webcamTexture.width, 
        webcamTexture.height, 
        TextureFormat.RGB24, false
    );
    snap.SetPixels(webcamTexture.GetPixels());
    snap.Apply();
    
    byte[] jpgData = snap.EncodeToJPG(75);
    string base64 = System.Convert.ToBase64String(jpgData);
    
    // Send to Shyameati's OCR endpoint
    using (var request = new UnityWebRequest(
        "https://your-api.azurewebsites.net/api/ocr", "POST"))
    {
        var body = JsonUtility.ToJson(new OCRRequest { image = base64 });
        request.uploadHandler = new UploadHandlerRaw(
            System.Text.Encoding.UTF8.GetBytes(body)
        );
        request.downloadHandler = new DownloadHandlerBuffer();
        request.SetRequestHeader("Content-Type", "application/json");
        
        yield return request.SendWebRequest();
        
        if (request.result == UnityWebRequest.Result.Success)
        {
            var results = JsonUtility.FromJson<OCRResponse>(
                request.downloadHandler.text
            );
            ProcessOCRResults(results);
        }
    }
    
    Destroy(snap);
}
```

### Hour 3:30–4:00 — WebGL Build + React Integration
- Build WebGL (Development Build for faster iteration)
- Copy Build/ folder to React app's public/unity-build/
- Mukti integrates UnityScanner.jsx component
- Test the full flow: React task UI → Unity camera → React results

### Hour 4:00–5:00 — Polish + Demo Prep
- Fine-tune overlay positions
- Ensure smooth transitions between React and Unity
- Test on mobile browser (critical — this is a phone app)
- Rehearse demo flow

---

## UNITY WEBGL BUILD SETTINGS

In Unity → File → Build Settings → Player Settings:

```
Resolution & Presentation:
  - WebGL Template: Minimal
  - Canvas Width: 390  (mobile width)
  - Canvas Height: 280  (fits in app layout)

Publishing Settings:
  - Compression Format: Disabled (faster loading for demo)
  - Data Caching: Disabled (avoid stale cache during dev)

Other Settings:
  - Color Space: Gamma
  - Auto Graphics API: true
  - Strip Engine Code: false (keep for demo stability)
```

---

## FILE STRUCTURE AFTER BUILD

```
react-app/
├── public/
│   └── unity-build/
│       └── Build/
│           ├── ShelfScanner.data
│           ├── ShelfScanner.framework.js
│           ├── ShelfScanner.loader.js
│           └── ShelfScanner.wasm
├── src/
│   ├── App.jsx           (main BuddyWork app — buddywork_v3.jsx)
│   └── UnityScanner.jsx  (Unity wrapper component)
```

---

## HOW REACT AND UNITY TALK

### React → Unity (commands)
```javascript
// React sends commands via SendMessage
unityInstance.SendMessage("ShelfScannerManager", "StartCamera");
unityInstance.SendMessage("ShelfScannerManager", "BeginScan");
unityInstance.SendMessage("ShelfScannerManager", "StopCamera");
```

### Unity → React (results)
```
Unity C# calls:        SendScanResults(jsonString)
                              ↓
jslib bridge:           Converts to CustomEvent
                              ↓
Browser:                window.dispatchEvent("buddywork-scan-results")
                              ↓
React:                  useEffect listener catches event
                              ↓
App state:              setScanResults(data) → moves to results step
```

### Data format Unity sends back:
```json
{
  "totalBooks": 6,
  "correctCount": 4,
  "misplacedCount": 2,
  "books": [
    {
      "callNumber": "FIC ADA",
      "bounds": { "x": 0.05, "y": 0.2, "width": 0.12, "height": 0.6 },
      "isCorrectOrder": true
    },
    {
      "callNumber": "FIC HER",
      "bounds": { "x": 0.44, "y": 0.2, "width": 0.12, "height": 0.6 },
      "isCorrectOrder": false
    }
  ]
}
```

---

## COLOR SYSTEM (match React app exactly)

| Element          | Color   | Hex       |
|-----------------|---------|-----------|
| Correct border   | Green   | #5A9E8F   |
| Correct icon bg  | Green   | #5A9E8F   |
| Misplaced border | Yellow  | #D4920B   |
| Misplaced icon   | Yellow  | #D4920B   |
| Arrow indicator  | Yellow  | #D4920B   |
| Label text       | White   | #FFFFFF   |
| Label shadow     | Black   | #000000 40% opacity |

Shape + color rule (accessibility):
- Correct = CIRCLE with checkmark + green
- Misplaced = TRIANGLE with ! + yellow
- Never rely on color alone

---

## FALLBACK PLAN (if Unity WebGL is too heavy)

If Unity build takes too long or WebGL camera access fails on
the demo device, fall back to this approach:

1. Anthony exports just the AR overlay as a transparent PNG sequence
2. Mukti layers it on top of a static shelf photo in the React app
3. The "scanning" step shows a pre-recorded video/animation
4. Results still display with the same green/yellow system

This still demonstrates the concept convincingly.
The minimum demo is: photo in → highlights out.

---

## COORDINATION POINTS

| Time    | Who           | Does what                                    |
|---------|---------------|----------------------------------------------|
| 0:30    | Anthony + Mukti | Agree on canvas size, z-index, hide/show    |
| 1:00    | Anthony + Aysu  | Get highlight prefab colors/shapes right    |
| 2:00    | Anthony + Shyameati | Test OCR API endpoint (if doing real OCR) |
| 2:30    | Anthony + Joe   | WebGL build hosted on Azure                 |
| 3:30    | Anthony + Mukti | Full integration test on mobile browser     |
| 4:00    | All            | Demo rehearsal                               |
