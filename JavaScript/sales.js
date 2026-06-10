// JavaScript for Sales / Invoices Module
(function() {
  document.addEventListener("DOMContentLoaded", () => {
    // Render the view
    const container = document.getElementById("view-container");
    if (container && window.Views) {
      container.innerHTML = Views.sales();
    }

    // Highlight sidebar active item
    const sidebarItem = document.querySelector('[data-route="sales"]');
    if (sidebarItem) {
      sidebarItem.classList.add("bg-slate-800", "text-white", "border-l-4", "border-blue-600");
      sidebarItem.classList.remove("text-slate-400");
    }

    // Base initializations
    if (window.updateNavigationBadges) window.updateNavigationBadges();
    filterSalesInvoicesList();
  });

  // SALES INVOICING CORE
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
      <form id="billing-invoice-form" onsubmit="saveSalesInvoiceSubmit(event)" class="space-y-4">
        
        <!-- Header details row -->
        <h3 class="font-bold text-slate-800 border-b pb-1 flex items-center gap-1.5"><i data-lucide="info" class="w-4 h-4 text-indigo-500"></i> Corporate GST Invoice Details</h3>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
          <div>
            <label class="block text-slate-500 font-bold mb-1">Customer Profile Link</label>
            <select id="invoice-cust-select" onchange="syncSelectedCustomerInvoicing(this.value)" class="bg-white border rounded p-1.5 w-full font-bold text-slate-700">
              <option value="">-- Choose Customer --</option>
              ${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-slate-500 font-bold mb-1">Recipient Name *</label>
            <input type="text" id="invoice-cust-name" class="bg-white border rounded p-1.5 w-full font-bold" required />
          </div>
          <div>
            <label class="block text-slate-500 font-bold mb-1">Invoice Date *</label>
            <input type="date" id="invoice-date" value="${new Date().toISOString().slice(0, 10)}" class="bg-white border rounded p-1.5 w-full font-bold font-mono" required />
          </div>
          <div>
            <label class="block text-slate-500 font-bold mb-1">Invoice Number *</label>
            <input type="text" id="invoice-no" value="${proposedInvNo}" class="bg-white border rounded p-1.5 w-full font-bold font-mono text-center" required />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
          <div>
            <label class="block text-slate-500 font-bold mb-1">GSTIN Number (Optional)</label>
            <input type="text" id="invoice-cust-gst" class="bg-white border rounded p-1.5 w-full font-bold font-mono uppercase" placeholder="e.g. 24ABCDF1234F1Z4" maxlength="15" />
          </div>
          <div>
            <label class="block text-slate-500 font-bold mb-1">Recipient Contact Phone</label>
            <input type="text" id="invoice-cust-phone" class="bg-white border rounded p-1.5 w-full font-bold" />
          </div>
          <div>
            <label class="block text-slate-500 font-bold mb-1">Billing Recipient Address</label>
            <input type="text" id="invoice-cust-address" class="bg-white border rounded p-1.5 w-full font-semibold" placeholder="Complete destination address details" />
          </div>
        </div>

        <!-- Particular rolls selection and table grid -->
        <div class="flex items-center justify-between border-b pb-1 pt-2">
          <h3 class="font-bold text-slate-800 flex items-center gap-1.5"><i data-lucide="layers" class="w-4 h-4 text-indigo-500"></i> Invoice Item Particulars</h3>
          <div class="flex items-center gap-1.5">
            <select id="invoice-additem-picker" onchange="triggerAddProductInvoiceLine(this.value)" class="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 p-1 rounded font-bold text-xs cursor-pointer">
              <option value="">-- Click to Add SKU --</option>
              ${products.map(p => `<option value="${p.id}">${p.name} (Qty: ${p.quantity})</option>`).join('')}
            </select>
            <button type="button" onclick="addNewEmptyInvoiceLine()" class="bg-slate-100 hover:bg-slate-250 border border-slate-300 p-1.5 rounded text-xs font-bold text-slate-700 flex items-center gap-1"><i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> Custom Particular Row</button>
          </div>
        </div>

        <div class="border rounded-md overflow-hidden bg-white max-h-48 overflow-y-auto">
          <table class="w-full">
            <thead class="bg-slate-50 border-b">
              <tr>
                <th class="py-1 px-2 text-left">Product Name Details Particulars</th>
                <th class="py-1 px-2 text-center w-24">HSN/SAC</th>
                <th class="py-1 px-2 text-center w-20">Qty</th>
                <th class="py-1 px-2 text-right w-24">Unit Rate</th>
                <th class="py-1 px-1 text-center w-24">GST Tax %</th>
                <th class="py-1 px-2 text-right w-28">Taxable Amount</th>
                <th class="py-1 px-2 text-center w-12">Purge</th>
              </tr>
            </thead>
            <tbody id="invoice-items-form-tbody">
              <!-- Dynamically appended row lines -->
            </tbody>
          </table>
        </div>

        <!-- Footer computations panels -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-3">
          <div class="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col justify-between">
            <div>
              <span class="block text-[11px] text-slate-400 font-bold uppercase tracking-wider">Number to Words Amount:</span>
              <span id="invoice-form-words-label" class="block font-black text-xs text-indigo-800 leading-normal mt-1">Rupees Zero Only</span>
            </div>
            <div>
              <label class="block text-slate-500 font-bold mb-1">Optional Invoice Discount Adjustment (₹)</label>
              <input type="number" id="invoice-form-discount" onkeyup="recalculateInvoiceGrandTotals()" value="0" class="bg-white border rounded p-1.5 w-32 font-bold font-mono text-center" />
            </div>
          </div>

          <div class="space-y-1 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div class="flex items-center justify-between text-slate-600 font-bold">
              <span>Overall Total Taxable:</span>
              <span id="label-subtotal">₹0.00</span>
            </div>
            <div class="flex items-center justify-between text-slate-500 font-bold border-b pb-1">
              <span>Consolidated GST:</span>
              <span id="label-gst">₹0.00</span>
            </div>
            <div class="flex items-center justify-between text-slate-600 font-bold border-b pb-1 text-[11px]">
              <span>Round Off Adjust:</span>
              <span id="label-round">₹0.00</span>
            </div>
            <div class="flex items-center justify-between text-indigo-900 font-black text-sm pt-1">
              <span>Grand Net Invoice Total:</span>
              <span id="label-grand">₹0.00</span>
            </div>
          </div>
        </div>

        <!-- Submit block -->
        <div class="flex justify-end gap-2 pt-3 border-t">
          <button type="button" onclick="closeModal()" class="border px-4 py-2 rounded-md text-xs font-semibold hover:bg-slate-50">Discard</button>
          <button type="submit" class="btn-primary px-4 py-2 flex items-center gap-1"><i data-lucide="check" class="w-4 h-4"></i> Save & Record Sales Invoice</button>
        </div>

      </form>
    `;

    openModal("Create Inward GST Invoice", html);
    addNewEmptyInvoiceLine();
  };

  window.syncSelectedCustomerInvoicing = function(custID) {
    if (!custID) return;
    const customer = DB.getCompanies().find(c => c.id === custID);
    if (!customer) return;

    document.getElementById("invoice-cust-name").value = customer.name;
    document.getElementById("invoice-cust-gst").value = customer.gst || "";
    document.getElementById("invoice-cust-phone").value = customer.phone || "";
    document.getElementById("invoice-cust-address").value = customer.address || "";
  };

  window.triggerAddProductInvoiceLine = function(productId) {
    if (!productId) return;
    const prod = DB.getProducts().find(p => p.id === productId);
    if (!prod) return;

    const tbody = document.getElementById("invoice-items-form-tbody");
    if (!tbody) return;

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

      const calcField = tr.querySelector(".row-calc-taxable");
      if (calcField) {
        calcField.innerText = formatINR(taxable);
      }
    });

    const discount = Number(document.getElementById("invoice-form-discount")?.value) || 0;
    const netBeforeRound = (overallTaxable + overallGst) - discount;
    const grandNetTotal = Math.round(netBeforeRound);
    const roundOff = grandNetTotal - netBeforeRound;

    const subtotalLabel = document.getElementById("label-subtotal");
    const gstLabel = document.getElementById("label-gst");
    const roundLabel = document.getElementById("label-round");
    const grandLabel = document.getElementById("label-grand");

    if (subtotalLabel) subtotalLabel.innerText = formatINR(overallTaxable);
    if (gstLabel) gstLabel.innerText = formatINR(overallGst);
    if (roundLabel) roundLabel.innerText = (roundOff >= 0 ? "+" : "") + formatINR(roundOff);
    if (grandLabel) grandLabel.innerText = formatINR(grandNetTotal);

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
    const date = document.getElementById("invoice-date").value;
    const invoiceNo = document.getElementById("invoice-no").value;
    const discount = Number(document.getElementById("invoice-form-discount").value) || 0;

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

      if (prodId && !prodId.startsWith("custom-")) {
        DB.stockAdjust(prodId, -qty);
      }
    }

    const netBeforeRound = (subtotal + gstAmount) - discount;
    const grandTotal = Math.round(netBeforeRound);
    const roundOff = grandTotal - netBeforeRound;

    const invoices = DB.getSales();
    invoices.push({
      id: "sale-" + Date.now(),
      invoiceNo,
      date,
      customerName,
      customerGst,
      customerAddress,
      customerPhone,
      items,
      subtotal,
      gstAmount,
      discount,
      roundOff,
      grandTotal,
      paid: false
    });

    DB.save("sales", invoices);

    const sets = DB.getSettings();
    sets.nextInvoiceNo = (sets.nextInvoiceNo || 101) + 1;
    DB.saveSettings(sets);

    closeModal();
    toast.success("Sales Invoice Saved successfully!");
    
    // Refresh page standard rendering
    filterSalesInvoicesList();
    if (window.updateNavigationBadges) window.updateNavigationBadges();
  };
})();
