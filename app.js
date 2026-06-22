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
    id: "water-wind",
    name: "水風",
    type: "属性",
    icon: "WW",
    duration: 130,
    wait: 20,
    color: "#55c9d9",
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
  {
    id: "wait-command",
    name: "待ち",
    type: "その他",
    icon: "WT",
    duration: 10,
    wait: 0,
    color: "#a9b0c2",
  },
];

const MAX_ORDERS = 20;
const MAX_WAIT_ORDERS = 10;
const WAIT_ORDER_ID = "wait-command";
const SUPPORT_ORDER_ID = "elemental-burst";
const MAIN_ASSIGNEES = ["とも", "スット", "くると"];
const MATCH_DURATION_SECONDS = 15 * 60;
const LONG_PRESS_DELAY_MS = 450;
const LONG_PRESS_MOVE_TOLERANCE = 10;
const STORAGE_KEY = "order-composer-sequence-v1";
const ASSIGNEE_STORAGE_KEY = "order-composer-assignees-v1";
const categories = [
  "すべて",
  ...new Set([...ORDERS.map((order) => order.type), "その他"]),
];

const state = {
  selectedIds: loadInitialSequence(),
  mainAssignees: loadMainAssignees(),
  filter: "すべて",
  query: "",
  draggedId: null,
  touchDrag: null,
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

function loadMainAssignees() {
  const urlAssignee = new URLSearchParams(window.location.search).get("main");
  if (MAIN_ASSIGNEES.includes(urlAssignee)) {
    return { [SUPPORT_ORDER_ID]: urlAssignee };
  }

  try {
    const stored = JSON.parse(localStorage.getItem(ASSIGNEE_STORAGE_KEY)) ?? {};
    return MAIN_ASSIGNEES.includes(stored[SUPPORT_ORDER_ID])
      ? { [SUPPORT_ORDER_ID]: stored[SUPPORT_ORDER_ID] }
      : {};
  } catch {
    return {};
  }
}

function sanitizeIds(ids) {
  const sanitized = [];
  const usedEntries = new Set();
  const usedOrderIds = new Set();
  let waitCount = 0;

  for (const rawEntryId of ids) {
    if (sanitized.length >= MAX_ORDERS || typeof rawEntryId !== "string") break;

    const orderId = getOrderId(rawEntryId);
    if (!ORDERS.some((order) => order.id === orderId)) continue;

    if (orderId === WAIT_ORDER_ID) {
      if (waitCount >= MAX_WAIT_ORDERS) continue;
      let entryId = rawEntryId.includes("~")
        ? rawEntryId
        : `${WAIT_ORDER_ID}~${waitCount + 1}`;
      while (usedEntries.has(entryId)) {
        entryId = `${WAIT_ORDER_ID}~${waitCount + 1}-${usedEntries.size}`;
      }
      sanitized.push(entryId);
      usedEntries.add(entryId);
      waitCount += 1;
      continue;
    }

    if (usedOrderIds.has(orderId)) continue;
    sanitized.push(orderId);
    usedEntries.add(orderId);
    usedOrderIds.add(orderId);
  }

  return sanitized;
}

function getOrderId(entryId) {
  return entryId.split("~")[0];
}

function getOrderByEntryId(entryId) {
  const orderId = getOrderId(entryId);
  return ORDERS.find((order) => order.id === orderId);
}

function getOrderCount(orderId) {
  return state.selectedIds.filter((entryId) => getOrderId(entryId) === orderId).length;
}

function createWaitEntryId() {
  let serial = 1;
  while (state.selectedIds.includes(`${WAIT_ORDER_ID}~${serial}`)) {
    serial += 1;
  }
  return `${WAIT_ORDER_ID}~${serial}`;
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
      const selectedCount = getOrderCount(order.id);
      const isWaitOrder = order.id === WAIT_ORDER_ID;
      const reachedLimit = isWaitOrder
        ? selectedCount >= MAX_WAIT_ORDERS
        : selectedCount >= 1;

      card.style.setProperty("--card-color", order.color);
      card.classList.toggle("selected", reachedLimit);
      card.classList.toggle("order-card-compact", isWaitOrder);
      fragment.querySelector(".order-icon").textContent = order.icon;
      fragment.querySelector(".type-pill").textContent = order.type.toUpperCase();
      fragment.querySelector(".order-duration").textContent = `${order.duration} SEC`;
      fragment.querySelector("h3").textContent = order.name;
      addButton.textContent = reachedLimit ? "✓" : "＋";
      addButton.disabled = reachedLimit;
      addButton.setAttribute(
        "aria-label",
        reachedLimit
          ? `${order.name}は上限まで追加済み`
          : `${order.name}を編成に追加${isWaitOrder ? `（${selectedCount + 1}個目）` : ""}`,
      );
      addButton.addEventListener("click", () => addOrder(order.id));

      return fragment;
    }),
  );
}

