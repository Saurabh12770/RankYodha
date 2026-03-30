let currentSubject = 'geography';
let testState = {
    subject: currentSubject,
    answers: {},
    marked: [],
    visited: [],
    timeLeft: 90 * 60,
    currentIdx: 0,
    isActive: false
};
let timerInterval;

const views = {
    dashboard: document.getElementById('dashboard'),
    loading: document.getElementById('loading-screen'),
    engine: document.getElementById('exam-engine'),
    result: document.getElementById('result-screen')
};

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initLogin();
    renderSubjectCards();
    checkExistingTestSession();
});

function showView(viewId) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[viewId].classList.add('active');
}

function renderSubjectCards() {
    const cards = document.querySelectorAll('.subject-card:not(.locked)');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.subject-card').forEach(c => c.classList.remove('active-subject'));
            card.classList.add('active-subject');
            currentSubject = card.getAttribute('data-subject');
            document.getElementById('testSelection').style.display = 'block';
            renderTestGrid();
        });
    });
}

function renderTestGrid() {
    const grid = document.getElementById('testGrid');
    grid.innerHTML = '';
    for (let i = 1; i <= 30; i++) {
        const btn = document.createElement('button');
        btn.className = 'test-btn';
        btn.innerText = `Mock Test ${i}`;
        btn.onclick = () => startTest(`Mock Test ${i}`, currentSubject);
        grid.appendChild(btn);
    }
}

async function startTest(testName, subject) {
    showView('loading');
    try {
        const response = await fetch(`data/${subject}.json`);
        const data = await response.json();
        
        let shuffled = shuffleArray([...data]);
        let selectedQuestions = shuffled.slice(0, 100);
        
        testState = {
            testName: testName,
            subject: subject,
            answers: {},
            marked: [],
            visited: [0],
            timeLeft: 90 * 60,
            currentIdx: 0,
            isActive: true,
            selectedQuestions: selectedQuestions
        };
        
        saveProgress();
        loadExamEngine();
    } catch (e) {
        alert(`Failed to load ${subject} test data.`);
        showView('dashboard');
    }
}

function checkExistingTestSession() {
    const saved = localStorage.getItem('mockTestState');
    if (saved) {
        try {
            const state = JSON.parse(saved);
            if (state.isActive) {
                if (confirm("You have an active test. Resume?")) {
                    testState = state;
                    loadExamEngine();
                } else {
                    localStorage.removeItem('mockTestState');
                }
            }
        } catch(e) {}
    }
}

function saveProgress() {
    localStorage.setItem('mockTestState', JSON.stringify(testState));
}

function loadExamEngine() {
    const subName = testState.subject.charAt(0).toUpperCase() + testState.subject.slice(1);
    document.getElementById('exam-title').innerText = `BPSC - ${subName} ${testState.testName}`;
    renderPalette();
    renderQuestion();
    startTimer();
    showView('engine');
}

function renderQuestion() {
    const qData = testState.selectedQuestions[testState.currentIdx];
    document.getElementById('q-no').innerText = testState.currentIdx + 1;
    document.getElementById('q-text').innerText = qData.question;
    
    if (!testState.visited.includes(testState.currentIdx)) {
        testState.visited.push(testState.currentIdx);
    }
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    qData.options.forEach((optText, index) => {
        const row = document.createElement('div');
        row.className = 'option-row';
        row.onclick = () => { optRadio.checked = true; };
        
        const optRadio = document.createElement('input');
        optRadio.type = 'radio';
        optRadio.name = 'q_option';
        optRadio.value = index;
        if (testState.answers[testState.currentIdx] === index) {
            optRadio.checked = true;
        }
        
        const label = document.createElement('label');
        label.innerText = optText;
        label.style.width = '100%';
        label.style.cursor = 'pointer';
        
        row.appendChild(optRadio);
        row.appendChild(label);
        optionsContainer.appendChild(row);
    });
    
    updatePaletteActive();
    updatePaletteStats();
}

