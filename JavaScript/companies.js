// JavaScript for Companies & Contacts Module
(function() {
  let activeCompanyTab = "customer"; // customer or vendor

  document.addEventListener("DOMContentLoaded", () => {
    // Render the view
    const container = document.getElementById("view-container");
    if (container && window.Views) {
      container.innerHTML = Views.companies();
    }

    // Highlight sidebar active item
    const sidebarItem = document.querySelector('[data-route="companies"]');
    if (sidebarItem) {
      sidebarItem.classList.add("bg-slate-800", "text-white", "border-l-4", "border-blue-600");
      sidebarItem.classList.remove("text-slate-400");
    }

    // Base initializations
    if (window.updateNavigationBadges) window.updateNavigationBadges();
    filterCompaniesList();
  });

  // tab switching and lists filtering
  window.switchCompanyTabs = function(tabType) {
    activeCompanyTab = tabType;
    const custBtn = document.getElementById("tab-btn-customer");
    const vendBtn = document.getElementById("tab-btn-vendor");
    
    if (custBtn && vendBtn) {
      if (tabType === 'customer') {
        custBtn.className = "px-3 py-1.5 text-xs font-bold rounded-md bg-white text-indigo-600 shadow-xs";
        vendBtn.className = "px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800";
      } else {
        vendBtn.className = "px-3 py-1.5 text-xs font-bold rounded-md bg-white text-indigo-600 shadow-xs";
        custBtn.className = "px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800";
      }
    }

    filterCompaniesList();
  };

  window.filterCompaniesList = function() {
    const companies = DB.getCompanies();
    const query = (document.getElementById("company-search-query")?.value || "").toLowerCase();
    const tbody = document.getElementById("company-tbody");
    if (!tbody) return;

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
})();
