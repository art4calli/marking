/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const APPS_SCRIPT_GUIDE_AR = `
### 📚 دليل ربط الموقع الجديد بجدول بيانات قوقل (Google Sheets) مجاناً بالكامل

لقد تم تصميم الموقع الجديد ليتصل مباشرة بجدول بيانات قوقل الخاص بك ومجلد قوقل درايف دون الحاجة لأي خوادم مدفوعة أو إعدادات معقدة. يتم ذلك عن طريق تحويل كود **Google Apps Script** الخاص بك إلى **بوابة برمجية (API)** يستدعيها الموقع.

---

### ⚙️ خطوات التنفيذ خطوة بخطوة:

1. **افتح جدول البيانات الخاص بك** (Google Sheet) المتصل بالنظام.
2. من القائمة العلوية، اضغط على **Extensions** (الإضافات) ثم اختر **Apps Script**.
3. قم بمسح كافة الأكواد الحالية في ملف \`Code.gs\`.
4. انسخ الكود البرمجي الموحد الجديد الموضح بالأسفل بالكامل، والصقه في ملف \`Code.gs\`.
5. قم بتعديل قيمة معرف جدول البيانات \`spreadsheetId\` في الكود (السطر 5) ليكون معرف الجدول الخاص بك:
   \`\`\`javascript
   var SPREADSHEET_ID = "معرف_جدول_بياناتك_هنا";
   \`\`\`
6. اضغط على زر **Save** (حفظ - أيقونة القرص المرن 💾).
7. اضغط على زر **Deploy** (نشر) في الزاوية العلوية اليمنى، ثم اختر **New deployment** (نشر جديد).
8. اضغط على أيقونة الترس بجانب "Select type" واختر **Web app** (تطبيق ويب).
9. قم بضبط الإعدادات التالية بدقة:
   - **Description**: \`Grading API\`
   - **Execute as**: \`Me (بريدي الإلكتروني)\` (هام جداً لتشغيل العمليات بصلاحياتك في قوقل درايف)
   - **Who has access**: \`Anyone\` (أي شخص - هذا يسمح للموقع بالاتصال بالـ API بشكل مجاني وسلس)
10. اضغط على زر **Deploy**. قد يطلب منك قوقل "Authorize access" (منح الصلاحيات)، اضغط عليها واختر حسابك ثم اضغط على "Advanced" ثم "Go to ... (unsafe)" لمنح الصلاحيات اللازمة لقراءة وكتابة الملفات والجدول.
11. بعد إتمام النشر، سيظهر لك رابط يسمى **Web app URL** ينتهي بـ \`/exec\`.
12. **انسخ هذا الرابط**، وافتحه في إعدادات الموقع الجديد (لوحة إعدادات الاتصال)، وسيصبح موقعك متصلاً بشكل حي ومباشر بقوقل شيت وقوقل درايف!

---

### 📋 كود Apps Script الجديد الموحد (انسخه بالكامل):
`;

