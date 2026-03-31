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
    initAboutModal();
    renderSubjectCards();
    checkExistingTestSession();
    document.getElementById('scrollToSubjects').addEventListener('click', () => {
        document.querySelector('.subject-grid').scrollIntoView({ behavior: 'smooth' });
    });
    animateCounters();
    populateTrendingTests();
});

function showView(viewId) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[viewId].classList.add('active');
}

function renderSubjectCards() {
    document.querySelectorAll('.subject-card').forEach(card => {
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
        btn.innerHTML = `<i class="fas fa-play"></i> Mock Test ${i}`;
        btn.onclick = () => startTest(`Mock Test ${i}`, currentSubject);
        grid.appendChild(btn);
    }
}

async function startTest(testName, subject) {
    showView('loading');
    try {
        const response = await fetch(`${subject}.json`);
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
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(e => console.warn("Full-screen not allowed"));
        }
        loadExamEngine();
    } catch (e) {
        alert(`Failed to load ${subject} test data. Ensure ${subject}.json exists.`);
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
    document.getElementById('exam-title').innerHTML = `RankYodha - ${subName} ${testState.testName}`;
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
        const optRadio = document.createElement('input');
        optRadio.type = 'radio';
        optRadio.name = 'q_option';
        optRadio.value = index;
        if (testState.answers[testState.currentIdx] === index) optRadio.checked = true;
        const label = document.createElement('label');
        label.innerText = optText;
        label.style.cursor = 'pointer';
        row.appendChild(optRadio);
        row.appendChild(label);
        row.onclick = (e) => {
            if (e.target !== optRadio) optRadio.checked = true;
        };
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
        btn.className = 'p-btn';
        btn.innerHTML = idx + 1;
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
        if (idx === testState.currentIdx) btn.classList.add('current');
    });
    updatePaletteStats();
}

function updatePaletteActive() { updatePaletteClasses(); }

