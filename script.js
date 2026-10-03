const INVENTORY_STORAGE_KEY = "tsa-wms-inventory";
const APPROVED_TRANSFERS_STORAGE_KEY = "tsa-wms-approved-transfers";

function readInventory(fallbackItems) {
  let storedValue;

  try {
    storedValue = window.localStorage.getItem(INVENTORY_STORAGE_KEY);
  } catch (error) {
    console.error("Could not read saved inventory.", error);
    return fallbackItems;
  }

  if (storedValue === null) {
    return fallbackItems;
  }

  try {
    const inventory = JSON.parse(storedValue);
    if (
      !Array.isArray(inventory) ||
      !inventory.every(
        (item) =>
          typeof item.sku === "string" &&
          typeof item.product === "string" &&
          typeof item.location === "string" &&
          Number.isSafeInteger(item.quantity) &&
          item.quantity >= 0,
      )
    ) {
      throw new Error("Saved inventory has an invalid format.");
    }

    const savedSkus = new Set(inventory.map((item) => item.sku));
    return [
      ...inventory,
      ...fallbackItems.filter((item) => !savedSkus.has(item.sku)),
    ];
  } catch (error) {
    console.error("Could not parse saved inventory.", error);
    return fallbackItems;
  }
}

function saveInventory(inventory) {
  try {
    window.localStorage.setItem(
      INVENTORY_STORAGE_KEY,
      JSON.stringify(inventory),
    );
    return true;
  } catch (error) {
    console.error("Could not save inventory.", error);
    return false;
  }
}

function getInventoryFromTable(tbody) {
  return [...tbody.querySelectorAll("tr")].map((row) => {
    const stockLink = row.querySelector(".stock-in");
    return {
      sku: stockLink.dataset.sku,
      product: stockLink.dataset.product,
      location: stockLink.dataset.location,
      quantity: Number(stockLink.dataset.quantity),
    };
  });
}

function getStockStatus(quantity) {
  if (quantity === 0) {
    return { className: "out-of-stock", label: "Out of stock" };
  }
  if (quantity <= 5) {
    return { className: "low-stock", label: "Low stock" };
  }
  return { className: "in-stock", label: "In stock" };
}

function updateInventoryPage(tbody) {
  const tableItems = getInventoryFromTable(tbody);
  const inventory = readInventory(tableItems);
  saveInventory(inventory);

  const rows = [...tbody.querySelectorAll("tr")];
  rows.forEach((row) => {
    const stockInLink = row.querySelector(".stock-in");
    const item = inventory.find(
      (inventoryItem) => inventoryItem.sku === stockInLink.dataset.sku,
    );
    if (!item) {
      return;
    }

    row.querySelector(".quantity").textContent = String(item.quantity);
    const status = row.querySelector(".status");
    const stockStatus = getStockStatus(item.quantity);
    status.classList.remove("in-stock", "low-stock", "out-of-stock");
    status.classList.add(stockStatus.className);
    status.textContent = stockStatus.label;

    row.querySelectorAll(".stock-in, .stock-out").forEach((link) => {
      link.dataset.quantity = String(item.quantity);
      link.href = `${link.getAttribute("href")}?${new URLSearchParams({
        sku: item.sku,
        product: item.product,
        location: item.location,
        quantity: String(item.quantity),
      })}`;
    });
  });

  const searchInput = document.querySelector("#searchInput");
  const noResultsRow = document.createElement("tr");
  noResultsRow.className = "inventory-no-results";
  noResultsRow.hidden = true;
  const noResultsCell = document.createElement("td");
  noResultsCell.colSpan = 6;
  noResultsCell.textContent = "No matching inventory items.";
  noResultsRow.append(noResultsCell);
  tbody.append(noResultsRow);

  searchInput?.addEventListener("input", () => {
    const searchTerm = searchInput.value.trim().toLocaleLowerCase();
    let visibleRows = 0;

    rows.forEach((row) => {
      const matches = row.textContent.toLocaleLowerCase().includes(searchTerm);
      row.hidden = !matches;
      if (matches) {
        visibleRows += 1;
      }
    });

    noResultsRow.hidden = visibleRows > 0;
  });

  const transaction = new URLSearchParams(window.location.search).get(
    "transaction",
  );
  if (transaction === "stock-in" || transaction === "stock-out") {
    const sku = new URLSearchParams(window.location.search).get("sku") ?? "";
    const message = document.createElement("p");
    message.className = "inventory-message";
    message.setAttribute("role", "status");
    message.textContent = `${transaction === "stock-in" ? "Stock-in" : "Stock-out"} recorded for ${sku}.`;
    document.querySelector(".inventory-card").prepend(message);
    window.history.replaceState({}, "", window.location.pathname);
  }
}

function showFormMessage(form, message, isError = false) {
  let messageElement = form.querySelector(".form-feedback");
  if (!messageElement) {
    messageElement = document.createElement("p");
    messageElement.className = "form-feedback";
    messageElement.setAttribute("role", "status");
    form.prepend(messageElement);
  }

  messageElement.textContent = message;
  messageElement.classList.toggle("form-feedback-error", isError);
}

