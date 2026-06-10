// JavaScript for Chart of Accounts & General Ledger Module
(function() {
  document.addEventListener("DOMContentLoaded", () => {
    // Render the view
    const container = document.getElementById("view-container");
    if (container && window.Views) {
      container.innerHTML = Views.accounts();
    }

    // Highlight sidebar active item
    const sidebarItem = document.querySelector('[data-route="accounts"]');
    if (sidebarItem) {
      sidebarItem.className = "sidebar-item flex items-center gap-2.5 w-full px-3 py-2 text-xs bg-slate-800 text-white rounded-md font-medium border-l-4 border-blue-600 transition-colors";
    }

    if (window.updateNavigationBadges) window.updateNavigationBadges();
    filterAccountsList();
    renderAccountStats();
  });

  function renderAccountStats() {
    const cashLedger = DB.getLedger("acc-cash");
    const bankLedger = DB.getLedger("acc-bank");
    const accounts = DB.getAccounts();

    const cashBal = cashLedger ? cashLedger.balance : 0;
    const bankBal = bankLedger ? bankLedger.balance : 0;

    const cashEl = document.getElementById("stat-cash-balance");
    const bankEl = document.getElementById("stat-bank-balance");
    const totalEl = document.getElementById("stat-total-accounts");

    if (cashEl) cashEl.innerText = formatINR(cashBal);
    if (bankEl) bankEl.innerText = formatINR(bankBal);
    if (totalEl) totalEl.innerText = accounts.length;
  }

  // Formatting currency helper
  function formatINR(val) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  }

  window.filterAccountsList = function() {
    const query = (document.getElementById("account-search-query")?.value || "").toLowerCase();
    const tbody = document.getElementById("accounts-tbody");
    if (!tbody) return;

    const accounts = DB.getAccounts();
    const filtered = accounts.filter(a => a.name.toLowerCase().includes(query) || a.group.toLowerCase().includes(query));

    tbody.innerHTML = filtered.map(acc => {
      const ledger = DB.getLedger(acc.id);
      const bal = ledger ? ledger.balance : 0;
      
      const isDebitNormal = (acc.group === "Assets" || acc.group === "Sundry Debtors" || acc.group === "Expenses");
      let balStr = "";
      if (isDebitNormal) {
        balStr = `${formatINR(Math.abs(bal))} ${bal >= 0 ? 'Dr' : 'Cr'}`;
      } else {
        balStr = `${formatINR(Math.abs(bal))} ${bal >= 0 ? 'Cr' : 'Dr'}`;
      }

      const isSystem = acc.type === "system";
      const badgeColor = isSystem ? "bg-slate-100 text-slate-800 border-slate-200" : "bg-purple-50 text-purple-700 border-purple-100";
      
      return `
        <tr class="hover:bg-slate-50/50">
          <td class="p-3 font-semibold text-slate-900 border-b border-slate-100">${acc.name}</td>
          <td class="p-3 text-slate-500 font-bold border-b border-slate-100">${acc.group}</td>
          <td class="p-3 border-b border-slate-100">
            <span class="text-[10px] px-2 py-0.5 border rounded-full font-bold uppercase ${badgeColor}">
              ${isSystem ? 'System Primary' : 'Party Related'}
            </span>
          </td>
          <td class="p-3 text-right font-mono font-bold text-slate-800 border-b border-slate-100">${balStr}</td>
          <td class="p-3 text-center border-b border-slate-100">
            <button onclick="viewLedgerStatement('${acc.id}')" class="text-indigo-600 hover:text-indigo-800 font-bold hover:underline transition-colors flex items-center justify-center gap-1 mx-auto">
              <i data-lucide="eye" class="w-3.5 h-3.5 inline"></i> Ledger Statement
            </button>
          </td>
        </tr>
      `;
    }).join("");

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-slate-400 py-8">No account heads match search parameter.</td></tr>`;
    }

    if (window.lucide) window.lucide.createIcons();
  };

  // Popup modal showing the exact double entry ledger transactions list for an account head
  window.viewLedgerStatement = function(accountId) {
    const ledgerData = DB.getLedger(accountId);
    if (!ledgerData) {
      toast.error("Account Ledger was unable to compile.");
      return;
    }

    const { account, entries, balance } = ledgerData;
    const isDebitNormal = (account.group === "Assets" || account.group === "Sundry Debtors" || account.group === "Expenses");
    
    let balLabel = "";
    if (isDebitNormal) {
      balLabel = `${formatINR(Math.abs(balance))} ${balance >= 0 ? 'Dr (Asset/Owed)' : 'Cr (Owed to Vendor)'}`;
    } else {
      balLabel = `${formatINR(Math.abs(balance))} ${balance >= 0 ? 'Cr (Liabilities/Equity/Income)' : 'Dr'}`;
    }

    const tableRowsHtml = entries.map((e, index) => {
      const dbVal = e.debit ? formatINR(e.debit) : "-";
      const crVal = e.credit ? formatINR(e.credit) : "-";
      
      let runningStr = "";
      if (isDebitNormal) {
        runningStr = `${formatINR(Math.abs(e.runningBalance))} ${e.runningBalance >= 0 ? 'Dr' : 'Cr'}`;
      } else {
        runningStr = `${formatINR(Math.abs(e.runningBalance))} ${e.runningBalance >= 0 ? 'Cr' : 'Dr'}`;
      }

      return `
        <tr class="border-b hover:bg-slate-50/40">
          <td class="p-2.5 text-slate-500 font-mono text-[11px]">${e.date ? new Date(e.date).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}) : "-"}</td>
          <td class="p-2.5 font-bold text-slate-800 text-xs">${e.description}</td>
          <td class="p-2.5 text-right font-mono font-bold text-indigo-600 text-xs">${dbVal}</td>
          <td class="p-2.5 text-right font-mono font-bold text-amber-600 text-xs">${crVal}</td>
          <td class="p-2.5 text-right font-mono font-bold text-slate-700 text-xs">${runningStr}</td>
        </tr>
      `;
    }).join("");

    const stmtHtml = `
      <div class="space-y-4">
        <!-- Account Summary Header Banner -->
        <div class="bg-indigo-900 text-white p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <span class="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">${account.group} Account Head</span>
            <h2 class="text-lg font-bold text-white tracking-tight">${account.name}</h2>
          </div>
          <div class="text-right">
            <span class="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">Closing Ledger Balance</span>
            <span class="text-lg font-bold font-mono text-emerald-400">${balLabel}</span>
          </div>
        </div>

        <!-- Ledger Entries Panel -->
        <div class="bg-white border rounded-lg shadow-xs overflow-hidden max-h-[480px] overflow-y-auto">
          <table class="w-full text-left" id="ledger-statement-table">
            <thead>
              <tr class="bg-slate-100 text-slate-700 border-b text-[10px] uppercase font-bold sticky top-0">
                <th class="p-2.5">Date</th>
                <th class="p-2.5">Transaction Detail Description</th>
                <th class="p-2.5 text-right">Debit (Dr) / ₹</th>
                <th class="p-2.5 text-right">Credit (Cr) / ₹</th>
                <th class="p-2.5 text-right">Running Balance / ₹</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </div>

        <div class="flex justify-between items-center pt-2 border-t">
          <button onclick="window.printInvoiceHTML('ledger-statement-table', { title: 'Ledger Statement for ${account.name}' })" class="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border px-3 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="printer" class="w-4 h-4"></i> Print Statement
          </button>
          <button onclick="closeModal()" class="btn-primary bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold font-medium" style="padding: 8px 16px;">Done</button>
        </div>
      </div>
    `;

    openModal(`General Ledger Statement: ${account.name}`, stmtHtml);
  };

  // Create a Custom Account Head
  window.openAccountHeadForm = function() {
    const html = `
      <form id="ledger-head-form" onsubmit="saveAccountHeadFormSubmit(event)" class="space-y-4">
        <div>
          <label class="block text-slate-500 font-bold mb-1">New Account Head Name *</label>
          <input type="text" id="form-acc-name" class="bg-slate-50 border rounded-md p-2 w-full font-bold text-slate-800" required placeholder="e.g. Office Stationery Expenses" />
        </div>
        <div>
          <label class="block text-slate-500 font-bold mb-1">Account Group *</label>
          <select id="form-acc-group" class="bg-slate-50 border rounded-md p-2 w-full font-bold" required>
            <option value="Assets">Assets (Debit balance normal)</option>
            <option value="Capital">Capital (Credit balance normal)</option>
            <option value="Expenses">Expenses (Debit balance normal)</option>
            <option value="Income">Income (Credit balance normal)</option>
            <option value="Liabilities">Liabilities (Credit balance normal)</option>
          </select>
        </div>
        <div>
          <label class="block text-slate-500 font-bold mb-1">Account Opening Balance Adjustment (₹)</label>
          <input type="number" id="form-acc-balance" value="0" class="bg-slate-50 border rounded-md p-2 w-48 font-bold" placeholder="0.00" />
          <span class="text-[10px] text-slate-400 block mt-1">Specify positive number. This modifies initial double entry scales.</span>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t">
          <button type="button" onclick="closeModal()" class="border px-4 py-2 rounded-md text-xs font-semibold hover:bg-slate-50 transition-colors">Discard</button>
          <button type="submit" class="btn-primary bg-blue-600 text-white px-4 py-1.5 flex items-center gap-1 font-bold text-xs"><i data-lucide="check" class="w-4 h-4"></i> Create Account Head</button>
        </div>
      </form>
    `;
    openModal("Add Custom Ledger Account Head", html);
  };

  window.saveAccountHeadFormSubmit = function(event) {
    event.preventDefault();
    const name = document.getElementById("form-acc-name").value;
    const group = document.getElementById("form-acc-group").value;
    const openingBalance = Number(document.getElementById("form-acc-balance").value) || 0;

    const accounts = DB.getAccounts();
    // Pre-verification against duplicates
    const isDuplicate = accounts.some(a => a.name.toLowerCase() === name.toLowerCase());
    if (isDuplicate) {
      toast.error("An account head with exact name already exists in chart!");
      return;
    }

    accounts.push({
      id: "acc-custom-" + Date.now(),
      name: name,
      group: group,
      type: "custom",
      openingBalance: openingBalance,
      balance: openingBalance
    });

    DB.saveAccounts(accounts);
    closeModal();
    toast.success(`Account head '${name}' registered!`);
    filterAccountsList();
    renderAccountStats();
  };

})();
