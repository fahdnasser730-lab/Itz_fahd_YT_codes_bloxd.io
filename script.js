document.addEventListener("DOMContentLoaded", () => {
  const OWNER_CODE_HASH = "314144ac3b28f927d617d0cfcb5b3cf1a5e824bd2294c9567c4fb335e3932e3d";
  const ownerBtn = document.getElementById("ownerBtn");
  const modal = document.getElementById("ownerModal");
  const closeModal = document.getElementById("closeModal");
  const loginOwner = document.getElementById("loginOwner");
  const ownerPassword = document.getElementById("ownerPassword");
  const loginMsg = document.getElementById("loginMsg");
  const ownerTools = document.getElementById("ownerTools");
  const addCodeBtn = document.getElementById("addCodeBtn");
  const newCodeTitle = document.getElementById("newCodeTitle");
  const newCodeCategory = document.getElementById("newCodeCategory");
  const newCodeText = document.getElementById("newCodeText");
  const addCodeMsg = document.getElementById("addCodeMsg");
  const codeGrid = document.getElementById("codeGrid");
  const codeCount = document.getElementById("codeCount");

  function isOwner() {
    return sessionStorage.getItem("omaniOwner") === "1";
  }
  function applyOwner() {
    document.body.classList.toggle("owner-mode", isOwner());
    if (ownerTools) ownerTools.hidden = !isOwner();
  }

  ownerBtn?.addEventListener("click", () => {
    modal?.classList.remove("hidden");
    ownerPassword.value = "";
    loginMsg.textContent = "";
    applyOwner();
    if (!isOwner()) ownerPassword?.focus();
  });
  closeModal?.addEventListener("click", () => modal?.classList.add("hidden"));
  modal?.addEventListener("click", e => { if (e.target === modal) modal.classList.add("hidden"); });

  async function sha256(text) {
    const data = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  loginOwner?.addEventListener("click", async () => {
    const hash = await sha256(ownerPassword.value);
    if (hash === OWNER_CODE_HASH) {
      sessionStorage.setItem("omaniOwner", "1");
      loginMsg.textContent = "✅ Owner unlocked";
      loginMsg.style.color = "#00ff9d";
      applyOwner();
      ownerPassword.value = "";
    } else {
      sessionStorage.removeItem("omaniOwner");
      applyOwner();
      loginMsg.textContent = "❌ Wrong owner code — access denied";
      loginMsg.style.color = "#ff4d6d";
      ownerPassword.value = "";
      ownerPassword.focus();
    }
  });

  ownerPassword?.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); loginOwner.click(); }
  });

  const DELETED_DEFAULTS_KEY = "omaniDeletedDefaults";

  function getDeletedDefaults() {
    try { return new Set(JSON.parse(localStorage.getItem(DELETED_DEFAULTS_KEY) || "[]")); }
    catch { return new Set(); }
  }

  function saveDeletedDefaults(set) {
    localStorage.setItem(DELETED_DEFAULTS_KEY, JSON.stringify([...set]));
  }

  function updateCount() {
    if (codeCount && codeGrid) codeCount.textContent = codeGrid.querySelectorAll(".card").length;
  }

  async function copyCode(btn) {
    const card = btn.closest(".card");
    const code = card?.querySelector("code")?.innerText || "";
    try {
      await navigator.clipboard.writeText(code);
      const old = btn.textContent;
      btn.textContent = "✅ Copied!";
      setTimeout(() => btn.textContent = old, 1200);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
      btn.textContent = "✅ Copied!";
      setTimeout(() => btn.textContent = "📋 Copy Code", 1200);
    }
  }

  function wireCard(card) {
    const copy = card.querySelector(".copy-btn");
    copy?.addEventListener("click", () => copyCode(copy));

    const del = card.querySelector(".delete-btn");
    del?.addEventListener("click", () => {
      // Delete is OWNER-ONLY. Even if someone manually reveals the button,
      // this check blocks the action unless the owner session is unlocked.
      if (!isOwner()) {
        alert("👑 Owner only");
        return;
      }
      if (!confirm("Delete this code?")) return;

      const defaultId = card.dataset.defaultId;
      if (defaultId) {
        const deleted = getDeletedDefaults();
        deleted.add(defaultId);
        saveDeletedDefaults(deleted);
      }
      card.remove();
      updateCount();
      saveAddedCodes();
    });

    const bgInput = card.querySelector(".bg-input");
    bgInput?.addEventListener("change", () => {
      if (!isOwner() || !bgInput.files?.[0]) return;
      const file = bgInput.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        card.style.backgroundImage =
          `linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.68)), url("${reader.result}")`;
        card.style.backgroundSize = "cover";
        card.style.backgroundPosition = "center";
        card.style.backgroundRepeat = "no-repeat";
      };
      reader.readAsDataURL(file);
    });
  }

  document.querySelectorAll(".card").forEach(wireCard);

  // Filters
  document.querySelectorAll(".filter").forEach(filter => {
    filter.addEventListener("click", () => {
      document.querySelectorAll(".filter").forEach(x => x.classList.remove("active"));
      filter.classList.add("active");
      const value = filter.dataset.filter;
      document.querySelectorAll(".card").forEach(card => {
        card.style.display = value === "all" || card.dataset.category === value ? "" : "none";
      });
    });
  });

  function makeCodeCard(title, category, code, id) {
    const article = document.createElement("article");
    article.className = "card added-code";
    article.dataset.category = category;
    article.dataset.addedId = id;
    article.innerHTML = `
      <div class="card-icon">${category === "cinematic" ? "🎬" : category === "chat" ? "💬" : category === "character" ? "👤" : "⚡"}</div>
      <h3></h3>
      <p>Added from Owner Panel.</p>
      <pre><code></code></pre>
      <div class="card-actions">
        <button class="copy-btn">📋 Copy Code</button>
        <button class="delete-btn owner-only">🗑️ Delete</button>
      </div>
      <label class="bg-btn owner-only">🖼️ Code Background<input class="bg-input" type="file" accept="image/*"></label>`;
    article.querySelector("h3").textContent = title;
    article.querySelector("code").textContent = code;
    wireCard(article);
    return article;
  }

  function saveAddedCodes() {
    const added = [...document.querySelectorAll(".added-code")].map(card => ({
      id: card.dataset.addedId,
      title: card.querySelector("h3")?.textContent || "Untitled",
      category: card.dataset.category || "commands",
      code: card.querySelector("code")?.innerText || ""
    }));
    localStorage.setItem("omaniAddedCodes", JSON.stringify(added));
  }

  function loadSavedState() {
    // Restore the user's saved deletions first.
    const deleted = getDeletedDefaults();
    codeGrid.querySelectorAll(".card[data-default-id]").forEach(card => {
      if (deleted.has(card.dataset.defaultId)) card.remove();
    });

    // Then restore codes created from the Owner Panel.
    try {
      const added = JSON.parse(localStorage.getItem("omaniAddedCodes") || "[]");
      added.forEach(x => codeGrid.appendChild(makeCodeCard(x.title, x.category, x.code, x.id)));
    } catch {}

    updateCount();
  }

  addCodeBtn?.addEventListener("click", () => {
    if (!isOwner()) return;
    const title = newCodeTitle.value.trim();
    const code = newCodeText.value.trim();
    const category = newCodeCategory.value;
    if (!title || !code) {
      addCodeMsg.textContent = "⚠️ اكتب اسم الكود والكود نفسه";
      addCodeMsg.style.color = "#ffd166";
      return;
    }
    const id = Date.now().toString(36);
    codeGrid.appendChild(makeCodeCard(title, category, code, id));
    saveAddedCodes();
    updateCount();
    newCodeTitle.value = "";
    newCodeText.value = "";
    addCodeMsg.textContent = "✅ Code added — saved on this browser";
    addCodeMsg.style.color = "#00ff9d";
  });

  // Owner-only restore for the built-in cards.
  const restoreDefaultsBtn = document.createElement("button");
  restoreDefaultsBtn.type = "button";
  restoreDefaultsBtn.className = "main-btn restore-btn";
  restoreDefaultsBtn.textContent = "↩ RESTORE DEFAULT CODES";
  restoreDefaultsBtn.style.marginTop = "10px";
  restoreDefaultsBtn.addEventListener("click", () => {
    if (!isOwner()) { alert("👑 Owner only"); return; }
    localStorage.removeItem(DELETED_DEFAULTS_KEY);
    location.reload();
  });
  ownerTools?.appendChild(restoreDefaultsBtn);

  const logoutBtn = document.createElement("button");
  logoutBtn.type = "button";
  logoutBtn.className = "main-btn logout-btn";
  logoutBtn.textContent = "🔒 LOCK OWNER PANEL";
  logoutBtn.style.marginTop = "10px";
  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("omaniOwner");
    applyOwner();
    loginMsg.textContent = "🔒 Owner panel locked";
    loginMsg.style.color = "#ffd166";
    ownerPassword.value = "";
  });
  ownerTools?.appendChild(logoutBtn);

  loadSavedState();
  applyOwner();

  // Persistent schematic/file vault using IndexedDB (survives page refreshes).
  const fileInput = document.getElementById("fileInput");
  const dropZone = document.getElementById("dropZone");
  const fileList = document.getElementById("fileList");
  const fileCount = document.getElementById("fileCount");
  const DB_NAME = "itzFahdCodeHubDB";
  const STORE_NAME = "vaultFiles";
  let db = null;
  let files = [];

  function openFileDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error("IndexedDB is not supported in this browser."));
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      };
      request.onsuccess = () => { db = request.result; resolve(db); };
      request.onerror = () => reject(request.error);
    });
  }
  function dbRequest(mode, action) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const req = action(tx.objectStore(STORE_NAME));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function refreshFiles() {
    if (!db) return;
    files = await dbRequest("readonly", store => store.getAll());
    renderFiles();
  }
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }
  function renderFiles() {
    if (!fileList) return;
    fileList.innerHTML = "";
    files.forEach(file => {
      const row = document.createElement("div");
      row.className = "file-row";
      const info = document.createElement("div");
      info.className = "file-info";
      const name = document.createElement("strong");
      name.textContent = "📄 " + file.name;
      const meta = document.createElement("small");
      meta.textContent = formatSize(file.size || 0);
      info.append(name, meta);
      const actions = document.createElement("div");
      actions.className = "file-actions";
      const download = document.createElement("a");
      download.className = "file-download";
      download.textContent = "⬇ Download";
      download.href = URL.createObjectURL(file.blob);
      download.download = file.name;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "file-remove";
      remove.textContent = "✕";
      remove.setAttribute("aria-label", "Remove " + file.name);
      remove.onclick = async () => {
        await dbRequest("readwrite", store => store.delete(file.id));
        await refreshFiles();
      };
      actions.append(download, remove);
      row.append(info, actions);
      fileList.appendChild(row);
    });
    if (fileCount) fileCount.textContent = files.length;
  }
  async function addFiles(fileArray) {
    if (!db) {
      alert("File vault is not ready yet. Refresh the page and try again.");
      return;
    }
    for (const file of fileArray) {
      await dbRequest("readwrite", store => store.add({ name: file.name, size: file.size, type: file.type, blob: file, addedAt: Date.now() }));
    }
    await refreshFiles();
  }
  fileInput?.addEventListener("change", async () => {
    await addFiles(Array.from(fileInput.files || []));
    fileInput.value = "";
  });
  ["dragover", "dragenter"].forEach(ev => dropZone?.addEventListener(ev, e => {
    e.preventDefault(); dropZone.classList.add("drag");
  }));
  ["dragleave", "drop"].forEach(ev => dropZone?.addEventListener(ev, e => {
    e.preventDefault(); dropZone.classList.remove("drag");
  }));
  dropZone?.addEventListener("drop", async e => {
    await addFiles(Array.from(e.dataTransfer?.files || []));
  });
  openFileDB().then(refreshFiles).catch(error => {
    console.error("Could not initialize persistent file vault:", error);
    if (fileList) fileList.textContent = "This browser could not open local file storage. Try a current version of Chrome.";
  });
});
