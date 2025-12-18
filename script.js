// ================== НАСТРОЙКИ ==================
const SERVER_VERSION = "0.5.1";   // версия сервера, отображается в карточке

// ================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==================
let GL_totalFiles  = 0;   // всего файлов
let GL_neededFiles = 0;   // осталось
let GL_gotTotals   = false;
let GL_lastStatus  = "";

const barEl    = document.getElementById("loading-progress");
const statusEl = document.getElementById("loading-status");
const tipEl    = document.getElementById("tip-text");
const verEl    = document.getElementById("server-version");

// сразу выставим версию сервера
if (verEl) verEl.textContent = SERVER_VERSION;

// ===== РЕЗЕРВНЫЙ ФЕЙКОВЫЙ ПРОГРЕСС (если Gmod не дергает функции) =====
let fallbackProgress = 0;
let fallbackTimer = setInterval(() => {
    if (GL_gotTotals) return;  // как только пошли реальные данные — вырубаем
    if (!barEl) return;

    fallbackProgress = Math.min(90, fallbackProgress + (Math.random() * 4 + 1));
    barEl.style.width = fallbackProgress + "%";

    if (statusEl && !GL_lastStatus) {
        statusEl.textContent = "Подготовка к подключению...";
    }
}, 600);


// ===== ПОДСКАЗКИ / ФАКТЫ =====
(function () {
    if (!tipEl) return;

    const tips = [
        "Используй /me и /it, чтобы описывать действия и окружение — это делает RP живым.",
        "OOC-уважение обязательно: персонажи могут конфликтовать, игроки — нет.",
        "Слишком много подписок в Workshop замедляет загрузку. Регулярно чисти лишнее.",
        "Перед игрой ознакомься с /rules — незнание правил не освобождает от ответственности.",
        "Если что-то сломалось или лагает — используй /report или Discord сервера."
    ];

    let i = 0;
    setInterval(() => {
        i = (i + 1) % tips.length;
        tipEl.textContent = `"${tips[i]}"`;
    }, 12000);
})();


// ===== GameDetails — инфа о сервере и игроке =====
// GameDetails(servername, serverurl, mapname, maxplayers, steamid, gamemode, volume, language)
window.GameDetails = function (servername, serverurl, mapname, maxplayers, steamid, gamemode) {
    const serverNameEl = document.getElementById("server-name");
    const mapEl        = document.getElementById("map-name");
    const modeEl       = document.getElementById("server-gamemode");
    const steamEl      = document.getElementById("steam-id");

    if (serverNameEl) {
        serverNameEl.textContent = servername || "Новый сервер";
    }

    if (mapEl) {
        mapEl.textContent = mapname || "Неизвестная карта";
    }

    if (modeEl) {
        modeEl.textContent = gamemode
            ? `Режим: ${gamemode}`
            : "Режим: неизвестен";
    }

    if (steamEl) {
        steamEl.textContent = steamid || "Неизвестно";
    }

    if (statusEl && !GL_lastStatus) {
        statusEl.textContent = "Получение информации о сервере...";
    }
};


// ===== SetFilesTotal — всего файлов =====
window.SetFilesTotal = function (total) {
    GL_totalFiles  = parseInt(total, 10) || 0;
    GL_neededFiles = GL_totalFiles;
    GL_gotTotals   = true;

    if (barEl) {
        barEl.style.width = "0%";
    }

    if (statusEl) {
        statusEl.textContent =
            GL_totalFiles > 0
                ? `Подготовка к загрузке файлов (${GL_totalFiles})...`
                : "Подготовка к подключению...";
    }

    clearInterval(fallbackTimer);
};


// ===== SetFilesNeeded — сколько осталось =====
window.SetFilesNeeded = function (needed) {
    GL_neededFiles = parseInt(needed, 10) || 0;

    if (!barEl || GL_totalFiles <= 0) return;

    const downloaded = GL_totalFiles - GL_neededFiles;
    let percent = (downloaded / GL_totalFiles) * 100;

    if (percent < 3) percent = 3;
    if (percent > 99 && GL_neededFiles > 0) percent = 99;
    if (GL_neededFiles === 0) percent = 100;

    barEl.style.width = percent + "%";

    if (statusEl) {
        if (GL_neededFiles > 0) {
            statusEl.textContent =
                `Загрузка контента: ${downloaded}/${GL_totalFiles} файлов...`;
        } else {
            statusEl.textContent = "Все файлы скачаны. Инициализация клиента...";
        }
    }
};


// ===== DownloadingFile — имя текущего файла =====
window.DownloadingFile = function (fileName) {
    GL_lastStatus = `Скачивание: ${fileName}`;
    if (statusEl) statusEl.textContent = GL_lastStatus;
};


// ===== SetStatusChanged — стадия подключения =====
window.SetStatusChanged = function (status) {
    GL_lastStatus = status;

    if (!statusEl) return;

    let nice = status;

    if (status === "Workshop Complete") {
        nice = "Контент Workshop загружен";
    } else if (status === "Sending client info...") {
        nice = "Отправка данных клиента...";
    } else if (status === "Starting Lua...") {
        nice = "Запуск Lua-скриптов...";
    }

    statusEl.textContent = nice;
};


// ===== РЕЗЕРВ: чтение параметров из URL (%m, %s) =====
// Пример в server.cfg:
// sv_loadingurl "https://твой-домен/load/index.html?map=%m&steamid=%s"
(function () {
    const params = new URLSearchParams(window.location.search);

    const map   = params.get("map") || params.get("mapname");
    const steam = params.get("steamid") || params.get("steam");

    if (map) {
        const mapEl = document.getElementById("map-name");
        if (mapEl) mapEl.textContent = map;
    }

    if (steam) {
        const steamEl = document.getElementById("steam-id");
        if (steamEl) steamEl.textContent = steam;
    }
})();
