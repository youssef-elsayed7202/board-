"use strict";

/* =========================================================
   GENERAL WHITEBOARD APP
   Three-file version:
   index.html
   style.css
   script.js
========================================================= */


/* =========================================================
   ELEMENTS
========================================================= */

const $ = (id) => document.getElementById(id);

const homeScreen = $("homeScreen");
const boardScreen = $("boardScreen");

const board = $("board");
const canvas = $("drawCanvas");
const ctx = canvas.getContext("2d");

const objectLayer = $("objectLayer");

const filesList = $("filesList");
const emptyState = $("emptyState");
const fileCount = $("fileCount");
const searchInput = $("searchInput");

const boardTitle = $("boardTitle");
const saveState = $("saveState");

const colorDot = $("colorDot");

const colorPopup = $("colorPopup");
const sizePopup = $("sizePopup");
const shapePopup = $("shapePopup");
const morePopup = $("morePopup");
const backgroundPopup = $("backgroundPopup");

const calculator = $("calculator");
const timerPanel = $("timerPanel");

const toast = $("toast");

const imageInput = $("imageInput");

const ruler = $("ruler");
const lockOverlay = $("lockOverlay");


/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEY = "general_whiteboard_database_v4";
const SETTINGS_KEY = "general_whiteboard_settings_v4";


let database = {
  files: []
};

let settings = {
  theme: "light"
};


function loadDatabase() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      database = JSON.parse(saved);

      if (!database.files || !Array.isArray(database.files)) {
        database.files = [];
      }
    }
  } catch (error) {
    console.error(error);

    database = {
      files: []
    };
  }
}


function saveDatabase() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(database)
    );
  } catch (error) {
    console.error(error);
    showToast("مساحة التخزين في المتصفح ممتلئة");
  }
}


function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);

    if (saved) {
      settings = {
        ...settings,
        ...JSON.parse(saved)
      };
    }
  } catch (error) {
    console.error(error);
  }
}


function saveSettings() {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify(settings)
  );
}


/* =========================================================
   APP STATE
========================================================= */

let currentFileId = null;
let currentPageIndex = 0;

let currentTool = "pen";
let currentColor = "#111111";
let currentSize = 4;
let currentShape = "line";

let locked = false;

let isDrawing = false;
let currentStroke = null;

let history = [];
let redoHistory = [];

let timerInterval = null;
let timerSeconds = 300;

let selectedObjectId = null;
let draggedObject = null;


/* =========================================================
   DEFAULT PAGE
========================================================= */

function createPage() {
  return {
    background: "white",
    strokes: [],
    texts: [],
    images: []
  };
}


/* =========================================================
   FILE HELPERS
========================================================= */

function createFile(name, standalone = false) {

  const now = Date.now();

  const file = {
    id: "file_" + now + "_" + Math.random().toString(36).slice(2),
    name: name || "ملف جديد",
    type: standalone ? "standalone" : "file",
    favorite: false,
    locked: false,
    createdAt: now,
    updatedAt: now,
    pages: [createPage()]
  };

  database.files.unshift(file);

  saveDatabase();

  return file;
}


function getCurrentFile() {
  return database.files.find(
    file => file.id === currentFileId
  );
}


function updateCurrentFile() {

  const file = getCurrentFile();

  if (!file) {
    return;
  }

  file.updatedAt = Date.now();

  saveDatabase();

  saveState.textContent = "تم الحفظ";

  setTimeout(() => {

    if (getCurrentFile()) {
      saveState.textContent = "محفوظ";
    }

  }, 700);
}


/* =========================================================
   HOME
========================================================= */

