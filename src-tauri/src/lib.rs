use tauri::Manager;

/// Ping command used to verify the desktop shell is wired up.
#[tauri::command]
fn greet(name: &str) -> String {
  format!("Hello {name}, from Shelfie desktop")
}

// ---------------------------------------------------------------------------
// Future native integrations (not implemented yet)
//
// - spotlight_index(books): push titles/authors/ISBNs into macOS Spotlight
//   via Core Spotlight / NSMetadataItem so ⌘-Space finds books offline.
// - quick_look_preview(book_id): QLPreviewItem provider for cover + metadata.
// - home_widgets: WidgetKit / App Intents for “Currently Reading” and streaks.
// - These require Apple entitlements and ship as follow-up Tauri plugins.
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![greet])
    .setup(|app| {
      if cfg!(debug_assertions) {
        let _ = app.get_webview_window("main");
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running Shelfie desktop");
}
