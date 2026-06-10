// Bipin Petroleum Co. Accounting Workspace Central Script Engine
(function() {
  
  // Current active navigation route state
  let currentActiveRoute = "dashboard";
  let activeCompanyTab = "customer"; // customer or vendor
  let activeReportSubtab = "trialbalance"; // trialbalance, partyledger, stocksummary, gstr1, gstr3b

  // 1. BOOTSTRAP INITIALIZATION ON PAGE LOAD
  document.addEventListener("DOMContentLoaded", () => {
    // Run workflow security guard
    enforceWorkflowAccessGuard();

    // Render Unified dynamic sidebar with workflow locking
    renderUnifiedSidebar();

    // Detect active route from current HTML filename
    const path = window.location.pathname;
    let initialRoute = "dashboard";
    if (path.includes("companies.html")) initialRoute = "companies";
    else if (path.includes("accounts.html")) initialRoute = "accounts";
    else if (path.includes("sales.html")) initialRoute = "sales";
    else if (path.includes("purchase.html")) initialRoute = "purchase";
    else if (path.includes("stock.html")) initialRoute = "stock";
    else if (path.includes("reports.html")) initialRoute = "reports";
    else if (path.includes("settings.html")) initialRoute = "settings";
    
    navigateTo(initialRoute);
    
    // Start background syncing with Supabase cloud database if available and active
    if (window.DB && window.DB.bootstrapCloudSync) {
      window.DB.bootstrapCloudSync().catch(e => console.warn("Cloud sync bootstrap deferred:", e));
    }
    
    // Register background database updates syncing badges and locks
    updateNavigationBadges();
    window.addEventListener("db-update", () => {
      renderUnifiedSidebar();
      updateNavigationBadges();
    });
  });

  // Direct-access workflow guard
  function enforceWorkflowAccessGuard() {
    const path = window.location.pathname;
    const isHTMLFolder = path.includes("/HTML/");
    
    let targetTab = "";
    if (path.includes("companies.html")) targetTab = "companies";
    else if (path.includes("stock.html")) targetTab = "stock";
    else if (path.includes("purchase.html")) targetTab = "purchase";
    else if (path.includes("sales.html")) targetTab = "sales";
    else if (path.includes("reports.html")) targetTab = "reports";

    if (!targetTab) return; // not a restricted view

    const status = DB.getWorkflowStatus();
    if (status[targetTab] && !status[targetTab].active) {
      alert(`⚠️ Workflow Locked!\nRequirement: ${status[targetTab].req}`);
      
      // Select last completed step dynamically
      let fallback = "dashboard.html";
      if (!status.companies.active) fallback = "accounts.html";
      else if (!status.stock.active) fallback = "companies.html";
      else if (!status.purchase.active && !status.sales.active) fallback = "stock.html";
      
      window.location.href = isHTMLFolder ? fallback : "HTML/" + fallback;
    }
  }

  // Unified global locked alert
  window.showWorkflowLockAlert = function(tabName, prerequisite) {
    if (window.toast && typeof window.toast.error === "function") {
      toast.error(`🔒 ${tabName} is locked! Requirement: ${prerequisite}`);
    } else {
      alert(`🔒 ${tabName} is currently locked!\nPrerequisite: ${prerequisite}`);
    }
  };

  // Unified sidebar rendering engine
  window.renderUnifiedSidebar = function() {
    const nav = document.querySelector("#sidebar nav");
    if (!nav) return;

    const path = window.location.pathname;
    const isHTMLFolder = path.includes("/HTML/");
    const getPageUrl = (filename) => isHTMLFolder ? filename : "HTML/" + filename;

    // Read live workflow status from DB
    const status = DB.getWorkflowStatus();

    const items = [
      { id: "dashboard", label: "Dashboard Hub", file: "dashboard.html", icon: "layout-dashboard", statId: "" },
      { id: "accounts", label: "Step 1: Chart of Accounts", file: "accounts.html", icon: "book-open", statId: "" },
      { id: "companies", label: "Step 2: Parties/Contacts", file: "companies.html", icon: "users", statId: "badge-customer-count", locked: !status.companies.active, req: status.companies.req },
      { id: "stock", label: "Step 3: Stock Register", file: "stock.html", icon: "box", statId: "badge-lowstock-count", locked: !status.stock.active, req: status.stock.req },
      { id: "purchase", label: "Step 4: Purchase Bills", file: "purchase.html", icon: "shopping-bag", statId: "badge-purchase-count", locked: !status.purchase.active, req: status.purchase.req },
      { id: "sales", label: "Step 5: Sales Invoices", file: "sales.html", icon: "file-text", statId: "badge-sales-count", locked: !status.sales.active, req: status.sales.req },
      { id: "reports", label: "Step 6: Reports & Filing", file: "reports.html", icon: "trending-up", statId: "", locked: !status.reports.active, req: status.reports.req }
    ];

    nav.innerHTML = items.map(item => {
      const active = path.includes(item.file);
      const activeClass = active 
        ? "active-sidebar-item bg-slate-800 text-white font-semibold border-l-4 border-blue-600 shadow-xs" 
        : "text-slate-400 hover:bg-white/5 hover:text-white";

      let linkAttr = `href="${getPageUrl(item.file)}"`;
      let lockHtml = "";
      let opacityClass = "";

      if (item.locked) {
        linkAttr = `href="javascript:void(0)" onclick="showWorkflowLockAlert('${item.label}', '${item.req}')"`;
        lockHtml = `<i data-lucide="lock" class="w-3.5 h-3.5 text-amber-500 shrink-0 ml-auto"></i>`;
        opacityClass = "opacity-45 hover:bg-transparent pointer-events-auto cursor-not-allowed";
      }

      let statHtml = "";
      if (item.statId) {
        if (item.statId === "badge-lowstock-count") {
          statHtml = `<span id="${item.statId}" class="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-text-amber-400 border border-amber-500/10 hidden">0</span>`;
        } else {
          statHtml = `<span id="${item.statId}" class="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-slate-800 border border-slate-700 text-slate-300">0</span>`;
        }
      }

      return `
        <a ${linkAttr} data-route="${item.id}" class="sidebar-item flex items-center gap-2.5 px-3 py-2 text-xs rounded-md font-medium transition-colors cursor-pointer ${activeClass} ${opacityClass}">
          <i data-lucide="${item.icon}" class="w-4 h-4 shrink-0"></i>
          <span class="truncate pr-1">${item.label}</span>
          ${lockHtml}
          ${statHtml}
        </a>
      `;
    }).join("");

    // Workspace settings button
    const settingsBtn = document.createElement("button");
    settingsBtn.className = "sidebar-item flex items-center gap-2.5 w-full px-3 py-2 text-xs text-slate-400 rounded-md hover:bg-white/5 hover:text-white font-medium transition-colors text-left mt-2 cursor-pointer";
    settingsBtn.setAttribute("data-route", "settings");
    if (path.includes("settings.html")) {
      settingsBtn.className += " bg-slate-800 text-white border-l-4 border-blue-600";
    }
    settingsBtn.onclick = () => {
      window.location.href = getPageUrl("settings.html");
    };
    settingsBtn.innerHTML = `<i data-lucide="settings" class="w-4 h-4 shrink-0 text-slate-400"></i><span>Workspace Settings</span>`;
    nav.appendChild(settingsBtn);

    // Dynamic sign out action
    const logoutBtn = document.createElement("button");
    logoutBtn.className = "sidebar-item flex items-center gap-2.5 w-full px-3 py-2 text-xs text-slate-400 rounded-md hover:bg-white/5 hover:text-red-400 font-medium transition-colors text-left mt-6 cursor-pointer border-t border-slate-800 pt-3";
    logoutBtn.onclick = () => {
      if (window.handleSignOut) {
        window.handleSignOut();
      } else {
        localStorage.clear();
        window.location.href = isHTMLFolder ? "login.html" : "HTML/login.html";
      }
    };
    logoutBtn.innerHTML = `<i data-lucide="log-out" class="w-4 h-4 shrink-0 text-slate-400"></i><span>Sign Out Profile</span>`;
    nav.appendChild(logoutBtn);

    // Supabase & Offline Synchronization Status Indicator
    const syncStatusCard = document.createElement("div");
    syncStatusCard.className = "mt-4 p-3 rounded-lg bg-slate-900 border border-slate-800 text-[10px] space-y-2 text-slate-400";
    
    const isOnline = navigator.onLine;
    const pendingCount = window.DB && window.DB.getPendingSyncCount ? window.DB.getPendingSyncCount() : 0;
    const userId = window.getSupabaseUserId ? window.getSupabaseUserId() : null;
    
    let statusText = "";
    let statusColor = "";
    let statusIcon = "";
    
    if (!userId) {
      statusText = "Guest Mode (Local)";
      statusColor = "text-amber-500";
      statusIcon = "user-minus";
    } else if (isOnline) {
      if (pendingCount > 0) {
        statusText = `Pending Sync (${pendingCount})`;
        statusColor = "text-amber-400 animate-pulse";
        statusIcon = "alert-circle";
      } else {
        statusText = "Cloud Synced";
        statusColor = "text-emerald-400";
        statusIcon = "cloud-lightning";
      }
    } else {
      statusText = "Offline Mode";
      statusColor = "text-rose-400";
      statusIcon = "cloud-off";
    }
    
    syncStatusCard.innerHTML = `
      <div class="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold uppercase text-[9px] tracking-wider text-slate-500">
        <span>Cloud Sync Status</span>
        <span class="flex items-center gap-1 ${statusColor}">
          <i data-lucide="${statusIcon}" class="w-3 h-3"></i> ${statusText}
        </span>
      </div>
      <div class="flex items-center justify-between text-[9px]">
        <span>Storage Layer:</span>
        <span class="text-emerald-400 font-bold">IndexedDB (Dexie)</span>
      </div>
      ${userId ? `
      <button onclick="if(window.DB && window.DB.syncWithCloud) window.DB.syncWithCloud(true)" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors font-bold rounded py-1 text-[9px] mt-1 text-center shrink-0 flex items-center justify-center gap-1">
        <i data-lucide="refresh-cw" class="w-2.5 h-2.5"></i> Sync Workspace Now
      </button>
      ` : ""}
    `;
    nav.appendChild(syncStatusCard);

    if (window.lucide) window.lucide.createIcons();
    updateNavigationBadges();
  };

  // 2. ROUTING CONTROLLER
  window.navigateTo = function(route) {
    currentActiveRoute = route;
    const container = document.getElementById("view-container");
    if (!container) return;

    // Highlight active sidebar item (flat design, no glow, no shadows)
    document.querySelectorAll(".sidebar-item").forEach(btn => {
      if (btn.getAttribute("data-route") === route) {
        btn.classList.add("active-sidebar-item", "bg-slate-800", "text-white", "font-semibold", "border-l-4", "border-blue-600", "shadow-xs");
        btn.classList.remove("text-slate-400");
      } else {
        btn.classList.remove("active-sidebar-item", "bg-slate-800", "text-white", "font-semibold", "border-l-4", "border-blue-600", "shadow-xs");
        if (!btn.classList.contains("border-t")) {
          btn.classList.add("text-slate-400");
        }
      }
    });

    // Render requested View
    if (route === "dashboard") {
      container.innerHTML = Views.dashboard();
    } else if (route === "companies") {
      container.innerHTML = Views.companies();
      filterCompaniesList();
    } else if (route === "sales") {
      container.innerHTML = Views.sales();
      filterSalesInvoicesList();
    } else if (route === "purchase") {
      container.innerHTML = Views.purchase();
      filterPurchaseInvoicesList();
    } else if (route === "stock") {
      container.innerHTML = Views.stock();
      filterProductsList();
    } else if (route === "reports") {
      container.innerHTML = Views.reports();
      
      // Auto pre-select current month & year in selector
      const today = new Date();
      const mSel = document.getElementById("report-month-select");
      const ySel = document.getElementById("report-year-select");
      if (mSel && ySel) {
        mSel.value = today.getMonth();
        ySel.value = today.getFullYear();
      }
      compileBusinessStatementReports();
    } else if (route === "settings") {
      container.innerHTML = Views.settings();
    }

    // Refresh lucide icons rendered in views
    if (window.lucide) {
      window.lucide.createIcons();
    }
  };

  // Live navigation notifications badges
  function updateNavigationBadges() {
    const sales = DB.getSales();
    const purchases = DB.getPurchases();
    const products = DB.getProducts();

    const saleBadge = document.getElementById("badge-sales-count");
    if (saleBadge) saleBadge.innerText = sales.length;

    const purchaseBadge = document.getElementById("badge-purchase-count");
    if (purchaseBadge) purchaseBadge.innerText = purchases.length;

    const lowstockCount = products.filter(p => p.quantity < 10).length;
    const lowstockBadge = document.getElementById("badge-lowstock-count");
    if (lowstockBadge) {
      lowstockBadge.innerText = lowstockCount;
      if (lowstockCount > 0) {
        lowstockBadge.className = "bg-rose-950/40 text-rose-350 border border-rose-900/40 text-[10px]/normal px-2 py-0.5 rounded font-medium";
      } else {
        lowstockBadge.className = "bg-slate-800 text-slate-400 text-[10px]/normal px-2 py-0.5 rounded font-medium";
      }
    }
  }

  // 3. TOAST MESSENGER ENGINE
  window.toast = {
    show: function(msg, type = "success") {
      const container = document.getElementById("toast-container") || document.getElementById("toast-wrapper");
      if (!container) return;

      const div = document.createElement("div");
      div.className = `flex items-center gap-2 p-3 rounded border text-xs font-medium transform translate-y-2 opacity-0 transition-all duration-300 ${
        type === "success" 
          ? "bg-blue-50 border-blue-100 text-blue-800" 
          : "bg-rose-50 border-rose-100 text-rose-800"
      }`;
      div.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}" class="w-4 h-4"></i>
        <span>${msg}</span>
      `;
      container.appendChild(div);
      if (window.lucide) window.lucide.createIcons();

      // Trigger animations
      setTimeout(() => {
        div.classList.remove("translate-y-2", "opacity-0");
      }, 50);

      // Automatic purge
      setTimeout(() => {
        div.classList.add("opacity-0", "translate-y--2");
        setTimeout(() => div.remove(), 300);
      }, 3500);
    },
    success: function(msg) { this.show(msg, "success"); },
    error: function(msg) { this.show(msg, "error"); }
  };

  // 4. MODALS & INJECTORS
  window.openModal = function(title, html) {
    const container = document.getElementById("modal-container");
    const contentBox = document.getElementById("modal-content-box");
    if (!container || !contentBox) return;

    // Remove shadows, add extra whitespace and make headings medium bold
    contentBox.innerHTML = `
      <div class="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 rounded-t shrink-0">
        <h3 class="text-sm font-semibold text-slate-900 uppercase tracking-wider">${title}</h3>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded transition-colors"><i data-lucide="x" class="w-4 h-4"></i></button>
      </div>
      <div class="p-8 flex-1 overflow-y-auto space-y-6">
        ${html}
      </div>
    `;

    // Overwrite class list to force prompt/form visibility immediately
    contentBox.className = "bg-white rounded z-10 w-full max-w-4xl max-h-[85vh] overflow-y-auto flex flex-col transform transition-all duration-150 scale-100 opacity-100";
    container.classList.remove("hidden");

    if (window.lucide) window.lucide.createIcons();
  };

  window.closeModal = function() {
    const container = document.getElementById("modal-container");
    const contentBox = document.getElementById("modal-content-box");
    if (contentBox) {
      contentBox.className = "bg-white rounded z-10 w-full max-w-4xl max-h-[85vh] overflow-y-auto flex flex-col transform transition-all duration-155 scale-95 opacity-0";
    }
    setTimeout(() => {
      if (container) container.classList.add("hidden");
    }, 160);
  };

  window.openAlert = function(title, desc, confirmLabel, onConfirm) {
    const container = document.getElementById("alert-container");
    const contentBox = document.getElementById("alert-content-box");
    if (!container || !contentBox) return;

    // Flat alert, spacious, and clean
    contentBox.innerHTML = `
      <h3 class="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-2">${title}</h3>
      <p class="text-slate-500 text-xs mb-6 leading-relaxed">${desc}</p>
      <div class="flex justify-end gap-3 pt-3 border-t border-slate-100">
        <button onclick="closeAlert()" class="border font-medium px-4 py-2 rounded text-xs hover:bg-slate-50 transition-colors">Cancel</button>
        <button id="alert-confirm-btn" class="bg-rose-600 hover:bg-rose-700 text-white font-medium px-4 py-2 rounded text-xs transition-colors">
          ${confirmLabel}
        </button>
      </div>
    `;

    // Overwrite class list to force visibility immediately
    contentBox.className = "bg-white rounded z-10 w-full max-w-md p-6 flex flex-col transform transition-all duration-150 scale-100 opacity-100";
    container.classList.remove("hidden");

    document.getElementById("alert-confirm-btn").onclick = function() {
      onConfirm();
      closeAlert();
    };
  };

  window.closeAlert = function() {
    const container = document.getElementById("alert-container");
    const contentBox = document.getElementById("alert-content-box");
    if (contentBox) {
      contentBox.className = "bg-white rounded z-10 w-full max-w-md p-6 flex flex-col transform transition-all duration-155 scale-95 opacity-0";
    }
    setTimeout(() => {
      if (container) container.classList.add("hidden");
    }, 150);
  };

  // 5. COMPANIES MODULE
  window.switchCompanyTabs = function(tabType) {
    activeCompanyTab = tabType;
    const custBtn = document.getElementById("tab-btn-customer");
    const vendBtn = document.getElementById("tab-btn-vendor");
    
    if (tabType === 'customer') {
      custBtn.className = "px-3 py-1.5 text-xs font-bold rounded-md bg-white text-indigo-600 shadow-xs";
      vendBtn.className = "px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800";
    } else {
      vendBtn.className = "px-3 py-1.5 text-xs font-bold rounded-md bg-white text-indigo-600 shadow-xs";
      custBtn.className = "px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800";
    }

    filterCompaniesList();
  };

  window.filterCompaniesList = function() {
    const companies = DB.getCompanies();
    const query = (document.getElementById("company-search-query")?.value || "").toLowerCase();
    const tbody = document.getElementById("company-tbody");
    if (!tbody) return;

    // Filter by type + query match
    const list = companies.filter(c => {
      const matchesType = c.type === activeCompanyTab;
      const matchesSearch = c.name.toLowerCase().includes(query) || 
                            (c.gst || "").toLowerCase().includes(query) || 
                            (c.email || "").toLowerCase().includes(query);
      return matchesType && matchesSearch;
    });

    tbody.innerHTML = list.map(c => `
      <tr class="border-b hover:bg-slate-50/50">
        <td class="font-bold text-slate-900">${c.name}</td>
        <td class="font-bold font-mono text-slate-600 uppercase">${c.gst || 'No GSTIN / Retail'}</td>
        <td class="text-slate-500 font-medium">${c.phone || '-'} <br/> <span class="text-[10px] text-slate-400 font-normal">${c.email || ''}</span></td>
        <td class="text-[11px] font-normal text-slate-500 max-w-[200px] truncate" title="${c.address}">${c.address || '-'}</td>
        <td class="text-right font-bold text-slate-800">${formatINR(c.openingBalance)}</td>
        <td class="text-center space-x-1.5">
          <button onclick="openCompanyForm('${c.id}')" class="text-indigo-600 hover:text-indigo-800 font-bold hover:underline transition-colors"><i data-lucide="edit-3" class="w-3.5 h-3.5 inline mr-0.5"></i>Edit</button>
          <button onclick="deleteCompanyPrompt('${c.id}')" class="text-rose-500 hover:text-rose-700 font-bold hover:underline transition-colors"><i data-lucide="trash-2" class="w-3.5 h-3.5 inline mr-0.5"></i>Delete</button>
        </td>
      </tr>
    `).join('');

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-slate-400 py-10">No contacting profiles matching search standard. Click "Add New Company" above to add.</td></tr>`;
    }

    if (window.lucide) window.lucide.createIcons();
  };

  window.openCompanyForm = function(companyId = null) {
    const companies = DB.getCompanies();
    const target = companyId ? companies.find(c => c.id === companyId) : null;

    const html = `
      <form id="company-form" onsubmit="saveCompanyFormSubmit(event, '${companyId || ''}')" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-slate-500 font-bold mb-1">Company / Retail Name *</label>
            <input type="text" id="form-comp-name" value="${target ? target.name : ''}" class="bg-slate-50 border rounded-md p-2 w-full font-bold text-slate-800" required placeholder="e.g. MK Traders Pvt Ltd" />
          </div>
          <div>
            <label class="block text-slate-500 font-bold mb-1">Account Relationship Type *</label>
            <select id="form-comp-type" class="bg-slate-50 border rounded-md p-2 w-full font-bold">
              <option value="customer" ${target && target.type === 'customer' ? 'selected' : (activeCompanyTab === 'customer' ? 'selected' : '')}>Customer (Sales Outlet)</option>
              <option value="vendor" ${target && target.type === 'vendor' ? 'selected' : (activeCompanyTab === 'vendor' ? 'selected' : '')}>Vendor (Purchase Supplier)</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-slate-500 font-bold mb-1">GSTIN Number</label>
            <input type="text" id="form-comp-gst" value="${target ? target.gst : ''}" class="bg-slate-50 border rounded-md p-2 w-full uppercase font-mono font-bold" placeholder="e.g. 24ABCDF1234F1Z4" maxlength="15" />
          </div>
          <div>
            <label class="block text-slate-500 font-bold mb-1">Contact Phone</label>
            <input type="text" id="form-comp-phone" value="${target ? target.phone : ''}" class="bg-slate-50 border rounded-md p-2 w-full font-semibold" placeholder="10 Digits Contact" />
          </div>
          <div>
            <label class="block text-slate-500 font-bold mb-1">Business Email</label>
            <input type="email" id="form-comp-email" value="${target ? target.email : ''}" class="bg-slate-50 border rounded-md p-2 w-full font-semibold" placeholder="info@company.com" />
          </div>
        </div>

        <div>
          <label class="block text-slate-500 font-bold mb-1">Registered Billing Address</label>
          <textarea id="form-comp-address" rows="2" class="bg-slate-50 border rounded-md p-2 w-full font-medium" placeholder="Specify full delivery/billing address details">${target ? target.address : ''}</textarea>
        </div>

        <div>
          <label class="block text-slate-500 font-bold mb-1">Opening Balance Ledger Adjustment (₹)</label>
          <input type="number" id="form-comp-balance" value="${target ? target.openingBalance : 0}" class="bg-slate-50 border rounded-md p-2 w-48 font-bold" placeholder="0.00" />
          <span class="text-[10px] text-slate-400 block mt-1">Specify positive number if customer owes you. Negative if you owe vendor.</span>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t">
          <button type="button" onclick="closeModal()" class="border px-4 py-2 rounded-md text-xs font-semibold hover:bg-slate-50 transition-colors">Discard</button>
          <button type="submit" class="btn-primary px-4 py-2 flex items-center gap-1"><i data-lucide="check" class="w-4 h-4"></i> Save Company Record</button>
        </div>
      </form>
    `;

    openModal(companyId ? "Modify Company Profile" : "Register New Company", html);
  };

  window.saveCompanyFormSubmit = function(event, companyId) {
    event.preventDefault();
    const companies = DB.getCompanies();

    const name = document.getElementById("form-comp-name").value;
    const type = document.getElementById("form-comp-type").value;
    const gst = document.getElementById("form-comp-gst").value.toUpperCase();
    const phone = document.getElementById("form-comp-phone").value;
    const email = document.getElementById("form-comp-email").value;
    const address = document.getElementById("form-comp-address").value;
    const openingBalance = Number(document.getElementById("form-comp-balance").value) || 0;

    if (companyId) { // EDIT
      const idx = companies.findIndex(c => c.id === companyId);
      if (idx !== -1) {
        companies[idx] = { ...companies[idx], name, type, gst, phone, email, address, openingBalance };
      }
    } else { // CREATE
      companies.push({ id: "comp-" + Date.now(), type, name, gst, phone, email, address, openingBalance });
    }

    DB.saveCompanies(companies);
    closeModal();
    toast.success("Company profile synced successfully!");
    filterCompaniesList();
  };

  window.deleteCompanyPrompt = function(id) {
    const companies = DB.getCompanies();
    const target = companies.find(c => c.id === id);
    if (!target) return;

    openAlert(
      "Remove Company Record",
      `Are you sure you want to completely erase '${target.name}' from your ledger index? This action is irreversible.`,
      "Delete Profile",
      () => {
        const remaining = companies.filter(c => c.id !== id);
        DB.saveCompanies(remaining);
        toast.success("Company profile deleted.");
        filterCompaniesList();
      }
    );
  };

  // 6. STOCK / PRODUCTS MODULE
  window.filterProductsList = function() {
    const products = DB.getProducts();
    const query = (document.getElementById("stock-search-query")?.value || "").toLowerCase();
    const tbody = document.getElementById("stock-tbody");
    if (!tbody) return;

    const list = products.filter(p => p.name.toLowerCase().includes(query) || (p.hsn || "").includes(query));
    
    // Updates metric labels too
    const totalSKU = document.getElementById("stock-total-skus");
    if (totalSKU) totalSKU.innerText = list.length;

    const lowStockCount = list.filter(p => p.quantity < 10).length;
    const lowCountLabel = document.getElementById("stock-low-count");
    if (lowCountLabel) lowCountLabel.innerText = lowStockCount;

    tbody.innerHTML = list.map(p => {
      const isLowStock = p.quantity < 10;
      return `
        <tr class="border-b hover:bg-slate-50/50 ${isLowStock ? 'bg-rose-50/20' : ''}">
          <td class="font-bold text-slate-900 flex flex-col">
            <span>${p.name}</span>
            ${isLowStock ? '<span class="text-[8px] text-rose-500 font-bold uppercase mt-0.5 tracking-wider">● Low Stock Alert</span>' : ''}
          </td>
          <td class="font-bold font-mono text-slate-505 truncate text-slate-500">${p.hsn || '7408'}</td>
          <td class="text-center font-bold text-slate-600">${p.unit || 'Kg'}</td>
          <td class="text-center font-bold">
            <span class="px-2 py-0.5 rounded text-xs ${isLowStock ? 'bg-rose-50 text-rose-600 font-black border border-rose-100' : 'bg-slate-100 text-slate-800'}">${p.quantity}</span>
          </td>
          <td class="text-right font-bold text-slate-600">${formatINR(p.purchasePrice)}</td>
          <td class="text-right font-bold text-slate-850 text-indigo-700">${formatINR(p.sellingPrice)}</td>
          <td class="text-center">
            <div class="inline-flex gap-1">
              <button onclick="inlineAdjustStockValue('${p.id}', 1)" class="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/50 px-1.5 py-0.5 rounded font-black text-xs transition-colors">+</button>
              <button onclick="inlineAdjustStockValue('${p.id}', -1)" class="bg-slate-50 text-slate-700 hover:bg-slate-150 border border-slate-200 px-1.5 py-0.5 rounded font-black text-xs transition-colors">-</button>
            </div>
          </td>
          <td class="text-center space-x-1.5">
            <button onclick="openProductForm('${p.id}')" class="text-indigo-600 hover:text-indigo-800 font-bold hover:underline transition-colors"><i data-lucide="edit-3" class="w-3.5 h-3.5 inline mr-0.5"></i>Edit</button>
            <button onclick="deleteProductPrompt('${p.id}')" class="text-rose-500 hover:text-rose-500 font-bold hover:underline transition-colors"><i data-lucide="trash-2" class="w-3.5 h-3.5 inline mr-0.5"></i>Delete</button>
          </td>
        </tr>
      `;
    }).join('');

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-slate-400 py-10">No items available. Standardise inventory catalog by clicking "Add New Product" above.</td></tr>`;
    }

    if (window.lucide) window.lucide.createIcons();
  };

  window.inlineAdjustStockValue = function(productId, delta) {
    DB.stockAdjust(productId, delta);
    filterProductsList();
    toast.success(`Inventory stock adjusted by ${delta > 0 ? '+' : ''}${delta}`);
  };

  window.openProductForm = function(productId = null) {
    const products = DB.getProducts();
    const target = productId ? products.find(p => p.id === productId) : null;

    const html = `
      <form id="product-form" onsubmit="saveProductFormSubmit(event, '${productId || ''}')" class="space-y-4">
        <div>
          <label class="block text-slate-500 font-bold mb-1">Product Particular Description Name *</label>
          <input type="text" id="form-prod-name" value="${target ? target.name : ''}" class="bg-slate-50 border rounded-md p-2 w-full font-bold text-slate-800" required placeholder="e.g. Copper Wire Roll 1.5mm" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-slate-500 font-bold mb-1">HSN / SAC Code</label>
            <input type="text" id="form-prod-hsn" value="${target ? target.hsn : ''}" class="bg-slate-50 border rounded-md p-2 w-full font-bold font-mono text-center" placeholder="e.g. 7408" required />
          </div>
          <div>
            <label class="block text-slate-500 font-bold mb-1">Standard Item Unit *</label>
            <select id="form-prod-unit" class="bg-slate-50 border rounded-md p-2 w-full font-bold">
              <option value="Liters" ${target && (target.unit === 'Liters' || target.unit === 'Ltr') ? 'selected' : ''}>Liters</option>
              <option value="KG" ${target && (target.unit === 'KG' || target.unit === 'Kg') ? 'selected' : ''}>KG</option>
            </select>
          </div>
          <div>
            <label class="block text-slate-500 font-bold mb-1">Current Quantity *</label>
            <input type="number" id="form-prod-qty" value="${target ? target.quantity : 0}" class="bg-slate-50 border rounded-md p-2 w-full font-bold text-center" required />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <label class="block text-slate-500 font-bold mb-1">Purchase Cost (₹) *</label>
            <input type="number" step="any" id="form-prod-purchase" value="${target ? target.purchasePrice : ''}" class="bg-slate-50 border rounded-md p-2 w-full font-bold" required placeholder="0.00" />
            <span class="text-[10px] text-slate-400 block mt-1">Used to evaluate GSTR-3B matching & margins.</span>
          </div>
          <div>
            <label class="block text-slate-500 font-bold mb-1">Outward Selling Rate (₹) *</label>
            <input type="number" step="any" id="form-prod-selling" value="${target ? target.sellingPrice : ''}" class="bg-slate-50 border rounded-md p-2 w-full font-bold" required placeholder="0.00" />
            <span class="text-[10px] text-slate-400 block mt-1">This will auto-fill as default price during billing.</span>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t">
          <button type="button" onclick="closeModal()" class="border px-4 py-2 rounded-md text-xs font-semibold hover:bg-slate-50 transition-colors">Discard</button>
          <button type="submit" class="btn-primary px-4 py-2 flex items-center gap-1"><i data-lucide="check" class="w-4 h-4"></i> Save Stock Product</button>
        </div>
      </form>
    `;

    openModal(productId ? "Configure Product Specs" : "Insert Stock Item", html);
  };

  window.saveProductFormSubmit = function(event, productId) {
    event.preventDefault();
    const products = DB.getProducts();

    const name = document.getElementById("form-prod-name").value;
    const hsn = document.getElementById("form-prod-hsn").value;
    const unit = document.getElementById("form-prod-unit").value;
    const quantity = Number(document.getElementById("form-prod-qty").value) || 0;
    const purchasePrice = Number(document.getElementById("form-prod-purchase").value) || 0;
    const sellingPrice = Number(document.getElementById("form-prod-selling").value) || 0;

    if (productId) {
      const idx = products.findIndex(p => p.id === productId);
      if (idx !== -1) {
        products[idx] = { ...products[idx], name, hsn, unit, quantity, purchasePrice, sellingPrice };
      }
    } else {
      products.push({ id: "prod-" + Date.now(), name, hsn, unit, quantity, purchasePrice, sellingPrice });
    }

    DB.saveProducts(products);
    closeModal();
    toast.success("Product specification synced!");
    filterProductsList();
  };

  window.deleteProductPrompt = function(productId) {
    const products = DB.getProducts();
    const target = products.find(p => p.id === productId);
    if (!target) return;

    openAlert(
      "Remove Inventory Record",
      `Deleting '${target.name}' will remove it from stock listings instantly. Confirm?`,
      "Delete Item",
      () => {
        const remaining = products.filter(p => p.id !== productId);
        DB.saveProducts(remaining);
        toast.success("Stock product deleted.");
        filterProductsList();
      }
    );
  };

  // 7. SALES INVOICING CORE
  window.filterSalesInvoicesList = function() {
    const sales = DB.getSales();
    const query = (document.getElementById("sales-search-query")?.value || "").toLowerCase();
    const tbody = document.getElementById("sales-tbody");
    if (!tbody) return;

    const list = sales.filter(s => s.invoiceNo.toLowerCase().includes(query) || s.customerName.toLowerCase().includes(query));

    tbody.innerHTML = list.map(s => `
      <tr class="border-b hover:bg-slate-50/50">
        <td class="font-bold text-slate-900 font-mono">${s.invoiceNo}</td>
        <td class="text-slate-500 font-mono">${formatDate(s.date)}</td>
        <td class="font-bold text-slate-800">${s.customerName}</td>
        <td class="font-bold text-[10px] text-slate-400 font-mono uppercase">${s.customerGst || 'B2C Retailer'}</td>
        <td class="text-right text-slate-500 font-bold">${formatINR(s.subtotal)}</td>
        <td class="text-right text-slate-500 font-mono">${formatINR(s.gstAmount)}</td>
        <td class="text-right font-bold text-indigo-700">${formatINR(s.grandTotal)}</td>
        <td class="text-center">
          <button onclick="toggleSalesInvoiceReceiptPaid('${s.id}')" class="px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all border ${s.paid ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'}">
            ${s.paid ? 'Paid ✓' : 'Unpaid ✗'}
          </button>
        </td>
        <td class="text-center space-x-1.5 flex items-center justify-center">
          <button onclick="triggerPrintSalesInvoiceReceipt('${s.id}')" class="text-indigo-600 hover:text-indigo-800 font-bold hover:underline transition-colors"><i data-lucide="printer" class="w-3.5 h-3.5 inline mr-0.5"></i>Print</button>
          <button onclick="deleteSalesInvoicePrompt('${s.id}')" class="text-rose-500 hover:text-rose-700 font-bold hover:underline transition-colors"><i data-lucide="trash-2" class="w-3.5 h-3.5 inline mr-0.5"></i>Delete</button>
        </td>
      </tr>
    `).join('');

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center text-slate-400 py-10">No records matching search parameters. Click "Create GST Sales Invoice" above.</td></tr>`;
    }

    if (window.lucide) window.lucide.createIcons();
  };

  window.toggleSalesInvoiceReceiptPaid = function(invoiceId) {
    const sales = DB.getSales();
    const idx = sales.findIndex(s => s.id === invoiceId);
    if (idx !== -1) {
      sales[idx].paid = !sales[idx].paid;
      DB.save("sales", sales);
      toast.success("Invoice status checked.");
      filterSalesInvoicesList();
    }
  };

  window.deleteSalesInvoicePrompt = function(id) {
    const sales = DB.getSales();
    const target = sales.find(s => s.id === id);
    if (!target) return;

    openAlert(
      "Void Sales Invoice Document",
      `Are you sure you want to delete invoice ${target.invoiceNo}? This cannot be undone.`,
      "Delete Invoice",
      () => {
        const remaining = sales.filter(s => s.id !== id);
        DB.save("sales", remaining);
        toast.success("Sales Invoice voided successfully.");
        filterSalesInvoicesList();
      }
    );
  };

  window.openNewSalesInvoiceForm = function() {
    const customers = DB.getCompanies().filter(c => c.type === 'customer');
    const products = DB.getProducts();
    const sets = DB.getSettings();

    // Prefill invoice number
    const proposedInvNo = (sets.invoicePrefix || 'INV-') + (sets.nextInvoiceNo || 101);

    const html = `
      <form id="billing-invoice-form" onsubmit="saveSalesInvoiceSubmit(event)" class="space-y-6">
        
        <!-- Recipient Profile & Billing Details -->
        <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 class="font-bold text-slate-800 border-b pb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500">
            <i data-lucide="user" class="w-4 h-4 text-indigo-500"></i> Recipient Billing Details (Bill To)
          </h3>
          
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">Customer Profile Link</label>
              <select id="invoice-cust-select" onchange="syncSelectedCustomerInvoicing(this.value)" class="bg-slate-50 border rounded p-1.5 w-full font-bold text-slate-700 text-xs">
                <option value="">-- Choose Customer --</option>
                ${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">Recipient Name *</label>
              <input type="text" id="invoice-cust-name" class="bg-white border rounded p-1.5 w-full font-bold text-xs" required placeholder="Walk-in Customer" />
            </div>
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">Recipient Phone</label>
              <input type="text" id="invoice-cust-phone" class="bg-white border rounded p-1.5 w-full font-semibold text-xs" placeholder="e.g. +91 99812..." />
            </div>
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">Billing Address *</label>
              <input type="text" id="invoice-cust-address" class="bg-white border rounded p-1.5 w-full font-semibold text-xs" required placeholder="Plot 42, GIDC" />
            </div>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">GSTIN Number</label>
              <input type="text" id="invoice-cust-gst" class="bg-white border rounded p-1.5 w-full font-bold font-mono text-xs uppercase" placeholder="e.g. 24ABCDF1234F1Z4" maxlength="15" />
            </div>
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">PAN Number</label>
              <input type="text" id="invoice-cust-pan" class="bg-white border rounded p-1.5 w-full font-bold font-mono text-xs uppercase" placeholder="e.g. AVHPC6971A" maxlength="10" />
            </div>
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">Place of Supply</label>
              <input type="text" id="invoice-cust-supply" class="bg-white border rounded p-1.5 w-full font-bold text-xs" placeholder="e.g. Rajasthan" value="Rajasthan" />
            </div>
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">Recipient Email</label>
              <input type="email" id="invoice-cust-email" class="bg-white border rounded p-1.5 w-full font-semibold text-xs" placeholder="e.g. client@mail.com" />
            </div>
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">Recipient FSSAI No & Website</label>
              <div class="flex gap-1.5">
                <input type="text" id="invoice-cust-fssai" class="bg-white border rounded p-1.5 w-1/2 font-semibold text-xs" placeholder="FSSAI" />
                <input type="text" id="invoice-cust-website" class="bg-white border rounded p-1.5 w-1/2 font-semibold text-xs" placeholder="Website" />
              </div>
            </div>
          </div>
        </div>

        <!-- Shipping Destination Details (Ship To) -->
        <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b pb-1.5">
            <h3 class="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500">
              <i data-lucide="truck" class="w-4 h-4 text-blue-500"></i> Shipping Destination Details (Ship To)
            </h3>
            <div class="flex items-center gap-1.5">
              <input type="checkbox" id="invoice-same-shipping" class="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer" checked onchange="toggleSameShipping(this.checked)" />
              <label for="invoice-same-shipping" class="text-xs font-bold text-slate-700 cursor-pointer select-none">Same as Billing Details</label>
            </div>
          </div>
          
          <div id="shipping-fields-group" class="grid grid-cols-1 sm:grid-cols-5 gap-4 hidden">
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">Shipping Recipient Name</label>
              <input type="text" id="invoice-ship-name" class="bg-white border rounded p-1.5 w-full font-bold text-xs" placeholder="Ship recipient name" />
            </div>
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">Shipping Destination Address</label>
              <input type="text" id="invoice-ship-address" class="bg-white border rounded p-1.5 w-full font-semibold text-xs" placeholder="Shipping address details" />
            </div>
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">Shipping PIN Code</label>
              <input type="text" id="invoice-ship-pin" class="bg-white border rounded p-1.5 w-full font-bold text-xs font-mono" placeholder="PIN Code" />
            </div>
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">Shipping Contact Phone</label>
              <input type="text" id="invoice-ship-phone" class="bg-white border rounded p-1.5 w-full font-semibold text-xs font-mono" placeholder="Phone No." />
            </div>
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">Shipping State / State Code</label>
              <input type="text" id="invoice-ship-state" class="bg-white border rounded p-1.5 w-full font-bold text-xs" placeholder="e.g. Rajasthan" />
            </div>
          </div>
        </div>

        <!-- Invoice Meta Details & Ledger Balances -->
        <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 class="font-bold text-slate-800 border-b pb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500">
            <i data-lucide="file-text" class="w-4 h-4 text-purple-500"></i> Invoice Parameters & Outstanding Balances
          </h3>
          
          <div class="grid grid-cols-1 sm:grid-cols-6 gap-3">
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">Invoice Number *</label>
              <input type="text" id="invoice-no" value="${proposedInvNo}" class="bg-white border rounded p-1.5 w-full font-bold font-mono text-center text-xs" required />
            </div>
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">Invoice Dated *</label>
              <input type="date" id="invoice-date" value="${new Date().toISOString().slice(0, 10)}" class="bg-white border rounded p-1.5 w-full font-bold font-mono text-xs" required />
            </div>
            <div>
              <label class="block text-emerald-600 font-black mb-1 text-[11px]">Received Amount (₹)</label>
              <input type="number" id="invoice-form-received" onkeyup="recalculateInvoiceGrandTotals()" onchange="recalculateInvoiceGrandTotals()" value="0" class="bg-white border border-emerald-300 rounded p-1.5 w-full font-black text-emerald-700 text-center font-mono text-xs" />
            </div>
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">Previous Balance (₹)</label>
              <input type="number" id="invoice-form-prev-balance" onkeyup="recalculateInvoiceGrandTotals()" onchange="recalculateInvoiceGrandTotals()" value="0" class="bg-white border rounded p-1.5 w-full font-bold text-center font-mono text-xs" />
            </div>
            <div>
              <label class="block text-slate-400 font-bold mb-1 text-[11px]">Current Bill Balance (₹)</label>
              <input type="text" id="invoice-form-balance" value="0.00" class="bg-slate-50 border rounded p-1.5 w-full text-center font-bold font-mono text-xs text-slate-600" disabled readonly />
            </div>
            <div>
              <label class="block text-rose-500 font-black mb-1 text-[11px]">Net Account Bal. (₹)</label>
              <input type="text" id="invoice-form-curr-balance" value="0.00" class="bg-rose-50/50 border border-rose-200 rounded p-1.5 w-full text-center font-black font-mono text-xs text-rose-700" disabled readonly />
            </div>
          </div>
        </div>

        <!-- Particular selections and table grid -->
        <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b pb-1.5">
            <h3 class="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500">
              <i data-lucide="layers" class="w-4 h-4 text-amber-500"></i> Invoice Item Particulars
            </h3>
            <div class="flex items-center gap-1.5">
              <select id="invoice-additem-picker" onchange="triggerAddProductInvoiceLine(this.value)" class="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 p-1.5 rounded font-bold text-[11px] cursor-pointer">
                <option value="">-- Apply SKU Catalog Item --</option>
                ${products.map(p => `<option value="${p.id}">${p.name} (Qty: ${p.quantity})</option>`).join('')}
              </select>
              <button type="button" onclick="addNewEmptyInvoiceLine()" class="bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2 py-1.5 rounded text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> Custom Description Row
              </button>
            </div>
          </div>

          <div class="border rounded-md overflow-hidden bg-white max-h-48 overflow-y-auto">
            <table class="w-full">
              <thead class="bg-slate-50 border-b text-[11px] text-slate-500 font-bold">
                <tr>
                  <th class="py-2 px-2 text-left">Product Name Details Particulars</th>
                  <th class="py-2 px-2 text-center w-24">HSN/SAC</th>
                  <th class="py-2 px-2 text-center w-20">Qty</th>
                  <th class="py-2 px-2 text-right w-24">Unit Rate</th>
                  <th class="py-2 px-1 text-center w-24">GST Tax %</th>
                  <th class="py-2 px-2 text-right w-28">Taxable Amount</th>
                  <th class="py-2 px-2 text-center w-12">Purge</th>
                </tr>
              </thead>
              <tbody id="invoice-items-form-tbody">
                <!-- Dynamically appended row lines -->
              </tbody>
            </table>
          </div>

          <!-- Footer computations panels -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-3">
            <div class="space-y-4 bg-slate-50/50 p-3 rounded-lg border border-slate-100 flex flex-col justify-between">
              <div>
                <span class="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Number to Words Amount:</span>
                <span id="invoice-form-words-label" class="block font-black text-xs text-indigo-800 leading-normal mt-1">Rupees Zero Only</span>
              </div>
              <div class="flex items-center gap-3">
                <div class="w-full sm:w-1/2">
                  <label class="block text-slate-500 font-bold mb-1 text-[11px]">Invoice Overall Discount (₹)</label>
                  <input type="number" id="invoice-form-discount" onkeyup="recalculateInvoiceGrandTotals()" value="0" class="bg-white border rounded p-1.5 w-full font-bold font-mono text-center text-xs" />
                </div>
              </div>
            </div>

            <div class="space-y-1 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div class="flex items-center justify-between text-slate-600 font-bold text-xs">
                <span>Overall Total Taxable:</span>
                <span id="label-subtotal">₹0.00</span>
              </div>
              <div class="flex items-center justify-between text-slate-500 font-bold border-b pb-1 text-xs">
                <span>Consolidated GST:</span>
                <span id="label-gst">₹0.00</span>
              </div>
              <div class="flex items-center justify-between text-slate-600 font-bold border-b pb-1 text-[10px]">
                <span>Round Off Adjust:</span>
                <span id="label-round">₹0.00</span>
              </div>
              <div class="flex items-center justify-between text-indigo-900 font-black text-sm pt-1">
                <span>Grand Net Invoice Total:</span>
                <span id="label-grand">₹0.00</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Terms & Banking coordinates details (Pre-filled, editable) -->
        <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 class="font-bold text-slate-800 border-b pb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500">
            <i data-lucide="landmark" class="w-4 h-4 text-slate-500"></i> Terms & Account Banking Coordinates (Filled from settings)
          </h3>
          
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-3">
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">Bank Account Holder Name</label>
              <input type="text" id="invoice-form-bank-holder" value="${sets.bankHolder || 'Bipin Singh'}" class="bg-slate-50 hover:bg-white focus:bg-white transition-colors border rounded p-1.5 w-full font-bold text-xs" />
            </div>
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">Bank Account Number</label>
              <input type="text" id="invoice-form-bank-account" value="${sets.bankAccount || '38028101723'}" class="bg-slate-50 hover:bg-white focus:bg-white transition-colors border rounded p-1.5 w-full font-bold font-mono text-xs" />
            </div>
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">Bank Name & Branch</label>
              <div class="flex gap-1.5">
                <input type="text" id="invoice-form-bank-name" value="${sets.bankName || 'State Bank of India'}" class="bg-slate-50 hover:bg-white focus:bg-white transition-colors border rounded p-1.5 w-1/2 font-bold text-xs" placeholder="Bank" />
                <input type="text" id="invoice-form-bank-branch" value="${sets.bankBranch || 'Jaipur'}" class="bg-slate-50 hover:bg-white focus:bg-white transition-colors border rounded p-1.5 w-1/2 font-bold text-xs" placeholder="Branch" />
              </div>
            </div>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">IFSC Code Details</label>
              <input type="text" id="invoice-form-bank-ifsc" value="${sets.bankIfsc || 'SBIN0002836'}" class="bg-slate-50 hover:bg-white focus:bg-white transition-colors border rounded p-1.5 w-full font-bold font-mono text-xs uppercase" />
            </div>
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">UPI Payment ID Address</label>
              <input type="text" id="invoice-form-bank-upi" value="${sets.bankUpi || 'bipin@paytm'}" class="bg-slate-50 hover:bg-white focus:bg-white transition-colors border rounded p-1.5 w-full font-bold font-mono text-xs" />
            </div>
            <div>
              <label class="block text-slate-500 font-bold mb-1 text-[11px]">Terms and Conditions Description</label>
              <textarea id="invoice-form-terms" rows="2" class="bg-slate-50 hover:bg-white focus:bg-white transition-colors border rounded p-1 w-full text-xs font-semibold leading-normal">${sets.terms || '1. Customer will pay the GST\n2. Pay due amount within 15 days'}</textarea>
            </div>
          </div>
        </div>

        <!-- Submit block -->
        <div class="flex justify-end gap-2 pt-3 border-t">
          <button type="button" onclick="closeModal()" class="border px-4 py-2 rounded-md text-xs font-semibold hover:bg-slate-50">Discard</button>
          <button type="submit" class="btn-primary px-4 py-2 flex items-center gap-1">
            <i data-lucide="check" class="w-4 h-4"></i> Save, Record & Close
          </button>
        </div>

      </form>
    `;

    openModal("Create Inward GST Invoice", html);
    addNewEmptyInvoiceLine();
  };

  window.toggleSameShipping = function(checked) {
    const el = document.getElementById("shipping-fields-group");
    if (!el) return;
    if (checked) {
      el.classList.add("hidden");
    } else {
      el.classList.remove("hidden");
      // Prefill with billing details as draft
      document.getElementById("invoice-ship-name").value = document.getElementById("invoice-cust-name").value;
      document.getElementById("invoice-ship-address").value = document.getElementById("invoice-cust-address").value;
      document.getElementById("invoice-ship-phone").value = document.getElementById("invoice-cust-phone").value;
      document.getElementById("invoice-ship-state").value = document.getElementById("invoice-cust-supply").value;
    }
  };

  window.syncSelectedCustomerInvoicing = function(custID) {
    if (!custID) return;
    const customer = DB.getCompanies().find(c => c.id === custID);
    if (!customer) return;

    document.getElementById("invoice-cust-name").value = customer.name;
    document.getElementById("invoice-cust-gst").value = customer.gst || "";
    document.getElementById("invoice-cust-phone").value = customer.phone || "";
    document.getElementById("invoice-cust-address").value = customer.address || "";
    if (document.getElementById("invoice-cust-pan")) document.getElementById("invoice-cust-pan").value = customer.pan || "";
    if (document.getElementById("invoice-cust-email")) document.getElementById("invoice-cust-email").value = customer.email || "";
    if (document.getElementById("invoice-cust-fssai")) document.getElementById("invoice-cust-fssai").value = customer.fssai || "";
    if (document.getElementById("invoice-cust-website")) document.getElementById("invoice-cust-website").value = customer.website || "";

    // Calculate dynamic ledger balance of customer
    const sales = DB.getSales();
    let outstanding = 0;
    sales.forEach(sale => {
      if (sale.customerName === customer.name) {
        const received = Number(sale.receivedAmount) || 0;
        const total = Number(sale.grandTotal) || 0;
        outstanding += (total - received);
      }
    });

    const prevBalInput = document.getElementById("invoice-form-prev-balance");
    if (prevBalInput) {
      prevBalInput.value = outstanding.toFixed(2);
      recalculateInvoiceGrandTotals();
    }
  };

  window.triggerAddProductInvoiceLine = function(productId) {
    if (!productId) return;
    const prod = DB.getProducts().find(p => p.id === productId);
    if (!prod) return;

    // We verify if we have rows or can append item
    const tbody = document.getElementById("invoice-items-form-tbody");
    if (!tbody) return;

    // Check if the single first row is completely blank and replace it
    const rows = tbody.querySelectorAll(".invoice-row-line");
    if (rows.length === 1 && rows[0].querySelector(".row-prod-name").value === "") {
      rows[0].remove();
    }

    const tr = document.createElement("tr");
    tr.className = "invoice-row-line border-b border-slate-100 hover:bg-slate-50";
    tr.setAttribute("data-id", prod.id);
    tr.innerHTML = `
      <td class="py-1 px-2"><input type="text" class="row-prod-name bg-slate-50 border rounded p-1 w-full font-bold" value="${prod.name}" required /></td>
      <td class="py-1 px-2"><input type="text" class="row-prod-hsn bg-slate-50 border rounded p-1 w-full text-center font-bold font-mono" value="${prod.hsn || '7408'}" /></td>
      <td class="py-1 px-2"><input type="number" onkeyup="recalculateInvoiceGrandTotals()" onchange="recalculateInvoiceGrandTotals()" class="row-prod-qty bg-slate-50 border rounded p-1 w-full text-center font-semibold" value="1" required /></td>
      <td class="py-1 px-2"><input type="number" step="any" onkeyup="recalculateInvoiceGrandTotals()" onchange="recalculateInvoiceGrandTotals()" class="row-prod-rate bg-slate-50 border rounded p-1 w-full text-right font-semibold" value="${prod.sellingPrice}" required /></td>
      <td class="py-1 px-1">
        <select onchange="recalculateInvoiceGrandTotals()" class="row-prod-gst bg-slate-50 border rounded p-1 w-full font-bold text-center">
          <option value="5">5%</option>
          <option value="12">12%</option>
          <option value="18" selected>18%</option>
          <option value="28">28%</option>
        </select>
      </td>
      <td class="py-1 px-2 text-right font-bold text-slate-700 row-calc-taxable">₹0.00</td>
      <td class="py-1 px-2 text-center">
        <button type="button" onclick="this.closest('tr').remove(); recalculateInvoiceGrandTotals();" class="text-rose-500 hover:text-rose-700 transition-colors p-1"><i data-lucide="minus-circle" class="w-4 h-4"></i></button>
      </td>
    `;
    tbody.appendChild(tr);

    // Reset selectors picker
    document.getElementById("invoice-additem-picker").value = "";

    if (window.lucide) window.lucide.createIcons();
    recalculateInvoiceGrandTotals();
  };

  window.addNewEmptyInvoiceLine = function() {
    const tbody = document.getElementById("invoice-items-form-tbody");
    if (!tbody) return;

    const tr = document.createElement("tr");
    tr.className = "invoice-row-line border-b border-slate-100 hover:bg-slate-50";
    tr.setAttribute("data-id", "custom-" + Date.now());
    tr.innerHTML = `
      <td class="py-1 px-2"><input type="text" class="row-prod-name bg-slate-50 border rounded p-1 w-full font-bold" value="" required placeholder="Goods Description" /></td>
      <td class="py-1 px-2"><input type="text" class="row-prod-hsn bg-slate-50 border rounded p-1 w-full text-center font-bold font-mono" value="99" /></td>
      <td class="py-1 px-2"><input type="number" onkeyup="recalculateInvoiceGrandTotals()" onchange="recalculateInvoiceGrandTotals()" class="row-prod-qty bg-slate-50 border rounded p-1 w-full text-center font-semibold" value="1" required /></td>
      <td class="py-1 px-2"><input type="number" step="any" onkeyup="recalculateInvoiceGrandTotals()" onchange="recalculateInvoiceGrandTotals()" class="row-prod-rate bg-slate-50 border rounded p-1 w-full text-right font-semibold" value="0" required /></td>
      <td class="py-1 px-1">
        <select onchange="recalculateInvoiceGrandTotals()" class="row-prod-gst bg-slate-50 border rounded p-1 w-full font-bold text-center">
          <option value="5">5%</option>
          <option value="12">12%</option>
          <option value="18" selected>18%</option>
          <option value="28">28%</option>
        </select>
      </td>
      <td class="py-1 px-2 text-right font-bold text-slate-700 row-calc-taxable">₹0.00</td>
      <td class="py-1 px-2 text-center">
        <button type="button" onclick="this.closest('tr').remove(); recalculateInvoiceGrandTotals();" class="text-rose-500 hover:text-rose-700 transition-colors p-1"><i data-lucide="minus-circle" class="w-4 h-4"></i></button>
      </td>
    `;
    tbody.appendChild(tr);

    if (window.lucide) window.lucide.createIcons();
    recalculateInvoiceGrandTotals();
  };

  window.recalculateInvoiceGrandTotals = function() {
    const lines = document.querySelectorAll(".invoice-row-line");
    let overallTaxable = 0;
    let overallGst = 0;

    lines.forEach(tr => {
      const qty = Number(tr.querySelector(".row-prod-qty").value) || 0;
      const rate = Number(tr.querySelector(".row-prod-rate").value) || 0;
      const gstRate = Number(tr.querySelector(".row-prod-gst").value) || 0;

      const taxable = qty * rate;
      const gst = taxable * (gstRate / 100);

      overallTaxable += taxable;
      overallGst += gst;

      tr.querySelector(".row-calc-taxable").innerText = formatINR(taxable);
    });

    const discount = Number(document.getElementById("invoice-form-discount")?.value) || 0;
    const netBeforeRound = (overallTaxable + overallGst) - discount;
    const grandNetTotal = Math.round(netBeforeRound);
    const roundOff = grandNetTotal - netBeforeRound;

    // Display labels update
    document.getElementById("label-subtotal").innerText = formatINR(overallTaxable);
    document.getElementById("label-gst").innerText = formatINR(overallGst);
    document.getElementById("label-round").innerText = (roundOff >= 0 ? "+" : "") + formatINR(roundOff);
    document.getElementById("label-grand").innerText = formatINR(grandNetTotal);

    // Outstanding balances computation
    const received = Number(document.getElementById("invoice-form-received")?.value) || 0;
    const previous = Number(document.getElementById("invoice-form-prev-balance")?.value) || 0;
    const balance = grandNetTotal - received;
    const totalDue = previous + balance;

    const balEl = document.getElementById("invoice-form-balance");
    if (balEl) balEl.value = balance.toFixed(2);

    const currBalEl = document.getElementById("invoice-form-curr-balance");
    if (currBalEl) currBalEl.value = totalDue.toFixed(2);

    const wordsLabel = document.getElementById("invoice-form-words-label");
    if (wordsLabel && window.numberToWords) {
      wordsLabel.innerText = window.numberToWords(grandNetTotal);
    }
  };

  window.saveSalesInvoiceSubmit = function(event) {
    event.preventDefault();

    const customerName = document.getElementById("invoice-cust-name").value;
    const customerGst = document.getElementById("invoice-cust-gst").value.toUpperCase();
    const customerPhone = document.getElementById("invoice-cust-phone").value;
    const customerAddress = document.getElementById("invoice-cust-address").value;
    const customerPan = document.getElementById("invoice-cust-pan") ? document.getElementById("invoice-cust-pan").value.toUpperCase() : "";
    const customerSupply = document.getElementById("invoice-cust-supply") ? document.getElementById("invoice-cust-supply").value : "Rajasthan";
    const customerEmail = document.getElementById("invoice-cust-email") ? document.getElementById("invoice-cust-email").value : "";
    const customerFssai = document.getElementById("invoice-cust-fssai") ? document.getElementById("invoice-cust-fssai").value : "";
    const customerWebsite = document.getElementById("invoice-cust-website") ? document.getElementById("invoice-cust-website").value : "";

    // Shipping details
    const sameShipping = document.getElementById("invoice-same-shipping") ? document.getElementById("invoice-same-shipping").checked : true;
    let shippingDetails = { same: true };
    if (!sameShipping) {
      shippingDetails = {
        same: false,
        name: document.getElementById("invoice-ship-name").value || customerName,
        address: document.getElementById("invoice-ship-address").value || customerAddress,
        pin: document.getElementById("invoice-ship-pin").value || "",
        phone: document.getElementById("invoice-ship-phone").value || customerPhone,
        state: document.getElementById("invoice-ship-state").value || customerSupply
      };
    }

    const date = document.getElementById("invoice-date").value;
    const invoiceNo = document.getElementById("invoice-no").value;
    const discount = Number(document.getElementById("invoice-form-discount").value) || 0;
    const receivedAmount = Number(document.getElementById("invoice-form-received")?.value) || 0;
    const previousBalance = Number(document.getElementById("invoice-form-prev-balance")?.value) || 0;

    // Grab selective lines
    const lines = document.querySelectorAll(".invoice-row-line");
    if (lines.length === 0) {
      toast.error("Please add at least one line item product!");
      return;
    }

    const items = [];
    let subtotal = 0;
    let gstAmount = 0;

    for (let i = 0; i < lines.length; i++) {
      const tr = lines[i];
      const prodId = tr.getAttribute("data-id");
      const name = tr.querySelector(".row-prod-name").value;
      const hsn = tr.querySelector(".row-prod-hsn").value;
      const qty = Number(tr.querySelector(".row-prod-qty").value) || 0;
      const rate = Number(tr.querySelector(".row-prod-rate").value) || 0;
      const gstRate = Number(tr.querySelector(".row-prod-gst").value) || 0;

      if (name === "") {
        toast.error("Items description cannot be left empty!");
        return;
      }

      const lineTaxable = qty * rate;
      const lineGst = lineTaxable * (gstRate / 100);

      items.push({
        id: prodId,
        name,
        hsnCode: hsn,
        qty,
        rate,
        taxable: lineTaxable,
        gstRate,
        cgst: lineGst / 2,
        sgst: lineGst / 2,
        total: lineTaxable + lineGst
      });

      subtotal += lineTaxable;
      gstAmount += lineGst;

      // EXTREME HIT: Decrease product stock quantity automatically if linked to product
      if (prodId && !prodId.startsWith("custom-")) {
        DB.stockAdjust(prodId, -qty);
      }
    }

    const netBeforeRound = (subtotal + gstAmount) - discount;
    const grandTotal = Math.round(netBeforeRound);
    const roundOff = grandTotal - netBeforeRound;
    const currentBalance = previousBalance + (grandTotal - receivedAmount);

    // Banking details and terms from UI
    const bankDetails = {
      holder: document.getElementById("invoice-form-bank-holder") ? document.getElementById("invoice-form-bank-holder").value : "",
      account: document.getElementById("invoice-form-bank-account") ? document.getElementById("invoice-form-bank-account").value : "",
      name: document.getElementById("invoice-form-bank-name") ? document.getElementById("invoice-form-bank-name").value : "",
      branch: document.getElementById("invoice-form-bank-branch") ? document.getElementById("invoice-form-bank-branch").value : "",
      ifsc: document.getElementById("invoice-form-bank-ifsc") ? document.getElementById("invoice-form-bank-ifsc").value : "",
      upi: document.getElementById("invoice-form-bank-upi") ? document.getElementById("invoice-form-bank-upi").value : ""
    };
    const terms = document.getElementById("invoice-form-terms") ? document.getElementById("invoice-form-terms").value : "";

    const invoices = DB.getSales();
    invoices.push({
      id: "sale-" + Date.now(),
      invoiceNo,
      date,
      customerName,
      customerGst,
      customerAddress,
      customerPhone,
      customerPan,
      customerSupply,
      customerEmail,
      customerFssai,
      customerWebsite,
      shippingDetails,
      items,
      subtotal,
      gstAmount,
      discount,
      roundOff,
      grandTotal,
      receivedAmount,
      previousBalance,
      currentBalance,
      bankDetails,
      terms,
      paid: receivedAmount >= grandTotal
    });

    DB.save("sales", invoices);

    // Update prefix index in settings so next generation suggestions incremental
    const sets = DB.getSettings();
    sets.nextInvoiceNo = (sets.nextInvoiceNo || 101) + 1;
    DB.saveSettings(sets);

    closeModal();
    toast.success("Sales Invoice Saved successfully!");
    
    // Redirect / reload register list
    navigateTo("sales");
  };

  // 8. PURCHASE INVOICING CORE
  window.filterPurchaseInvoicesList = function() {
    const list = DB.getPurchases();
    const query = (document.getElementById("purchase-search-query")?.value || "").toLowerCase();
    const tbody = document.getElementById("purchases-tbody");
    if (!tbody) return;

    const filtered = list.filter(p => p.billNo.toLowerCase().includes(query) || p.vendorName.toLowerCase().includes(query));

    tbody.innerHTML = filtered.map(p => `
      <tr class="border-b hover:bg-slate-50/50">
        <td class="font-bold font-mono text-slate-900">${p.billNo}</td>
        <td class="text-slate-500 font-mono">${formatDate(p.date)}</td>
        <td class="font-bold text-slate-800">${p.vendorName}</td>
        <td class="font-bold text-[10px] text-slate-400 font-mono uppercase">${p.vendorGst || 'No GSTIN'}</td>
        <td class="text-right text-slate-500 font-bold">${formatINR(p.subtotal)}</td>
        <td class="text-right text-slate-500 font-mono">${formatINR(p.gstAmount)}</td>
        <td class="text-right font-bold text-teal-700">${formatINR(p.total)}</td>
        <td class="text-center space-x-1.5 flex items-center justify-center">
          <button onclick="triggerPrintPurchaseInvoiceReceipt('${p.id}')" class="text-indigo-600 hover:text-indigo-800 font-bold hover:underline transition-colors"><i data-lucide="printer" class="w-3.5 h-3.5 inline mr-0.5"></i>Print</button>
          <button onclick="deletePurchaseInvoicePrompt('${p.id}')" class="text-rose-500 hover:text-rose-700 font-bold hover:underline transition-colors"><i data-lucide="trash-2" class="w-3.5 h-3.5 inline mr-0.5"></i>Delete</button>
        </td>
      </tr>
    `).join('');

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-slate-400 py-10">No purchase records matching queries. Log bills by clicking "Log Vendor Purchase Bill" above.</td></tr>`;
    }

    if (window.lucide) window.lucide.createIcons();
  };

  window.deletePurchaseInvoicePrompt = function(id) {
    const purchases = DB.getPurchases();
    const target = purchases.find(p => p.id === id);
    if (!target) return;

    openAlert(
      "Remove Vendor Purchase Document Ledger Record",
      `Are you sure you want to delete purchase bill ${target.billNo}? Storage balances will update.`,
      "Delete Bill",
      () => {
        const remaining = purchases.filter(p => p.id !== id);
        DB.save("purchase", remaining);
        toast.success("Purchase bill removed.");
        filterPurchaseInvoicesList();
      }
    );
  };

  window.openNewPurchaseBillForm = function() {
    const vendors = DB.getCompanies().filter(c => c.type === 'vendor');
    const products = DB.getProducts();

    const html = `
      <form id="purchase-bill-form" onsubmit="savePurchaseBillSubmit(event)" class="space-y-4">
        
        <h3 class="font-bold text-slate-800 border-b pb-1 flex items-center gap-1.5"><i data-lucide="info" class="w-4 h-4 text-emerald-600"></i> Vendor Supplier Detail Specs</h3>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
          <div>
            <label class="block text-slate-500 font-bold mb-1">Select Supplier Vendor</label>
            <select id="pur-vendor-select" onchange="syncSelectedVendorPurchasing(this.value)" class="bg-white border rounded p-1.5 w-full font-bold">
              <option value="">-- Choose Vendor Supplier --</option>
              ${vendors.map(v => `<option value="${v.id}">${v.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-slate-500 font-bold mb-1">Vendor Name *</label>
            <input type="text" id="pur-vendor-name" class="bg-white border rounded p-1.5 w-full font-bold" required />
          </div>
          <div>
            <label class="block text-slate-500 font-bold mb-1">Purchase Bill Date *</label>
            <input type="date" id="pur-date" value="${new Date().toISOString().slice(0, 10)}" class="bg-white border rounded p-1.5 w-full font-bold font-mono" required />
          </div>
          <div>
            <label class="block text-slate-500 font-bold mb-1">Vendor Bill/Invoice Number *</label>
            <input type="text" id="pur-bill-no" class="bg-white border rounded p-1.5 w-full font-bold font-mono text-center" required placeholder="e.g. APX-983" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
          <div>
            <label class="block text-slate-500 font-bold mb-1">GSTIN Number (Optional)</label>
            <input type="text" id="pur-vendor-gst" class="bg-white border rounded p-1.5 w-full uppercase font-mono font-bold" placeholder="e.g. 24AAHCA4455H1Z3" />
          </div>
          <div>
            <label class="block text-slate-500 font-bold mb-1">Supplier Contact Phone</label>
            <input type="text" id="pur-vendor-phone" class="bg-white border rounded p-1.5 w-full font-semibold" />
          </div>
          <div>
            <label class="block text-slate-500 font-bold mb-1">Vendor Invoice Address</label>
            <input type="text" id="pur-vendor-address" class="bg-white border rounded p-1.5 w-full font-semibold" />
          </div>
        </div>

        <!-- Particular selections -->
        <div class="flex items-center justify-between border-b pb-1 pt-2">
          <h3 class="font-bold text-slate-800 flex items-center gap-1.5"><i data-lucide="layers" class="w-4 h-4 text-emerald-600"></i> Purchase Bills Items</h3>
          <div class="flex items-center gap-1.5">
            <select id="pur-additem-picker" onchange="triggerAddProductPurchaseLine(this.value)" class="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 p-1 rounded font-bold text-xs cursor-pointer">
              <option value="">-- Click to Add Stock SKU --</option>
              ${products.map(p => `<option value="${p.id}">${p.name} (Inward cost: ${p.purchasePrice})</option>`).join('')}
            </select>
            <button type="button" onclick="addNewEmptyPurchaseLine()" class="bg-slate-100 hover:bg-slate-250 border border-slate-300 p-1.5 rounded text-xs font-bold font-slate-700 flex items-center gap-1"><i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> Custom Particular Row</button>
          </div>
        </div>

        <div class="border rounded-md overflow-hidden bg-white max-h-48 overflow-y-auto">
          <table class="w-full">
            <thead class="bg-slate-50 border-b">
              <tr>
                <th class="py-1 px-2 text-left">Product Name / Invoiced Supplies Particular Description</th>
                <th class="py-1 px-2 text-center w-24">HSN/SAC</th>
                <th class="py-1 px-2 text-center w-20">Qty</th>
                <th class="py-1 px-2 text-right w-24">Unit Rate</th>
                <th class="py-1 px-1 text-center w-24">GST Rate %</th>
                <th class="py-1 px-2 text-right w-28">Taxable Amount</th>
                <th class="py-1 px-2 text-center w-12">Purge</th>
              </tr>
            </thead>
            <tbody id="pur-items-form-tbody">
              <!-- Inline values -->
            </tbody>
          </table>
        </div>

        <!-- Footer calculation totalers -->
        <div class="space-y-1 bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col items-end">
          <div class="w-full sm:w-80 space-y-1">
            <div class="flex items-center justify-between text-slate-600 font-bold">
              <span>Purchase Taxable Total:</span>
              <span id="label-pur-subtotal">₹0.00</span>
            </div>
            <div class="flex items-center justify-between text-slate-500 font-bold border-b pb-1">
              <span>Total GST Paid (Inward):</span>
              <span id="label-pur-gst">₹0.00</span>
            </div>
            <div class="flex items-center justify-between text-teal-800 font-black text-sm pt-1 border-t">
              <span>Recorded Bill Net Grand:</span>
              <span id="label-pur-grand">₹0.00</span>
            </div>
          </div>
        </div>

        <!-- Submit actions -->
        <div class="flex justify-end gap-2 pt-2 border-t">
          <button type="button" onclick="closeModal()" class="border px-4 py-2 rounded-md text-xs font-semibold hover:bg-slate-50">Discard</button>
          <button type="submit" class="btn-primary px-4 py-2 bg-teal-600 hover:bg-teal-700 border-teal-700 flex items-center gap-1"><i data-lucide="check" class="w-4 h-4"></i> Save & Log Purchase Bill</button>
        </div>

      </form>
    `;

    openModal("Inward Vendor Purchase Invoice Bill", html);
    addNewEmptyPurchaseLine();
  };

  window.syncSelectedVendorPurchasing = function(vendorId) {
    if (!vendorId) return;
    const vend = DB.getCompanies().find(v => v.id === vendorId);
    if (!vend) return;

    document.getElementById("pur-vendor-name").value = vend.name;
    document.getElementById("pur-vendor-gst").value = vend.gst || "";
    document.getElementById("pur-vendor-phone").value = vend.phone || "";
    document.getElementById("pur-vendor-address").value = vend.address || "";
  };

  window.triggerAddProductPurchaseLine = function(productId) {
    if (!productId) return;
    const prod = DB.getProducts().find(p => p.id === productId);
    if (!prod) return;

    const tbody = document.getElementById("pur-items-form-tbody");
    if (!tbody) return;

    const rows = tbody.querySelectorAll(".pur-row-line");
    if (rows.length === 1 && rows[0].querySelector(".row-pur-name").value === "") {
      rows[0].remove();
    }

    const tr = document.createElement("tr");
    tr.className = "pur-row-line border-b border-slate-100 hover:bg-slate-50";
    tr.setAttribute("data-id", prod.id);
    tr.innerHTML = `
      <td class="py-1 px-2"><input type="text" class="row-pur-name bg-slate-50 border rounded p-1 w-full font-bold" value="${prod.name}" required /></td>
      <td class="py-1 px-2"><input type="text" class="row-pur-hsn bg-slate-50 border rounded p-1 w-full text-center font-bold font-mono text-slate-600" value="${prod.hsn || '7408'}" /></td>
      <td class="py-1 px-2"><input type="number" onkeyup="recalculatePurchaseGrandTotals()" onchange="recalculatePurchaseGrandTotals()" class="row-pur-qty bg-slate-50 border rounded p-1 w-full text-center font-semibold text-slate-800" value="1" required /></td>
      <td class="py-1 px-2"><input type="number" step="any" onkeyup="recalculatePurchaseGrandTotals()" onchange="recalculatePurchaseGrandTotals()" class="row-pur-rate bg-slate-50 border rounded p-1 w-full text-right font-semibold text-slate-800" value="${prod.purchasePrice}" required /></td>
      <td class="py-1 px-1">
        <select onchange="recalculatePurchaseGrandTotals()" class="row-pur-gst bg-slate-50 border rounded p-1 w-full font-bold text-center">
          <option value="5">5%</option>
          <option value="12">12%</option>
          <option value="18" selected>18%</option>
          <option value="28">28%</option>
        </select>
      </td>
      <td class="py-1 px-2 text-right font-bold text-slate-700 row-pur-calc-taxable">₹0.00</td>
      <td class="py-1 px-2 text-center">
        <button type="button" onclick="this.closest('tr').remove(); recalculatePurchaseGrandTotals();" class="text-rose-500 hover:text-rose-700 transition-colors p-1"><i data-lucide="minus-circle" class="w-4 h-4"></i></button>
      </td>
    `;
    tbody.appendChild(tr);

    document.getElementById("pur-additem-picker").value = "";

    if (window.lucide) window.lucide.createIcons();
    recalculatePurchaseGrandTotals();
  };

  window.addNewEmptyPurchaseLine = function() {
    const tbody = document.getElementById("pur-items-form-tbody");
    if (!tbody) return;

    const tr = document.createElement("tr");
    tr.className = "pur-row-line border-b border-slate-100 hover:bg-slate-50";
    tr.setAttribute("data-id", "custom-" + Date.now());
    tr.innerHTML = `
      <td class="py-1 px-2"><input type="text" class="row-pur-name bg-slate-50 border rounded p-1 w-full font-bold" value="" required placeholder="Goods particulars" /></td>
      <td class="py-1 px-2"><input type="text" class="row-pur-hsn bg-slate-50 border rounded p-1 w-full text-center font-bold font-mono" value="99" /></td>
      <td class="py-1 px-2"><input type="number" onkeyup="recalculatePurchaseGrandTotals()" onchange="recalculatePurchaseGrandTotals()" class="row-pur-qty bg-slate-50 border rounded p-1 w-full text-center font-semibold text-slate-800" value="1" required /></td>
      <td class="py-1 px-2"><input type="number" step="any" onkeyup="recalculatePurchaseGrandTotals()" onchange="recalculatePurchaseGrandTotals()" class="row-pur-rate bg-slate-50 border rounded p-1 w-full text-right font-semibold text-slate-800" value="0" required /></td>
      <td class="py-1 px-1">
        <select onchange="recalculatePurchaseGrandTotals()" class="row-pur-gst bg-slate-50 border rounded p-1 w-full font-bold text-center">
          <option value="5">5%</option>
          <option value="12">12%</option>
          <option value="18" selected>18%</option>
          <option value="28">28%</option>
        </select>
      </td>
      <td class="py-1 px-2 text-right font-bold text-slate-700 row-pur-calc-taxable">₹0.00</td>
      <td class="py-1 px-2 text-center">
        <button type="button" onclick="this.closest('tr').remove(); recalculatePurchaseGrandTotals();" class="text-rose-500 hover:text-rose-700 transition-colors p-1"><i data-lucide="minus-circle" class="w-4 h-4"></i></button>
      </td>
    `;
    tbody.appendChild(tr);

    if (window.lucide) window.lucide.createIcons();
    recalculatePurchaseGrandTotals();
  };

  window.recalculatePurchaseGrandTotals = function() {
    const rows = document.querySelectorAll(".pur-row-line");
    let subtotal = 0;
    let gstAmount = 0;

    rows.forEach(tr => {
      const qty = Number(tr.querySelector(".row-pur-qty").value) || 0;
      const rate = Number(tr.querySelector(".row-pur-rate").value) || 0;
      const gstRate = Number(tr.querySelector(".row-pur-gst").value) || 0;

      const taxable = qty * rate;
      const gst = taxable * (gstRate / 100);

      subtotal += taxable;
      gstAmount += gst;

      tr.querySelector(".row-pur-calc-taxable").innerText = formatINR(taxable);
    });

    const netAmount = subtotal + gstAmount;

    // update UI labels
    document.getElementById("label-pur-subtotal").innerText = formatINR(subtotal);
    document.getElementById("label-pur-gst").innerText = formatINR(gstAmount);
    document.getElementById("label-pur-grand").innerText = formatINR(netAmount);
  };

  window.savePurchaseBillSubmit = function(event) {
    event.preventDefault();

    const vendorName = document.getElementById("pur-vendor-name").value;
    const vendorGst = document.getElementById("pur-vendor-gst").value.toUpperCase();
    const vendorPhone = document.getElementById("pur-vendor-phone").value;
    const vendorAddress = document.getElementById("pur-vendor-address").value;
    const date = document.getElementById("pur-date").value;
    const billNo = document.getElementById("pur-bill-no").value;

    const rows = document.querySelectorAll(".pur-row-line");
    if (rows.length === 0) {
      toast.error("Please add at least one item row purchase supply!");
      return;
    }

    const items = [];
    let subtotal = 0;
    let gstAmount = 0;

    for (let i = 0; i < rows.length; i++) {
      const tr = rows[i];
      const prodId = tr.getAttribute("data-id");
      const name = tr.querySelector(".row-pur-name").value;
      const hsn = tr.querySelector(".row-pur-hsn").value;
      const qty = Number(tr.querySelector(".row-pur-qty").value) || 0;
      const rate = Number(tr.querySelector(".row-pur-rate").value) || 0;
      const gstRate = Number(tr.querySelector(".row-pur-gst").value) || 0;

      if (name === "") {
        toast.error("Supply description cannot be empty.");
        return;
      }

      const taxable = qty * rate;
      const gst = taxable * (gstRate / 100);

      // Locate or automatically create the item in the products stock list
      let finalProdId = prodId;
      const products = DB.getProducts();
      let matchedProd = products.find(p => p.id === prodId && !prodId.startsWith("custom-"));
      if (!matchedProd) {
        matchedProd = products.find(p => p.name.toLowerCase().trim() === name.toLowerCase().trim());
      }

      if (matchedProd) {
        finalProdId = matchedProd.id;
      } else {
        const newProdId = "prod-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
        finalProdId = newProdId;
        const lowerName = name.toLowerCase();
        const unit = (lowerName.includes("oil") || lowerName.includes("petrol") || lowerName.includes("diesel") || lowerName.includes("liter") || lowerName.includes("ltr")) ? "Liters" : "KG";

        const newProd = {
          id: newProdId,
          name: name,
          hsn: hsn || "7408",
          unit: unit,
          quantity: 0, // set initial stock to 0, which stockAdjust will update
          purchasePrice: rate,
          sellingPrice: Math.round(rate * 1.2) // default 20% markup
        };
        products.push(newProd);
        DB.saveProducts(products);
      }

      items.push({
        id: finalProdId,
        name,
        hsnCode: hsn,
        qty,
        rate,
        taxable,
        gstRate,
        cgst: gst / 2,
        sgst: gst / 2,
        total: taxable + gst
      });

      subtotal += taxable;
      gstAmount += gst;

      // EXTREME TRIGGER: Increase physical store inventory stock automatically
      DB.stockAdjust(finalProdId, qty);
    }

    const total = subtotal + gstAmount;

    const purchases = DB.getPurchases();
    purchases.push({
      id: "pur-" + Date.now(),
      billNo,
      date,
      vendorName,
      vendorGst,
      vendorAddress,
      vendorPhone,
      items,
      subtotal,
      gstAmount,
      total,
      paid: true
    });

    DB.save("purchase", purchases);
    closeModal();
    toast.success("Vendor Purchase Bill saved & inventory updated!");
    navigateTo("purchase");
  };

  // 9. FINANCIAL STATEMENTS DIRECT REPORTS COMPILE METHODS
  window.switchReportSubtabs = function(subtab) {
    activeReportSubtab = subtab;
    
    const btns = {
      trialbalance: document.getElementById("report-tab-trialbalance"),
      partyledger: document.getElementById("report-tab-partyledger"),
      stocksummary: document.getElementById("report-tab-stocksummary"),
      gstr1: document.getElementById("report-tab-gstr1"),
      gstr3b: document.getElementById("report-tab-gstr3b")
    };

    Object.keys(btns).forEach(k => {
      const btn = btns[k];
      if (btn) {
        if (k === subtab) {
          btn.className = "px-3 py-2 font-bold text-xs rounded-t-md border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/10";
        } else {
          btn.className = "px-3 py-2 font-semibold text-slate-500 hover:text-slate-800 text-xs rounded-t-md";
        }
      }
    });

    compileBusinessStatementReports();
  };

  window.compileBusinessStatementReports = function() {
    const month = Number(document.getElementById("report-month-select")?.value || 0);
    const year = Number(document.getElementById("report-year-select")?.value || 2026);
    const reportBox = document.getElementById("report-statement-view");
    if (!reportBox) return;

    const sales = DB.getSales().filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    const purchases = DB.getPurchases().filter(p => {
      const d = new Date(p.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    if (activeReportSubtab === 'trialbalance') {
      const tb = DB.getTrialBalance();
      const rowsHtml = tb.items.map(it => {
        return `
          <tr class="border-b hover:bg-slate-50/30 text-xs">
            <td class="p-3 font-semibold text-slate-900">${it.name}</td>
            <td class="p-3 text-slate-500 font-bold">${it.group}</td>
            <td class="p-3 text-right font-mono font-bold text-indigo-600">${it.debit ? formatINR(it.debit) : "-"}</td>
            <td class="p-3 text-right font-mono font-bold text-amber-600">${it.credit ? formatINR(it.credit) : "-"}</td>
          </tr>
        `;
      }).join("");

      reportBox.innerHTML = `
        <div class="space-y-4">
          <div class="bg-indigo-50/50 p-4 rounded border border-indigo-100 flex items-center justify-between">
            <div>
              <h4 class="text-indigo-900 font-bold text-sm uppercase tracking-wider">Corporate Trial Balance Summary</h4>
              <p class="text-slate-500 font-medium text-[11px] mt-0.5">Dual-entry balanced list of all active ledger account totals representing exact corporate financial status.</p>
            </div>
            <span class="text-xs bg-indigo-100 text-indigo-800 px-3 py-1 rounded-md font-bold">As of: ${month + 1}/${year}</span>
          </div>

          <div class="overflow-x-auto border rounded bg-white" id="trial-balance-report-table-div">
            <table class="w-full text-left" id="trial-balance-report-table">
              <thead class="bg-slate-50 font-bold border-b text-slate-700">
                <tr>
                  <th class="p-3 text-xs">Ledger Account Head</th>
                  <th class="p-3 text-xs">Accounting Group</th>
                  <th class="p-3 text-xs text-right">Debit Balance (Dr) / ₹</th>
                  <th class="p-3 text-xs text-right">Credit Balance (Cr) / ₹</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                <tr class="bg-slate-100/80 font-bold border-t border-b border-slate-300">
                  <td class="p-3 text-slate-800 text-xs font-black">TOTAL TALLY BALANCE</td>
                  <td class="p-3 text-slate-500"></td>
                  <td class="p-3 text-right font-mono text-indigo-700 font-black text-sm">${formatINR(tb.totalDebit)}</td>
                  <td class="p-3 text-right font-mono text-amber-700 font-black text-sm">${formatINR(tb.totalCredit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (activeReportSubtab === 'partyledger') {
      const accounts = DB.getAccounts().filter(a => a.type === "party");
      if (accounts.length === 0) {
        reportBox.innerHTML = `<div class="text-center py-10 text-slate-400">Please register custom Parties/Contacts first!</div>`;
        return;
      }

      // Default selection to first party account
      if (!window.selectedPartyLedgerId) {
        window.selectedPartyLedgerId = accounts[0].id;
      }

      const optionsHtml = accounts.map(a => `<option value="${a.id}" ${window.selectedPartyLedgerId === a.id ? 'selected' : ''}>${a.name}</option>`).join("");
      
      const ledger = DB.getLedger(window.selectedPartyLedgerId);
      let ledgerRowsHtml = "";
      let closingBalStr = "₹0.00 Dr";

      if (ledger) {
        const isDebitNormal = (ledger.account.group === "Sundry Debtors");
        closingBalStr = isDebitNormal
          ? `${formatINR(Math.abs(ledger.balance))} ${ledger.balance >= 0 ? "Dr" : "Cr"}`
          : `${formatINR(Math.abs(ledger.balance))} ${ledger.balance >= 0 ? "Cr" : "Dr"}`;

        ledgerRowsHtml = ledger.entries.map(e => {
          const dbVal = e.debit ? formatINR(e.debit) : "-";
          const crVal = e.credit ? formatINR(e.credit) : "-";
          const runStr = isDebitNormal
            ? `${formatINR(Math.abs(e.runningBalance))} ${e.runningBalance >= 0 ? 'Dr' : 'Cr'}`
            : `${formatINR(Math.abs(e.runningBalance))} ${e.runningBalance >= 0 ? 'Cr' : 'Dr'}`;
          
          return `
            <tr class="border-b hover:bg-slate-50/20 text-xs">
              <td class="p-2.5 text-slate-500 font-mono">${e.date ? new Date(e.date).toLocaleDateString('en-IN') : "-"}</td>
              <td class="p-2.5 font-bold text-slate-800">${e.description}</td>
              <td class="p-2.5 text-right font-mono font-bold text-indigo-600">${dbVal}</td>
              <td class="p-2.5 text-right font-mono font-bold text-amber-600">${crVal}</td>
              <td class="p-2.5 text-right font-mono font-semibold text-slate-700">${runStr}</td>
            </tr>
          `;
        }).join("");
      }

      reportBox.innerHTML = `
        <div class="space-y-4">
          <div class="bg-indigo-50/50 p-4 rounded border border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h4 class="text-indigo-900 font-bold text-sm uppercase tracking-wider">Party Ledger Transaction Journals</h4>
              <p class="text-slate-500 font-medium text-[11px] mt-0.5">Filter complete transaction ledger log journals for any specific Customer or Vendor.</p>
            </div>
            
            <div class="flex items-center gap-2">
              <label class="block text-slate-600 font-bold text-xs shrink-0 font-sans">Select Party:</label>
              <select id="party-ledger-select" onchange="window.selectedPartyLedgerId = this.value; compileBusinessStatementReports();" class="bg-white border rounded px-3 py-1.5 font-bold text-xs text-slate-700 w-48 sm:w-64 max-w-full">
                ${optionsHtml}
              </select>
            </div>
          </div>

          <div class="overflow-x-auto border rounded bg-white" id="party-ledger-report-table-div">
            <table class="w-full text-left" id="party-ledger-report-table">
              <thead class="bg-slate-50 font-bold border-b text-[10px] text-slate-600 uppercase">
                <tr>
                  <th class="p-2.5">Date</th>
                  <th class="p-2.5">Particular Ledger Entries</th>
                  <th class="p-2.5 text-right">Debit (Dr) / ₹</th>
                  <th class="p-2.5 text-right">Credit (Cr) / ₹</th>
                  <th class="p-2.5 text-right">Running Balance / ₹</th>
                </tr>
              </thead>
              <tbody>
                ${ledgerRowsHtml || '<tr><td colspan="5" class="p-4 text-center text-slate-400">No postings recorded for selected party.</td></tr>'}
                <tr class="bg-slate-100 font-bold text-slate-800 text-xs">
                  <td colspan="2" class="p-3 text-slate-800 font-black">PARTY CLOSING LEDGER BALANCE</td>
                  <td class="p-3"></td>
                  <td class="p-3"></td>
                  <td class="p-3 text-right font-mono text-emerald-700 text-sm font-black">${closingBalStr}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (activeReportSubtab === 'stocksummary') {
      const products = DB.getProducts();
      let totalStockValuation = 0;

      const rowsHtml = products.map(p => {
        let inwardQty = 0;
        let outwardQty = 0;

        DB.getPurchases().forEach(bill => {
          bill.items.forEach(it => {
            if (it.productId === p.id) {
              inwardQty += Number(it.quantity || 0);
            }
          });
        });

        DB.getSales().forEach(invoice => {
          invoice.items.forEach(it => {
            if (it.productId === p.id) {
              outwardQty += Number(it.quantity || 0);
            }
          });
        });

        const currentQty = Number(p.quantity || 0);
        const openingQty = Math.max(0, currentQty + outwardQty - inwardQty);
        const valuation = currentQty * Number(p.purchasePrice || 0);
        totalStockValuation += valuation;

        return `
          <tr class="border-b hover:bg-slate-50/20 text-xs text-left">
            <td class="p-3 font-semibold text-slate-900">${p.name}</td>
            <td class="p-3 font-mono font-bold text-slate-600 uppercase">${p.hsn || "-"}</td>
            <td class="p-3 text-center font-bold text-slate-500 font-mono">${openingQty}</td>
            <td class="p-3 text-center font-bold text-emerald-600 font-mono">+ ${inwardQty}</td>
            <td class="p-3 text-center font-bold text-rose-500 font-mono">- ${outwardQty}</td>
            <td class="p-3 text-center font-black text-slate-800 font-mono ${currentQty < 10 ? 'bg-amber-50 text-amber-600' : ''}">${currentQty}</td>
            <td class="p-3 text-right font-bold text-slate-700 font-mono">${formatINR(p.purchasePrice)}</td>
            <td class="p-3 text-right font-black text-teal-700 font-mono">${formatINR(valuation)}</td>
          </tr>
        `;
      }).join("");

      reportBox.innerHTML = `
        <div class="space-y-4">
          <div class="bg-indigo-50/50 p-4 rounded border border-indigo-100 flex items-center justify-between">
            <div>
              <h4 class="text-indigo-900 font-bold text-sm uppercase tracking-wider">Dynamic Stock Register Summary</h4>
              <p class="text-slate-500 font-medium text-[11px] mt-0.5">Comprehensive audit track listing item names, HSN codes, inward flows, sales outflows and total ending valuations.</p>
            </div>
            <span class="text-xs bg-indigo-100 text-indigo-800 px-3 py-1 rounded-md font-bold">Total Valuation: ${formatINR(totalStockValuation)}</span>
          </div>

          <div class="overflow-x-auto border rounded bg-white" id="stock-summary-report-table-div">
            <table class="w-full text-left" id="stock-summary-report-table">
              <thead class="bg-slate-50 font-bold border-b text-[10px] text-slate-600 uppercase">
                <tr>
                  <th class="p-3">Material Name</th>
                  <th class="p-3">HSN Code</th>
                  <th class="p-3 text-center">Opening Stock</th>
                  <th class="p-3 text-center">Inward (Purchased)</th>
                  <th class="p-3 text-center">Outward (Sales)</th>
                  <th class="p-3 text-center">Closing Balance</th>
                  <th class="p-3 text-right">Purchase Rate</th>
                  <th class="p-3 text-right">Inventory Valuation / ₹</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="8" class="p-4 text-center text-slate-400">No stock products recorded in register database.</td></tr>'}
                <tr class="bg-slate-100 font-bold border-t border-b border-slate-300">
                  <td colspan="7" class="p-3 text-slate-800 font-black text-xs">TOTAL ENDING INVENTORY MARKET VALUE VALUATION</td>
                  <td class="p-3 text-right font-mono text-teal-700 font-black text-sm">${formatINR(totalStockValuation)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (activeReportSubtab === 'gstr1') {
      // GSTR-1: Sales Summary (B2B vs B2C)
      const b2b = sales.filter(s => s.customerGst && s.customerGst.trim().length > 0);
      const b2c = sales.filter(s => !s.customerGst || s.customerGst.trim().length === 0);

      const b2bTaxable = b2b.reduce((sum, s) => sum + s.subtotal, 0);
      const b2bGST = b2b.reduce((sum, s) => sum + s.gstAmount, 0);
      const b2bTotal = b2b.reduce((sum, s) => sum + s.grandTotal, 0);

      const b2cTaxable = b2c.reduce((sum, s) => sum + s.subtotal, 0);
      const b2cGST = b2c.reduce((sum, s) => sum + s.gstAmount, 0);
      const b2cTotal = b2c.reduce((sum, s) => sum + s.grandTotal, 0);

      reportBox.innerHTML = `
        <div class="space-y-4">
          <div class="bg-indigo-50/50 p-4 rounded border border-indigo-100 flex items-center justify-between">
            <div>
              <h4 class="text-indigo-900 font-bold text-sm uppercase tracking-wider">Outward Supplies GSTR-1 Ledger Statement</h4>
              <p class="text-slate-500 font-medium text-[11px] mt-0.5">Categorized breakdown of commerce sales transactions during selected slot.</p>
            </div>
            <span class="text-xs bg-indigo-100 text-indigo-800 px-3 py-1 rounded-md font-bold">Filing Period: ${month + 1}/${year}</span>
          </div>

          <!-- B2B + B2C Tables -->
          <div class="space-y-3">
            <h5 class="text-xs font-bold text-slate-800 flex items-center gap-1"><i data-lucide="shield-check" class="w-4 h-4 text-emerald-600"></i> Section 4: Registered B2B Outward Corporate Supplies (Recipient has GSTIN)</h5>
            <div class="overflow-x-auto border rounded bg-white">
              <table class="w-full">
                <thead class="bg-slate-50">
                  <tr>
                    <th>Invoice No</th>
                    <th>Recipient GSTIN</th>
                    <th>Customer Name</th>
                    <th class="text-right">Taxable Worth (₹)</th>
                    <th class="text-right">SGST collected (₹)</th>
                    <th class="text-right">CGST collected (₹)</th>
                    <th class="text-right">Total Invoice (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${b2b.map(s => `
                    <tr class="border-b">
                      <td class="font-bold text-slate-900 font-mono">${s.invoiceNo}</td>
                      <td class="font-mono text-slate-700 font-bold uppercase">${s.customerGst}</td>
                      <td class="text-slate-600 font-bold">${s.customerName}</td>
                      <td class="text-right text-slate-550">${formatINR(s.subtotal)}</td>
                      <td class="text-right text-slate-500 font-mono">${formatINR(s.gstAmount / 2)}</td>
                      <td class="text-right text-slate-500 font-mono">${formatINR(s.gstAmount / 2)}</td>
                      <td class="text-right font-black text-indigo-700">${formatINR(s.grandTotal)}</td>
                    </tr>
                  `).join('')}
                  ${b2b.length === 0 ? '<tr><td colspan="7" class="text-center text-slate-400 py-4">No B2B invoices recorded in this block.</td></tr>' : ''}
                  <tr class="bg-indigo-50/20 font-bold text-slate-900">
                    <td colspan="3" class="text-left font-black">B2B Summary Total:</td>
                    <td class="text-right">${formatINR(b2bTaxable)}</td>
                    <td class="text-right font-mono">${formatINR(b2bGST / 2)}</td>
                    <td class="text-right font-mono">${formatINR(b2bGST / 2)}</td>
                    <td class="text-right text-indigo-600 text-xs font-black">${formatINR(b2bTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="space-y-3 pt-3">
            <h5 class="text-xs font-bold text-slate-800 flex items-center gap-1"><i data-lucide="user" class="w-4 h-4 text-indigo-500"></i> Section 5: Unregistered B2C Retail Outlet Supplies (Recipient has NO GSTIN)</h5>
            <div class="overflow-x-auto border rounded bg-white">
              <table class="w-full">
                <thead class="bg-slate-50">
                  <tr>
                    <th>Invoice No</th>
                    <th>Customer Customer Name</th>
                    <th class="text-right">Taxable Worth (₹)</th>
                    <th class="text-right">CGST Collected (₹)</th>
                    <th class="text-right">SGST Collected (₹)</th>
                    <th class="text-right">Total Outward Receipt (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${b2c.map(s => `
                    <tr class="border-b">
                      <td class="font-bold text-slate-900 font-mono">${s.invoiceNo}</td>
                      <td class="text-slate-600 font-bold">${s.customerName}</td>
                      <td class="text-right text-slate-550">${formatINR(s.subtotal)}</td>
                      <td class="text-right text-slate-500 font-mono">${formatINR(s.gstAmount / 2)}</td>
                      <td class="text-right text-slate-500 font-mono">${formatINR(s.gstAmount / 2)}</td>
                      <td class="text-right font-bold text-slate-800">${formatINR(s.grandTotal)}</td>
                    </tr>
                  `).join('')}
                  ${b2c.length === 0 ? '<tr><td colspan="6" class="text-center text-slate-400 py-4">No retail B2C invoices recorded in this block.</td></tr>' : ''}
                  <tr class="bg-slate-50 font-bold text-slate-900 border-t">
                    <td colspan="2" class="text-left font-black">B2C Summary Total:</td>
                    <td class="text-right">${formatINR(b2cTaxable)}</td>
                    <td class="text-right font-mono">${formatINR(b2cGST / 2)}</td>
                    <td class="text-right font-mono">${formatINR(b2cGST / 2)}</td>
                    <td class="text-right text-indigo-600 text-xs font-black">${formatINR(b2cTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } else if (activeReportSubtab === 'gstr3b') {
      // GSTR-3B: Outward & Inward consolidated tax return matches
      const outboundTaxable = sales.reduce((sum, s) => sum + s.subtotal, 0);
      const outboundTaxVal = sales.reduce((sum, s) => sum + s.gstAmount, 0);

      const inboundTaxable = purchases.reduce((sum, p) => sum + p.subtotal, 0);
      const inboundTaxVal = purchases.reduce((sum, p) => sum + p.gstAmount, 0);

      const netTaxCreditAvailed = inboundTaxVal;
      const taxLiabilityDue = outboundTaxVal;
      const netTaxPayable = Math.max(0, taxLiabilityDue - netTaxCreditAvailed);

      reportBox.innerHTML = `
        <div class="space-y-4">
          <div class="bg-indigo-50/50 p-4 rounded border border-indigo-100">
            <h4 class="text-indigo-900 font-bold text-sm uppercase tracking-wider">Consolidated GSTR-3B Tax Return Summary</h4>
            <p class="text-slate-500 font-medium text-[11px] mt-0.5">Calculations of Outward collection liability matched against Inward input tax credits (ITC).</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="bg-slate-50 p-3 rounded border">
              <span class="text-slate-400 block text-[10px] uppercase font-bold">Total Collection Liability (Outward)</span>
              <span class="text-base font-black text-slate-800 block mt-1">${formatINR(taxLiabilityDue)}</span>
            </div>
            <div class="bg-slate-50 p-3 rounded border">
              <span class="text-slate-400 block text-[10px] uppercase font-bold">Input Tax Credit (ITC Availed)</span>
              <span class="text-base font-black text-emerald-600 block mt-1">${formatINR(netTaxCreditAvailed)}</span>
            </div>
            <div class="bg-indigo-50 text-indigo-900 p-3 rounded border border-indigo-100">
              <span class="text-indigo-600 block text-[10px] uppercase font-bold">Net GST Payable Cash Ledger</span>
              <span class="text-base font-black block mt-1">${formatINR(netTaxPayable)}</span>
            </div>
          </div>

          <!-- detailed returns sheets table -->
          <div class="overflow-x-auto border rounded bg-white mt-3">
            <table class="w-full">
              <thead class="bg-slate-50">
                <tr>
                  <th>Nature of Supply Operations</th>
                  <th class="text-right">Total Taxable Value (₹)</th>
                  <th class="text-right">Central Tax CGST Outstanding (₹)</th>
                  <th class="text-right">State Tax SGST Outstanding (₹)</th>
                  <th class="text-right font-black">Consolidated Total Tax Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b">
                  <td class="font-bold text-slate-800">3.1 Outward supplies (Sales invoices logged)</td>
                  <td class="text-right">${formatINR(outboundTaxable)}</td>
                  <td class="text-right text-slate-600 font-mono">${formatINR(outboundTaxVal / 2)}</td>
                  <td class="text-right text-slate-600 font-mono">${formatINR(outboundTaxVal / 2)}</td>
                  <td class="text-right font-black text-indigo-700">${formatINR(outboundTaxVal)}</td>
                </tr>
                <tr class="border-b">
                  <td class="font-bold text-slate-800">4.1 Eligible Inward Input Tax Credit (ITC matching purchase bills)</td>
                  <td class="text-right">${formatINR(inboundTaxable)}</td>
                  <td class="text-right text-slate-600 font-mono">${formatINR(inboundTaxVal / 2)}</td>
                  <td class="text-right text-slate-600 font-mono">${formatINR(inboundTaxVal / 2)}</td>
                  <td class="text-right font-black text-emerald-600">${formatINR(inboundTaxVal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (activeReportSubtab === 'pl') {
      // Profit & Loss margin evaluates
      const grossIncome = sales.reduce((sum, s) => sum + s.subtotal, 0);
      const gstCollected = sales.reduce((sum, s) => sum + s.gstAmount, 0);
      const totalInflow = grossIncome + gstCollected;

      const purchaseExpenses = purchases.reduce((sum, p) => sum + p.subtotal, 0);
      const gstExpenses = purchases.reduce((sum, p) => sum + p.gstAmount, 0);
      const overallOutflow = purchaseExpenses + gstExpenses;

      const netIncomeProfit = grossIncome - purchaseExpenses;
      const profitMarginPct = grossIncome > 0 ? ((netIncomeProfit / grossIncome) * 100).toFixed(1) : "0.0";

      reportBox.innerHTML = `
        <div class="space-y-4 font-semibold text-slate-800 text-xs">
          <div class="bg-indigo-50/50 p-4 rounded border border-indigo-100">
            <h4 class="text-indigo-900 font-bold text-sm uppercase tracking-wider">Trading Income Profit & Loss statement</h4>
            <p class="text-slate-500 font-medium text-[11px] mt-0.5">Calculated evaluate metrics of business volume transactions (excluding cash tax flows).</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div class="bg-indigo-50 border rounded p-3">
              <span class="block text-slate-500 text-[10px] uppercase font-bold">Total Operating Revenue</span>
              <span class="block text-base font-black text-indigo-800 mt-1">${formatINR(grossIncome)}</span>
            </div>
            <div class="bg-rose-50 border rounded p-3">
              <span class="block text-slate-500 text-[10px] uppercase font-bold">Total Operating Expenses</span>
              <span class="block text-base font-black text-rose-600 mt-1">${formatINR(purchaseExpenses)}</span>
            </div>
            <div class="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded p-3">
              <span class="block text-slate-500 text-[10px] uppercase font-bold">Trading Margin Profit (EBIT)</span>
              <span class="block text-base font-black mt-1 ${netIncomeProfit >= 0 ? "text-emerald-700" : "text-rose-600"}">${formatINR(netIncomeProfit)} <span class="text-[10px] font-bold text-slate-400 ml-1">(${profitMarginPct}%)</span></span>
            </div>
          </div>

          <!-- Statement ledger lists card -->
          <div class="border rounded bg-white mt-1 pt-2">
            <div class="px-4 py-2 border-b font-bold text-slate-800 text-xs uppercase tracking-wider bg-slate-50/30">Operating Balance Statement Grid</div>
            <div class="p-4 space-y-3 font-semibold text-slate-700">
              <div class="flex items-center justify-between">
                <span>Total Corporate Sales Revenue (A):</span>
                <span class="font-bold text-slate-900">${formatINR(grossIncome)}</span>
              </div>
              <div class="flex items-center justify-between border-b pb-2 text-slate-400 font-normal">
                <span>* Add: GST Taxes collected on sales:</span>
                <span class="text-slate-500">${formatINR(gstCollected)}</span>
              </div>
              
              <div class="flex items-center justify-between pt-1">
                <span>Total Cost of Inward Purchase Inventory Goods (B):</span>
                <span class="font-bold text-slate-900">${formatINR(purchaseExpenses)}</span>
              </div>
              <div class="flex items-center justify-between border-b pb-2 text-slate-400 font-normal">
                <span>* Add: GST Taxes paid to vendors:</span>
                <span class="text-slate-500">${formatINR(gstExpenses)}</span>
              </div>

              <div class="flex items-center justify-between pt-2 text-sm text-indigo-800 font-black">
                <span>NET ACCOUNTING PROFIT (A - B):</span>
                <span class="${netIncomeProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${formatINR(netIncomeProfit)}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (window.lucide) window.lucide.createIcons();
  };

  window.exportReportsCSV = function() {
    // Dynamically builds CSV from active reports list
    const month = Number(document.getElementById("report-month-select")?.value || 0) + 1;
    const year = Number(document.getElementById("report-year-select")?.value || 2026);
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (activeReportSubtab === 'gstr1') {
      const b2b = DB.getSales().filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === (month - 1) && d.getFullYear() === year && s.customerGst;
      });
      csvContent += "InvoiceNo,RecipientGSTIN,CustomerName,TaxableWorth,GSTAmount,TotalInvoice\n";
      b2b.forEach(s => {
        csvContent += `"${s.invoiceNo}","${s.customerGst}","${s.customerName}",${s.subtotal},${s.gstAmount},${s.grandTotal}\n`;
      });
    } else {
      const sales = DB.getSales().filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === (month - 1) && d.getFullYear() === year;
      });
      const purchases = DB.getPurchases().filter(p => {
        const d = new Date(p.date);
        return d.getMonth() === (month - 1) && d.getFullYear() === year;
      });

      csvContent += "Type,TaxableValue,GSTTaxAmount,TotalValue\n";
      csvContent += `OutwardSales,${sales.reduce((sum,s) => sum+s.subtotal, 0)},${sales.reduce((sum,s) => sum+s.gstAmount,0)},${sales.reduce((sum,s) => sum+s.grandTotal,0)}\n`;
      csvContent += `InwardPurchases,${purchases.reduce((sum,p) => sum+p.subtotal, 0)},${purchases.reduce((sum,p) => sum+p.gstAmount,0)},${purchases.reduce((sum,p) => sum+p.total,0)}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Zenterfy_Report_${month}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV Statement file downloaded successfully!");
  };

  // 10. COMPANY PROFILE & BACKUP RESTORE SETTINGS ENGINE
  window.saveWorkspaceSettingsProfile = function(event) {
    event.preventDefault();

    const companyName = document.getElementById("set-company-name").value;
    const gstin = document.getElementById("set-gstin").value.toUpperCase();
    const address = document.getElementById("set-address").value;
    const invoicePrefix = document.getElementById("set-inv-prefix").value;
    const nextInvoiceNo = Number(document.getElementById("set-inv-next").value) || 101;
    const defaultGstRate = Number(document.getElementById("set-gst-default").value) || 18;

    // Additional industry-standard properties from extended profile inputs
    const phone = document.getElementById("set-phone")?.value || "";
    const email = document.getElementById("set-email")?.value || "";
    const website = document.getElementById("set-website")?.value || "";
    const pan = document.getElementById("set-pan")?.value || "";
    const fssai = document.getElementById("set-fssai")?.value || "";
    const bankHolder = document.getElementById("set-bank-holder")?.value || "";
    const bankName = document.getElementById("set-bank-name")?.value || "";
    const bankAccount = document.getElementById("set-bank-account")?.value || "";
    const bankBranch = document.getElementById("set-bank-branch")?.value || "";
    const bankIfsc = document.getElementById("set-bank-ifsc")?.value || "";
    const bankUpi = document.getElementById("set-bank-upi")?.value || "";
    const terms = document.getElementById("set-terms")?.value || "";

    const oldSets = DB.getSettings();

    const sets = {
      ...oldSets,
      companyName,
      gstin,
      address,
      invoicePrefix,
      nextInvoiceNo,
      defaultGstRate,
      phone,
      email,
      website,
      pan,
      fssai,
      bankHolder,
      bankName,
      bankAccount,
      bankBranch,
      bankIfsc,
      bankUpi,
      terms
    };

    DB.saveSettings(sets);
    toast.success("Settings saved successfully.");
    navigateTo("settings");
  };

  window.downloadBackupDatabaseJSON = function() {
    const backupObj = {
      companies: DB.getCompanies(),
      sales: DB.getSales(),
      purchase: DB.getPurchases(),
      products: DB.getProducts(),
      settings: DB.getSettings()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `Zenterfy_Ledger_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    document.body.removeChild(dlAnchorElem);
    toast.success("Ledger backup JSON download triggered!");
  };

  window.uploadBackupDatabaseJSON = function(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        if (data.companies) DB.saveCompanies(data.companies);
        if (data.sales) DB.saveSales(data.sales);
        if (data.purchase) DB.savePurchases(data.purchase);
        if (data.products) DB.saveProducts(data.products);
        if (data.settings) DB.saveSettings(data.settings);

        // Sync and refresh
        window.dispatchEvent(new Event("db-update"));
        toast.success("Ledger tables restored successfully from JSON backup!");
        navigateTo("dashboard");
      } catch (err) {
        toast.error("Invalid JSON ledger file format selected!");
      }
    };
    reader.readAsText(file);
  };

  window.triggerResetFactoryLedger = function() {
    openAlert(
      "FACTORY RESET ACC WORKSPACE",
      "Erasing ledger data will flush all clients records, purchase bills, sales templates and restore default mock items. Proceed?",
      "Factory Reset All Data",
      () => {
        const userId = window.currentUser ? window.currentUser.id : null;
        if (userId) {
          localStorage.removeItem("companies_" + userId);
          localStorage.removeItem("sales_" + userId);
          localStorage.removeItem("purchase_" + userId);
          localStorage.removeItem("products_" + userId);
          localStorage.removeItem("settings_" + userId);
        } else {
          localStorage.clear();
        }
        // Trigger auto seed recreate or simple refresh on reload
        window.location.reload();
      }
    );
  };

  // 11. PRINTING PREVIEW TEMPLATE INJECTORS
  
  // Universal High-Reliability Iframe-based Printer
  window.printHTMLContent = function(htmlContent) {
    const iframeId = "print-invoice-iframe-container";
    const existing = document.getElementById(iframeId);
    if (existing) {
      existing.remove();
    }
    
    const iframe = document.createElement("iframe");
    iframe.id = iframeId;
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    iframe.style.top = "0px";
    iframe.style.left = "0px";
    iframe.style.visibility = "hidden";
    iframe.style.zIndex = "-9999";
    
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow.document || iframe.contentDocument;
    doc.open();
    // Inject the content into the frame
    doc.write(htmlContent);
    doc.close();
    
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.error("Iframe print triggered exception:", e);
      }
      
      const cleanUp = () => {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1000);
        window.removeEventListener("focus", cleanUp);
      };
      window.addEventListener("focus", cleanUp);
    }, 450);
  };

  // Reusable standalone function requested by the user:
  // Accepts a DOM Element ID, a DOM element reference, or raw innerHTML string
  // It instantly prints this content beautifully on A4 with proper margins
  window.printInvoiceHTML = function(contentOrId, options = {}) {
    let printContent = "";
    if (typeof contentOrId === "string") {
      const element = document.getElementById(contentOrId) || document.querySelector(contentOrId);
      if (element) {
        printContent = element.innerHTML;
      } else {
        printContent = contentOrId;
      }
    } else if (contentOrId && contentOrId.innerHTML) {
      printContent = contentOrId.innerHTML;
    } else {
      console.error("printInvoiceHTML error: Invalid content, element, or selector provided.");
      return;
    }

    const title = options.title || "Invoice Print Receipt";
    const paperSize = options.paperSize || "A4";
    const margin = options.margin || "8mm";
    const keepBackgroundColors = options.keepBackgroundColors !== false;
    const keepImages = options.keepImages !== false;
    const font = options.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

    const cleanHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            *, *::before, *::after {
              box-sizing: border-box;
            }
            body {
              font-family: ${font};
              color: #0d1117;
              background-color: #ffffff;
              margin: 0;
              padding: 0;
              font-size: 10px;
              line-height: 1.4;
              -webkit-print-color-adjust: ${keepBackgroundColors ? 'exact' : 'unset'};
              print-color-adjust: ${keepBackgroundColors ? 'exact' : 'unset'};
            }
            @page {
              size: ${paperSize} portrait;
              margin: ${margin};
            }
            .print-wrapper-box {
              width: 100%;
              max-width: 195mm;
              margin: 0 auto;
              background-color: #ffffff;
              padding: 0;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              page-break-inside: avoid;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            thead {
              display: table-header-group;
            }
            tfoot {
              display: table-footer-group;
            }
            img {
              display: ${keepImages ? 'block' : 'none'} !important;
              max-width: 100%;
              height: auto;
            }
            @media print {
              body {
                background: none !important;
                color: #000000 !important;
              }
              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body onload="window.print()">
          <div class="print-wrapper-box">
            ${printContent}
          </div>
        </body>
      </html>
    `;
    window.printHTMLContent(cleanHtml);
  };

  window.triggerPrintSalesInvoiceReceipt = function(invoiceId) {
    const s = DB.getSales().find(inv => inv.id === invoiceId) || {};
    const sets = DB.getSettings();

    let htmlContentCollected = "";
    const printWindow = {
      document: {
        write: function(str) {
          htmlContentCollected += str;
        },
        close: function() {
          window.printHTMLContent(htmlContentCollected);
        }
      }
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const d = new Date(parts[0], parts[1]-1, parts[2]);
      if (isNaN(d.getTime())) return dateStr;
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      return `${parts[2]} ${months[d.getMonth()]} ${parts[0]}`;
    };

    // Goods description dynamic items list
    let itemLinesHTML = "";
    const itemsList = s.items || [];
    itemsList.forEach((it, idx) => {
      const pId = it.id;
      const cachedProd = DB.getProducts().find(p => p.id === pId);
      const unit = cachedProd && cachedProd.unit ? cachedProd.unit : (it.name.toLowerCase().includes("oil") || it.name.toLowerCase().includes("petrol") || it.name.toLowerCase().includes("diesel") || it.name.toLowerCase().includes("liter") || it.name.toLowerCase().includes("ltr") ? "Liters" : "KG");
      itemLinesHTML += `
        <tr style="border-bottom: 1.5px solid #cbd5e1; height: 22px; background-color: transparent;">
          <td style="text-align: center; font-weight: bold; border-right: 1.5px solid #cbd5e1; color: #1e293b; padding: 2px;">${idx + 1}</td>
          <td style="border-right: 1.5px solid #cbd5e1; padding-left: 6px; font-weight: 600; color: #0f172a; font-size: 9.5px;">${it.name}</td>
          <td style="border-right: 1.5px solid #cbd5e1; text-align: center; color: #475569; font-size: 9px;">${it.hsnCode || '—'}</td>
          <td style="border-right: 1.5px solid #cbd5e1; text-align: center; font-weight: bold; color: #1e293b; font-size: 9px;">${it.qty} ${unit}</td>
          <td style="border-right: 1.5px solid #cbd5e1; text-align: right; padding-right: 6px; font-weight: bold; color: #1e293b; font-size: 9px;">Rs. ${Number(it.rate).toFixed(2)}</td>
          <td style="border-right: 1.5px solid #cbd5e1; text-align: center; color: #475569; font-size: 9px;">${it.gstRate}%</td>
          <td style="text-align: right; padding-right: 6px; font-weight: bold; color: #0f172a; font-size: 9.5px;">Rs. ${Number(it.total).toFixed(2)}</td>
        </tr>
      `;
    });

    // Pad with compact empty rows if needed (min 20 rows total) to maintain layout structure beautifully
    const minRows = 20;
    const emptyRowsCount = Math.max(0, minRows - itemsList.length);
    for (let i = 0; i < emptyRowsCount; i++) {
      const displaySNo = itemsList.length + i + 1;
      itemLinesHTML += `
        <tr style="border-bottom: 1.5px solid #cbd5e1; height: 20px; background-color: transparent;">
          <td style="text-align: center; font-weight: bold; border-right: 1.5px solid #cbd5e1; color: #cbd5e1; padding: 2px;">${displaySNo}</td>
          <td style="border-right: 1.5px solid #cbd5e1;">&nbsp;</td>
          <td style="border-right: 1.5px solid #cbd5e1;">&nbsp;</td>
          <td style="border-right: 1.5px solid #cbd5e1;">&nbsp;</td>
          <td style="border-right: 1.5px solid #cbd5e1;">&nbsp;</td>
          <td style="border-right: 1.5px solid #cbd5e1;">&nbsp;</td>
          <td>&nbsp;</td>
        </tr>
      `;
    }

    const discountRowHTML = `
      <tr style="border-bottom: 1.5px solid #cbd5e1; font-weight: bold; background-color: transparent; height: 20px;">
        <td colspan="6" style="text-align: right; padding-right: 12px; border-right: 1.5px solid #cbd5e1; color: #475569; padding: 2px; font-size: 9px;">Discount</td>
        <td style="text-align: right; padding-right: 6px; font-weight: bold; color: #dc2626; padding: 2px; font-size: 9.5px;">Rs. ${Number(s.discount || 0).toFixed(2)}</td>
      </tr>
    `;

    const totalQty = itemsList.reduce((sum, it) => sum + Number(it.qty), 0);
    const totalRowHTML = `
      <tr style="font-weight: bold; background-color: rgba(241, 245, 249, 0.5); height: 22px; border-bottom: 1.5px solid #cbd5e1;">
        <td colspan="3" style="text-align: left; padding-left: 8px; border-right: 1px solid #cbd5e1; text-transform: uppercase; padding: 2px; font-size: 9px;">TOTAL</td>
        <td style="text-align: center; border-right: 1px solid #cbd5e1; padding: 2px; font-size: 9px;">${totalQty}</td>
        <td style="border-right: 1px solid #cbd5e1;">&nbsp;</td>
        <td style="text-align: center; border-right: 1px solid #cbd5e1;">&nbsp;</td>
        <td style="text-align: right; padding-right: 6px; font-weight: bold; color: #0f172a; padding: 2px; font-size: 9.5px;">Rs. ${Number(s.grandTotal || 0).toFixed(2)}</td>
      </tr>
    `;

    // Outstanding Balances dynamic board (Using exact form-saved ledger data)
    const receivedAmount = Number(s.receivedAmount !== undefined ? s.receivedAmount : (s.paid ? s.grandTotal : 0));
    const balanceAmount = Number((s.grandTotal || 0) - receivedAmount);
    const previousBalance = Number(s.previousBalance || 0);
    const currentBalance = Number(s.currentBalance !== undefined ? s.currentBalance : (previousBalance + balanceAmount));

    const outstandingBalancesHTML = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 9.5px; font-weight: bold; border: 1.5px solid #94a3b8; background-color: transparent;">
        <tr style="text-align: center; background-color: rgba(248, 250, 252, 0.5); height: 18px;">
          <td style="border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding: 3px; width: 25%; color: #475569; text-transform: uppercase; font-size: 8px;">Received Amount</td>
          <td style="border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding: 3px; width: 25%; color: #475569; text-transform: uppercase; font-size: 8px;">Balance Amount</td>
          <td style="border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding: 3px; width: 25%; color: #475569; text-transform: uppercase; font-size: 8px;">Previous Balance</td>
          <td style="border-bottom: 1px solid #cbd5e1; padding: 3px; width: 25%; background-color: rgba(254, 226, 226, 0.5); color: #991b1b; text-transform: uppercase; font-size: 8px;">Current Balance</td>
        </tr>
        <tr style="text-align: center; height: 18px; font-size: 9.5px;">
          <td style="border-right: 1px solid #cbd5e1; color: #047857; padding: 3px;">Rs. ${receivedAmount.toFixed(2)}</td>
          <td style="border-right: 1px solid #cbd5e1; color: #1e293b; padding: 3px;">Rs. ${balanceAmount.toFixed(2)}</td>
          <td style="border-right: 1px solid #cbd5e1; color: #1e293b; padding: 3px;">Rs. ${previousBalance.toFixed(2)}</td>
          <td style="background-color: rgba(254, 242, 242, 0.5); color: #b91c1c; font-weight: 900; padding: 3px;">Rs. ${currentBalance.toFixed(2)}</td>
        </tr>
      </table>
    `;

    // Tax Bifurcation board filled with actual calculations grouped by HSN code
    const hsnGroups = {};
    itemsList.forEach(it => {
      const hsn = it.hsnCode || "7408";
      if (!hsnGroups[hsn]) {
        hsnGroups[hsn] = {
          hsn,
          taxableAmount: 0,
          cgstRate: it.gstRate / 2,
          cgstAmount: 0,
          sgstRate: it.gstRate / 2,
          sgstAmount: 0,
          totalTax: 0
        };
      }
      const taxVal = Number(it.cgst || 0) + Number(it.sgst || 0);
      hsnGroups[hsn].taxableAmount += Number(it.taxable || (it.qty * it.rate));
      hsnGroups[hsn].cgstAmount += Number(it.cgst || (taxVal / 2));
      hsnGroups[hsn].sgstAmount += Number(it.sgst || (taxVal / 2));
      hsnGroups[hsn].totalTax += taxVal;
    });

    let bifurcationRowsHTML = "";
    let bifurcationTotalTaxable = 0;
    let bifurcationTotalCgst = 0;
    let bifurcationTotalSgst = 0;
    let bifurcationTotalTax = 0;

    Object.values(hsnGroups).forEach(group => {
      bifurcationTotalTaxable += group.taxableAmount;
      bifurcationTotalCgst += group.cgstAmount;
      bifurcationTotalSgst += group.sgstAmount;
      bifurcationTotalTax += group.totalTax;

      bifurcationRowsHTML += `
        <tr style="height: 16px;">
          <td style="text-align: center; border-right: 1px solid #cbd5e1; padding: 2px;">${group.hsn}</td>
          <td style="text-align: right; padding-right: 6px; border-right: 1px solid #cbd5e1; padding: 2px;">Rs. ${group.taxableAmount.toFixed(2)}</td>
          <td style="text-align: center; border-right: 1px solid #cbd5e1; padding: 2px;">${group.cgstRate.toFixed(1)}%</td>
          <td style="text-align: right; padding-right: 6px; border-right: 1px solid #cbd5e1; padding: 2px;">Rs. ${group.cgstAmount.toFixed(2)}</td>
          <td style="text-align: center; border-right: 1px solid #cbd5e1; padding: 2px;">${group.sgstRate.toFixed(1)}%</td>
          <td style="text-align: right; padding-right: 6px; border-right: 1px solid #cbd5e1; padding: 2px;">Rs. ${group.sgstAmount.toFixed(2)}</td>
          <td style="text-align: right; padding-right: 6px; font-weight: bold; padding: 2px;">Rs. ${group.totalTax.toFixed(2)}</td>
        </tr>
      `;
    });

    if (bifurcationRowsHTML === "") {
      bifurcationRowsHTML = `
        <tr style="height: 16px;">
          <td style="border-right: 1px solid #cbd5e1; padding: 2px;">&nbsp;</td>
          <td style="border-right: 1px solid #cbd5e1; padding: 2px;">&nbsp;</td>
          <td style="border-right: 1px solid #cbd5e1; padding: 2px;">&nbsp;</td>
          <td style="border-right: 1px solid #cbd5e1; padding: 2px;">&nbsp;</td>
          <td style="border-right: 1px solid #cbd5e1; padding: 2px;">&nbsp;</td>
          <td style="border-right: 1px solid #cbd5e1; padding: 2px;">&nbsp;</td>
          <td style="padding: 2px;">&nbsp;</td>
        </tr>
      `;
    }

    const bifurcationTableHTML = `
      <div style="margin-top: 4px;">
        <table class="table-sub" style="background-color: transparent;">
          <thead>
            <tr>
              <th rowspan="2" style="width: 15%; padding: 2px; font-size: 8px;">HSN</th>
              <th rowspan="2" style="width: 20%; padding: 2px; font-size: 8px;">Taxable Amount</th>
              <th colspan="2" style="width: 22%; padding: 1px; font-size: 8px;">CGST</th>
              <th colspan="2" style="width: 22%; padding: 1px; font-size: 8px;">SGST</th>
              <th rowspan="2" style="width: 21%; padding: 2px; font-size: 8px;">Total Tax</th>
            </tr>
            <tr>
              <th style="font-size: 7.5px; padding: 1px;">Rate</th>
              <th style="font-size: 7.5px; padding: 1px;">Amount</th>
              <th style="font-size: 7.5px; padding: 1px;">Rate</th>
              <th style="font-size: 7.5px; padding: 1px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${bifurcationRowsHTML}
            <tr style="font-weight: bold; background-color: rgba(248, 250, 252, 0.5); height: 16px;">
              <td style="text-align: center; border-right: 1px solid #cbd5e1; padding: 2px;">Total</td>
              <td style="text-align: right; padding-right: 6px; border-right: 1px solid #cbd5e1; padding: 2px;">Rs. ${bifurcationTotalTaxable.toFixed(2)}</td>
              <td style="border-right: 1px solid #cbd5e1; padding: 2px;"></td>
              <td style="text-align: right; padding-right: 6px; border-right: 1px solid #cbd5e1; padding: 2px;">Rs. ${bifurcationTotalCgst.toFixed(2)}</td>
              <td style="border-right: 1px solid #cbd5e1; padding: 2px;"></td>
              <td style="text-align: right; padding-right: 6px; border-right: 1px solid #cbd5e1; padding: 2px;">Rs. ${bifurcationTotalSgst.toFixed(2)}</td>
              <td style="text-align: right; padding-right: 6px; padding: 2px;">Rs. ${bifurcationTotalTax.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    // Dynamic Terms block splitting on newline
    const activeTerms = s.terms !== undefined ? s.terms : sets.terms;
    const termsArr = (activeTerms || "").split('\n').map(t => t.trim()).filter(Boolean);
    let termsListHTML = "";
    if (termsArr.length > 0) {
      termsArr.forEach((t, idx) => {
        termsListHTML += `<div style="border-bottom: 1px dotted #e2e8f0; padding-bottom: 1px; margin-bottom: 2px;">${idx + 1}. ${t}</div>`;
      });
    } else {
      termsListHTML = `
        <div style="border-bottom: 1px dotted #e2e8f0; padding-bottom: 1px; margin-bottom: 2px;">1. Subject to Jodhpur jurisdiction.</div>
        <div style="border-bottom: 1px dotted #e2e8f0; padding-bottom: 1px; margin-bottom: 2px;">2. Interest @ 18% p.a. will be charged after due date.</div>
        <div style="border-bottom: 1px dotted #e2e8f0; padding-bottom: 1px;">3. Goods once sold will not be returned.</div>
      `;
    }

    // Filled Terms & banking and Remark
    const savedBank = s.bankDetails || {};
    const bottomInfoHTML = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 4px; border: 1.5px solid #94a3b8; font-size: 8.5px; background-color: transparent;">
        <tr>
          <td colspan="3" style="padding: 4px; border-bottom: 1px solid #cbd5e1; font-weight: bold; background-color: rgba(248, 250, 252, 0.5);">
            Remark: <span style="font-weight: normal; color: #1e293b; display: inline-block; padding-left: 6px;">Tax Invoice for Sales transaction (${s.invoiceNo})</span>
          </td>
        </tr>
        <tr>
          <!-- Terms & Conditions Column -->
          <td style="width: 38%; padding: 6px; border-right: 1.5px solid #cbd5e1; vertical-align: top; line-height: 1.4;">
            <div style="font-weight: bold; margin-bottom: 3px; text-transform: uppercase; color: #475569; font-size: 8.5px;">Terms & Conditions</div>
            <div style="color: #475569; font-size: 8px;">
              ${termsListHTML}
            </div>
          </td>
          <!-- Bank Details Column -->
          <td style="width: 38%; padding: 6px; border-right: 1.5px solid #cbd5e1; vertical-align: top; line-height: 1.4;">
            <div style="font-weight: bold; margin-bottom: 3px; text-transform: uppercase; color: #475569; font-size: 8.5px;">Bank Details</div>
            <table style="width: 100%; font-size: 8px; border-collapse: collapse;" border="0">
              <tr>
                <td style="padding: 1px 0; color: #64748b; width: 42%;">Acc. Holder:</td>
                <td style="padding: 1px 0; font-weight: 700; color: #0f172a;">${savedBank.holder || sets.bankHolder || 'Bipin Singh'}</td>
              </tr>
              <tr>
                <td style="padding: 1px 0; color: #64748b;">Acc. Number:</td>
                <td style="padding: 1px 0; font-weight: 700; font-family: monospace; color: #0f172a;">${savedBank.account || sets.bankAccount || '38028101723'}</td>
              </tr>
              <tr>
                <td style="padding: 1px 0; color: #64748b;">Bank Name:</td>
                <td style="padding: 1px 0; font-weight: 700; color: #0f172a;">${savedBank.name || sets.bankName || 'State Bank of India'}</td>
              </tr>
              <tr>
                <td style="padding: 1px 0; color: #64748b;">Branch / IFSC:</td>
                <td style="padding: 1px 0; font-weight: 700; font-family: monospace; text-transform: uppercase; color: #0f172a;">${savedBank.branch || sets.bankBranch || 'Surat Main'} - ${savedBank.ifsc || sets.bankIfsc || 'SBIN0002836'}</td>
              </tr>
              <tr>
                <td style="padding: 1px 0; color: #64748b;">UPI ID:</td>
                <td style="padding: 1px 0; font-weight: 700; font-family: monospace; color: #0f172a;">${savedBank.upi || sets.bankUpi || 'bipin@paytm'}</td>
              </tr>
            </table>
          </td>
          <!-- Authorised Signatory Column -->
          <td style="width: 24%; padding: 6px; vertical-align: top; text-align: center; position: relative; line-height: 1.3;">
            <div style="height: 38px;"></div>
            <div style="font-size: 8px; font-weight: bold; color: #475569; margin-bottom: 2px;">Authorised Signatory For</div>
            <div style="font-size: 9px; font-weight: 800; color: #1e293b; text-transform: uppercase;">${sets.companyName || 'Bipin Petroleum Co.'}</div>
          </td>
        </tr>
      </table>
    `;

    // Process Shipping variables
    const sDetails = s.shippingDetails || { same: true };
    const shipName = !sDetails.same ? sDetails.name : (s.customerName || 'Walk-in Customer');
    const shipAddress = !sDetails.same ? sDetails.address : (s.customerAddress || '—');
    const shipPhone = !sDetails.same ? sDetails.phone : (s.customerPhone || '—');
    const shipPin = !sDetails.same ? (sDetails.pin || '—') : '—';
    const shipState = !sDetails.same ? sDetails.state : (s.customerSupply || 'Rajasthan');

    printWindow.document.write(`
      <html>
        <head>
          <title>Sales Tax Invoice - ${sets.companyName || 'Bipin Petroleum Co.'}</title>
          <style>
            *, *::before, *::after {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0f172a;
              background-color: #ffffff;
              margin: 0;
              padding: 0;
              font-size: 9.5px;
              line-height: 1.3;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page {
              size: A4 portrait;
              margin: 4mm;
            }
            .invoice-shell {
              width: 100%;
              max-width: 195mm;
              margin: 0 auto;
              background-color: #ffffff;
              padding: 0;
              position: relative;
              height: 275mm;
              max-height: 275mm;
              box-sizing: border-box;
            }
            .border-grid {
              border: 1.5px solid #94a3b8;
              width: 100%;
            }
            .table-main {
              width: 100%;
              border-collapse: collapse;
              border: 1.5px solid #94a3b8;
              margin-top: 4px;
              background-color: transparent;
            }
            .table-main th {
              background-color: #ef4444; /* Red header as pictured */
              color: #ffffff;
              font-size: 9.5px;
              font-weight: bold;
              padding: 4px;
              text-align: center;
              border: 1.5px solid #94a3b8;
              text-transform: uppercase;
            }
            .table-main td {
              font-size: 9.5px;
              padding: 3px 4px;
            }
            .table-sub {
              width: 100%;
              border-collapse: collapse;
              border: 1.5px solid #94a3b8;
              font-size: 8.5px;
              background-color: transparent;
            }
            .table-sub th {
              background-color: rgba(248, 250, 252, 0.5);
              font-weight: bold;
              text-align: center;
              border: 1px solid #94a3b8;
              padding: 2px;
              text-transform: uppercase;
            }
            .table-sub td {
              border: 1px solid #cbd5e1;
              padding: 2px;
              font-size: 8.5px;
            }
            .title-red {
              color: #dc2626;
              font-size: 18px;
              font-weight: 800;
              line-height: 1.1;
              margin: 0 0 2px 0;
              text-transform: uppercase;
              letter-spacing: -0.5px;
            }
            .col-header {
              background-color: rgba(241, 245, 249, 0.5);
              font-weight: bold;
              padding: 3px 6px;
              border: 1px solid #cbd5e1;
              font-size: 8.5px;
              text-transform: uppercase;
              color: #334155;
            }
          </style>
        </head>
        <body onload="window.print()">
          <div class="invoice-shell">
            
            <!-- Watermark of oil can icon in the background -->
            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 0;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width: 250px; height: 250px; opacity: 0.08; transform: translateY(-20px);">
                <!-- Body of the oil can -->
                <path d="M 32,38 L 32,84 A 6,6 0 0,0 38,90 L 72,90 A 6,6 0 0,0 78,84 L 78,48 A 8,8 0 0,0 70,40 L 52,38 Z" fill="none" stroke="#475569" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
                <!-- Safe Handle cut-out -->
                <path d="M 40,48 L 40,78 A 3,3 0 0,0 43,81 L 49,81 A 3,3 0 0,0 52,78 L 52,48 A 3,3 0 0,0 49,45 L 43,45 A 3,3 0 0,0 40,48 Z" fill="none" stroke="#475569" stroke-width="2" stroke-linejoin="round"/>
                <!-- Nozzle spout -->
                <path d="M 68,39 L 71,25 A 2,2 0 0,1 73,23 L 83,23 A 1,1 0 0,1 84,24 L 84,27 A 2,2 0 0,1 82,29 L 76,34" fill="none" stroke="#475569" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
                <!-- Lid/Cap details -->
                <line x1="73.5" y1="23" x2="83.5" y2="23" stroke="#475569" stroke-width="4.5" stroke-linecap="round"/>
                <!-- Oil Droplet pouring -->
                <path d="M 89,48 C 89,44 84,37 84,37 C 84,37 79,44 79,48 A 5,5 0 0,0 89,48 Z" fill="none" stroke="#475569" stroke-width="1.8" stroke-linejoin="round"/>
              </svg>
            </div>

            <!-- Company Profile Header & Metadata -->
            <div style="display: flex; width: 100%; border: 1.5px solid #94a3b8; border-bottom: none; background-color: transparent;" class="border-grid">
              <!-- Left: Vendor Details -->
              <div style="width: 50%; padding: 6px; border-right: 1.5px solid #94a3b8; line-height: 1.3;">
                <h1 class="title-red">${sets.companyName || 'Bipin Petroleum Co.'}</h1>
                <div style="color: #475569; font-size: 9.5px; font-weight: bold;">
                  ${sets.address || 'Ajmer Road, Jaipur, Rajasthan 201202'}<br/>
                  Phone: ${sets.phone || '+91 9961228197'}<br/>
                  GSTIN: <span style="font-family: monospace; font-size: 10px;">${sets.gstin || '06AALCR2857A1ZD'}</span><br/>
                  PAN Number: <span style="font-family: monospace; font-size: 10px;">${sets.pan || 'AVHPC6971A'}</span>
                </div>
              </div>
              
              <!-- Right: Invoice Metadata (Filled) -->
              <div style="width: 50%; padding: 6px; position: relative;">
                <div style="position: absolute; top: 3px; right: 3px; font-size: 7px; font-weight: 900; color: #94a3b8; letter-spacing: 0.5px;">ORIGINAL FOR RECIPIENT</div>
                <h2 style="font-size: 14px; margin: 0 0 3px 0; font-weight: 800; text-transform: uppercase; color: #0f172a; border-bottom: 2px solid #ef4444; padding-bottom: 1px; display: inline-block;">Tax Invoice</h2>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 1px; font-size: 9.5px; font-weight: bold;">
                  <tr>
                    <td style="padding: 1px 0; color: #475569; width: 35%;">Invoice No:</td>
                    <td style="padding: 1px 0; border-bottom: 1px dotted #cbd5e1; color: #0f172a;">${s.invoiceNo || '—'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 1px 0; color: #475569;">Invoice Date:</td>
                    <td style="padding: 1px 0; border-bottom: 1px dotted #cbd5e1; color: #0f172a;">${formatDate(s.date) || '—'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 1px 0; color: #475569;">Email Id:</td>
                    <td style="padding: 1px 0; border-bottom: 1px dotted #cbd5e1; color: #0f172a;">${sets.email || '—'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 1px 0; color: #475569;">FSSAI No:</td>
                    <td style="padding: 1px 0; border-bottom: 1px dotted #cbd5e1; color: #0f172a;">${sets.fssai || '—'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 1px 0; color: #475569;">Website:</td>
                    <td style="padding: 1px 0; border-bottom: 1px dotted #cbd5e1; color: #0f172a;">${sets.website || '—'}</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- BILL TO & SHIP TO Rows -->
            <div style="display: flex; width: 100%; border-left: 1.5px solid #94a3b8; border-right: 1.5px solid #94a3b8; border-top: 1.5px solid #94a3b8; background-color: transparent;">
              <div style="width: 50%; border-right: 1.5px solid #94a3b8;">
                <div class="col-header">Bill To</div>
                <div style="padding: 4px 8px; line-height: 1.3; font-size: 9px;">
                  <div style="border-bottom: 1px dotted #e2e8f0; padding-bottom: 1px; margin-bottom: 2px; font-weight: bold; color: #1e293b;">Name: <span style="font-weight: 500; color: #475569;">${s.customerName || '—'}</span></div>
                  <div style="border-bottom: 1px dotted #e2e8f0; padding-bottom: 1px; margin-bottom: 2px; font-weight: bold; color: #1e293b;">Address: <span style="font-weight: 500; color: #475569;">${s.customerAddress || '—'}</span></div>
                  
                  <div style="display: flex; gap: 8px; border-bottom: 1px dotted #e2e8f0; padding-bottom: 1px; margin-bottom: 2px;">
                    <div style="width: 50%; font-weight: bold; color: #1e293b;">Contact No: <span style="font-weight: 500; color: #475569;">${s.customerPhone || '—'}</span></div>
                    <div style="width: 50%; font-weight: bold; color: #1e293b;">PAN: <span style="font-weight: 500; color: #475569;">${s.customerPan || '—'}</span></div>
                  </div>
                  
                  <div style="display: flex; gap: 8px; margin-bottom: 1px;">
                    <div style="width: 50%; font-weight: bold; color: #1e293b;">GSTIN: <span style="font-family: monospace; font-weight: 500; color: #475569;">${s.customerGst || '—'}</span></div>
                    <div style="width: 50%; font-weight: bold; color: #1e293b;">Supply Place: <span style="font-weight: 500; color: #475569;">${s.customerSupply || '—'}</span></div>
                  </div>
                  <div style="display: flex; gap: 8px; margin-top: 2px; border-top: 1px dotted #f1f5f9; padding-top: 1px;">
                    <div style="width: 100%; font-weight: bold; color: #1e293b;">Email / FSSAI: <span style="font-weight: 500; color: #475569;">${s.customerEmail || '—'} / ${s.customerFssai || '—'}</span></div>
                  </div>
                </div>
              </div>
              <div style="width: 50%;">
                <div class="col-header">Ship To</div>
                <div style="padding: 4px 8px; line-height: 1.3; font-size: 9px;">
                  <div style="border-bottom: 1px dotted #e2e8f0; padding-bottom: 1px; margin-bottom: 2px; font-weight: bold; color: #1e293b;">Name: <span style="font-weight: 500; color: #475569;">${shipName || '—'}</span></div>
                  <div style="border-bottom: 1px dotted #e2e8f0; padding-bottom: 1px; margin-bottom: 2px; font-weight: bold; color: #1e293b;">Address: <span style="font-weight: 500; color: #475569;">${shipAddress || '—'}</span></div>
                  
                  <div style="display: flex; gap: 8px; border-bottom: 1px dotted #e2e8f0; padding-bottom: 1px; margin-bottom: 2px;">
                    <div style="width: 50%; font-weight: bold; color: #1e293b;">Contact No: <span style="font-weight: 500; color: #475569;">${shipPhone || '—'}</span></div>
                    <div style="width: 50%; font-weight: bold; color: #1e293b;">PIN Code: <span style="font-weight: 500; color: #475569;">${shipPin || '—'}</span></div>
                  </div>
                  <div style="font-weight: bold; color: #1e293b; margin-bottom: 1px;">Delivery State: <span style="font-weight: 500; color: #475569;">${shipState || '—'}</span></div>
                  <div style="display: flex; gap: 8px; margin-top: 2px; border-top: 1px dotted #f1f5f9; padding-top: 1px;">
                    <div style="width: 100%; font-weight: bold; color: #1e293b;">Website Link: <span style="font-weight: 500; color: #475569;">${s.customerWebsite || '—'}</span></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Goods description main table -->
            <table class="table-main">
              <thead>
                <tr>
                  <th style="width: 6%;">S. No.</th>
                  <th style="width: 42%; text-align: left; padding-left: 8px;">Item</th>
                  <th style="width: 10%;">HSN</th>
                  <th style="width: 12%;">Quantity</th>
                  <th style="width: 10%; text-align: right; padding-right: 6px;">Rate</th>
                  <th style="width: 10%;">Tax ( % )</th>
                  <th style="width: 10%; text-align: right; padding-right: 6px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemLinesHTML}
                ${discountRowHTML}
                ${totalRowHTML}
              </tbody>
            </table>

            <!-- Outstanding Balances Board -->
            ${outstandingBalancesHTML}

            <!-- Tax bifurcation board -->
            ${bifurcationTableHTML}

            <!-- Bottom Remark & Banking coordinates & Terms & Auth Sign -->
            ${bottomInfoHTML}

          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  window.triggerPrintPurchaseInvoiceReceipt = function(purchaseId) {
    const p = DB.getPurchases().find(bill => bill.id === purchaseId) || {};
    const sets = DB.getSettings();

    let htmlContentCollected = "";
    const printWindow = {
      document: {
        write: function(str) {
          htmlContentCollected += str;
        },
        close: function() {
          window.printHTMLContent(htmlContentCollected);
        }
      }
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const d = new Date(parts[0], parts[1]-1, parts[2]);
      if (isNaN(d.getTime())) return dateStr;
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      return `${parts[2]} ${months[d.getMonth()]} ${parts[0]}`;
    };

    // Goods description dynamic items list for purchase
    let itemLinesHTML = "";
    const itemsList = p.items || [];
    itemsList.forEach((it, idx) => {
      const pId = it.id;
      const cachedProd = DB.getProducts().find(prod => prod.id === pId);
      const unit = cachedProd && cachedProd.unit ? cachedProd.unit : (it.name.toLowerCase().includes("oil") || it.name.toLowerCase().includes("petrol") || it.name.toLowerCase().includes("diesel") || it.name.toLowerCase().includes("liter") || it.name.toLowerCase().includes("ltr") ? "Liters" : "KG");
      itemLinesHTML += `
        <tr style="border-bottom: 1.5px solid #cbd5e1; height: 22px; background-color: transparent;">
          <td style="text-align: center; font-weight: bold; border-right: 1.5px solid #cbd5e1; color: #1e293b; padding: 2px;">${idx + 1}</td>
          <td style="border-right: 1.5px solid #cbd5e1; padding-left: 6px; font-weight: 600; color: #0f172a; font-size: 9.5px;">${it.name}</td>
          <td style="border-right: 1.5px solid #cbd5e1; text-align: center; color: #475569; font-size: 9px;">${it.hsnCode || '—'}</td>
          <td style="border-right: 1.5px solid #cbd5e1; text-align: center; font-weight: bold; color: #1e293b; font-size: 9px;">${it.qty} ${unit}</td>
          <td style="border-right: 1.5px solid #cbd5e1; text-align: right; padding-right: 6px; font-weight: bold; color: #1e293b; font-size: 9px;">Rs. ${Number(it.rate).toFixed(2)}</td>
          <td style="border-right: 1.5px solid #cbd5e1; text-align: center; color: #475569; font-size: 9px;">${it.gstRate}%</td>
          <td style="text-align: right; padding-right: 6px; font-weight: bold; color: #0f172a; font-size: 9.5px;">Rs. ${Number(it.total).toFixed(2)}</td>
        </tr>
      `;
    });

    // Pad with compact empty rows if needed (min 20 rows total) to maintain layout structure beautifully
    const minRows = 20;
    const emptyRowsCount = Math.max(0, minRows - itemsList.length);
    for (let i = 0; i < emptyRowsCount; i++) {
      const displaySNo = itemsList.length + i + 1;
      itemLinesHTML += `
        <tr style="border-bottom: 1.5px solid #cbd5e1; height: 20px; background-color: transparent;">
          <td style="text-align: center; font-weight: bold; border-right: 1.5px solid #cbd5e1; color: #cbd5e1; padding: 2px;">${displaySNo}</td>
          <td style="border-right: 1.5px solid #cbd5e1;">&nbsp;</td>
          <td style="border-right: 1.5px solid #cbd5e1;">&nbsp;</td>
          <td style="border-right: 1.5px solid #cbd5e1;">&nbsp;</td>
          <td style="border-right: 1.5px solid #cbd5e1;">&nbsp;</td>
          <td style="border-right: 1.5px solid #cbd5e1;">&nbsp;</td>
          <td>&nbsp;</td>
        </tr>
      `;
    }

    const totalQty = itemsList.reduce((sum, it) => sum + Number(it.qty), 0);
    const totalRowHTML = `
      <tr style="font-weight: bold; background-color: rgba(241, 245, 249, 0.5); height: 22px; border-bottom: 1.5px solid #cbd5e1;">
        <td colspan="3" style="text-align: left; padding-left: 8px; border-right: 1px solid #cbd5e1; text-transform: uppercase; padding: 2px; font-size: 9px;">TOTAL</td>
        <td style="text-align: center; border-right: 1px solid #cbd5e1; padding: 2px; font-size: 9px;">${totalQty}</td>
        <td style="border-right: 1px solid #cbd5e1;">&nbsp;</td>
        <td style="text-align: center; border-right: 1px solid #cbd5e1;">&nbsp;</td>
        <td style="text-align: right; padding-right: 6px; font-weight: bold; color: #0f172a; padding: 2px; font-size: 9.5px;">Rs. ${Number(p.total || 0).toFixed(2)}</td>
      </tr>
    `;

    // Outstanding Balances dynamic board (Vendor ledger accounts balance tracks)
    const suppliers = DB.getCompanies() || [];
    const vendor = suppliers.find(v => v.name === p.vendorName || v.id === p.vendorId);
    
    // Inwards can retrieve from explicit saved properties or calculate gracefully
    const previousBalance = Number(p.previousBalance !== undefined ? p.previousBalance : (vendor ? Number(vendor.openingBalance) || 0 : 0));
    const receivedAmount = Number(p.receivedAmount !== undefined ? p.receivedAmount : (p.paid ? Number(p.total) : 0));
    const balanceAmount = Number((p.total || 0) - receivedAmount);
    const currentBalance = Number(p.currentBalance !== undefined ? p.currentBalance : (previousBalance + balanceAmount));

    const outstandingBalancesHTML = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 9.5px; font-weight: bold; border: 1.5px solid #94a3b8; background-color: transparent;">
        <tr style="text-align: center; background-color: rgba(248, 250, 252, 0.5); height: 18px;">
          <td style="border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding: 3px; width: 25%; color: #475569; text-transform: uppercase; font-size: 8px;">Paid Amount</td>
          <td style="border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding: 3px; width: 25%; color: #475569; text-transform: uppercase; font-size: 8px;">Outstanding Balance</td>
          <td style="border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding: 3px; width: 25%; color: #475569; text-transform: uppercase; font-size: 8px;">Supplier Prev Balance</td>
          <td style="border-bottom: 1px solid #cbd5e1; padding: 3px; width: 25%; background-color: rgba(254, 226, 226, 0.5); color: #991b1b; text-transform: uppercase; font-size: 8px;">Net Inward Account</td>
        </tr>
        <tr style="text-align: center; height: 18px; font-size: 9.5px;">
          <td style="border-right: 1px solid #cbd5e1; color: #047857; padding: 3px;">Rs. ${receivedAmount.toFixed(2)}</td>
          <td style="border-right: 1px solid #cbd5e1; color: #1e293b; padding: 3px;">Rs. ${balanceAmount.toFixed(2)}</td>
          <td style="border-right: 1px solid #cbd5e1; color: #1e293b; padding: 3px;">Rs. ${previousBalance.toFixed(2)}</td>
          <td style="background-color: rgba(254, 242, 242, 0.5); color: #b91c1c; font-weight: 900; padding: 3px;">Rs. ${currentBalance.toFixed(2)}</td>
        </tr>
      </table>
    `;

    // Tax bifurcation board for purchase
    const hsnGroups = {};
    itemsList.forEach(it => {
      const hsn = it.hsnCode || "7408";
      if (!hsnGroups[hsn]) {
        hsnGroups[hsn] = {
          hsn,
          taxableAmount: 0,
          cgstRate: it.gstRate / 2,
          cgstAmount: 0,
          sgstRate: it.gstRate / 2,
          sgstAmount: 0,
          totalTax: 0
        };
      }
      const taxVal = Number(it.cgst || 0) + Number(it.sgst || 0);
      hsnGroups[hsn].taxableAmount += Number(it.taxable || (it.qty * it.rate));
      hsnGroups[hsn].cgstAmount += Number(it.cgst || (taxVal / 2));
      hsnGroups[hsn].sgstAmount += Number(it.sgst || (taxVal / 2));
      hsnGroups[hsn].totalTax += taxVal;
    });

    let bifurcationRowsHTML = "";
    let bifurcationTotalTaxable = 0;
    let bifurcationTotalCgst = 0;
    let bifurcationTotalSgst = 0;
    let bifurcationTotalTax = 0;

    Object.values(hsnGroups).forEach(group => {
      bifurcationTotalTaxable += group.taxableAmount;
      bifurcationTotalCgst += group.cgstAmount;
      bifurcationTotalSgst += group.sgstAmount;
      bifurcationTotalTax += group.totalTax;

      bifurcationRowsHTML += `
        <tr style="height: 16px;">
          <td style="text-align: center; border-right: 1px solid #cbd5e1; padding: 2px;">${group.hsn}</td>
          <td style="text-align: right; padding-right: 6px; border-right: 1px solid #cbd5e1; padding: 2px;">Rs. ${group.taxableAmount.toFixed(2)}</td>
          <td style="text-align: center; border-right: 1px solid #cbd5e1; padding: 2px;">${group.cgstRate.toFixed(1)}%</td>
          <td style="text-align: right; padding-right: 6px; border-right: 1px solid #cbd5e1; padding: 2px;">Rs. ${group.cgstAmount.toFixed(2)}</td>
          <td style="text-align: center; border-right: 1px solid #cbd5e1; padding: 2px;">${group.sgstRate.toFixed(1)}%</td>
          <td style="text-align: right; padding-right: 6px; border-right: 1px solid #cbd5e1; padding: 2px;">Rs. ${group.sgstAmount.toFixed(2)}</td>
          <td style="text-align: right; padding-right: 6px; font-weight: bold; padding: 2px;">Rs. ${group.totalTax.toFixed(2)}</td>
        </tr>
      `;
    });

    if (bifurcationRowsHTML === "") {
      bifurcationRowsHTML = `
        <tr style="height: 16px;">
          <td style="border-right: 1px solid #cbd5e1; padding: 2px;">&nbsp;</td>
          <td style="border-right: 1px solid #cbd5e1; padding: 2px;">&nbsp;</td>
          <td style="border-right: 1px solid #cbd5e1; padding: 2px;">&nbsp;</td>
          <td style="border-right: 1px solid #cbd5e1; padding: 2px;">&nbsp;</td>
          <td style="border-right: 1px solid #cbd5e1; padding: 2px;">&nbsp;</td>
          <td style="border-right: 1px solid #cbd5e1; padding: 2px;">&nbsp;</td>
          <td style="padding: 2px;">&nbsp;</td>
        </tr>
      `;
    }

    const bifurcationTableHTML = `
      <div style="margin-top: 4px;">
        <table class="table-sub" style="background-color: transparent;">
          <thead>
            <tr>
              <th rowspan="2" style="width: 15%; padding: 2px; font-size: 8px;">HSN</th>
              <th rowspan="2" style="width: 20%; padding: 2px; font-size: 8px;">Taxable Amount</th>
              <th colspan="2" style="width: 22%; padding: 1px; font-size: 8px;">CGST</th>
              <th colspan="2" style="width: 22%; padding: 1px; font-size: 8px;">SGST</th>
              <th rowspan="2" style="width: 21%; padding: 2px; font-size: 8px;">Total Tax</th>
            </tr>
            <tr>
              <th style="font-size: 7.5px; padding: 1px;">Rate</th>
              <th style="font-size: 7.5px; padding: 1px;">Amount</th>
              <th style="font-size: 7.5px; padding: 1px;">Rate</th>
              <th style="font-size: 7.5px; padding: 1px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${bifurcationRowsHTML}
            <tr style="font-weight: bold; background-color: rgba(248, 250, 252, 0.5); height: 16px;">
              <td style="text-align: center; border-right: 1px solid #cbd5e1; padding: 2px;">Total</td>
              <td style="text-align: right; padding-right: 6px; border-right: 1px solid #cbd5e1; padding: 2px;">Rs. ${bifurcationTotalTaxable.toFixed(2)}</td>
              <td style="border-right: 1px solid #cbd5e1; padding: 2px;"></td>
              <td style="text-align: right; padding-right: 6px; border-right: 1px solid #cbd5e1; padding: 2px;">Rs. ${bifurcationTotalCgst.toFixed(2)}</td>
              <td style="border-right: 1px solid #cbd5e1; padding: 2px;"></td>
              <td style="text-align: right; padding-right: 6px; border-right: 1px solid #cbd5e1; padding: 2px;">Rs. ${bifurcationTotalSgst.toFixed(2)}</td>
              <td style="text-align: right; padding-right: 6px; padding: 2px;">Rs. ${bifurcationTotalTax.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    // Purchase Terms
    const bottomInfoHTML = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 4px; border: 1.5px solid #94a3b8; font-size: 8.5px; background-color: transparent;">
        <tr>
          <td colspan="3" style="padding: 4px; border-bottom: 1px solid #cbd5e1; font-weight: bold; background-color: rgba(248, 250, 252, 0.5);">
            Remark: <span style="font-weight: normal; color: #1e293b; display: inline-block; padding-left: 6px;">Purchase inward and stock verification record (${p.billNo})</span>
          </td>
        </tr>
        <tr>
          <!-- Terms & Conditions Column -->
          <td style="width: 38%; padding: 6px; border-right: 1.5px solid #cbd5e1; vertical-align: top; line-height: 1.4;">
            <div style="font-weight: bold; margin-bottom: 3px; text-transform: uppercase; color: #475569; font-size: 8.5px;">Terms of Purchase</div>
            <div style="color: #475569; font-size: 8px;">
              <div style="border-bottom: 1px dotted #e2e8f0; padding-bottom: 1px; margin-bottom: 2px;">1. Subject strictly to inventory inspection.</div>
              <div style="border-bottom: 1px dotted #e2e8f0; padding-bottom: 1px; margin-bottom: 2px;">2. Discrepancies to be notified within 24 hours.</div>
              <div style="border-bottom: 1px dotted #e2e8f0; padding-bottom: 1px;">3. Stock automatic credit adjustment on entry.</div>
            </div>
          </td>
          <!-- Bank Details Column -->
          <td style="width: 38%; padding: 6px; border-right: 1.5px solid #cbd5e1; vertical-align: top; line-height: 1.4;">
            <div style="font-weight: bold; margin-bottom: 3px; text-transform: uppercase; color: #475569; font-size: 8.5px;">Our Company Bank Details</div>
            <table style="width: 100%; font-size: 8px; border-collapse: collapse;" border="0">
              <tr>
                <td style="padding: 1px 0; color: #64748b; width: 42%;">Acc. Holder:</td>
                <td style="padding: 1px 0; font-weight: 700; color: #0f172a;">${sets.bankHolder || 'Bipin Singh'}</td>
              </tr>
              <tr>
                <td style="padding: 1px 0; color: #64748b;">Acc. Number:</td>
                <td style="padding: 1px 0; font-weight: 700; font-family: monospace; color: #0f172a;">${sets.bankAccount || '38028101723'}</td>
              </tr>
              <tr>
                <td style="padding: 1px 0; color: #64748b;">Bank Name:</td>
                <td style="padding: 1px 0; font-weight: 700; color: #0f172a;">${sets.bankName || 'State Bank of India'}</td>
              </tr>
              <tr>
                <td style="padding: 1px 0; color: #64748b;">Branch / IFSC:</td>
                <td style="padding: 1px 0; font-weight: 700; font-family: monospace; text-transform: uppercase; color: #0f172a;">${sets.bankBranch || 'Surat Main'} - ${sets.bankIfsc || 'SBIN0002836'}</td>
              </tr>
            </table>
          </td>
          <!-- Authorised Signatory Column -->
          <td style="width: 24%; padding: 6px; vertical-align: top; text-align: center; position: relative; line-height: 1.3;">
            <div style="height: 38px;"></div>
            <div style="font-size: 8px; font-weight: bold; color: #475569; margin-bottom: 2px;">Authorised Stamp / Sign</div>
            <div style="font-size: 9px; font-weight: 800; color: #1e293b; text-transform: uppercase;">${sets.companyName || 'Bipin Petroleum Co.'}</div>
          </td>
        </tr>
      </table>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Purchase Inward Bill - ${sets.companyName || 'Bipin Petroleum Co.'}</title>
          <style>
            *, *::before, *::after {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0f172a;
              background-color: #ffffff;
              margin: 0;
              padding: 0;
              font-size: 9.5px;
              line-height: 1.3;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page {
              size: A4 portrait;
              margin: 4mm;
            }
            .invoice-shell {
              width: 100%;
              max-width: 195mm;
              margin: 0 auto;
              background-color: #ffffff;
              padding: 0;
              position: relative;
              height: 275mm;
              max-height: 275mm;
              box-sizing: border-box;
            }
            .border-grid {
              border: 1.5px solid #94a3b8;
              width: 100%;
            }
            .table-main {
              width: 100%;
              border-collapse: collapse;
              border: 1.5px solid #94a3b8;
              margin-top: 4px;
              background-color: transparent;
            }
            .table-main th {
              background-color: #10b981; /* Emerald-green header for purchase */
              color: #ffffff;
              font-size: 9.5px;
              font-weight: bold;
              padding: 4px;
              text-align: center;
              border: 1.5px solid #94a3b8;
              text-transform: uppercase;
            }
            .table-main td {
              font-size: 9.5px;
              padding: 3px 4px;
            }
            .table-sub {
              width: 100%;
              border-collapse: collapse;
              border: 1.5px solid #94a3b8;
              font-size: 8.5px;
              background-color: transparent;
            }
            .table-sub th {
              background-color: rgba(248, 250, 252, 0.5);
              font-weight: bold;
              text-align: center;
              border: 1px solid #94a3b8;
              padding: 2px;
              text-transform: uppercase;
            }
            .table-sub td {
              border: 1px solid #cbd5e1;
              padding: 2px;
              font-size: 8.5px;
            }
            .title-green {
              color: #059669;
              font-size: 18px;
              font-weight: 800;
              line-height: 1.1;
              margin: 0 0 2px 0;
              text-transform: uppercase;
              letter-spacing: -0.5px;
            }
            .col-header {
              background-color: rgba(241, 245, 249, 0.5);
              font-weight: bold;
              padding: 3px 6px;
              border: 1px solid #cbd5e1;
              font-size: 8.5px;
              text-transform: uppercase;
              color: #334155;
            }
          </style>
        </head>
        <body onload="window.print()">
          <div class="invoice-shell">
            
            <!-- Watermark of oil can icon in the background -->
            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 0;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width: 250px; height: 250px; opacity: 0.08; transform: translateY(-20px);">
                <!-- Body of the oil can -->
                <path d="M 32,38 L 32,84 A 6,6 0 0,0 38,90 L 72,90 A 6,6 0 0,0 78,84 L 78,48 A 8,8 0 0,0 70,40 L 52,38 Z" fill="none" stroke="#475569" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
                <!-- Safe Handle cut-out -->
                <path d="M 40,48 L 40,78 A 3,3 0 0,0 43,81 L 49,81 A 3,3 0 0,0 52,78 L 52,48 A 3,3 0 0,0 49,45 L 43,45 A 3,3 0 0,0 40,48 Z" fill="none" stroke="#475569" stroke-width="2" stroke-linejoin="round"/>
                <!-- Nozzle spout -->
                <path d="M 68,39 L 71,25 A 2,2 0 0,1 73,23 L 83,23 A 1,1 0 0,1 84,24 L 84,27 A 2,2 0 0,1 82,29 L 76,34" fill="none" stroke="#475569" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
                <!-- Lid/Cap details -->
                <line x1="73.5" y1="23" x2="83.5" y2="23" stroke="#475569" stroke-width="4.5" stroke-linecap="round"/>
                <!-- Oil Droplet pouring -->
                <path d="M 89,48 C 89,44 84,37 84,37 C 84,37 79,44 79,48 A 5,5 0 0,0 89,48 Z" fill="none" stroke="#475569" stroke-width="1.8" stroke-linejoin="round"/>
              </svg>
            </div>

            <!-- Supplier Profile Header & Metadata -->
            <div style="display: flex; width: 100%; border: 1.5px solid #94a3b8; border-bottom: none; background-color: transparent;" class="border-grid">
              <!-- Left: Supplier/Vendor Details -->
              <div style="width: 50%; padding: 6px; border-right: 1.5px solid #94a3b8; line-height: 1.3;">
                <h1 class="title-green">${p.vendorName || 'Supplier / Vendor'}</h1>
                <div style="color: #475569; font-size: 9.5px; font-weight: bold;">
                  ${p.vendorAddress || 'Address N/A'}<br/>
                  Phone: ${p.vendorPhone || '—'}<br/>
                  GSTIN: <span style="font-family: monospace; font-size: 10px;">${p.vendorGst || '—'}</span>
                </div>
              </div>
              
              <!-- Right: Invoice Metadata (Filled) -->
              <div style="width: 50%; padding: 6px; position: relative;">
                <div style="position: absolute; top: 3px; right: 3px; font-size: 7px; font-weight: 900; color: #10b981; letter-spacing: 0.5px;">COPY FOR PURCHASE FILE</div>
                <h2 style="font-size: 14px; margin: 0 0 3px 0; font-weight: 800; text-transform: uppercase; color: #0f172a; border-bottom: 2px solid #10b981; padding-bottom: 1px; display: inline-block;">Purchase Inward</h2>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 1px; font-size: 9.5px; font-weight: bold;">
                  <tr>
                    <td style="padding: 1px 0; color: #475569; width: 35%;">Bill No:</td>
                    <td style="padding: 1px 0; border-bottom: 1px dotted #cbd5e1; color: #0f172a;">${p.billNo || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 1px 0; color: #475569;">Inward Date:</td>
                    <td style="padding: 1px 0; border-bottom: 1px dotted #cbd5e1; color: #0f172a;">${formatDate(p.date) || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 1px 0; color: #475569;">Received By:</td>
                    <td style="padding: 1px 0; border-bottom: 1px dotted #cbd5e1; color: #0f172a;">${sets.email || 'Bipin Petroleum Co.'}</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- BILL TO & SHIP TO Rows -->
            <div style="display: flex; width: 100%; border-left: 1.5px solid #94a3b8; border-right: 1.5px solid #94a3b8; border-top: 1.5px solid #94a3b8; background-color: transparent;">
              <div style="width: 50%; border-right: 1.5px solid #94a3b8;">
                <div class="col-header">Bill To (Our Details)</div>
                <div style="padding: 4px 8px; line-height: 1.3; font-size: 9px; color: #475569;">
                  <strong style="font-size: 10px; color: #0f172a; display: block; margin-bottom: 1px;">${sets.companyName || 'Bipin Petroleum Co.'}</strong>
                  ${sets.address || 'Ajmer Road, Jaipur, Rajasthan 201202'}<br/>
                  Phone: ${sets.phone || '+91 9961228197'}<br/>
                  GSTIN: <span style="font-family: monospace;">${sets.gstin || '06AALCR2857A1ZD'}</span>
                </div>
              </div>
              <div style="width: 50%;">
                <div class="col-header">Ship To (Inward Delivery Site)</div>
                <div style="padding: 4px 8px; line-height: 1.3; font-size: 9px; color: #475569;">
                  <strong style="font-size: 10px; color: #0f172a; display: block; margin-bottom: 1px;">${sets.companyName || 'Bipin Petroleum Co.'}</strong>
                  ${sets.address || 'Ajmer Road, Jaipur, Rajasthan 201202'}<br/>
                  Phone: ${sets.phone || '+91 9961228197'}<br/>
                  GSTIN: <span style="font-family: monospace;">${sets.gstin || '06AALCR2857A1ZD'}</span>
                </div>
              </div>
            </div>

            <!-- Goods description main table -->
            <table class="table-main">
              <thead>
                <tr>
                  <th style="width: 8%;">S. No.</th>
                  <th style="width: 40%; text-align: left; padding-left: 8px;">Item</th>
                  <th style="width: 10%;">HSN</th>
                  <th style="width: 12%;">Quantity</th>
                  <th style="width: 10%; text-align: right; padding-right: 6px;">Rate</th>
                  <th style="width: 10%;">Tax ( % )</th>
                  <th style="width: 10%; text-align: right; padding-right: 6px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemLinesHTML}
                ${totalRowHTML}
              </tbody>
            </table>

            <!-- Outstanding Balances Board -->
            ${outstandingBalancesHTML}

            <!-- Tax bifurcation board -->
            ${bifurcationTableHTML}

            <!-- Bottom Remark & Banking coordinates & Terms & Auth Sign -->
            ${bottomInfoHTML}

          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

})();

