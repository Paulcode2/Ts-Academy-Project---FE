const APPROVED_TRANSFERS_STORAGE_KEY = "tsa-wms-approved-transfers";

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
  updateTransfersPage();
});
