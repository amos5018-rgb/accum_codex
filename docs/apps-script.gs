function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('records');
  var payload = JSON.parse(e.postData.contents);

  sheet.appendRow([
    payload.id,
    payload.createdAt,
    payload.teacherId,
    payload.teacherName,
    payload.subjectId,
    payload.subjectName,
    payload.classId,
    payload.className,
    payload.studentId,
    payload.studentName,
    payload.lessonTopic,
    (payload.achievementTags || []).join(', '),
    payload.observation,
    payload.growthNote,
    payload.nextGuide
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
