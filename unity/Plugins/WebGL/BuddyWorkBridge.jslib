// ============================================================
// BuddyWork JavaScript Bridge Plugin
// Place this file at: Assets/Plugins/WebGL/BuddyWorkBridge.jslib
//
// This enables two-way communication:
//   React  → Unity : window.unityInstance.SendMessage(...)
//   Unity  → React : mergeIntoLibrary functions below
// ============================================================

mergeIntoLibrary({

    // Called by Unity C# when scan results are ready
    // Passes JSON string to React callback
    SendScanResults: function(jsonPtr) {
        var json = UTF8ToString(jsonPtr);

        // Fire custom event that React listens for
        var event = new CustomEvent('buddywork-scan-results', {
            detail: JSON.parse(json)
        });
        window.dispatchEvent(event);

        // Also call direct callback if registered
        if (window.onBuddyWorkScanResults) {
            window.onBuddyWorkScanResults(JSON.parse(json));
        }
    },

    // Called by Unity C# during scanning to report progress (0-1)
    SendScanProgress: function(progress) {
        var event = new CustomEvent('buddywork-scan-progress', {
            detail: { progress: progress }
        });
        window.dispatchEvent(event);

        if (window.onBuddyWorkScanProgress) {
            window.onBuddyWorkScanProgress(progress);
        }
    }
});
