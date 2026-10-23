// CONFIGURAÇÃO DO FIREBASE (Sua mesma chave do site de RPG)
const firebaseConfig = {
  apiKey: "AIzaSyDmO4b4K_5K9UjMA7sOM99hHlj5kxuYbis",
  authDomain: "meu-rpg-fichas-86b00.firebaseapp.com",
  databaseURL: "https://meu-rpg-fichas-86b00-default-rtdb.firebaseio.com",
  projectId: "meu-rpg-fichas-86b00",
  storageBucket: "meu-rpg-fichas-86b00.firebasestorage.app",
  messagingSenderId: "869128398165",
  appId: "1:869128398165:web:ba35bbd104b6cb4733fbdc"
};

// Inicializa Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();
const portalRef = database.ref('portalCasal');

const PASSWORD = "1102";
let currentPin = "";

let db = {
  books: [
    { id: '1', title: 'Nosso Começo', color: '#ff758c', divisors: [{ name: 'Primeiro Encontro', text: 'Foi inesquecível...' }] }
  ],
  drawings: [],
  cartas: [
    "Você é o motivo do meu sorriso diário! 💕",
    "Obrigado por existir e ser tão especial na minha vida. ✨"
  ],
  boards: [
    { id: '1', title: 'Sonhos do Casal', todos: [{ text: 'Viajar juntos', done: false }] }
  ],
  galaxyMsgs: [
    "Te amo mais a cada segundo! 💕",
    "Nosso amor é infinito! 🌌"
  ]
};

let selectedBookId = null;
let selectedDivisorIndex = 0;
let tempUploadData = null;
let currentZoomPx = 140;

// ESCUTAR O FIREBASE EM TEMPO REAL
window.addEventListener('load', () => {
  portalRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      db = {
        books: data.books || [],
        drawings: data.drawings || [],
        cartas: data.cartas || [],
        boards: data.boards || [],
        galaxyMsgs: data.galaxyMsgs || []
      };
      
      // Atualiza as telas que estiverem abertas
      if (document.getElementById('diario-shelves-view').classList.contains('active')) renderBooksShelves();
      if (document.getElementById('diario-reader-view').classList.contains('active')) {
        renderDivisorsList();
        loadCurrentDivisorNote(false);
      }
      if (document.getElementById('app-galeria').classList.contains('active')) renderDrawings();
      if (document.getElementById('app-cartas').classList.contains('active')) renderCartas();
      if (document.getElementById('app-listas').classList.contains('active')) renderBoards();
    }
  });
});

function syncFirebase() {
  portalRef.set(db);
}

// --- MÚSICA DE FUNDO ---
function toggleMusic() {
  const audio = document.getElementById('audio-element');
  const btn = document.getElementById('music-toggle-btn');
  if (audio.paused) {
    audio.play();
    btn.innerText = "⏸️ Pause";
  } else {
    audio.pause();
    btn.innerText = "🎵 Play";
  }
}

// --- KEYPAD ---
function pressPin(num) {
  if (currentPin.length < 4) {
    currentPin += num;
    updatePinDots();
  }
  if (currentPin.length === 4) checkPin();
}

function clearPin() { currentPin = ""; updatePinDots(); }
function backspacePin() { currentPin = currentPin.slice(0, -1); updatePinDots(); }

function updatePinDots() {
  document.querySelectorAll('.dot').forEach((dot, idx) => {
    if (idx < currentPin.length) dot.classList.add('active');
    else dot.classList.remove('active');
  });
}

function checkPin() {
  if (currentPin === PASSWORD) {
    const login = document.getElementById('login-screen');
    if (login) login.remove();
    document.getElementById('main-app').classList.remove('hidden');
    
    // Tenta dar play automático na música caso o navegador permita
    const audio = document.getElementById('audio-element');
    if(audio) {
      audio.play().then(() => {
        document.getElementById('music-toggle-btn').innerText = "⏸️ Pause";
      }).catch(() => { /* clique do usuário necessário */ });
    }

    initTimers();
  } else {
    document.getElementById('pin-error').innerText = "Senha incorreta!";
    setTimeout(() => { clearPin(); document.getElementById('pin-error').innerText = ""; }, 1200);
  }
}