function renderFiles(filter = "") {

  filesList.innerHTML = "";

  const query = filter.trim().toLowerCase();

  const files = database.files.filter(file => {

    return file.name
      .toLowerCase()
      .includes(query);

  });

  fileCount.textContent = files.length;

  if (files.length === 0) {

    emptyState.classList.remove("hidden");

    if (query) {
      emptyState.querySelector("h3").textContent =
        "مش لاقي الملف";
      emptyState.querySelector("p").textContent =
        "جرب اسم مختلف.";
    } else {
      emptyState.querySelector("h3").textContent =
        "مفيش ملفات لسه";
      emptyState.querySelector("p").textContent =
        "اعمل ملف جديد وابدأ الكتابة على السبورة.";
    }

    return;
  }

  emptyState.classList.add("hidden");

  files.forEach(file => {

    const card = document.createElement("div");
    card.className = "fileCard";

    const top = document.createElement("div");
    top.className = "fileCardTop";

    const icon = document.createElement("div");
    icon.className = "fileIcon";
    icon.textContent = file.type === "standalone" ? "▱" : "▤";

    const favorite = document.createElement("button");
    favorite.className = "fileFavorite";
    favorite.textContent = file.favorite ? "★" : "☆";

    favorite.addEventListener("click", (event) => {

      event.stopPropagation();

      file.favorite = !file.favorite;

      saveDatabase();
      renderFiles(searchInput.value);

    });

    top.appendChild(icon);
    top.appendChild(favorite);

    const info = document.createElement("div");

    const name = document.createElement("div");
    name.className = "fileName";
    name.textContent = file.name;

    const meta = document.createElement("div");
    meta.className = "fileMeta";

    const typeText =
      file.type === "standalone"
        ? "سبورة مستقلة"
        : "ملف";

    meta.textContent =
      `${typeText} • ${file.pages.length} صفحة`;

    info.appendChild(name);
    info.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "fileActions";

    const open = document.createElement("button");
    open.textContent = "فتح";

    open.addEventListener("click", () => {
      openFile(file.id);
    });

    const rename = document.createElement("button");
    rename.textContent = "تعديل الاسم";

    rename.addEventListener("click", () => {

      const newName = prompt(
        "اكتب الاسم الجديد:",
        file.name
      );

      if (
        newName !== null &&
        newName.trim()
      ) {

        file.name = newName.trim();

        saveDatabase();
        renderFiles(searchInput.value);

      }

    });

    const remove = document.createElement("button");
    remove.className = "danger";
    remove.textContent = "حذف";

    remove.addEventListener("click", () => {

      const ok = confirm(
        `هل تريد حذف "${file.name}"؟`
      );

      if (!ok) {
        return;
      }

      database.files =
        database.files.filter(
          item => item.id !== file.id
        );

      saveDatabase();
      renderFiles(searchInput.value);

    });

    actions.appendChild(open);
    actions.appendChild(rename);
    actions.appendChild(remove);

    card.appendChild(top);
    card.appendChild(info);
    card.appendChild(actions);

    filesList.appendChild(card);

  });
}


/* =========================================================
   OPEN / CREATE
========================================================= */

function openFile(id) {

  const file = database.files.find(
    item => item.id === id
  );

  if (!file) {
    return;
  }

  currentFileId = id;
  currentPageIndex = 0;

  locked = !!file.locked;

  homeScreen.classList.add("hidden");
  boardScreen.classList.remove("hidden");

  boardTitle.value = file.name;

  history = [];
  redoHistory = [];

  updateLockUI();

  resizeCanvas();

  renderCurrentPage();

  closeAllPopups();

}


function createNewFile() {

  const name = prompt(
    "اسم الملف:",
    "ملف جديد"
  );

  if (name === null) {
    return;
  }

  const cleanName =
    name.trim() || "ملف جديد";

  const file = createFile(
    cleanName,
    false
  );

  openFile(file.id);
}


function createStandalone() {

  const file = createFile(
    "سبورة مستقلة",
    true
  );

  openFile(file.id);
}


/* =========================================================
   BACK
========================================================= */

function goHome() {

  saveCurrentState();

  currentFileId = null;

  boardScreen.classList.add("hidden");
  homeScreen.classList.remove("hidden");

  closeAllPopups();

  renderFiles(searchInput.value);
}


/* =========================================================
   BOARD TITLE
========================================================= */

boardTitle.addEventListener("change", () => {

  const file = getCurrentFile();

  if (!file) {
    return;
  }

  const name =
    boardTitle.value.trim();

  file.name =
    name || "السبورة";

  boardTitle.value = file.name;

  updateCurrentFile();

});


/* =========================================================
   CANVAS
========================================================= */

function resizeCanvas() {

  const rect =
    board.getBoundingClientRect();

  const dpr =
    window.devicePixelRatio || 1;

  canvas.width =
    Math.max(1, Math.round(rect.width * dpr));

  canvas.height =
    Math.max(1, Math.round(rect.height * dpr));

  canvas.style.width =
    rect.width + "px";

  canvas.style.height =
    rect.height + "px";

  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );

  renderCurrentPage();
}


window.addEventListener(
  "resize",
  resizeCanvas
);


/* =========================================================
   COORDINATES
========================================================= */

function getPoint(event) {

  const rect =
    canvas.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };

}


/* =========================================================
   PAGE RENDERING
========================================================= */

function applyBackground(background) {

  board.classList.remove(
    "background-white",
    "background-black",
    "background-lines",
    "background-grid"
  );

  board.classList.add(
    "background-" + background
  );

}


