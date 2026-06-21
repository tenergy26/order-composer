const ORDERS = [
  {
    id: "brave-field",
    name: "火ロング",
    type: "属性",
    icon: "AT",
    duration: 130,
    wait: 20,
    color: "#ff6c89",
  },
  {
    id: "elemental-burst",
    name: "支え",
    type: "支援",
    icon: "EL",
    duration: 80,
    wait: 20,
    color: "#ffad5a",
  },
  {
    id: "aegis-line",
    name: "水ロング",
    type: "属性",
    icon: "DF",
    duration: 130,
    wait: 20,
    color: "#668cff",
  },
  {
    id: "healing-circle",
    name: "広域",
    type: "その他",
    icon: "HL",
    duration: 0,
    wait: 30,
    color: "#62e6aa",
  },
  {
    id: "quick-command",
    name: "砂時計",
    type: "その他",
    icon: "SP",
    duration: 0,
    wait: 30,
    color: "#59e6ff",
  },
  {
    id: "astral-guard",
    name: "覚醒の天月",
    type: "支援",
    icon: "DB",
    duration: 100,
    wait: 10,
    color: "#9e79ff",
  },
  {
    id: "critical-focus",
    name: "火水",
    type: "属性",
    icon: "CR",
    duration: 130,
    wait: 20,
    color: "#ff6cb1",
  },
  {
    id: "resist-shell",
    name: "火風",
    type: "属性",
    icon: "RS",
    duration: 65,
    wait: 10,
    color: "#5ca5ff",
  },
  {
    id: "limit-drive",
    name: "加速",
    type: "その他",
    icon: "EX",
    duration: 0,
    wait: 5,
    color: "#ffd45e",
  },
];

const MAX_ORDERS = 8;
const MATCH_DURATION_SECONDS = 15 * 60;
const STORAGE_KEY = "order-composer-sequence-v1";
const categories = ["すべて", ...new Set(ORDERS.map((order) => order.type)), "その他"];

const state = {
  selectedIds: loadInitialSequence(),
  filter: "すべて",
  query: "",
  draggedId: null,
};

const elements = {
  orderGrid: document.querySelector("#order-grid"),
  sequenceList: document.querySelector("#sequence-list"),
  filterRow: document.querySelector("#filter-row"),
  searchInput: document.querySelector("#search-input"),
  catalogCount: document.querySelector("#catalog-count"),
  selectedCount: document.querySelector("#selected-count"),
  remainingTime: document.querySelector("#remaining-time"),
  clearButton: document.querySelector("#clear-button"),
  saveButton: document.querySelector("#save-button"),
  shareButton: document.querySelector("#share-button"),
  toast: document.querySelector("#toast"),
  cardTemplate: document.querySelector("#order-card-template"),
};

function loadInitialSequence() {
  const urlIds = new URLSearchParams(window.location.search).get("orders");
  if (urlIds) {
    return sanitizeIds(urlIds.split(","));
  }

  try {
    return sanitizeIds(JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []);
  } catch {
    return [];
  }
}

function sanitizeIds(ids) {
  return [...new Set(ids)]
    .filter((id) => ORDERS.some((order) => order.id === id))
    .slice(0, MAX_ORDERS);
}

function renderFilters() {
  elements.filterRow.replaceChildren(
    ...categories.map((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `filter-chip${state.filter === category ? " active" : ""}`;
      button.textContent = category;
      button.addEventListener("click", () => {
        state.filter = category;
        render();
      });
      return button;
    }),
  );
}

function getVisibleOrders() {
  const query = state.query.trim().toLowerCase();
  return ORDERS.filter((order) => {
    const matchesCategory = state.filter === "すべて" || order.type === state.filter;
    const searchable = `${order.name} ${order.type}`.toLowerCase();
    return matchesCategory && searchable.includes(query);
  });
}

function renderCatalog() {
  const visibleOrders = getVisibleOrders();
  elements.catalogCount.textContent = `${visibleOrders.length} ITEMS`;

  elements.orderGrid.replaceChildren(
    ...visibleOrders.map((order) => {
      const fragment = elements.cardTemplate.content.cloneNode(true);
      const card = fragment.querySelector(".order-card");
      const addButton = fragment.querySelector(".add-button");
      const selected = state.selectedIds.includes(order.id);

      card.style.setProperty("--card-color", order.color);
      card.classList.toggle("selected", selected);
      fragment.querySelector(".order-icon").textContent = order.icon;
      fragment.querySelector(".type-pill").textContent = order.type.toUpperCase();
      fragment.querySelector(".order-duration").textContent = `${order.duration} SEC`;
      fragment.querySelector("h3").textContent = order.name;
      addButton.textContent = selected ? "✓" : "＋";
      addButton.disabled = selected;
      addButton.setAttribute(
        "aria-label",
        selected ? `${order.name}は追加済み` : `${order.name}を編成に追加`,
      );
      addButton.addEventListener("click", () => addOrder(order.id));

      return fragment;
    }),
  );
}