function renderSequence() {
  const selectedEntries = state.selectedIds
    .map((entryId) => ({ entryId, order: getOrderByEntryId(entryId) }))
    .filter(({ order }) => Boolean(order));

  if (selectedEntries.length === 0) {
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
      ...selectedEntries.map(({ entryId, order }, index) => {
        const start = elapsed;
        elapsed += order.duration + order.wait;
        const item = document.createElement("article");
        item.className = "sequence-item";
        item.classList.toggle("sequence-item-compact", order.id === WAIT_ORDER_ID);
        item.draggable = true;
        item.dataset.id = entryId;
        item.style.setProperty("--item-color", order.color);
        item.innerHTML = `
          <div
            class="sequence-index"
            role="button"
            aria-label="${order.name}を長押しして並べ替え"
          >
            <span class="remaining-time-chip">${formatSignedTime(
              MATCH_DURATION_SECONDS - start,
            )}</span>
            <span class="drag-grip" aria-hidden="true">⠿</span>
          </div>
          <div class="sequence-info">
            <strong>${order.name}</strong>
            <small>${order.type} · 効果 ${order.duration}秒 · 待機 ${order.wait}秒</small>
          </div>
          <div class="sequence-actions">
            <span class="time-chip">${formatTime(start)} → ${formatTime(start + order.duration)}</span>
            <button class="remove-button" type="button" aria-label="${order.name}を外す">×</button>
          </div>
        `;

        if (order.id === SUPPORT_ORDER_ID) {
          const assigneeField = document.createElement("label");
          assigneeField.className = "assignee-field";
          assigneeField.innerHTML = `
            <span>メイン担当</span>
            <select aria-label="支えのメイン担当">
              <option value="">未選択</option>
              ${MAIN_ASSIGNEES.map(
                (assignee) =>
                  `<option value="${assignee}"${
                    state.mainAssignees[entryId] === assignee ? " selected" : ""
                  }>${assignee}</option>`,
              ).join("")}
            </select>
          `;

          const select = assigneeField.querySelector("select");
          select.addEventListener("pointerdown", (event) => event.stopPropagation());
          select.addEventListener("touchstart", (event) => event.stopPropagation());
          select.addEventListener("focus", () => {
            item.draggable = false;
          });
          select.addEventListener("blur", () => {
            item.draggable = true;
          });
          select.addEventListener("change", (event) => {
            if (event.target.value) {
              state.mainAssignees[entryId] = event.target.value;
            } else {
              delete state.mainAssignees[entryId];
            }
          });
          item.querySelector(".sequence-info").append(assigneeField);
        }

        item.querySelector(".remove-button").addEventListener("click", () => removeOrder(entryId));
        item.addEventListener("dragstart", handleDragStart);
        item.addEventListener("dragend", handleDragEnd);
        item.addEventListener("dragover", handleDragOver);
        item.addEventListener("dragleave", handleDragLeave);
        item.addEventListener("drop", handleDrop);
        const dragHandle = item.querySelector(".sequence-index");
        dragHandle.addEventListener("touchstart", handleTouchStart, { passive: false });
        dragHandle.addEventListener("touchmove", handleTouchMove, { passive: false });
        dragHandle.addEventListener("touchend", handleTouchEnd);
        dragHandle.addEventListener("touchcancel", cancelTouchDrag);
        item.addEventListener("contextmenu", handleSequenceContextMenu);
        item.addEventListener("selectstart", preventSequenceSelection);
        return item;
      }),
    );
  }

  const totalSeconds = selectedEntries.reduce(
    (sum, { order }) => sum + order.duration + order.wait,
    0,
  );
  elements.selectedCount.textContent = selectedEntries.length;
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
  if (id === WAIT_ORDER_ID) {
    if (getOrderCount(WAIT_ORDER_ID) >= MAX_WAIT_ORDERS) {
      showToast(`「待ち」は最大${MAX_WAIT_ORDERS}個までです`);
      return;
    }
    state.selectedIds.push(createWaitEntryId());
    render();
    return;
  }

  if (!state.selectedIds.includes(id)) {
    state.selectedIds.push(id);
    render();
  }
}