function renderCurrentPage() {

  const file = getCurrentFile();

  if (!file) {
    return;
  }

  if (!file.pages[currentPageIndex]) {
    file.pages[currentPageIndex] =
      createPage();
  }

  const page =
    file.pages[currentPageIndex];

  applyBackground(page.background);

  const rect =
    board.getBoundingClientRect();

  ctx.clearRect(
    0,
    0,
    rect.width,
    rect.height
  );

  drawAllStrokes(page.strokes);

  renderObjects(page);

  updatePageInfo();

}


function drawAllStrokes(strokes) {

  strokes.forEach(stroke => {

    drawStroke(
      stroke,
      false
    );

  });

}


function drawStroke(stroke, preview = false) {

  if (!stroke) {
    return;
  }

  ctx.save();

  if (stroke.tool === "eraser") {

    ctx.globalCompositeOperation =
      "destination-out";

    ctx.globalAlpha = 1;

  } else if (stroke.tool === "highlighter") {

    ctx.globalCompositeOperation =
      "source-over";

    ctx.globalAlpha =
      stroke.opacity || 0.28;

  } else {

    ctx.globalCompositeOperation =
      "source-over";

    ctx.globalAlpha =
      stroke.opacity || 1;

  }

  ctx.strokeStyle =
    stroke.color || "#111111";

  ctx.fillStyle =
    stroke.color || "#111111";

  ctx.lineWidth =
    stroke.size || 4;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (stroke.type === "freehand") {

    const points = stroke.points || [];

    if (points.length === 0) {
      ctx.restore();
      return;
    }

    if (points.length === 1) {

      ctx.beginPath();

      ctx.arc(
        points[0].x,
        points[0].y,
        Math.max(
          1,
          (stroke.size || 4) / 2
        ),
        0,
        Math.PI * 2
      );

      ctx.fill();

    } else {

      ctx.beginPath();

      ctx.moveTo(
        points[0].x,
        points[0].y
      );

      for (
        let i = 1;
        i < points.length;
        i++
      ) {

        ctx.lineTo(
          points[i].x,
          points[i].y
        );

      }

      ctx.stroke();

    }

  }

  if (stroke.type === "shape") {

    drawShape(
      stroke.shape,
      stroke.start,
      stroke.end
    );

  }

  ctx.restore();

}


function drawShape(
  shape,
  start,
  end
) {

  if (!start || !end) {
    return;
  }

  const x1 = start.x;
  const y1 = start.y;
  const x2 = end.x;
  const y2 = end.y;

  const width = x2 - x1;
  const height = y2 - y1;

  ctx.beginPath();

  if (shape === "line") {

    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    ctx.stroke();

  }

  else if (shape === "arrow") {

    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const angle =
      Math.atan2(
        y2 - y1,
        x2 - x1
      );

    const head =
      Math.max(
        10,
        (ctx.lineWidth || 4) * 3
      );

    ctx.beginPath();

    ctx.moveTo(
      x2,
      y2
    );

    ctx.lineTo(
      x2 - head * Math.cos(angle - Math.PI / 6),
      y2 - head * Math.sin(angle - Math.PI / 6)
    );

    ctx.moveTo(
      x2,
      y2
    );

    ctx.lineTo(
      x2 - head * Math.cos(angle + Math.PI / 6),
      y2 - head * Math.sin(angle + Math.PI / 6)
    );

    ctx.stroke();

  }

  else if (shape === "rect") {

    ctx.strokeRect(
      x1,
      y1,
      width,
      height
    );

  }

  else if (shape === "circle") {

    const cx =
      (x1 + x2) / 2;

    const cy =
      (y1 + y2) / 2;

    const rx =
      Math.abs(width) / 2;

    const ry =
      Math.abs(height) / 2;

    ctx.save();

    ctx.translate(cx, cy);

    ctx.scale(
      Math.max(rx, 1),
      Math.max(ry, 1)
    );

    ctx.arc(
      0,
      0,
      1,
      0,
      Math.PI * 2
    );

    ctx.restore();

    ctx.stroke();

  }

  else if (shape === "triangle") {

    const topX =
      (x1 + x2) / 2;

    const topY =
      Math.min(y1, y2);

    const bottomY =
      Math.max(y1, y2);

    ctx.moveTo(
      topX,
      topY
    );

    ctx.lineTo(
      x1,
      bottomY
    );

    ctx.lineTo(
      x2,
      bottomY
    );

    ctx.closePath();

    ctx.stroke();

  }

}


/* =========================================================
   POINTER DRAWING
========================================================= */

canvas.addEventListener(
  "pointerdown",
  startDrawing
);

canvas.addEventListener(
  "pointermove",
  drawMove
);

canvas.addEventListener(
  "pointerup",
  stopDrawing
);

canvas.addEventListener(
  "pointercancel",
  stopDrawing
);