function renderPalette() {
    const grid = document.getElementById('palette-grid');
    grid.innerHTML = '';
    testState.selectedQuestions.forEach((_, idx) => {
        const btn = document.createElement('button');
        btn.className = 'p-btn';
        btn.id = `pal-${idx}`;
        btn.innerText = idx + 1;
        btn.onclick = () => {
            saveCurrentAnswer();
            testState.currentIdx = idx;
            renderQuestion();
            saveProgress();
        };
        grid.appendChild(btn);
    });
    updatePaletteClasses();
}

function updatePaletteClasses() {
    testState.selectedQuestions.forEach((_, idx) => {
        const btn = document.getElementById(`pal-${idx}`);
        if (!btn) return;
        
        // Remove previous states
        btn.className = 'p-btn';
        btn.innerHTML = idx + 1; // reset inner HTML
        
        if (testState.visited.includes(idx)) {
            if (testState.answers[idx] !== undefined) {
                if (testState.marked.includes(idx)) {
                    btn.classList.add('answered-marked');
                    btn.innerHTML = `${idx + 1}<div class="green-dot"></div>`;
                } else {
                    btn.classList.add('answered');
                }
            } else {
                if (testState.marked.includes(idx)) {
                    btn.classList.add('marked');
                } else {
                    btn.classList.add('not-answered');
                }
            }
        } else {
            btn.classList.add('not-visited');
        }
        
        if (idx === testState.currentIdx) {
            btn.classList.add('current');
        }
    });
    updatePaletteStats();
}

function updatePaletteActive() { updatePaletteClasses(); }

function updatePaletteStats() {
    let answered = 0, notAnswered = 0, marked = 0, ansMarked = 0, notVisited = 0;
    
    testState.selectedQuestions.forEach((_, idx) => {
        if (!testState.visited.includes(idx)) {
            notVisited++;
        } else {
            if (testState.answers[idx] !== undefined) {
                if (testState.marked.includes(idx)) {
                    ansMarked++;
                } else {
                    answered++;
                }
            } else {
                if (testState.marked.includes(idx)) {
                    marked++;
                } else {
                    notAnswered++;
                }
            }
        }
    });
    
    document.getElementById('c-answered').innerText = answered;
    document.getElementById('c-not-answered').innerText = notAnswered;
    document.getElementById('c-marked').innerText = marked;
    document.getElementById('c-answered-marked').innerText = ansMarked;
    document.getElementById('c-not-visited').innerText = notVisited;
}

function saveCurrentAnswer() {
    const selected = document.querySelector('input[name="q_option"]:checked');
    if (selected) {
        testState.answers[testState.currentIdx] = parseInt(selected.value);
    }
}

document.getElementById('btn-next').onclick = () => {
    saveCurrentAnswer();
    // TCS standard: "Save & Next" removes the "Mark for Review" status for this question.
    if (testState.marked.includes(testState.currentIdx)) {
        testState.marked = testState.marked.filter(x => x !== testState.currentIdx);
    }
    if (testState.currentIdx < testState.selectedQuestions.length - 1) {
        testState.currentIdx++;
    }
    saveProgress();
    renderQuestion();
};

document.getElementById('btn-prev').onclick = () => {
    saveCurrentAnswer();
    if (testState.currentIdx > 0) testState.currentIdx--;
    saveProgress();
    renderQuestion();
};

document.getElementById('btn-mark').onclick = () => {
    saveCurrentAnswer();
    if (!testState.marked.includes(testState.currentIdx)) {
        testState.marked.push(testState.currentIdx);
    }
    if (testState.currentIdx < testState.selectedQuestions.length - 1) {
        testState.currentIdx++;
    }
    saveProgress();
    renderQuestion();
};

document.getElementById('btn-clear').onclick = () => {
    delete testState.answers[testState.currentIdx];
    const radios = document.querySelectorAll('input[name="q_option"]');
    radios.forEach(r => r.checked = false);
    saveProgress();
    renderQuestion();
};

document.getElementById('btn-submit').onclick = () => {
    if (confirm("Are you sure you want to submit the test?")) submitTest();
};

function startTimer() {
    clearInterval(timerInterval);
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        testState.timeLeft--;
        updateTimerDisplay();
        
        if (testState.timeLeft === 10 * 60) alert("10 minutes left!");
        if (testState.timeLeft === 5 * 60) alert("5 minutes left!");
        if (testState.timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("Time's up! Auto-submitting test.");
            submitTest();
        }
        if (testState.timeLeft % 10 === 0) saveProgress();
    }, 1000);
}