function removeOrder(entryId) {
  state.selectedIds = state.selectedIds.filter((selectedId) => selectedId !== entryId);
  delete state.mainAssignees[entryId];
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
  reorderOrders(state.draggedId, targetId);
}

function reorderOrders(draggedId, targetId) {
  if (!draggedId || !targetId || targetId === draggedId) return;
  const reordered = [...state.selectedIds];
  const fromIndex = reordered.indexOf(draggedId);
  const targetIndex = reordered.indexOf(targetId);
  if (fromIndex === -1 || targetIndex === -1) return;

  reordered.splice(fromIndex, 1);
  reordered.splice(targetIndex, 0, draggedId);
  state.selectedIds = reordered;
  render();
}

function handleTouchStart(event) {
  if (event.touches.length !== 1) return;

  event.preventDefault();
  cancelTouchDrag();
  const touch = event.touches[0];
  const item = event.currentTarget.closest(".sequence-item");
  const touchDrag = {
    id: item.dataset.id,
    identifier: touch.identifier,
    startX: touch.clientX,
    startY: touch.clientY,
    targetId: item.dataset.id,
    active: false,
    item,
    timer: null,
  };

  touchDrag.timer = window.setTimeout(() => {
    if (state.touchDrag !== touchDrag) return;
    touchDrag.active = true;
    item.classList.add("touch-dragging");
    navigator.vibrate?.(30);
  }, LONG_PRESS_DELAY_MS);

  state.touchDrag = touchDrag;
}

function handleTouchMove(event) {
  const touchDrag = state.touchDrag;
  if (!touchDrag) return;

  const touch = [...event.touches].find(
    (currentTouch) => currentTouch.identifier === touchDrag.identifier,
  );
  if (!touch) return;

  if (!touchDrag.active) {
    const movedX = Math.abs(touch.clientX - touchDrag.startX);
    const movedY = Math.abs(touch.clientY - touchDrag.startY);
    if (
      movedX > LONG_PRESS_MOVE_TOLERANCE ||
      movedY > LONG_PRESS_MOVE_TOLERANCE
    ) {
      cancelTouchDrag();
    }
    return;
  }

  event.preventDefault();
  const targetItem = document
    .elementFromPoint(touch.clientX, touch.clientY)
    ?.closest(".sequence-item");

  document
    .querySelectorAll(".sequence-item.drag-over")
    .forEach((item) => item.classList.remove("drag-over"));

  touchDrag.targetId = touchDrag.id;
  if (targetItem && targetItem.dataset.id !== touchDrag.id) {
    targetItem.classList.add("drag-over");
    touchDrag.targetId = targetItem.dataset.id;
  }
}

function handleTouchEnd(event) {
  const touchDrag = state.touchDrag;
  if (!touchDrag) return;

  const ended = [...event.changedTouches].some(
    (touch) => touch.identifier === touchDrag.identifier,
  );
  if (!ended) return;

  const { active, id, targetId } = touchDrag;
  clearTouchDragState();
  if (active) {
    event.preventDefault();
    reorderOrders(id, targetId);
  }
}

function cancelTouchDrag() {
  if (!state.touchDrag) return;
  clearTouchDragState();
}

function clearTouchDragState() {
  const touchDrag = state.touchDrag;
  if (!touchDrag) return;

  window.clearTimeout(touchDrag.timer);
  touchDrag.item.classList.remove("touch-dragging");
  document
    .querySelectorAll(".sequence-item.drag-over")
    .forEach((item) => item.classList.remove("drag-over"));
  state.touchDrag = null;
}

function handleSequenceContextMenu(event) {
  event.preventDefault();
}

function preventSequenceSelection(event) {
  event.preventDefault();
}

function saveSequence() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.selectedIds));
  localStorage.setItem(ASSIGNEE_STORAGE_KEY, JSON.stringify(state.mainAssignees));
  showToast("この端末に編成を保存しました");
}

async function shareSequence() {
  const url = new URL(window.location.href);
  url.search = "";
  if (state.selectedIds.length > 0) {
    url.searchParams.set("orders", state.selectedIds.join(","));
  }
  const mainAssignee = state.mainAssignees[SUPPORT_ORDER_ID];
  if (MAIN_ASSIGNEES.includes(mainAssignee)) {
    url.searchParams.set("main", mainAssignee);
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
  state.mainAssignees = {};
  render();
});

elements.saveButton.addEventListener("click", saveSequence);
elements.shareButton.addEventListener("click", shareSequence);

render();