// --- LAUNCHER ---
function openApp(appId) {
  document.querySelectorAll('.app-screen').forEach(s => s.classList.remove('active'));
  const app = document.getElementById(appId);
  app.classList.add('active');

  if (appId === 'app-diario') renderBooksShelves();
  if (appId === 'app-galeria') renderDrawings();
  if (appId === 'app-cartas') renderCartas();
  if (appId === 'app-galaxya') initGalaxy3D();
  if (appId === 'app-listas') renderBoards();
}

function backToLauncher() {
  document.querySelectorAll('.app-screen').forEach(s => s.classList.remove('active'));
  document.getElementById('app-launcher').classList.add('active');
}

// --- 1. DIÁRIOS ---
function renderBooksShelves() {
  document.getElementById('diario-shelves-view').classList.add('active');
  document.getElementById('diario-reader-view').classList.remove('active');
  
  const grid = document.getElementById('books-grid');
  grid.innerHTML = "";

  db.books.forEach(book => {
    const card = document.createElement('div');
    card.className = 'book-card';
    card.style.backgroundColor = book.color;
    card.innerHTML = `
      <button class="book-delete-btn" onclick="deleteBook(event, '${book.id}')">✕</button>
      <h3>${book.title}</h3>
      <small>${book.divisors ? book.divisors.length : 0} Divisórias</small>
    `;
    card.onclick = (e) => {
      if(!e.target.classList.contains('book-delete-btn')) openBookReader(book.id);
    };
    grid.appendChild(card);
  });
}

function deleteBook(e, id) {
  e.stopPropagation();
  if(confirm("Tem certeza que deseja excluir este diário inteiro?")) {
    db.books = db.books.filter(b => b.id !== id);
    syncFirebase();
    renderBooksShelves();
  }
}

function openBookReader(bookId) {
  selectedBookId = bookId;
  selectedDivisorIndex = 0;
  
  document.getElementById('diario-shelves-view').classList.remove('active');
  document.getElementById('diario-reader-view').classList.add('active');

  renderDivisorsList();
  loadCurrentDivisorNote();
  setupAutoSave();
}

function backToShelves() { renderBooksShelves(); }

function toggleSidebar() { 
  const container = document.getElementById('reader-container');
  const sidebar = document.getElementById('reader-sidebar');
  container.classList.toggle('sidebar-open');
  sidebar.classList.toggle('open');
}

function renderDivisorsList() {
  const book = db.books.find(b => b.id === selectedBookId);
  const list = document.getElementById('divisores-list');
  list.innerHTML = "";

  if(!book || !book.divisors) return;

  book.divisors.forEach((div, idx) => {
    const item = document.createElement('div');
    item.className = `divisor-item ${idx === selectedDivisorIndex ? 'active' : ''}`;
    item.innerText = div.name;
    item.onclick = () => {
      selectedDivisorIndex = idx;
      renderDivisorsList();
      loadCurrentDivisorNote();
    };
    list.appendChild(item);
  });
}

function loadCurrentDivisorNote(focus = true) {
  const book = db.books.find(b => b.id === selectedBookId);
  if (book && book.divisors && book.divisors[selectedDivisorIndex]) {
    const div = book.divisors[selectedDivisorIndex];
    document.getElementById('current-divisor-name').innerText = div.name;
    
    const textarea = document.getElementById('divisor-textarea');
    if (document.activeElement !== textarea || !focus) {
      textarea.value = div.text || "";
    }

    document.getElementById('divisor-page-indicator').innerText = `${selectedDivisorIndex + 1} / ${book.divisors.length}`;
    document.getElementById('btn-prev-divisor').disabled = selectedDivisorIndex === 0;
    document.getElementById('btn-next-divisor').disabled = selectedDivisorIndex === book.divisors.length - 1;
  }
}

function navigateDivisor(direction) {
  const book = db.books.find(b => b.id === selectedBookId);
  if (book && book.divisors) {
    const newIdx = selectedDivisorIndex + direction;
    if (newIdx >= 0 && newIdx < book.divisors.length) {
      selectedDivisorIndex = newIdx;
      renderDivisorsList();
      loadCurrentDivisorNote();
    }
  }
}

let saveTimeout = null;
function setupAutoSave() {
  const textarea = document.getElementById('divisor-textarea');
  textarea.oninput = () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      const book = db.books.find(b => b.id === selectedBookId);
      if (book && book.divisors && book.divisors[selectedDivisorIndex]) {
        book.divisors[selectedDivisorIndex].text = textarea.value;
        syncFirebase();
        
        const status = document.getElementById('auto-save-status');
        status.classList.add('visible');
        setTimeout(() => status.classList.remove('visible'), 1500);
      }
    }, 600);
  };
}