function updateTimerDisplay() {
    const m = Math.floor(testState.timeLeft / 60);
    const s = testState.timeLeft % 60;
    document.getElementById('countdown').innerText = 
        `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function submitTest() {
    clearInterval(timerInterval);
    saveCurrentAnswer();
    testState.isActive = false;
    saveProgress();
    
    let correct = 0;
    let attempted = 0;
    
    testState.selectedQuestions.forEach((q, idx) => {
        if (testState.answers[idx] !== undefined) {
            attempted++;
            if (testState.answers[idx] === q.correctAnswer) correct++;
        }
    });
    
    const total = testState.selectedQuestions.length;
    const incorrect = attempted - correct;
    const unattempted = total - attempted;
    const percentage = ((correct / total) * 100).toFixed(2);
    
    document.getElementById('r-score').innerText = correct;
    document.getElementById('r-percent').innerText = percentage;
    document.getElementById('r-correct').innerText = correct;
    document.getElementById('r-incorrect').innerText = incorrect;
    document.getElementById('r-unattempted').innerText = unattempted;
    
    generateReview();
    showView('result');
    localStorage.removeItem('mockTestState');
}

function generateReview() {
    const container = document.getElementById('review-container');
    container.innerHTML = '<h3>Detailed Review</h3>';
    
    testState.selectedQuestions.forEach((q, idx) => {
        const div = document.createElement('div');
        const userAnsObj = testState.answers[idx];
        const isCorrect = userAnsObj === q.correctAnswer;
        
        div.className = `review-item ${isCorrect ? 'is-correct' : 'is-wrong'}`;
        
        let ansText = 'Not Attempted';
        if (userAnsObj !== undefined) {
            ansText = q.options[userAnsObj];
        }
        const corText = q.options[q.correctAnswer];
        
        div.innerHTML = `
            <h4>Q${idx + 1}: ${q.question}</h4>
            <div class="your-ans">Your Answer: ${ansText} ${isCorrect ? '✅' : '❌'}</div>
            <div class="cor-ans">Correct Answer: ${corText}</div>
            <div class="exp">Explanation: ${q.explanation}</div>
        `;
        container.appendChild(div);
    });
}

document.getElementById('btn-review').onclick = () => {
    const rc = document.getElementById('review-container');
    rc.style.display = rc.style.display === 'none' ? 'block' : 'none';
};

document.getElementById('btn-home').onclick = () => showView('dashboard');

function shuffleArray(array) {
    let curId = array.length, randomId;
    while (curId !== 0) {
        randomId = Math.floor(Math.random() * curId);
        curId -= 1;
        let tmp = array[curId];
        array[curId] = array[randomId];
        array[randomId] = tmp;
    }
    return array;
}

function initTheme() {
    const toggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        toggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    toggle.onclick = () => {
        const theme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        if (theme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            toggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            document.body.removeAttribute('data-theme');
            toggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
        localStorage.setItem('theme', theme);
    };
}

function initLogin() {
    const modal = document.getElementById('loginModal');
    const btn = document.getElementById('loginBtn');
    const close = document.getElementById('closeLogin');
    const doLog = document.getElementById('doLogin');
    
    const user = localStorage.getItem('mockUser');
    if (user) {
        btn.innerText = 'Logout';
        document.getElementById('userNameDisplay').innerText = user;
        document.getElementById('userNameDisplay').style.display = 'inline';
    }
    
    btn.onclick = () => {
        if (btn.innerText === 'Logout') {
            localStorage.removeItem('mockUser');
            btn.innerText = 'Login';
            document.getElementById('userNameDisplay').style.display = 'none';
        } else {
            modal.style.display = 'flex';
        }
    };
    close.onclick = () => modal.style.display = 'none';
    
    doLog.onclick = () => {
        const email = document.getElementById('loginEmail').value;
        if (email) {
            localStorage.setItem('mockUser', email);
            btn.innerText = 'Logout';
            document.getElementById('userNameDisplay').innerText = email;
            document.getElementById('userNameDisplay').style.display = 'inline';
            modal.style.display = 'none';
        }
    };
}
