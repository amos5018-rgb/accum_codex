const fs = require('fs/promises');
const path = require('path');
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const SCHOOL_FILE = path.join(DATA_DIR, 'school.json');
const LOCAL_RECORDS_FILE = path.join(DATA_DIR, 'local-records.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const GOOGLE_APPS_SCRIPT_WEBHOOK = process.env.GOOGLE_APPS_SCRIPT_WEBHOOK;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function validateRecord(input) {
  const required = [
    'teacherId', 'teacherName', 'subjectId', 'subjectName',
    'classId', 'className', 'studentId', 'studentName', 'observation'
  ];

  for (const key of required) {
    if (typeof input[key] !== 'string' || !input[key].trim()) {
      return `${key} 값이 필요합니다.`;
    }
  }

  if (input.observation.length > 500) return 'observation은 500자 이하만 가능합니다.';
  if ((input.lessonTopic || '').length > 80) return 'lessonTopic은 80자 이하만 가능합니다.';

  return null;
}

async function appendToLocalFile(record) {
  const existing = await readJson(LOCAL_RECORDS_FILE);
  existing.push(record);
  await writeJson(LOCAL_RECORDS_FILE, existing);
}

async function appendViaWebhook(record) {
  const response = await fetch(GOOGLE_APPS_SCRIPT_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record)
  });

  if (!response.ok) {
    throw new Error('Google Apps Script webhook 응답 실패');
  }
}

async function parseBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }
  if (!body) return {};
  return JSON.parse(body);
}

async function serveStatic(req, res, pathname) {
  const targetPath = pathname === '/' ? '/index.html' : pathname;
  const normalized = path.normalize(targetPath).replace(/^\/+/, '');
  const fullPath = path.join(PUBLIC_DIR, normalized);

  if (!fullPath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: 'forbidden' });
    return;
  }

  try {
    const content = await fs.readFile(fullPath);
    const ext = path.extname(fullPath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    const index = await fs.readFile(path.join(PUBLIC_DIR, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(index);
  }
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === 'GET' && reqUrl.pathname === '/api/bootstrap') {
      const school = await readJson(SCHOOL_FILE);
      return sendJson(res, 200, school);
    }

    if (req.method === 'GET' && reqUrl.pathname === '/api/records/local') {
      const records = await readJson(LOCAL_RECORDS_FILE);
      return sendJson(res, 200, { mode: 'local', records: records.slice(-20).reverse() });
    }

    if (req.method === 'POST' && reqUrl.pathname === '/api/records') {
      const payload = await parseBody(req);
      const validationError = validateRecord(payload);
      if (validationError) {
        return sendJson(res, 400, { error: validationError });
      }

      const record = {
        id: `R-${crypto.randomBytes(4).toString('hex')}`,
        createdAt: new Date().toISOString(),
        teacherId: payload.teacherId.trim(),
        teacherName: payload.teacherName.trim(),
        subjectId: payload.subjectId.trim(),
        subjectName: payload.subjectName.trim(),
        classId: payload.classId.trim(),
        className: payload.className.trim(),
        studentId: payload.studentId.trim(),
        studentName: payload.studentName.trim(),
        lessonTopic: (payload.lessonTopic || '').trim(),
        achievementTags: Array.isArray(payload.achievementTags)
          ? payload.achievementTags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 6)
          : [],
        observation: payload.observation.trim(),
        growthNote: (payload.growthNote || '').trim(),
        nextGuide: (payload.nextGuide || '').trim()
      };

      if (GOOGLE_APPS_SCRIPT_WEBHOOK) {
        await appendViaWebhook(record);
        return sendJson(res, 201, { ok: true, storage: 'google-sheets-webhook', record });
      }

      await appendToLocalFile(record);
      return sendJson(res, 201, {
        ok: true,
        storage: 'local-file',
        warning: 'GOOGLE_APPS_SCRIPT_WEBHOOK 미설정으로 로컬 저장되었습니다.',
        record
      });
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      return res.end();
    }

    return serveStatic(req, res, reqUrl.pathname);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: '서버 오류가 발생했습니다.' });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