function editCurrentDivisor() {
  const book = db.books.find(b => b.id === selectedBookId);
  if(book && book.divisors && book.divisors[selectedDivisorIndex]) {
    const newName = prompt("Novo nome da divisória:", book.divisors[selectedDivisorIndex].name);
    if(newName) {
      book.divisors[selectedDivisorIndex].name = newName;
      syncFirebase();
      renderDivisorsList();
      loadCurrentDivisorNote();
    }
  }
}

function deleteCurrentDivisor() {
  const book = db.books.find(b => b.id === selectedBookId);
  if(book && book.divisors) {
    if(book.divisors.length <= 1) {
      alert("O livro precisa ter pelo menos uma divisória!");
      return;
    }
    if(confirm("Excluir esta divisória?")) {
      book.divisors.splice(selectedDivisorIndex, 1);
      selectedDivisorIndex = 0;
      syncFirebase();
      renderDivisorsList();
      loadCurrentDivisorNote();
    }
  }
}

function scrollToBottom() {
  const textarea = document.getElementById('divisor-textarea');
  textarea.scrollTop = textarea.scrollHeight;
}

function openNewBookModal() { document.getElementById('modal-new-book').classList.remove('hidden'); }
function createNewBook() {
  const title = document.getElementById('book-title-input').value;
  const color = document.getElementById('book-color-input').value;
  if (title) {
    db.books.push({ id: Date.now().toString(), title, color, divisors: [{ name: 'Capítulo 1', text: '' }] });
    syncFirebase();
    closeModal('modal-new-book');
    renderBooksShelves();
  }
}

function openNewDivisorModal() { document.getElementById('modal-new-divisor').classList.remove('hidden'); }
function createNewDivisor() {
  const name = document.getElementById('divisor-title-input').value;
  if (name) {
    const book = db.books.find(b => b.id === selectedBookId);
    if (!book.divisors) book.divisors = [];
    book.divisors.push({ name, text: '' });
    syncFirebase();
    closeModal('modal-new-divisor');
    selectedDivisorIndex = book.divisors.length - 1;
    renderDivisorsList();
    loadCurrentDivisorNote();
  }
}

// --- 2. DESENHOS ---
function zoomGallery(direction) {
  const step = 30;
  const minZoom = 70;
  const maxZoom = 300;

  currentZoomPx += direction * step;
  if (currentZoomPx < minZoom) currentZoomPx = minZoom;
  if (currentZoomPx > maxZoom) currentZoomPx = maxZoom;

  const grid = document.getElementById('drawings-grid');
  if (grid) grid.style.setProperty('--thumb-size', `${currentZoomPx}px`);

  const indicator = document.getElementById('zoom-level-indicator');
  if (indicator) {
    const percentage = Math.round((currentZoomPx / 140) * 100);
    indicator.innerText = `${percentage}%`;
  }
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (file) {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = function(evt) {
      img.src = evt.target.result;
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
        canvas.height = (img.width > MAX_WIDTH) ? img.height * scaleSize : img.height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        tempUploadData = canvas.toDataURL('image/jpeg', 0.7);

        document.getElementById('upload-preview').src = tempUploadData;
        document.getElementById('modal-new-drawing').classList.remove('hidden');
      }
    };
    reader.readAsDataURL(file);
  }
}

function confirmSaveDrawing() {
  const title = document.getElementById('drawing-title-input').value || 'Desenho';
  if (tempUploadData) {
    if(!db.drawings) db.drawings = [];
    db.drawings.unshift({ id: Date.now(), title, img: tempUploadData });
    syncFirebase();
    closeModal('modal-new-drawing');
    renderDrawings();
  }
}

function renderDrawings() {
  const grid = document.getElementById('drawings-grid');
  grid.innerHTML = "";
  if(!db.drawings) return;

  db.drawings.forEach(item => {
    const card = document.createElement('div');
    card.className = 'polaroid-card';
    card.innerHTML = `
      <button class="delete-photo-btn" onclick="deleteDrawing(${item.id})">✕</button>
      <div class="polaroid-img-box" onclick="zoomImage('${item.img}')">
        <img src="${item.img}">
      </div>
      <p>${item.title}</p>
    `;
    grid.appendChild(card);
  });
}

function deleteDrawing(id) {
  if(confirm("Excluir esta foto/desenho?")) {
    db.drawings = db.drawings.filter(d => d.id !== id);
    syncFirebase();
    renderDrawings();
  }
}

