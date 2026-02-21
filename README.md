# 국어 누가기록 웹앱

아이폰(iOS Safari)에서 고등학교 국어 수업의 학생별 성취/성장 기록을 빠르게 입력하고, 서버에서 Google Sheets로 자동 누적할 수 있는 웹앱입니다.

## 기능

- 과목 → 학급 → 학생 선택
- 학생 관찰 기록 입력
- Google Apps Script Webhook 연동 시 Google Sheets 자동 누적
- Webhook 미설정 시 `data/local-records.json`에 임시 저장
- iOS 글래스모피즘 UI + PWA manifest

## 실행

```bash
npm run dev
```

기본 주소: `http://localhost:3000`

## Google Sheets 연동 (권장: Apps Script Web App)

1. Google 스프레드시트에 `records` 시트를 생성합니다.
2. Apps Script를 열고 `doPost(e)`에서 JSON body를 받아 시트에 append 하도록 작성합니다.
3. 웹앱으로 배포 후 발급된 URL을 `.env`의 `GOOGLE_APPS_SCRIPT_WEBHOOK`에 설정합니다.

`.env.example`:

```env
PORT=3000
GOOGLE_APPS_SCRIPT_WEBHOOK=https://script.google.com/macros/s/....../exec
```

### 권장 시트 컬럼 순서 (records 시트)

1. record_id
2. created_at
3. teacher_id
4. teacher_name
5. subject_id
6. subject_name
7. class_id
8. class_name
9. student_id
10. student_name
11. lesson_topic
12. achievement_tags
13. observation
14. growth_note
15. next_guide

## 데이터 샘플 편집

- 교사/과목/학급/학생 데이터: `data/school.json`
