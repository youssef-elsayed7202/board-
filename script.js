(function () {
  "use strict";

  /* =========================
     STORAGE
  ========================== */

  var STORAGE_KEY = "whiteboard_files_final";
  var SETTINGS_KEY = "whiteboard_settings_final";

  function loadJSON(key, fallback) {
    try {
      var value = localStorage.getItem(key);

      if (!value) {
        return fallback;
      }

      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  var files = loadJSON(STORAGE_KEY, []);
  var settings = loadJSON(SETTINGS_KEY, {
    darkMode: false
  });

  if (!Array.isArray(files)) {
    files = [];
  }

  /* =========================
     STATE
  ========================== */

  var currentFileId = null;
  var currentPageIndex = 0;

  var currentTool = "pen";
  var currentColor = "#163B7A";
  var currentSize = 4;

  var locked = false;

  var drawing = false;
  var currentStroke = null;
  var shapeStart = null;
  var selectedShape = null;

  var history = [];
  var redoHistory = [];

  var timerInterval = null;
  var timerSeconds = 300;

  /* =========================
     ELEMENTS
  ========================== */

  var homeScreen = document.getElementById("homeScreen");
  var boardScreen = document.getElementById("boardScreen");

  var newFileBtn = document.getElementById("newFileBtn");
  var standaloneBtn = document.getElementById("standaloneBtn");
  var themeHomeBtn = document.getElementById("themeHomeBtn");

  var searchInput = document.getElementById("searchInput");
  var filesList = document.getElementById("filesList");
  var fileCount = document.getElementById("fileCount");
  var emptyState = document.getElementById("emptyState");

  var backBtn = document.getElementById("backBtn");
  var boardTitle = document.getElementById("boardTitle");
  var saveState = document.getElementById("saveState");

  var undoBtn = document.getElementById("undoBtn");
  var redoBtn = document.getElementById("redoBtn");
  var moreBtn = document.getElementById("moreBtn");

  var board = document.getElementById("board");
  var canvas = document.getElementById("drawCanvas");
  var objectLayer = document.getElementById("objectLayer");

  var lockOverlay = document.getElementById("lockOverlay");
  var ruler = document.getElementById("ruler");

  var penBtn = document.getElementById("penBtn");
  var eraserBtn = document.getElementById("eraserBtn");
  var highlighterBtn = document.getElementById("highlighterBtn");
  var colorBtn = document.getElementById("colorBtn");
  var colorDot = document.getElementById("colorDot");
  var sizeBtn = document.getElementById("sizeBtn");
  var shapeBtn = document.getElementById("shapeBtn");
  var textBtn = document.getElementById("textBtn");
  var moreToolsBtn = document.getElementById("moreToolsBtn");

  var colorPopup = document.getElementById("colorPopup");
  var sizePopup = document.getElementById("sizePopup");
  var shapePopup = document.getElementById("shapePopup");
  var morePopup = document.getElementById("morePopup");
  var backgroundPopup = document.getElementById("backgroundPopup");

  var backgroundBtn = document.getElementById("backgroundBtn");
  var gridBtn = document.getElementById("gridBtn");
  var rulerBtn = document.getElementById("rulerBtn");
  var imageBtn = document.getElementById("imageBtn");
  var calculatorBtn = document.getElementById("calculatorBtn");
  var timerBtn = document.getElementById("timerBtn");
  var favoriteBtn = document.getElementById("favoriteBtn");
  var favoriteText = document.getElementById("favoriteText");
  var exportBtn = document.getElementById("exportBtn");
  var printBtn = document.getElementById("printBtn");
  var clearBtn = document.getElementById("clearBtn");
  var themeBtn = document.getElementById("themeBtn");
  var lockBtn = document.getElementById("lockBtn");
  var lockText = document.getElementById("lockText");
  var deleteBoardBtn = document.getElementById("deleteBoardBtn");

  var calculator = document.getElementById("calculator");
  var calcDisplay = document.getElementById("calcDisplay");

  var timerPanel = document.getElementById("timerPanel");
  var timerDisplay = document.getElementById("timerDisplay");
  var timerMinutes = document.getElementById("timerMinutes");
  var timerStart = document.getElementById("timerStart");
  var timerPause = document.getElementById("timerPause");
  var timerReset = document.getElementById("timerReset");

  var imageInput = document.getElementById("imageInput");

  var prevPageBtn = document.getElementById("prevPageBtn");
  var nextPageBtn = document.getElementById("nextPageBtn");
  var pageInfo = document.getElementById("pageInfo");

  var toast = document.getElementById("toast");

  var ctx = canvas.getContext("2d");

  /* =========================
     HELPERS
  ========================== */

  function uid() {
    return String(Date.now()) +
      "_" +
      String(Math.random()).substring(2);
  }

  function saveAll() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(files)
      );

      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(settings)
      );

      if (saveState) {
        saveState.textContent = "تم الحفظ";
      }
    } catch (error) {
      showToast("مساحة الحفظ ممتلئة");
    }
  }

  function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(function () {
      toast.classList.remove("show");
    }, 1600);
  }

  function hide(element) {
    if (!element) return;

    element.classList.add("hidden");
  }

  function show(element) {
    if (!element) return;

    element.classList.remove("hidden");
  }

  function closePopups() {
    hide(colorPopup);
    hide(sizePopup);
    hide(shapePopup);
    hide(morePopup);
    hide(backgroundPopup);
  }

  function closePanels() {
    hide(calculator);
    hide(timerPanel);
  }

  function openPopup(popup) {
    closePopups();
    show(popup);
  }

  function getCurrentFile() {
    var i;

    for (i = 0; i < files.length; i++) {
      if (files[i].id === currentFileId) {
        return files[i];
      }
    }

    return null;
  }

  function createPage() {
    return {
      id: uid(),
      background: "white",
      strokes: [],
      objects: []
    };
  }

  function createFile(name, standalone) {
    return {
      id: uid(),
      name: name,
      standalone: standalone,
      favorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pages: [createPage()]
    };
  }

  function getCurrentPage() {
    var file = getCurrentFile();

    if (!file) return null;

    if (!file.pages || !file.pages.length) {
      file.pages = [createPage()];
    }

    if (currentPageIndex < 0) {
      currentPageIndex = 0;
    }

    if (currentPageIndex >= file.pages.length) {
      currentPageIndex =
        file.pages.length - 1;
    }

    return file.pages[currentPageIndex];
  }

  /* =========================
     THEME
  ========================== */

  function applyTheme() {
    if (settings.darkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }

  function toggleTheme() {
    settings.darkMode =
      !settings.darkMode;

    applyTheme();
    saveAll();

    if (settings.darkMode) {
      showToast("الوضع الليلي");
    } else {
      showToast("الوضع النهاري");
    }
  }

  /* =========================
     HOME
  ========================== */

  function showHome() {
    show(homeScreen);
    hide(boardScreen);

    currentFileId = null;
    currentPageIndex = 0;

    closePopups();
    closePanels();

    renderFiles();
  }

  function openBoard(file) {
    if (!file) return;

    currentFileId = file.id;
    currentPageIndex = 0;

    history = [];
    redoHistory = [];

    locked = false;

    hide(homeScreen);
    show(boardScreen);

    closePopups();
    closePanels();

    boardTitle.value = file.name;

    updateFavoriteUI();
    updateLockUI();
    updateToolUI();
    updateColorUI();

    renderPage();
  }

  function createNewFile() {
    var name = prompt(
      "اكتب اسم الملف",
      "ملف جديد"
    );

    if (name === null) {
      return;
    }

    name = name.trim();

    if (!name) {
      showToast("اكتب اسم الملف");
      return;
    }

    var file = createFile(
      name,
      false
    );

    files.unshift(file);

    saveAll();

    openBoard(file);
  }

  function createStandalone() {
    var file = createFile(
      "سبورة مستقلة",
      true
    );

    files.unshift(file);

    saveAll();

    openBoard(file);
  }

  /* =========================
     FILES
  ========================== */

  function renderFiles() {
    var query =
      searchInput.value
        .trim()
        .toLowerCase();

    filesList.innerHTML = "";

    fileCount.textContent =
      String(files.length);

    var visibleFiles = [];

    var i;

    for (i = 0; i < files.length; i++) {
      if (
        !query ||
        files[i].name
          .toLowerCase()
          .indexOf(query) !== -1
      ) {
        visibleFiles.push(files[i]);
      }
    }

    if (visibleFiles.length === 0) {
      emptyState.style.display = "";
    } else {
      emptyState.style.display = "none";
    }

    for (
      i = 0;
      i < visibleFiles.length;
      i++
    ) {
      createFileCard(
        visibleFiles[i]
      );
    }
  }

  function createFileCard(file) {
    var card =
      document.createElement("article");

    card.className = "fileCard";

    var top =
      document.createElement("div");

    top.className =
      "fileCardTop";

    var icon =
      document.createElement("div");

    icon.className =
      "fileIcon";

    icon.textContent = "▱";

    var favorite =
      document.createElement("button");

    favorite.className =
      "fileFavorite";

    favorite.textContent =
      file.favorite ? "★" : "☆";

    favorite.onclick =
      function (event) {
        event.stopPropagation();

        file.favorite =
          !file.favorite;

        file.updatedAt =
          Date.now();

        saveAll();
        renderFiles();
      };

    top.appendChild(icon);
    top.appendChild(favorite);

    var name =
      document.createElement("div");

    name.className =
      "fileName";

    name.textContent =
      file.name;

    var meta =
      document.createElement("div");

    meta.className =
      "fileMeta";

    meta.textContent =
      file.pages.length +
      " صفحة";

    var actions =
      document.createElement("div");

    actions.className =
      "fileActions";

    var open =
      document.createElement("button");

    open.textContent = "فتح";

    open.onclick =
      function () {
        openBoard(file);
      };

    var rename =
      document.createElement("button");

    rename.textContent = "تسمية";

    rename.onclick =
      function () {
        renameFile(file);
      };

    var del =
      document.createElement("button");

    del.textContent = "حذف";
    del.className = "danger";

    del.onclick =
      function () {
        deleteFile(file.id);
      };

    actions.appendChild(open);
    actions.appendChild(rename);
    actions.appendChild(del);

    card.appendChild(top);
    card.appendChild(name);
    card.appendChild(meta);
    card.appendChild(actions);

    filesList.appendChild(card);
  }

  function renameFile(file) {
    var name = prompt(
      "اكتب الاسم الجديد",
      file.name
    );

    if (name === null) {
      return;
    }

    name = name.trim();

    if (!name) {
      return;
    }

    file.name = name;
    file.updatedAt = Date.now();

    saveAll();
    renderFiles();

    if (
      currentFileId === file.id
    ) {
      boardTitle.value =
        file.name;
    }
  }

  function deleteFile(id) {
    var file = null;
    var i;

    for (i = 