function zoomImage(src) {
  document.getElementById('modal-zoom-img-target').src = src;
  document.getElementById('modal-zoom-image').classList.remove('hidden');
}

// --- 3. CARTINHAS ---
function renderCartas() {
  const list = document.getElementById('cartas-list');
  list.innerHTML = "";
  if(!db.cartas) return;

  db.cartas.forEach((texto, idx) => {
    const card = document.createElement('div');
    card.className = 'carta-card';
    
    const delBtn = document.createElement('button');
    delBtn.className = 'mini-btn danger delete-carta-btn';
    delBtn.innerText = '🗑️';
    delBtn.onclick = () => deleteCarta(idx);

    const p = document.createElement('p');
    p.textContent = texto;

    card.appendChild(delBtn);
    card.appendChild(p);
    list.appendChild(card);
  });
}

function openNewCartaModal() { document.getElementById('modal-new-carta').classList.remove('hidden'); }
function saveNewCarta() {
  const text = document.getElementById('carta-text-input').value;
  if(text) {
    if(!db.cartas) db.cartas = [];
    db.cartas.unshift(text);
    syncFirebase();
    closeModal('modal-new-carta');
    renderCartas();
  }
}

function deleteCarta(idx) {
  if(confirm("Deseja realmente apagar esta cartinha?")) {
    db.cartas.splice(idx, 1);
    syncFirebase();
    renderCartas();
  }
}

function limparCartasComBug() {
  if(confirm("Isso apagará TODAS as cartinhas atuais para remover eventuais erros. Deseja continuar?")) {
    db.cartas = [
      "Você é o motivo do meu sorriso diário! 💕",
      "Obrigado por existir e ser tão especial na minha vida. ✨"
    ];
    syncFirebase();
    renderCartas();
    alert("Cartinhas resetadas com sucesso!");
  }
}

function sortearCarinho() {
  if(!db.cartas || db.cartas.length === 0) {
    alert("Nenhuma cartinha cadastrada ainda!");
    return;
  }
  const randomMsg = db.cartas[Math.floor(Math.random() * db.cartas.length)];
  alert(`💌 Cartinha do Dia:\n\n"${randomMsg}"`);
}

// --- 4. CONTADOR & ÁRVORE ---
function initTimers() {
  const datingDate = new Date("2026-02-11T19:32:00");
  const bdayDate = new Date("2026-10-25T00:00:00");

  function update() {
    const now = new Date();

    const diffUp = Math.max(0, now - datingDate);
    const dUp = Math.floor(diffUp / (1000 * 60 * 60 * 24));
    const hUp = Math.floor((diffUp / (1000 * 60 * 60)) % 24);
    const mUp = Math.floor((diffUp / 1000 / 60) % 60);
    const sUp = Math.floor((diffUp / 1000) % 60);
    document.getElementById('countup-timer').innerText = `${dUp}d ${hUp}h ${mUp}m ${sUp}s`;

    const diffDown = Math.max(0, bdayDate - now);
    const dDown = Math.floor(diffDown / (1000 * 60 * 60 * 24));
    const hDown = Math.floor((diffDown / (1000 * 60 * 60)) % 24);
    const mDown = Math.floor((diffDown / 1000 / 60) % 60);
    const sDown = Math.floor((diffDown / 1000) % 60);
    document.getElementById('countdown-timer').innerText = `${dDown}d ${hDown}h ${mDown}s`;

    drawTreeByDay(dUp);
  }

  setInterval(update, 1000);
  update();
}