function startDrawing(event) {

  if (locked) {
    return;
  }

  event.preventDefault();

  const point =
    getPoint(event);

  if (currentTool === "text") {

    addTextAt(
      point.x,
      point.y
    );

    return;
  }

  isDrawing = true;

  canvas.setPointerCapture(
    event.pointerId
  );

  if (
    currentTool === "pen" ||
    currentTool === "highlighter" ||
    currentTool === "eraser"
  ) {

    currentStroke = {
      id: makeId(),
      type: "freehand",
      tool: currentTool,
      color: currentColor,
      size:
        currentTool === "highlighter"
          ? Math.max(currentSize * 3, 10)
          : currentSize,
      opacity:
        currentTool === "highlighter"
          ? 0.28
          : 1,
      points: [point]
    };

  }

  else if (currentTool === "shape") {

    currentStroke = {
      id: makeId(),
      type: "shape",
      tool: "pen",
      shape: currentShape,
      color: currentColor,
      size: currentSize,
      opacity: 1,
      start: point,
      end: point
    };

  }

}


function drawMove(event) {

  if (!isDrawing || !currentStroke) {
    return;
  }

  event.preventDefault();

  const point =
    getPoint(event);

  if (currentStroke.type === "freehand") {

    currentStroke.points.push(point);

  } else {

    currentStroke.end = point;

  }

  redrawForPreview();

}


function stopDrawing(event) {

  if (!isDrawing || !currentStroke) {
    return;
  }

  isDrawing = false;

  try {
    canvas.releasePointerCapture(
      event.pointerId
    );
  } catch (error) {}

  const file = getCurrentFile();

  if (!file) {
    currentStroke = null;
    return;
  }

  const page =
    file.pages[currentPageIndex];

  page.strokes.push(
    currentStroke
  );

  pushHistory();

  currentStroke = null;

  updateCurrentFile();

  renderCurrentPage();

}


function redrawForPreview() {

  const file = getCurrentFile();

  if (!file) {
    return;
  }

  const page =
    file.pages[currentPageIndex];

  const rect =
    board.getBoundingClientRect();

  ctx.clearRect(
    0,
    0,
    rect.width,
    rect.height
  );

  drawAllStrokes(page.strokes);

  if (currentStroke) {
    drawStroke(
      currentStroke,
      true
    );
  }

}


/* =========================================================
   HISTORY
========================================================= */

function clonePage(page) {

  return JSON.parse(
    JSON.stringify(page)
  );

}


function pushHistory() {

  const file = getCurrentFile();

  if (!file) {
    return;
  }

  history.push(
    clonePage(
      file.pages[currentPageIndex]
    )
  );

  if (history.length > 60) {
    history.shift();
  }

  redoHistory = [];

}


function undo() {

  const file = getCurrentFile();

  if (!file || history.length === 0) {
    return;
  }

  const current =
    clonePage(
      file.pages[currentPageIndex]
    );

  redoHistory.push(current);

  const previous =
    history.pop();

  file.pages[currentPageIndex] =
    previous;

  updateCurrentFile();

  renderCurrentPage();

}


function redo() {

  const file = getCurrentFile();

  if (!file || redoHistory.length === 0) {
    return;
  }

  history.push(
    clonePage(
      file.pages[currentPageIndex]
    )
  );

  const next =
    redoHistory.pop();

  file.pages[currentPageIndex] =
    next;

  updateCurrentFile();

  renderCurrentPage();

}


/* =========================================================
   OBJECTS
========================================================= */

function renderObjects(page) {

  objectLayer.innerHTML = "";

  page.texts.forEach(
    textObject => {

      const el =
        document.createElement("div");

      el.className =
        "boardText";

      el.dataset.id =
        textObject.id;

      el.textContent =
        textObject.text;

      el.style.left =
        textObject.x + "px";

      el.style.top =
        textObject.y + "px";

      el.style.fontSize =
        textObject.size + "px";

      el.style.color =
        textObject.color;

      el.style.fontWeight =
        textObject.bold
          ? "700"
          : "400";

      if (
        selectedObjectId ===
        textObject.id
      ) {

        el.classList.add(
          "selected"
        );

      }

      el.addEventListener(
        "pointerdown",
        startObjectDrag
      );

      el.addEventListener(
        "dblclick",
        () => editText(textObject)
      );

      objectLayer.appendChild(el);

    }
  );


  page.images.forEach(
    imageObject => {

      const img =
        document.createElement("img");

      img.className =
        "boardImage";

      img.dataset.id =
        imageObject.id;

      img.src =
        imageObject.src;

      img.draggable = false;

      img.style.left =
        imageObject.x + "px";

      img.style.top =
        imageObject.y + "px";

      img.style.width =
  