export const APPS_SCRIPT_CODE = `/**
 * Google Apps Script API Gateway for Grading Web Application
 * 100% Free - Enables CORS and handles secure read/write requests from React Frontend.
 */

var SPREADSHEET_ID = "1F3hDUfjgBEkUAIOaF66634EWQQ8XZSdyKjlTzrVA25k"; // استبدله بمعرف جدول البيانات الخاص بك إذا اختلف

// دالة لمعالجة طلبات GET
function doGet(e) {
  var action = e.parameter.action;
  var callback = e.parameter.callback;
  var result = {};
  
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    if (action === "getProfile") {
      result = getProfileData(ss);
    } else if (action === "getTableData") {
      result = getTableData(ss);
    } else if (action === "getAdditionalHeaders") {
      result = getAdditionalHeaders(ss);
    } else if (action === "getPredefinedTexts") {
      result = getPredefinedTexts(ss);
    } else if (action === "getStickerUrls") {
      result = getStickerUrls(ss);
    } else if (action === "getWatermarkSettings") {
      result = getWatermarkSettings(ss);
    } else if (action === "getSavedData") {
      var row = parseInt(e.parameter.row);
      result = getSavedData(ss, row);
    } else if (action === "getMediaAsBase64") {
      var fileId = e.parameter.fileId;
      result = { base64: getMediaAsBase64(fileId) };
    } else if (action === "getUsers") {
      result = getUsers(ss);
    } else {
      result = { error: "الإجراء غير معروف" };
    }
  } catch (err) {
    result = { error: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// دالة لمعالجة طلبات POST
function doPost(e) {
  var result = {};
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    if (action === "loginUser") {
      result = loginUser(ss, postData.username, postData.deviceId, postData.lat, postData.lng);
    } else if (action === "saveAllMedia") {
      result = saveAllMedia(
        ss,
        postData.canvasBase64,
        postData.canvasFilename,
        postData.imageBase64,
        postData.imageFilename,
        postData.videoBase64,
        postData.videoFilename,
        postData.audioBase64,
        postData.audioFilename,
        parseInt(postData.row),
        postData.notes,
        postData.imageGrade,
        postData.audioGrade
      );
    } else {
      result = { error: "الإجراء غير معروف في طلب POST" };
    }
  } catch (err) {
    result = { error: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------- الدوال المساعدة ----------------------

function getProfileData(ss) {
  var profileSheet = ss.getSheetByName('Profile');
  var contactSheet = ss.getSheetByName('Contact');
  var profileData = profileSheet ? profileSheet.getDataRange().getValues() : [];
  var contactData = contactSheet ? contactSheet.getDataRange().getValues() : [];
  return {
    profile: profileData.slice(1),
    contact: contactData.slice(1)
  };
}

function extractFileId(url) {
  if (!url) return null;
  var cleanUrl = url.split('?')[0];
  var regex = /\\/(?:d|folders)\\/([a-zA-Z0-9_-]+)/;
  var match = cleanUrl.match(regex);
  if (match && match[1]) {
    return match[1];
  }
  return url;
}

function getTableData(ss) {
  var sheet = ss.getSheetByName('A1');
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  var range = sheet.getRange('A2:Y' + lastRow).getValues();
  var displayRange = sheet.getRange('T2:Y' + lastRow).getDisplayValues();
  var data = [];
  
  for (var i = 0; i < range.length; i++) {
    var imageUrl = range[i][4]; // E: رابط الصورة
    var audioUrl = range[i][6]; // G: رابط الصوت
    var hasImage = !!imageUrl;
    var hasAudio = !!audioUrl;
  
    var imageFileId = null;
    var imageMimeType = null;
    if (hasImage) {
      try {
        imageFileId = extractFileId(imageUrl);
        imageMimeType = "image/jpeg"; // افتراضي لتفادي ثقل التحميل المسبق
      } catch (e) {}
    }
  
    var audioFileId = null;
    var audioMimeType = null;
    if (hasAudio) {
      try {
        audioFileId = extractFileId(audioUrl);
        audioMimeType = "audio/mpeg"; // افتراضي
      } catch (e) {}
    }
  
    data.push({
      studentId: range[i][0], // A
      studentName: range[i][1], // B
      lessonNumber: range[i][2], // C
      imageSubmissionCount: range[i][3] || 0, // D
      imageFileId: imageFileId,
      imageMimeType: imageMimeType,
      audioSubmissionCount: range[i][5] || 0, // F
      audioFileId: audioFileId,
      audioMimeType: audioMimeType,
      additionalT: displayRange[i][0] || "", // T
      additionalU: displayRange[i][1] || "", // U
      additionalV: displayRange[i][2] || "", // V
      additionalW: displayRange[i][3] || "", // W
      additionalX: displayRange[i][4] || "", // X
      additionalY: displayRange[i][5] || "", // Y
      row: i + 2,
      isSaved: range[i][7] === 'تم' // H
    });
  }
  return data;
}

function getAdditionalHeaders(ss) {
  var sheet = ss.getSheetByName('A1');
  if (!sheet) return [];
  var headersRange = sheet.getRange('T1:Y1').getValues()[0];
  return headersRange.map(function(header) { 
    return header ? header.toString().trim() : ''; 
  });
}

function getPredefinedTexts(ss) {
  var settingsSheet = ss.getSheetByName('Settings');
  if (!settingsSheet) return [];
  var lastRow = settingsSheet.getLastRow();
  if (lastRow < 2) return [];
  var range = settingsSheet.getRange('D2:E' + lastRow).getValues();
  var texts = [];
  for (var i = 0; i < range.length; i++) {
    var phrase = range[i][0] ? range[i][0].toString().trim() : '';
    var title = range[i][1] ? range[i][1].toString().trim() : '';
    if (phrase && title) {
      texts.push({ title: title, phrase: phrase });
    }
  }
  return texts;
}

function getMediaAsBase64(fileId) {
  try {
    var file = DriveApp.getFileById(fileId);
    var blob = file.getBlob();
    var contentType = blob.getContentType();
    var base64 = Utilities.base64Encode(blob.getBytes());
    return "data:" + contentType + ";base64," + base64;
  } catch (e) {
    return "";
  }
}

function getStickerUrls(ss) {
  var settingsSheet = ss.getSheetByName('Settings');
  if (!settingsSheet) return [];
  var lastRow = settingsSheet.getLastRow();
  if (lastRow < 3) return [];
  var range = settingsSheet.getRange('B3:B' + lastRow).getValues();
  var stickerUrls = [];
  for (var i = 0; i < range.length; i++) {
    if (range[i][0]) {
      try {
        var fileId = extractFileId(range[i][0]);
        stickerUrls.push(fileId);
      } catch (e) {}
    }
  }
  return stickerUrls;
}

function getWatermarkSettings(ss) {
  var settingsSheet = ss.getSheetByName('Settings');
  if (!settingsSheet) return { logoUrl: '', opacity: 1, sizeFactor: 1, logoPosition: 'bottom-right', textPrefix: '', fontSize: 20, textPosition: 'bottom-left' };
  var range = settingsSheet.getRange('G2:G8').getValues();
  return {
    logoUrl: range[0][0] ? range[0][0].toString().trim() : '',
    opacity: range[1][0] ? parseFloat(range[1][0]) : 1,
    sizeFactor: range[2][0] ? parseFloat(range[2][0]) : 1,
    logoPosition: range[3][0] ? range[3][0].toString().trim() : 'bottom-right',
    textPrefix: range[4][0] ? range[4][0].toString().trim() : '',
    fontSize: range[5][0] ? parseInt(range[5][0]) : 20,
    textPosition: range[6][0] ? range[6][0].toString().trim() : 'bottom-left'
  };
}

function getSavedData(ss, row) {
  try {
    var sheet = ss.getSheetByName('A1');
    var range = sheet.getRange('I' + row + ':O' + row).getValues()[0];
    var data = {
      notes: range[0] || '', // I
      imageGrade: range[1] || '', // J
      modifiedImage: '',
      audioGrade: range[3] || '', // L
      additionalImage: '',
      video: '',
      audio: ''
    };
    if (range[2]) { // K
      try {
        var fileId = extractFileId(range[2]);
        data.modifiedImage = getMediaAsBase64(fileId);
      } catch (e) {}
    }
    if (range[4]) { // M
      try {
        var fileId = extractFileId(range[4]);
        data.additionalImage = getMediaAsBase64(fileId);
      } catch (e) {}
    }
    if (range[5]) { // N
      try {
        var fileId = extractFileId(range[5]);
        data.video = getMediaAsBase64(fileId);
      } catch (e) {}
    }
    if (range[6]) { // O
      try {
        var fileId = extractFileId(range[6]);
        data.audio = getMediaAsBase64(fileId);
      } catch (e) {}
    }
    return data;
  } catch (e) {
    return { error: e.toString() };
  }
}

function getUsers(ss) {
  var settingsSheet = ss.getSheetByName('Settings');
  if (!settingsSheet) return [];
  var lastRow = settingsSheet.getLastRow();
  if (lastRow < 2) return [];
  var usersData = settingsSheet.getRange('Z2:AB' + lastRow).getValues();
  return usersData.map(function(row) {
    return {
      username: row[0] ? row[0].toString().trim() : '',
      password: row[1] ? row[1].toString().trim() : '',
      status: row[2] ? row[2].toString().trim() : ''
    };
  }).filter(function(user) { 
    return user.username !== ''; 
  });
}

function loginUser(ss, username, deviceId, lat, lng) {
  try {
    var settingsSheet = ss.getSheetByName('Settings');
    var usersRange = settingsSheet.getRange("Z2:AX" + settingsSheet.getLastRow());
    var usersData = usersRange.getValues();
    var userRow = -1;
    for (var i = 0; i < usersData.length; i++) {
      if (usersData[i][0].toString().trim() === username) {
        userRow = i + 2;
        break;
      }
    }
    if (userRow === -1) {
      return { success: false, message: 'مستخدم غير موجود' };
    }
    
    var deviceColumns = [
      {locationCol: 30, deviceCol: 31}, // AE=30, AF=31
      {locationCol: 32, deviceCol: 33}, // AG, AH
      {locationCol: 34, deviceCol: 35}, // AI, AJ
      {locationCol: 36, deviceCol: 37}, // AK, AL
      {locationCol: 38, deviceCol: 39}, // AM, AN
      {locationCol: 40, deviceCol: 41}, // AO, AP
      {locationCol: 42, deviceCol: 43}, // AQ, AR
      {locationCol: 44, deviceCol: 45}, // AS, AT
      {locationCol: 46, deviceCol: 47}, // AU, AV
      {locationCol: 48, deviceCol: 49}  // AW, AX
    ];
    
    var allowedDevices = parseInt(settingsSheet.getRange(userRow, 29).getValue()) || 1;
    allowedDevices = Math.min(allowedDevices, 10);
    
    var deviceIndex = -1;
    for (var j = 0; j < allowedDevices; j++) {
      var currentDeviceId = settingsSheet.getRange(userRow, deviceColumns[j].deviceCol).getValue().toString().trim();
      if (currentDeviceId === deviceId) {
        deviceIndex = j;
        break;
      }
    }
    
    var registeredCount = 0;
    for (var j = 0; j < allowedDevices; j++) {
      if (settingsSheet.getRange(userRow, deviceColumns[j].deviceCol).getValue().toString().trim() !== '') {
        registeredCount++;
      }
    }
    
    if (deviceIndex === -1) {
      if (registeredCount >= allowedDevices) {
        return { success: false, message: 'تم تجاوز عدد الأجهزة المسموحة' };
      }
      for (var j = 0; j < allowedDevices; j++) {
        if (settingsSheet.getRange(userRow, deviceColumns[j].deviceCol).getValue().toString().trim() === '') {
          deviceIndex = j;
          break;
        }
      }
    }
    
    var location = 'غير متاح';
    if (lat && lng) {
      try {
        var geocoder = Maps.newGeocoder().reverseGeocode(lat, lng);
        if (geocoder.results && geocoder.results.length > 0) {
          location = geocoder.results[0].formatted_address;
        }
      } catch (e) {
        location = "خط العرض: " + lat + ", خط الطول: " + lng;
      }
    }
    
    if (deviceIndex !== -1) {
      settingsSheet.getRange(userRow, deviceColumns[deviceIndex].locationCol).setValue(location);
      settingsSheet.getRange(userRow, deviceColumns[deviceIndex].deviceCol).setValue(deviceId);
    } else {
      return { success: false, message: 'خطأ في تسجيل الجهاز' };
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: 'خطأ في الدخول: ' + e.toString() };
  }
}

function saveAllMedia(
  ss,
  canvasBase64,
  canvasFilename,
  imageBase64,
  imageFilename,
  videoBase64,
  videoFilename,
  audioBase64,
  audioFilename,
  row,
  notes,
  imageGrade,
  audioGrade
) {
  try {
    var sheet = ss.getSheetByName('A1');
    var settingsSheet = ss.getSheetByName('Settings');
    var folderUrl = settingsSheet.getRange('B2').getValue();
    if (!folderUrl) {
      throw new Error('خلية Settings!B2 فارغة. يرجى إدخال رابط مجلد صالح.');
    }
    var folderId = extractFileId(folderUrl);
    var folder = DriveApp.getFolderById(folderId);
    var urls = {};

    var currentH = sheet.getRange('H' + row).getValue();
    if (currentH !== 'تم') {
      var currentQ = sheet.getRange('Q' + row).getValue() || 0;
      sheet.getRange('Q' + row).setValue(parseInt(currentQ) + 1);
      sheet.getRange('I' + row + ':P' + row).clearContent();
    }

    var currentData = sheet.getRange('I' + row + ':O' + row).getValues()[0];
    var existingModifiedImageUrl = currentData[2] || '';
    var existingAdditionalImageUrl = currentData[4] || '';
    var existingVideoUrl = currentData[5] || '';
    var existingAudioUrl = currentData[6] || '';

    // حفظ صورة الـ canvas
    if (canvasBase64 && canvasBase64.startsWith('data:image/')) {
      var content = canvasBase64.replace(/^data:image\\/\\w+;base64,/, "");
      var decodedBytes = Utilities.base64Decode(content);
      var mimeType = canvasBase64.match(/^data:image\\/(\\w+);base64,/)[1];
      var blob = Utilities.newBlob(decodedBytes, 'image/' + mimeType, canvasFilename);
      var file = folder.createFile(blob);
      urls.modified = file.getUrl();
    } else {
      urls.modified = existingModifiedImageUrl;
    }
    
    // حفظ الصورة الإضافية
    if (imageBase64 && imageBase64.startsWith('data:image/')) {
      var content = imageBase64.replace(/^data:image\\/\\w+;base64,/, "");
      var decodedBytes = Utilities.base64Decode(content);
      var mimeType = imageBase64.match(/^data:image\\/(\\w+);base64,/)[1];
      var blob = Utilities.newBlob(decodedBytes, 'image/' + mimeType, imageFilename);
      var file = folder.createFile(blob);
      urls.image = file.getUrl();
    } else {
      urls.image = existingAdditionalImageUrl;
    }
    
    // حفظ الفيديو
    if (videoBase64 && videoBase64.startsWith('data:video/')) {
      var content = videoBase64.replace(/^data:video\\/\\w+;base64,/, "");
      var decodedBytes = Utilities.base64Decode(content);
      var mimeType = videoBase64.match(/^data:video\\/(\\w+);base64,/)[1];
      var blob = Utilities.newBlob(decodedBytes, 'video/' + mimeType, videoFilename);
      var file = folder.createFile(blob);
      urls.video = file.getUrl();
    } else {
      urls.video = existingVideoUrl;
    }
    
    // حفظ الصوت
    if (audioBase64 && audioBase64.startsWith('data:audio/')) {
      var content = audioBase64.replace(/^data:audio\\/\\w+;base64,/, "");
      var decodedBytes = Utilities.base64Decode(content);
      var mimeType = audioBase64.match(/^data:audio\\/(\\w+);base64,/)[1];
      var blob = Utilities.newBlob(decodedBytes, 'audio/' + mimeType, audioFilename);
      var file = folder.createFile(blob);
      urls.audio = file.getUrl();
    } else {
      urls.audio = existingAudioUrl;
    }

    var currentDate = new Date();
    var formattedDate = Utilities.formatDate(currentDate, "GMT+03:00", "yyyy-MM-dd HH:mm:ss");
    
    sheet.getRange('I' + row).setValue(notes || '');
    sheet.getRange('J' + row).setValue(imageGrade || '');
    sheet.getRange('L' + row).setValue(audioGrade || '');
    sheet.getRange('P' + row).setValue(formattedDate);
    sheet.getRange('H' + row).setValue('تم');
    
    if (urls.modified) sheet.getRange('K' + row).setValue(urls.modified);
    if (urls.image) sheet.getRange('M' + row).setValue(urls.image);
    if (urls.video) sheet.getRange('N' + row).setValue(urls.video);
    if (urls.audio) sheet.getRange('O' + row).setValue(urls.audio);

    // الحفظ في التاريخ CorrectionHistory
    var historySheet = ss.getSheetByName('CorrectionHistory');
    if (!historySheet) {
      historySheet = ss.insertSheet('CorrectionHistory');
      var headers = sheet.getRange('A1:Q1').getValues();
      historySheet.getRange('A1:Q1').setValues(headers);
      historySheet.getRange('R1').setValue('تاريخ الحفظ');
    }
    var rowData = sheet.getRange('A' + row + ':Q' + row).getValues();
    rowData[0].push(formattedDate);
    var lastRowHistory = historySheet.getLastRow();
    historySheet.getRange(lastRowHistory + 1, 1, 1, rowData[0].length).setValues(rowData);

    return urls;
  } catch (e) {
    return { error: e.toString() };
  }
}
`;
