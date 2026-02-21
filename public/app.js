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
  const response = await fetch('/api/bootstrap');
  if (!response.ok) {
    throw new Error('초기 데이터를 불러오지 못했습니다.');
  }
  const data = await response.json();
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
    storageBadge.textContent = '저장소 상태 확인 실패';
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

loadBootstrap()
  .then(loadRecentLocalRecords)
  .catch((error) => {
    storageBadge.textContent = error.message;
  });
