// Paste into script.google.com -> Deploy -> New deployment -> Web app
// Execute as: Me   |   Who has access: Anyone with the link
function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents);
    var folder = DriveApp.getRootFolder();
    p.folderPath.forEach(function (name) {
      var it = folder.getFoldersByName(name);
      folder = it.hasNext() ? it.next() : folder.createFolder(name);
    });
    folder.createFile(Utilities.newBlob(Utilities.base64Decode(p.data), p.mime, p.fileName));
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  }
}
