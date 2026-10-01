(() => {
  "use strict";

  const STORAGE_KEY = "whiteboard_files_v4";
  const SETTINGS_KEY = "whiteboard_settings_v4";

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];

  const uid = () =>
    `${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 9)}`;

  const clamp = (value, min, max) =>
    Math.min(Math.max(value, min), max);

  function readJSON(key, fallback) {
    try {
      return JSON.parse(
        localStorage.getItem(key) || ""
      );
    } catch {
      return fallback;
    }
  }

  const state = {
    files: readJSON(STORAGE_KEY, []),
    settings: readJSON(SETTINGS_KEY, {}),

    screen: "home",

    currentFileId: null,
    pageIndex: 0,

    tool: "pen",
    color: "#163B7A",
    size: 4,

    locked: false,

    drawing: false,
    currentStroke: null,
    shapeStart: null,
    lastPointer: null,

    history: [],
    future: [],

    gridOn: false,

    timerSeconds: 300,
    timerRunning: false,
    timerInterval: null
  };

  if (!Array.isArray(state.files)) {
    state.files = [];
  }

  state.darkMode =
    Boolean(state.settings.darkMode);

  const els = {
    home: $("#homeScreen"),
    boardScreen: $("#boardScreen"),

    newFile: $("#newFileBtn"),
    standalone: $("#standaloneBtn"),
    homeTheme: $("#themeHomeBtn"),

    search: $("#searchInput"),
    fileCount: $("#fileCount"),
    filesList: $("#filesList"),
    emptyState: $("#emptyState"),

    back: $("#backBtn"),
    title: $("#boardTitle"),
    saveState: $("#saveState"),

    undo: $("#undoBtn"),
    redo: $("#redoBtn"),
    more: $("#moreBtn"),

    ruler: $("#ruler"),
    board: $("#board"),
    canvas: $("#drawCanvas"),
    objectLayer: $("#objectLayer"),
    lockOverlay: $("#lockOverlay"),

    pen: $("#penBtn"),
    eraser: $("#eraserBtn"),
    highlighter: $("#highlighterBtn"),
    color: $("#colorBtn"),
    colorDot: $("#colorDot"),
    size: $("#sizeBtn"),
    shapes: $("#shapeBtn"),
    text: $("#textBtn"),
    moreTools: $("#moreToolsBtn"),

    colorPopup: $("#colorPopup"),
    sizePopup: $("#sizePopup"),
    shapePopup: $("#shapePopup"),
    morePopup: $("#morePopup"),
    backgroundPopup: $("#backgroundPopup"),

    backgroundBtn: $("#backgroundBtn"),
    gridBtn: $("#gridBtn"),
    rulerBtn: $("#rulerBtn"),
    imageBtn: $("#imageBtn"),
    calculatorBtn: $("#calculatorBtn"),
    timerBtn: $("#timerBtn"),
    favoriteBtn: $("#favoriteBtn"),
    favoriteText: $("#favoriteText"),
    exportBtn: $("#exportBtn"),
    printBtn: $("#printBtn"),
    clearBtn: $("#clearBtn"),
    themeBtn: $("#themeBtn"),
    lockBtn: $("#lockBtn"),
    lockText: $("#lockText"),
    deleteBoardBtn: $("#deleteBoardBtn"),

    calculator: $("#calculator"),
    calcDisplay: $("#calcDisplay"),

    timerPanel: $("#timerPanel"),
    timerDisplay: $("#timerDisplay"),
    timerMinutes: $("#timerMinutes"),
    timerStart: $("#timerStart"),
    timerPause: $("#timerPause"),
    timerReset: $("#timerReset"),

    imageInput: $("#imageInput"),

    prevPage: $("#prevPageBtn"),
    nextPage: $("#nextPageBtn"),
    pageInfo: $("#pageInfo"),

    toast: $("#toast")
  };

  const ctx =
    els.canvas?.getContext("2d");

  let toastTimer = null;
  let drag = null;

  function saveData() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state.files)
      );

      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(state.settings)
      );
    } catch {
      showToast(
        "مساحة الحفظ في المتصفح امتلأت"
      );
    }
  }

  function currentFile() {
    return state.files.find(
      (file) =>
        file.id === state.currentFileId
    ) || null;
  }

  function emptyPage() {
    return {
      id: uid(),
      background: "white",
      strokes: [],
      objects: []
    };
  }

  function createFile(
    name,
    standalone = false
  ) {
    return {
      id: uid(),
      name:
        name ||
        "سبورة جديدة",

      standalone,

      favorite: false,

      createdAt: Date.now(),
      updatedAt: Date.now(),

      pages: [emptyPage()]
    };
  }

  function currentPage() {
    const file =
      currentFile();

    if (!file) {
      return null;
    }

    if (
      !Array.isArray(file.pages) ||
      !file.pages.length
    ) {
      file.pages = [emptyPage()];
    }

    state.pageIndex = clamp(
      state.pageIndex,
      0,
      file.pages.length - 1
    );

    return file.pages[
      state.pageIndex
    ];
  }

  function showToast(message) {
    if (!els.toast) return;

    els.toast.textContent = message;

    els.toast.classList.add(
      "show"
    );

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      els.toast.classList.remove(
        "show"
      );
    }, 1600);
  }

  /* =========================
     SHOW / HIDE
  ========================== */

  function reveal(element) {
    if (!element) return;

    element.classList.remove(
      "hidden"
    );

    element.hidden = false;

    element.style.removeProperty(
      "display"
    );
  }

  function hide(element) {
    if (!element) return;

    element.classList.add(
      "hidden"
    );

    element.hidden = true;

    element.style.display =
      "none";
  }

  function closePopups() {
    [
      els.colorPopup,
      els.sizePopup,
      els.shapePopup,
      els.morePopup,
      els.backgroundPopup
    ].forEach(hide);
  }

  function closePanels() {
    hide(els.calculator);
    hide(els.timerPanel);
  }

  function openPopup(popup) {
    closePopups();
    reveal(popup);
  }

  /* =========================
     THEME
  ========================== */

  function applyTheme() {
    document.body.classList.toggle(
      "dark",
      state.darkMode
    );

    document.documentElement.dataset.theme =
      state.darkMode
        ? "dark"
        : "light";
  }

  function toggleTheme() {
    state.darkMode =
      !state.darkMode;

    state.settings.darkMode =
      state.darkMode;

    applyTheme();
    saveData();

    showToast(
      state.darkMode
        ? "الوضع الداكن"
        : "الوضع الفاتح"
    );
  }

  /* =========================
     UI
  ========================== */

  function updateColorUI() {
    if (els.colorDot) {
      els.colorDot.style.background =
        state.color;
    }

    $$(".colorChoice").forEach(
      (button) => {
        button.classList.toggle(
          "active",
          button.dataset.color ===
            state.color
        );
      }
    );
  }

  function updateToolUI() {
    const buttons = {
      pen: els.pen,
      eraser: els.eraser,
      highlighter:
        els.highlighter
    };

    Object.entries(buttons).forEach(
      ([tool, button]) => {
        button?.classList.toggle(
          "active",
          state.tool === tool
        );
      }
    );
  }

  function updateLockUI() {
    if (state.locked) {
      reveal(els.lockOverlay);
    } else {
      hide(els.lockOverlay);
    }

    if (els.lockText) {
      els.lockText.textContent =
        state.locked
          ? "فتح السبورة"
          : "قفل السبورة";
    }
  }

  function updateFavoriteUI() {
    const file =
      currentFile();

    if (!file) return;

    if (els.favoriteText) {
      els.favoriteText.textContent =
        file.favorite
          ? "إزالة من المفضلة"
          : "إضافة للمفضلة";
    }

    const icon =
      els.favoriteBtn?.querySelector(
        ":scope > span:first-child"
      );

    if (icon) {
      icon.textContent =
        file.favorite
          ? "★"
          : "☆";
    }
  }

  function updateBoardTitle() {
    const file =
      currentFile();

    if (!file) return;

    if (els.title) {
      els.title.value =
        file.name;
    }

    if (els.saveState) {
      els.saveState.textContent =
        "تم الحفظ";
    }

    updateFavoriteUI();
  }

  /* =========================
     HOME
  ========================== */

  function showHome() {
    state.screen =
      "home";

    reveal(els.home);
    hide(els.boardScreen);

    state.currentFileId =
      null;

    state.pageIndex = 0;

    state.history = [];
    state.future = [];

    state.locked = false;

    closePopups();
    closePanels();

    renderFiles(
      els.search?.value || ""
    );
  }

  function openBoard(file) {
    if (!file) return;

    state.screen =
      "board";

    state.currentFileId =
      file.id;

    state.pageIndex = 0;

    state.history = [];
    state.future = [];

    state.locked = false;

    hide(els.home);
    reveal(els.boardScreen);

    closePopups();
    closePanels();

    applyTheme();

    updateBoardTitle();
    updateToolUI();
    updateColorUI();
    updateLockUI();

    renderPage();
  }

  function createNewFile() {
    const name = prompt(
      "اكتب اسم الملف",
      `سبورة ${state.files.length + 1}`
    );

    if (name === null) {
      return;
    }

    const trimmed =
      name.trim();

    if (!trimmed) {
      showToast(
        "اكتب اسمًا للملف"
      );
      return;
    }

    const file =
      createFile(
        trimmed,
        false
      );

    state.files.unshift(
      file
    );

    saveData();

    openBoard(file);

    showToast(
      "تم إنشاء الملف"
    );
  }

  function createStandalone() {
    const file =
      createFile(
        "سبورة مستقلة",
        true
      );

    state.files.unshift(
      file
    );

    saveData();

    openBoard(file);

    showToast(
      "تم فتح السبورة المستقلة"
    );
  }

  function renderFiles(
    query = ""
  ) {
    const q =
      query
        .trim()
        .toLowerCase();

    if (els.fileCount) {
      els.fileCount.textContent =
        String(
          state.files.length
        );
    }

    if (!els.filesList) {
      return;
    }

    const list =
      state.files
        .filter((file) =>
          !q ||
          file.name
            .toLowerCase()
            .includes(q)
        )
        .sort(
          (a, b) =>
            Number(b.favorite) -
              Number(a.favorite) ||
            b.updatedAt -
              a.updatedAt
        );

    els.filesList.innerHTML =
      "";

    if (els.emptyState) {
      els.emptyState.style.display =
        list.length
          ? "none"
          : "";
    }

    list.forEach(
      (file) => {
        const card =
          document.createElement(
            "article"
          );

        card.className =
          "fileCard";

        card.innerHTML = `
          <div class="fileCardTop">
            <div class="fileIcon">▱</div>

            <button
              class="fileFavorite"
              type="button"
            >
              ${file.favorite ? "★" : "☆"}
            </button>
          </div>

          <div class="fileName"></div>

          <div class="fileMeta">
            ${file.pages.length} صفحة
          </div>

          <div class="fileActions">

            <button
              type="button"
              data-open
            >
              فتح
            </button>

            <button
              type="button"
              data-rename
            >
              تسمية
            </button>

            <button
              type="button"
              data-delete
              class="danger"
            >
              حذف
            </button>

          </div>
        `;

        $(".fileName", card)
          .textContent =
          file.name;

        $("[data-open]", card)
          .addEventListener(
            "click",
            () =>
              openBoard(file)
          );

        $("[data-rename]", card)
          .addEventListener(
            "click",
            () =>
              renameFile(file)
          );

        $("[data-delete]", card)
          .addEventListener(
            "click",
            () =>
              deleteFile(file.id)
          );

        $(".fileFavorite", card)
          .addEventListener(
            "click",
            () =>
              toggleFavorite(
                file.id
              )
          );

        els.filesList.appendChild(
          card
        );
      }
    );
  }

  function renameFile(file) {
    const name = prompt(
      "اكتب الاسم الجديد",
      file.name
    );

    if (name === null) {
      return;
    }

    const trimmed =
      name.trim();

    if (!trimmed) {
      showToast(
        "الاسم لا يمكن أن يكون فارغًا"
      );

      return;
    }

    file.name =
      trimmed;

    file.updatedAt =
      Date.now();

    saveData();

    if (
      currentFile()?.id ===
      file.id
    ) {
      updateBoardTitle();
    }

    renderFiles(
      els.search?.value ||
        ""
    );

    showToast(
      "تم تغيير الاسم"
    );
  }

  function deleteFile(fileId) {
    const file =
      state.files.find(
        (item) =>
          item.id ===
          fileId
      );

    if (!file) return;

    const ok =
      confirm(
        `هل تريد حذف "${file.name}"؟`
      );

    if (!ok) {
      return;
    }

    state.files =
      state.files.filter(
        (item) =>
          item.id !==
          fileId
      );

    saveData();

    if (
      state.currentFileId ===
      fileId
    ) {
      showHome();
    } else {
      renderFiles(
        els.search?.value ||
          ""
      );
    }

    showToast(
      "تم حذف الملف"
    );
  }

  function toggleFavorite(fileId) {
    const file =
      state.files.find(
        (item) =>
          item.id ===
          fileId
      );

    if (!file) return;

    file.favorite =
      !file.favorite;

    file.updatedAt =
      Date.now();

    saveData();

    renderFiles(
      els.search?.value ||
        ""
    );

    if (
      currentFile()?.id ===
      fileId
    ) {
      updateFavoriteUI();
    }

    showToast(
      file.favorite
        ? "تمت الإضافة للمفضلة"
        : "تمت الإزالة من المفضلة"
    );
  }

  /* =========================
     HISTORY
  ========================== */

  function snapshot() {
    const file =
      currentFile();

    if (!file) {
      return null;
    }

    return JSON.parse(
      JSON.stringify(
        file.pages
      )
    );
  }

  function pushHistory() {
    const snap =
      snapshot();

    if (!snap) {
      return;
    }

    state.history.push(
      snap
    );

    if (
      state.history.length >
      50
    ) {
      state.history.shift();
    }

    state.future = [];
  }

  function restorePages(
    pages
  ) {
    const file =
      currentFile();

    if (!file) return;

    file.pages =
      JSON.parse(
        JSON.stringify(
          pages
        )
      );

    file.updatedAt =
      Date.now();

    state.pageIndex =
      clamp(
        state.pageIndex,
        0,
        file.pages.length - 1
      );

    saveData();

    renderPage();
  }

  function undo() {
    if (!state.history.length) {
      showToast(
        "مفيش حاجة للتراجع"
      );

      return;
    }

    const now =
      snapshot();

    if (now) {
      state.future.push(
        now
      );
    }

    const previous =
      state.history.pop();

    restorePages(
      previous
    );

    showToast(
      "تم التراجع"
    );
  }

  function redo() {
    if (!state.future.length) {
      showToast(
        "مفيش حاجة للإعادة"
      );

      return;
    }

    const now =
      snapshot();

    if (now) {
      state.history.push(
        now
      );
    }

    const next =
      state.future.pop();

    restorePages(
      next
    );

    showToast(
      "تمت الإعادة"
    );
  }

  /* =========================
     CANVAS
  ========================== */

  function resizeCanvas() {
    if (
      !els.canvas ||
      !ctx
    ) {
      return;
    }

    const rect =
      els.canvas.getBoundingClientRect();

    const width =
      Math.max(
        1,
        Math.round(
          rect.width *
            devicePixelRatio
        )
      );

    const height =
      Math.max(
        1,
        Math.round(
          rect.height *
            devicePixelRatio
        )
      );

    if (
      els.canvas.width !==
        width ||
      els.canvas.height !==
        height
    ) {
      els.canvas.width =
        width;

      els.canvas.height =
        height;
    }

    ctx.setTransform(
      devicePixelRatio,
      0,
      0,
      devicePixelRatio,
      0,
      0
    );

    ctx.lineCap =
      "round";

    ctx.lineJoin =
      "round";
  }

  function pointFromEvent(
    event
  ) {
    const rect =
      els.canvas.getBoundingClientRect();

    return {
      x:
        event.clientX -
        rect.left,

      y:
        event.clientY -
        rect.top
    };
  }

  function clearCanvas() {
    const rect =
      els.canvas.getBoundingClientRect();

    ctx.clearRect(
      0,
      0,
      rect.width,
      rect.height
    );
  }

  function drawStroke(
    stroke
  ) {
    if (
      !stroke?.points?.length
    ) {
      return;
    }

    ctx.save();

    ctx.globalCompositeOperation =
      stroke.tool ===
      "eraser"
        ? "destination-out"
        : "source-over";

    ctx.strokeStyle =
      stroke.color ||
      "#163B7A";

    ctx.lineWidth =
      Number(
        stroke.size
      ) || 4;

    ctx.globalAlpha =
      stroke.tool ===
      "highlighter"
        ? 0.28
        : 1;

    if (
      stroke.tool ===
      "highlighter"
    ) {
      ctx.lineWidth *= 4;
    }

    ctx.beginPath();

    ctx.moveTo(
      stroke.points[0].x,
      stroke.points[0].y
    );

    for (
      let i = 1;
      i < stroke.points.length;
      i++
    ) {
      ctx.lineTo(
        stroke.points[i].x,
        stroke.points[i].y
      );
    }

    ctx.stroke();

    ctx.restore();
  }

  /* =========================
     SHAPES
  ========================== */

  function makeShape(
    shape,
    start,
    end
  ) {
    return {
      id: uid(),

      type: "shape",

      shape,

      x:
        Math.min(
          start.x,
          end.x
        ),

      y:
        Math.min(
          start.y,
          end.y
        ),

      width:
        end.x -
        start.x,

      height:
        end.y -
        start.y,

      color:
        state.color,

      size:
        state.size
    };
  }

  function drawShape(
    shape
  ) {
    const x =
      shape.x;

    const y =
      shape.y;

    const w =
      shape.width;

    const h =
      shape.height;

    ctx.save();

    ctx.strokeStyle =
      shape.color ||
      "#163B7A";

    ctx.lineWidth =
      Number(
        shape.size
      ) || 4;

    ctx.lineCap =
      "round";

    ctx.lineJoin =
      "round";

    if (
      shape.shape ===
      "rect"
    ) {
      ctx.strokeRect(
        x,
        y,
        w,
        h
      );
    }

    else if (
      shape.shape ===
      "circle"
    ) {
      ctx.beginPath();

      ctx.ellipse(
        x + w / 2,
        y + h / 2,
        Math.abs(w / 2),
        Math.abs(h / 2),
        0,
        0,
        Math.PI * 2
      );

      ctx.stroke();
    }

    else if (
      shape.shape ===
      "triangle"
    ) {
      ctx.beginPath();

      ctx.moveTo(
        x + w / 2,
        y
      );

      ctx.lineTo(
        x + w,
        y + h
      );

      ctx.lineTo(
        x,
        y + h
      );

      ctx.closePath();

      ctx.stroke();
    }

    else {
      const endX =
        x + w;

      const endY =
        y + h;

      ctx.beginPath();

      ctx.moveTo(
        x,
        y
      );

      ctx.lineTo(
        endX,
        endY
      );

      ctx.stroke();

      if (
        shape.shape ===
        "arrow"
      ) {
        const angle =
          Math.atan2(
            endY - y,
            endX - x
          );

        const size = 14;

        ctx.beginPath();

        ctx.moveTo(
          endX,
          endY
        );

        ctx.lineTo(
          endX -
            size *
              Math.cos(
                angle -
                  Math.PI /