function updatePaletteStats() {
    let answered = 0, notAnswered = 0, marked = 0, ansMarked = 0, notVisited = 0;
    testState.selectedQuestions.forEach((_, idx) => {
        if (!testState.visited.includes(idx)) notVisited++;
        else {
            if (testState.answers[idx] !== undefined) {
                if (testState.marked.includes(idx)) ansMarked++;
                else answered++;
            } else {
                if (testState.marked.includes(idx)) marked++;
                else notAnswered++;
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
    if (selected) testState.answers[testState.currentIdx] = parseInt(selected.value);
}

document.getElementById('btn-next').onclick = () => {
    saveCurrentAnswer();
    if (testState.marked.includes(testState.currentIdx)) {
        testState.marked = testState.marked.filter(x => x !== testState.currentIdx);
    }
    if (testState.currentIdx < testState.selectedQuestions.length - 1) testState.currentIdx++;
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
    if (!testState.marked.includes(testState.currentIdx)) testState.marked.push(testState.currentIdx);
    if (testState.currentIdx < testState.selectedQuestions.length - 1) testState.currentIdx++;
    saveProgress();
    renderQuestion();
};

document.getElementById('btn-clear').onclick = () => {
    delete testState.answers[testState.currentIdx];
    document.querySelectorAll('input[name="q_option"]').forEach(r => r.checked = false);
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
        if (testState.timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("Time's up! Auto-submitting.");
            submitTest();
            return;
        }
        testState.timeLeft--;
        updateTimerDisplay();
        if (testState.timeLeft === 600) alert("10 minutes left!");
        if (testState.timeLeft === 300) alert("5 minutes left!");
        if (testState.timeLeft % 30 === 0) saveProgress();
    }, 1000);
}

function updateTimerDisplay() {
    const m = Math.floor(testState.timeLeft / 60);
    const s = testState.timeLeft % 60;
    document.getElementById('countdown').innerText = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function submitTest() {
    clearInterval(timerInterval);
    saveCurrentAnswer();
    testState.isActive = false;
    saveProgress();
    
    if (document.fullscreenElement) document.exitFullscreen().catch(e=>{});
    
    let correct = 0, attempted = 0;
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
        const userAns = testState.answers[idx];
        const isCorrect = userAns === q.correctAnswer;
        const div = document.createElement('div');
        div.className = `review-item ${isCorrect ? 'is-correct' : 'is-wrong'}`;
        let ansText = userAns !== undefined ? q.options[userAns] : 'Not Attempted';
        div.innerHTML = `
            <h4>Q${idx+1}: ${q.question}</h4>
            <div>Your Answer: ${ansText} ${isCorrect ? '✅' : '❌'}</div>
            <div>Correct Answer: ${q.options[q.correctAnswer]}</div>
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

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function initTheme() {
    const toggle = document.getElementById('themeToggle');
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        toggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    toggle.onclick = () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.body.removeAttribute('data-theme');
            toggle.innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem('theme', 'light');
        } else {
            document.body.setAttribute('data-theme', 'dark');
            toggle.innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem('theme', 'dark');
        }
    };
}

function initLogin() {
    const modal = document.getElementById('loginModal');
    const btn = document.getElementById('loginBtn');
    const close = document.getElementById('closeLogin');
    const doLog = document.getElementById('doLogin');
    const userSpan = document.getElementById('userNameDisplay');
    const savedUser = localStorage.getItem('mockUser');
    if (savedUser) {
        btn.innerText = 'Logout';
        userSpan.innerText = savedUser;
        userSpan.style.display = 'inline';
    }
    btn.onclick = () => {
        if (btn.innerText === 'Logout') {
            localStorage.removeItem('mockUser');
            btn.innerText = 'Login';
            userSpan.style.display = 'none';
        } else {
            modal.style.display = 'flex';
        }
    };
    close.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
        if (e.target === document.getElementById('aboutModal')) document.getElementById('aboutModal').style.display = 'none';
    };
    doLog.onclick = () => {
        const email = document.getElementById('loginEmail').value.trim();
        if (email) {
            localStorage.setItem('mockUser', email);
            btn.innerText = 'Logout';
            userSpan.innerText = email;
            userSpan.style.display = 'inline';
            modal.style.display = 'none';
        }
    };
}

function initAboutModal() {
    const aboutBtn = document.getElementById('aboutBtn');
    const aboutModal = document.getElementById('aboutModal');
    const closeAbout = document.getElementById('closeAbout');
    aboutBtn.onclick = () => aboutModal.style.display = 'flex';
    closeAbout.onclick = () => aboutModal.style.display = 'none';
}

function animateCounters() {
    const counters = document.querySelectorAll('.stat-counter');
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-count'));
        let current = 0;
        const increment = target / 50;
        const updateCounter = () => {
            if (current < target) {
                current += increment;
                counter.innerText = Math.ceil(current) + '+';
                setTimeout(updateCounter, 30);
            } else {
                counter.innerText = target + '+';
            }
        };
        updateCounter();
    });
}

function populateTrendingTests() {
    const grid = document.getElementById('trendingGrid');
    const tests = [
        { name: 'BPSC Prelims 2026', subject: 'geography', icon: 'fa-solid fa-earth-asia' },
        { name: 'History - Modern India', subject: 'history', icon: 'fa-solid fa-landmark' },
        { name: 'Indian Polity', subject: 'polity', icon: 'fa-solid fa-scale-balanced' },
        { name: 'Economy Survey', subject: 'economy', icon: 'fa-solid fa-chart-line' }
    ];
    grid.innerHTML = tests.map(test => `
        <div class="trending-card" data-subject="${test.subject}">
            <i class="${test.icon}"></i>
            <h4>${test.name}</h4>
            <div class="badge">🔥 Trending</div>
        </div>
    `).join('');
    document.querySelectorAll('.trending-card').forEach(card => {
        card.addEventListener('click', () => {
            const subject = card.getAttribute('data-subject');
            document.querySelector(`.subject-card[data-subject="${subject}"]`).click();
        });
    });
}