function updateStockForm(form) {
  const isStockIn = form.closest(".stk-in-form") !== null;
  const transactionType = isStockIn ? "stock-in" : "stock-out";
  const params = new URLSearchParams(window.location.search);
  const sku = params.get("sku") || "FV-70ML";
  const product = params.get("product") || "FANVANILLA";
  const location = params.get("location") || "Shelf B1";
  const queryQuantity = Number(params.get("quantity"));
  const fallbackQuantity =
    Number.isSafeInteger(queryQuantity) && queryQuantity >= 0
      ? queryQuantity
      : 420;
  const fallbackItem = { sku, product, location, quantity: fallbackQuantity };
  const inventory = readInventory([fallbackItem]);
  const item =
    inventory.find((inventoryItem) => inventoryItem.sku === sku) ?? fallbackItem;

  document.querySelector(".stk-in-title, .stk-out-title").textContent =
    `${isStockIn ? "Stock In" : "Stock Out"} — ${item.product} (${item.sku})`;
  form.elements.location.value = `${item.location} (${item.quantity} available)`;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const amount = Number(form.elements.quantity.value);
    if (!Number.isSafeInteger(amount) || amount < 1) {
      showFormMessage(form, "Enter a whole quantity greater than zero.", true);
      return;
    }

    const latestInventory = readInventory([fallbackItem]);
    const latestItem =
      latestInventory.find((inventoryItem) => inventoryItem.sku === item.sku) ??
      item;

    if (!isStockIn && amount > latestItem.quantity) {
      showFormMessage(
        form,
        `Only ${latestItem.quantity} units are available at this location.`,
        true,
      );
      return;
    }

    const updatedQuantity = isStockIn
      ? latestItem.quantity + amount
      : latestItem.quantity - amount;
    if (!Number.isSafeInteger(updatedQuantity)) {
      showFormMessage(form, "The resulting quantity is too large.", true);
      return;
    }

    const updatedInventory = latestInventory.map((inventoryItem) =>
      inventoryItem.sku === latestItem.sku
        ? { ...inventoryItem, quantity: updatedQuantity }
        : inventoryItem,
    );

    if (!saveInventory(updatedInventory)) {
      showFormMessage(
        form,
        "The inventory change could not be saved. Please try again.",
        true,
      );
      return;
    }

    const returnParams = new URLSearchParams({
      transaction: transactionType,
      sku: latestItem.sku,
    });
    window.location.assign(`inventory.html?${returnParams}`);
  });
}

function readApprovedTransfers() {
  try {
    const storedValue = window.localStorage.getItem(
      APPROVED_TRANSFERS_STORAGE_KEY,
    );
    if (storedValue === null) {
      return [];
    }

    const approvedTransfers = JSON.parse(storedValue);
    if (
      !Array.isArray(approvedTransfers) ||
      !approvedTransfers.every((id) => typeof id === "string")
    ) {
      throw new Error("Saved transfer approvals have an invalid format.");
    }
    return approvedTransfers;
  } catch (error) {
    console.error("Could not read saved transfer approvals.", error);
    return [];
  }
}

function updateTransfersPage() {
  const tableBody = document.querySelector(".transfer-table tbody");
  if (!tableBody) {
    return;
  }

  const approvedTransfers = readApprovedTransfers();
  const rows = [...tableBody.querySelectorAll("tr[data-transfer-id]")];
  rows.forEach((row) => {
    if (approvedTransfers.includes(row.dataset.transferId)) {
      row.remove();
    }
  });
  updateTransferCount(tableBody);

  tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) {
      return;
    }

    const row = button.closest("tr[data-transfer-id]");
    if (!row) {
      return;
    }

    if (button.classList.contains("review-button")) {
      const [product, quantity, route, requester] = [...row.cells].map(
        (cell) => cell.textContent.trim(),
      );
      window.alert(
        `Transfer request\nProduct: ${product}\nQuantity: ${quantity}\nRoute: ${route}\nRequested by: ${requester}`,
      );
      return;
    }

    if (!button.classList.contains("approve-button")) {
      return;
    }

    const transferId = row.dataset.transferId;
    const approvals = [...new Set([...readApprovedTransfers(), transferId])];
    try {
      window.localStorage.setItem(
        APPROVED_TRANSFERS_STORAGE_KEY,
        JSON.stringify(approvals),
      );
    } catch (error) {
      console.error("Could not save transfer approval.", error);
      window.alert("The transfer approval could not be saved.");
      return;
    }

    row.remove();
    updateTransferCount(tableBody);
  });
}

function updateTransferCount(tableBody) {
  const count = tableBody.querySelectorAll("tr[data-transfer-id]").length;
  const countLabel = document.querySelector(".transfer-count");
  countLabel.textContent = `${count} pending`;
  let emptyRow = tableBody.querySelector(".transfer-empty");

  if (count === 0 && !emptyRow) {
    emptyRow = document.createElement("tr");
    emptyRow.className = "transfer-empty";
    const emptyCell = document.createElement("td");
    emptyCell.colSpan = 5;
    emptyCell.textContent = "There are no pending transfers.";
    emptyRow.append(emptyCell);
    tableBody.append(emptyRow);
  } else if (count > 0) {
    if (emptyRow) {
      emptyRow.remove();
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const inventoryBody = document.querySelector("#inventoryBody");
  if (inventoryBody) {
    updateInventoryPage(inventoryBody);
  }

  const stockForm = document.querySelector(
    ".stk-in-form form, .stk-out-form form",
  );
  if (stockForm) {
    updateStockForm(stockForm);
  }

  updateTransfersPage();
});
