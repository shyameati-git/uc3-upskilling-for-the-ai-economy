using UnityEngine;
using UnityEngine.UI;
using System.Collections.Generic;
using System.Runtime.InteropServices;

/// <summary>
/// Main controller for the BuddyWork shelf scanning AR overlay.
/// Handles camera feed, receives OCR results, and renders 
/// green/yellow highlights on detected book spines.
/// </summary>
public class ShelfScanner : MonoBehaviour
{
    [Header("Camera")]
    public RawImage cameraDisplay;
    private WebCamTexture webcamTexture;

    [Header("UI Overlays")]
    public RectTransform overlayContainer;
    public GameObject correctHighlightPrefab;   // Green border + checkmark
    public GameObject misplacedHighlightPrefab; // Yellow border + triangle warning
    public GameObject arrowIndicatorPrefab;     // Arrow showing correct position

    [Header("Progress")]
    public Slider scanProgressBar;
    public Text statusText;

    // Book data from OCR
    private List<BookScanResult> scannedBooks = new List<BookScanResult>();
    private bool isScanning = false;

    // ============================================================
    // JS BRIDGE - React calls these via SendMessage
    // ============================================================

    /// <summary>
    /// Called by React when user reaches camera step.
    /// Activates camera and prepares for scanning.
    /// </summary>
    public void StartCamera()
    {
        Debug.Log("[BuddyWork] Starting camera");
        
        if (WebCamTexture.devices.Length > 0)
        {
            // Prefer rear camera for shelf scanning
            string cameraName = "";
            foreach (var device in WebCamTexture.devices)
            {
                if (!device.isFrontFacing)
                {
                    cameraName = device.name;
                    break;
                }
            }

            webcamTexture = new WebCamTexture(cameraName, 1280, 720, 30);
            cameraDisplay.texture = webcamTexture;
            webcamTexture.Play();

            statusText.text = "Camera ready";
        }
        else
        {
            statusText.text = "No camera found";
            // Fallback: use test image for demo
            LoadTestShelfImage();
        }
    }

    /// <summary>
    /// Called by React when user taps "Scan now".
    /// Begins the scanning process.
    /// </summary>
    public void BeginScan()
    {
        isScanning = true;
        scannedBooks.Clear();
        ClearOverlays();
        StartCoroutine(ScanSequence());
    }

    /// <summary>
    /// Called by React to shut down camera when leaving scan steps.
    /// </summary>
    public void StopCamera()
    {
        isScanning = false;
        if (webcamTexture != null && webcamTexture.isPlaying)
        {
            webcamTexture.Stop();
        }
        ClearOverlays();
    }

    // ============================================================
    // SCANNING LOGIC
    // ============================================================

    private System.Collections.IEnumerator ScanSequence()
    {
        float progress = 0f;
        statusText.text = "Scanning...";

        // Simulate scanning progress while OCR processes
        // In production, this would be driven by actual OCR callbacks
        while (progress < 1f && isScanning)
        {
            progress += Time.deltaTime * 0.25f; // ~4 seconds total
            scanProgressBar.value = progress;

            // At certain thresholds, "find" books
            // In production: replace with actual OCR detections
            if (progress > 0.15f && scannedBooks.Count < 1)
                AddDetectedBook("FIC ADA", new Rect(0.05f, 0.2f, 0.12f, 0.6f), true);
            if (progress > 0.3f && scannedBooks.Count < 2)
                AddDetectedBook("FIC BRA", new Rect(0.18f, 0.2f, 0.12f, 0.6f), true);
            if (progress > 0.45f && scannedBooks.Count < 3)
                AddDetectedBook("FIC CLA", new Rect(0.31f, 0.2f, 0.12f, 0.6f), true);
            if (progress > 0.6f && scannedBooks.Count < 4)
                AddDetectedBook("FIC HER", new Rect(0.44f, 0.2f, 0.12f, 0.6f), false);
            if (progress > 0.75f && scannedBooks.Count < 5)
                AddDetectedBook("FIC DIC", new Rect(0.57f, 0.2f, 0.12f, 0.6f), false);
            if (progress > 0.9f && scannedBooks.Count < 6)
                AddDetectedBook("FIC LEG", new Rect(0.70f, 0.2f, 0.12f, 0.6f), true);

            yield return null;
        }

        if (isScanning)
        {
            scanProgressBar.value = 1f;
            statusText.text = "Scan complete";
            ShowResults();
            SendResultsToReact();
        }
    }

    private void AddDetectedBook(string callNumber, Rect normalizedBounds, bool isCorrect)
    {
        var book = new BookScanResult
        {
            callNumber = callNumber,
            bounds = normalizedBounds,
            isCorrectOrder = isCorrect
        };
        scannedBooks.Add(book);

        // Show real-time highlight as each book is detected
        ShowBookHighlight(book, false);

        statusText.text = $"Found {scannedBooks.Count} books";
    }

