const subjectSelect = document.getElementById('subjectSelect');
const classSelect = document.getElementById('classSelect');
const studentSelect = document.getElementById('studentSelect');
const lessonTopicInput = document.getElementById('lessonTopic');
const achievementTagsInput = document.getElementById('achievementTags');
const observationInput = document.getElementById('observation');
const growthNoteInput = document.getElementById('growthNote');
const nextGuideInput = document.getElementById('nextGuide');
const storageBadge = document.getElementById('storageBadge');
const submitBtn = document.getElementById('submitBtn');
const recentList = document.getElementById('recentList');

const fallbackBootstrapData = {
  teacher: {
    id: 'teacher-korean-01',
    name: '국어 담당 교사'
  },
  subjects: [
    { id: 'kor-10', name: '국어(10학년)' },
    { id: 'lit-11', name: '문학(11학년)' },
    { id: 'lang-12', name: '화법과 작문(12학년)' }
  ],
  classes: [
    { id: '10-1', subjectId: 'kor-10', name: '1학년 1반' },
    { id: '11-1', subjectId: 'lit-11', name: '2학년 1반' },
    { id: '12-1', subjectId: 'lang-12', name: '3학년 1반' }
  ],
  students: [
    { id: 'S1001', classId: '10-1', number: 1, name: '김서윤' },
    { id: 'S1002', classId: '10-1', number: 2, name: '박지호' },
    { id: 'S1003', classId: '10-1', number: 3, name: '이하늘' },
    { id: 'S1101', classId: '11-1', number: 1, name: '정민서' },
    { id: 'S1102', classId: '11-1', number: 2, name: '최도윤' },
    { id: 'S1103', classId: '11-1', number: 3, name: '윤지아' },
    { id: 'S1201', classId: '12-1', number: 1, name: '강하준' },
    { id: 'S1202', classId: '12-1', number: 2, name: '오서현' },
    { id: 'S1203', classId: '12-1', number: 3, name: '한예린' }
  ]
};

const state = {
  teacher: null,
  subjects: [],
  classes: [],
  students: []
};

function fillOptions(select, items, labeler) {
  select.innerHTML = '';
  for (const item of items) {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = labeler(item);
    select.append(option);
  }
}

function selectedSubject() {
  return state.subjects.find((subject) => subject.id === subjectSelect.value);
}

function selectedClass() {
  return state.classes.find((klass) => klass.id === classSelect.value);
}

function selectedStudent() {
  return state.students.find((student) => student.id === studentSelect.value);
}

function refreshClassSelect() {
  const classes = state.classes.filter((klass) => klass.subjectId === subjectSelect.value);
  fillOptions(classSelect, classes, (klass) => klass.name);
  refreshStudentSelect();
}

function refreshStudentSelect() {
  const students = state.students
    .filter((student) => student.classId === classSelect.value)
    .sort((a, b) => a.number - b.number);
  fillOptions(studentSelect, students, (student) => `${student.number}번 ${student.name}`);
}

async function loadBootstrap() {
  let data = null;

  try {
    const response = await fetch('/api/bootstrap');
    if (response.ok) {
      data = await response.json();
    }
  } catch (_error) {
    // 서버 미실행/네트워크 문제 시 아래 fallback fixture를 사용합니다.
  }

  if (!data) {
    data = fallbackBootstrapData;
    storageBadge.textContent = '오프라인 예시 데이터로 표시 중';
  }

  state.teacher = data.teacher;
  state.subjects = data.subjects;
  state.classes = data.classes;
  state.students = data.students;

  fillOptions(subjectSelect, state.subjects, (subject) => subject.name);
  refreshClassSelect();
}

async function loadRecentLocalRecords() {
  const response = await fetch('/api/records/local');
  if (!response.ok) {
    if (!storageBadge.textContent.includes('오프라인 예시 데이터')) {
      storageBadge.textContent = '저장소 상태 확인 실패';
    }
    return;
  }

  const { records } = await response.json();
  storageBadge.textContent = 'Google Sheets 미연동 시 로컬 파일 저장';

  recentList.innerHTML = '';
  for (const record of records) {
    const item = document.createElement('li');
    item.textContent = `${new Date(record.createdAt).toLocaleString()} · ${record.className} ${record.studentName} — ${record.observation}`;
    recentList.append(item);
  }
}

async function submitRecord() {
  const subject = selectedSubject();
  const klass = selectedClass();
  const student = selectedStudent();

  if (!subject || !klass || !student) {
    window.alert('과목/학급/학생을 먼저 선택해주세요.');
    return;
  }

  if (!observationInput.value.trim()) {
    window.alert('관찰 내용을 입력해주세요.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = '저장 중...';

  const payload = {
    teacherId: state.teacher.id,
    teacherName: state.teacher.name,
    subjectId: subject.id,
    subjectName: subject.name,
    classId: klass.id,
    className: klass.name,
    studentId: student.id,
    studentName: student.name,
    lessonTopic: lessonTopicInput.value.trim(),
    achievementTags: achievementTagsInput.value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    observation: observationInput.value.trim(),
    growthNote: growthNoteInput.value.trim(),
    nextGuide: nextGuideInput.value.trim()
  };

  try {
    const response = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || '저장에 실패했습니다.');
    }

    const message = result.storage === 'google-sheets-webhook'
      ? 'Google 스프레드시트에 기록이 저장되었습니다.'
      : '로컬 파일에 기록이 저장되었습니다. Google Sheets 설정을 확인하세요.';

    observationInput.value = '';
    growthNoteInput.value = '';
    nextGuideInput.value = '';
    window.alert(message);
    await loadRecentLocalRecords();
  } catch (error) {
    window.alert(error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '기록 저장';
  }
}

subjectSelect.addEventListener('change', refreshClassSelect);
classSelect.addEventListener('change', refreshStudentSelect);
submitBtn.addEventListener('click', submitRecord);

loadBootstrap().then(loadRecentLocalRecords);