function drawTreeByDay(day) {
  const canvas = document.getElementById('tree-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const datingDate = new Date("2026-02-11T19:32:00");
  const bdayDate = new Date("2026-10-25T00:00:00");
  const now = new Date();

  const isMetaDay = (now >= bdayDate);
  const totalDuration = bdayDate - datingDate;
  const elapsed = Math.max(0, now - datingDate);
  const progress = Math.min(1, elapsed / totalDuration);
  const currentWeek = isMetaDay ? 52 : Math.min(51, Math.floor(progress * 52) + 1);

  const statusText = document.getElementById('tree-status-text');
  if (statusText) {
    if (isMetaDay) {
      statusText.innerText = "Chegou o Aniversário! A árvore de vocês floresceu completamente! 🎉🌸";
    } else {
      statusText.innerText = `Dia ${day} (Semana ${currentWeek}/52) - O amor de vocês está crescendo! 🌱`;
    }
  }

  const centerX = canvas.width / 2;
  const baseY = 290;

  ctx.fillStyle = "#e0e0e0";
  ctx.beginPath();
  ctx.ellipse(centerX, baseY + 10, 80, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#a8e6cf";
  ctx.beginPath();
  ctx.ellipse(centerX, baseY + 5, 75, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  const trunkHeight = 30 + (110 * progress);
  const trunkWidth = 4 + (14 * progress);

  const gradientTrunk = ctx.createLinearGradient(centerX - trunkWidth, baseY, centerX + trunkWidth, baseY - trunkHeight);
  gradientTrunk.addColorStop(0, '#3e2723');
  gradientTrunk.addColorStop(0.5, '#5d4037');
  gradientTrunk.addColorStop(1, '#8d6e63');

  ctx.strokeStyle = gradientTrunk;
  ctx.lineWidth = trunkWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(centerX, baseY);
  ctx.quadraticCurveTo(centerX - 10, baseY - (trunkHeight * 0.5), centerX, baseY - trunkHeight);
  ctx.stroke();

  if (progress >= 0.15) {
    const branchLen = 30 * progress;
    ctx.lineWidth = Math.max(2, trunkWidth * 0.5);

    ctx.beginPath();
    ctx.moveTo(centerX - 3, baseY - (trunkHeight * 0.55));
    ctx.quadraticCurveTo(centerX - 20, baseY - (trunkHeight * 0.65), centerX - branchLen - 15, baseY - (trunkHeight * 0.75));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX + 3, baseY - (trunkHeight * 0.65));
    ctx.quadraticCurveTo(centerX + 20, baseY - (trunkHeight * 0.75), centerX + branchLen + 15, baseY - (trunkHeight * 0.85));
    ctx.stroke();
  }

  if (progress >= 0.05) {
    const crownY = baseY - trunkHeight;
    const baseRadius = 10 + (55 * progress);

    const foliageClusters = [
      { x: centerX, y: crownY - 15, r: baseRadius * 0.9, color: '#2e7d32' },
      { x: centerX - (baseRadius * 0.45), y: crownY + 5, r: baseRadius * 0.75, color: '#388e3c' },
      { x: centerX + (baseRadius * 0.45), y: crownY + 5, r: baseRadius * 0.75, color: '#43a047' },
      { x: centerX - (baseRadius * 0.25), y: crownY - (baseRadius * 0.35), r: baseRadius * 0.7, color: '#4caf50' },
      { x: centerX + (baseRadius * 0.25), y: crownY - (baseRadius * 0.35), r: baseRadius * 0.7, color: '#66bb6a' },
      { x: centerX, y: crownY - (baseRadius * 0.5), r: baseRadius * 0.6, color: '#81c784' }
    ];

    foliageClusters.forEach(c => {
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(c.x, c.y, Math.max(2, c.r), 0, Math.PI * 2);
      ctx.fill();
    });
  }

  if (isMetaDay) {
    const crownY = baseY - trunkHeight;
    const blossoms = [
      { x: centerX, y: crownY - 35 },
      { x: centerX - 30, y: crownY - 15 },
      { x: centerX + 30, y: crownY - 15 },
      { x: centerX - 45, y: crownY + 10 },
      { x: centerX + 45, y: crownY + 10 },
      { x: centerX - 15, y: crownY + 25 },
      { x: centerX + 15, y: crownY + 25 },
      { x: centerX - 20, y: crownY - 30 },
      { x: centerX + 20, y: crownY - 30 },
      { x: centerX, y: crownY + 5 }
    ];

    blossoms.forEach(b => {
      ctx.fillStyle = '#ff80ab';
      ctx.beginPath();
      ctx.arc(b.x - 3, b.y, 4, 0, Math.PI * 2);
      ctx.arc(b.x + 3, b.y, 4, 0, Math.PI * 2);
      ctx.arc(b.x, b.y - 3, 4, 0, Math.PI * 2);
      ctx.arc(b.x, b.y + 3, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffe082';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    const fallingPetals = [
      { x: centerX - 50, y: baseY - 10 },
      { x: centerX - 30, y: baseY + 2 },
      { x: centerX + 40, y: baseY - 5 },
      { x: centerX + 60, y: baseY + 3 }
    ];

    ctx.fillStyle = '#ff80ab';
    fallingPetals.forEach(p => {
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 4, 2, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

// --- 5. GALÁXIA ---
let galaxyInitialized = false;
function initGalaxy3D() {
  if (galaxyInitialized) return;
  galaxyInitialized = true;

  const container = document.getElementById('galaxy-3d-container');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const count = 1500;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);

  for(let i=0; i<count*3; i+=3) {
    const r = Math.random() * 5;
    const theta = Math.random() * Math.PI * 2;
    positions[i] = r * Math.cos(theta);
    positions[i+1] = (Math.random() - 0.5) * 1.5;
    positions[i+2] = r * Math.sin(theta);
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xff7eb3, size: 0.04 });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  camera.position.z = 6;

  function animate() {
    requestAnimationFrame(animate);
    points.rotation.y += 0.002;
    renderer.render(scene, camera);
  }
  animate();

  container.onclick = () => {
    if(!db.galaxyMsgs || db.galaxyMsgs.length === 0) return;
    const randomMsg = db.galaxyMsgs[Math.floor(Math.random() * db.galaxyMsgs.length)];
    document.getElementById('galaxy-tooltip-text').innerText = randomMsg;
    document.getElementById('galaxy-tooltip').classList.remove('hidden');
  };
}

function closeGalaxyTooltip() { document.getElementById('galaxy-tooltip').classList.add('hidden'); }
function openNewGalaxyMsgModal() { document.getElementById('modal-galaxy-msg').classList.remove('hidden'); }
function saveNewGalaxyMsg() {
  const text = document.getElementById('galaxy-msg-input').value;
  if(text) {
    if(!db.galaxyMsgs) db.galaxyMsgs = [];
    db.galaxyMsgs.push(text);
    syncFirebase();
    closeModal('modal-galaxy-msg');
  }
}

// --- 6. PRANCHETAS ---
function renderBoards() {
  const grid = document.getElementById('boards-grid');
  grid.innerHTML = "";
  if(!db.boards) return;

  db.boards.forEach((board, boardIdx) => {
    const card = document.createElement('div');
    card.className = 'board-card';
    
    let todosHtml = "";
    if(board.todos) {
      board.todos.forEach((todo, todoIdx) => {
        todosHtml += `
          <li class="todo-item ${todo.done ? 'done' : ''}">
            <input type="checkbox" ${todo.done ? 'checked' : ''} onchange="toggleBoardTodo(${boardIdx}, ${todoIdx})">
            <span>${todo.text}</span>
            <button class="mini-btn danger" onclick="deleteBoardTodo(${boardIdx}, ${todoIdx})">✕</button>
          </li>
        `;
      });
    }

    card.innerHTML = `
      <div class="board-header">
        <h3>${board.title}</h3>
        <button class="mini-btn danger" onclick="deleteBoard(${boardIdx})">🗑️</button>
      </div>
      <ul class="todo-list">${todosHtml}</ul>
      <div class="add-todo-inline">
        <input type="text" id="board-input-${boardIdx}" placeholder="Novo item...">
        <button class="primary-btn" onclick="addTodoToBoard(${boardIdx})">+</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function openNewBoardModal() { document.getElementById('modal-new-board').classList.remove('hidden'); }
function createNewBoard() {
  const title = document.getElementById('board-title-input').value;
  if(title) {
    if(!db.boards) db.boards = [];
    db.boards.push({ id: Date.now().toString(), title, todos: [] });
    syncFirebase();
    closeModal('modal-new-board');
    renderBoards();
  }
}

function deleteBoard(boardIdx) {
  if(confirm("Excluir esta prancheta inteira?")) {
    db.boards.splice(boardIdx, 1);
    syncFirebase();
    renderBoards();
  }
}

function addTodoToBoard(boardIdx) {
  const input = document.getElementById(`board-input-${boardIdx}`);
  if(input.value) {
    if(!db.boards[boardIdx].todos) db.boards[boardIdx].todos = [];
    db.boards[boardIdx].todos.push({ text: input.value, done: false });
    syncFirebase();
    renderBoards();
  }
}

function toggleBoardTodo(boardIdx, todoIdx) {
  db.boards[boardIdx].todos[todoIdx].done = !db.boards[boardIdx].todos[todoIdx].done;
  syncFirebase();
  renderBoards();
}

function deleteBoardTodo(boardIdx, todoIdx) {
  db.boards[boardIdx].todos.splice(todoIdx, 1);
  syncFirebase();
  renderBoards();
}

// UTILITÁRIOS
function closeModal(modalId) { document.getElementById(modalId).classList.add('hidden'); }