function renderSequence() {
  const selectedOrders = state.selectedIds
    .map((id) => ORDERS.find((order) => order.id === id))
    .filter(Boolean);

  if (selectedOrders.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <span aria-hidden="true">＋</span>
      <strong>オーダーを追加してください</strong>
      <p>左の一覧から選ぶと、ここに発動順が表示されます。</p>
    `;
    elements.sequenceList.replaceChildren(empty);
  } else {
    let elapsed = 0;
    elements.sequenceList.replaceChildren(
      ...selectedOrders.map((order, index) => {
        const start = elapsed;
        elapsed += order.duration + order.wait;
        const item = document.createElement("article");
        item.className = "sequence-item";
        item.draggable = true;
        item.dataset.id = order.id;
        item.style.setProperty("--item-color", order.color);
        item.innerHTML = `
          <div class="sequence-index">${String(index + 1).padStart(2, "0")}</div>
          <div class="sequence-info">
            <strong>${order.name}</strong>
            <small>${order.type} · 効果 ${order.duration}秒 · 待機 ${order.wait}秒</small>
          </div>
          <div class="sequence-actions">
            <span class="time-chip">${formatTime(start)} → ${formatTime(start + order.duration)}</span>
            <button class="remove-button" type="button" aria-label="${order.name}を外す">×</button>
          </div>
        `;

        item.querySelector(".remove-button").addEventListener("click", () => removeOrder(order.id));
        item.addEventListener("dragstart", handleDragStart);
        item.addEventListener("dragend", handleDragEnd);
        item.addEventListener("dragover", handleDragOver);
        item.addEventListener("dragleave", handleDragLeave);
        item.addEventListener("drop", handleDrop);
        return item;
      }),
    );
  }

  const totalSeconds = selectedOrders.reduce(
    (sum, order) => sum + order.duration + order.wait,
    0,
  );
  elements.selectedCount.textContent = selectedOrders.length;
  elements.remainingTime.textContent = formatSignedTime(MATCH_DURATION_SECONDS - totalSeconds);
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function formatSignedTime(seconds) {
  const sign = seconds < 0 ? "−" : "";
  return `${sign}${formatTime(Math.abs(seconds))}`;
}

function addOrder(id) {
  if (state.selectedIds.length >= MAX_ORDERS) {
    showToast(`編成できるのは最大${MAX_ORDERS}件です`);
    return;
  }
  if (!state.selectedIds.includes(id)) {
    state.selectedIds.push(id);
    render();
  }
}

function removeOrder(id) {
  state.selectedIds = state.selectedIds.filter((selectedId) => selectedId !== id);
  render();
}

function handleDragStart(event) {
  state.draggedId = event.currentTarget.dataset.id;
  event.currentTarget.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
}

function handleDragEnd(event) {
  state.draggedId = null;
  event.currentTarget.classList.remove("dragging");
  document.querySelectorAll(".drag-over").forEach((item) => item.classList.remove("drag-over"));
}

function handleDragOver(event) {
  event.preventDefault();
  if (event.currentTarget.dataset.id !== state.draggedId) {
    event.currentTarget.classList.add("drag-over");
  }
}

function handleDragLeave(event) {
  event.currentTarget.classList.remove("drag-over");
}

function handleDrop(event) {
  event.preventDefault();
  const targetId = event.currentTarget.dataset.id;
  event.currentTarget.classList.remove("drag-over");
  if (!state.draggedId || targetId === state.draggedId) return;

  const reordered = [...state.selectedIds];
  const fromIndex = reordered.indexOf(state.draggedId);
  const targetIndex = reordered.indexOf(targetId);
  reordered.splice(fromIndex, 1);
  reordered.splice(targetIndex, 0, state.draggedId);
  state.selectedIds = reordered;
  render();
}

function saveSequence() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.selectedIds));
  showToast("この端末に編成を保存しました");
}

async function shareSequence() {
  const url = new URL(window.location.href);
  url.search = "";
  if (state.selectedIds.length > 0) {
    url.searchParams.set("orders", state.selectedIds.join(","));
  }

  try {
    await navigator.clipboard.writeText(url.toString());
    showToast("共有URLをコピーしました");
  } catch {
    window.prompt("共有URLをコピーしてください", url.toString());
  }
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimer = setTimeout(() => elements.toast.classList.remove("visible"), 2200);
}

function render() {
  renderFilters();
  renderCatalog();
  renderSequence();
}

elements.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderCatalog();
});

elements.clearButton.addEventListener("click", () => {
  if (state.selectedIds.length === 0) return;
  state.selectedIds = [];
  render();
});

elements.saveButton.addEventListener("click", saveSequence);
elements.shareButton.addEventListener("click", shareSequence);

render();