    // ============================================================
    // AR OVERLAY RENDERING
    // ============================================================

    private void ShowBookHighlight(BookScanResult book, bool showFinalStatus)
    {
        // Convert normalized camera coordinates to overlay UI coordinates
        Vector2 containerSize = overlayContainer.rect.size;

        float x = book.bounds.x * containerSize.x;
        float y = book.bounds.y * containerSize.y;
        float w = book.bounds.width * containerSize.x;
        float h = book.bounds.height * containerSize.y;

        // Pick prefab based on status
        GameObject prefab;
        if (!showFinalStatus)
        {
            // During scanning: neutral highlight (just detected)
            prefab = correctHighlightPrefab;
        }
        else
        {
            prefab = book.isCorrectOrder ? correctHighlightPrefab : misplacedHighlightPrefab;
        }

        GameObject highlight = Instantiate(prefab, overlayContainer);
        RectTransform rt = highlight.GetComponent<RectTransform>();

        rt.anchorMin = new Vector2(0, 0);
        rt.anchorMax = new Vector2(0, 0);
        rt.pivot = new Vector2(0, 0);
        rt.anchoredPosition = new Vector2(x, y);
        rt.sizeDelta = new Vector2(w, h);

        // Set call number label
        Text label = highlight.GetComponentInChildren<Text>();
        if (label != null)
        {
            label.text = book.callNumber;
        }
    }

    private void ShowResults()
    {
        ClearOverlays();

        foreach (var book in scannedBooks)
        {
            ShowBookHighlight(book, true);

            // For misplaced books, show arrow indicating correct position
            if (!book.isCorrectOrder)
            {
                ShowArrowIndicator(book);
            }
        }
    }

    private void ShowArrowIndicator(BookScanResult book)
    {
        Vector2 containerSize = overlayContainer.rect.size;

        GameObject arrow = Instantiate(arrowIndicatorPrefab, overlayContainer);
        RectTransform rt = arrow.GetComponent<RectTransform>();

        float bookCenterX = (book.bounds.x + book.bounds.width * 0.5f) * containerSize.x;
        float bookTop = book.bounds.y * containerSize.y;

        rt.anchoredPosition = new Vector2(bookCenterX, bookTop - 40f);

        // Animate arrow bouncing
        var anim = arrow.AddComponent<ArrowBounce>();
        anim.bounceAmount = 8f;
        anim.bounceSpeed = 2f;
    }

    private void ClearOverlays()
    {
        foreach (Transform child in overlayContainer)
        {
            Destroy(child.gameObject);
        }
    }

    // ============================================================
    // JS BRIDGE - Unity sends results back to React
    // ============================================================

#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void SendScanResults(string jsonResults);

    [DllImport("__Internal")]
    private static extern void SendScanProgress(float progress);
#else
    // Editor stubs
    private static void SendScanResults(string jsonResults)
    {
        Debug.Log("[BuddyWork] SendScanResults: " + jsonResults);
    }
    private static void SendScanProgress(float progress)
    {
        Debug.Log("[BuddyWork] Progress: " + progress);
    }
#endif

    private void SendResultsToReact()
    {
        var results = new ScanResultsPayload
        {
            totalBooks = scannedBooks.Count,
            correctCount = scannedBooks.FindAll(b => b.isCorrectOrder).Count,
            misplacedCount = scannedBooks.FindAll(b => !b.isCorrectOrder).Count,
            books = scannedBooks.ToArray()
        };

        string json = JsonUtility.ToJson(results);
        SendScanResults(json);
    }

    // ============================================================
    // FALLBACK FOR DEMO (no real camera)
    // ============================================================

    private void LoadTestShelfImage()
    {
        // Load a pre-baked shelf image for demo purposes
        // when real camera isn't available
        Texture2D testImage = Resources.Load<Texture2D>("TestShelf");
        if (testImage != null)
        {
            cameraDisplay.texture = testImage;
        }
    }
}

// ============================================================
// DATA STRUCTURES
// ============================================================

[System.Serializable]
public class BookScanResult
{
    public string callNumber;
    public Rect bounds;         // Normalized 0-1 coordinates on camera feed
    public bool isCorrectOrder;
}

[System.Serializable]
public class ScanResultsPayload
{
    public int totalBooks;
    public int correctCount;
    public int misplacedCount;
    public BookScanResult[] books;
}

// Simple bounce animation for arrow indicators
public class ArrowBounce : MonoBehaviour
{
    public float bounceAmount = 8f;
    public float bounceSpeed = 2f;
    private Vector3 startPos;

    void Start()
    {
        startPos = transform.localPosition;
    }

    void Update()
    {
        float offset = Mathf.Sin(Time.time * bounceSpeed) * bounceAmount;
        transform.localPosition = startPos + new Vector3(0, offset, 0);
    }
}
