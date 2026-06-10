// JavaScript for Purchase Module
(function() {
  document.addEventListener("DOMContentLoaded", () => {
    // Render the view
    const container = document.getElementById("view-container");
    if (container && window.Views) {
      container.innerHTML = Views.purchase();
    }

    // Highlight sidebar active item
    const sidebarItem = document.querySelector('[data-route="purchase"]');
    if (sidebarItem) {
      sidebarItem.classList.add("bg-slate-800", "text-white", "border-l-4", "border-blue-600");
      sidebarItem.classList.remove("text-slate-400");
    }

    // Base initializations
    if (window.updateNavigationBadges) window.updateNavigationBadges();
    filterPurchaseInvoicesList();
  });

  // PURCHASE INVOICING CORE
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
        if (window.updateNavigationBadges) window.updateNavigationBadges();
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

      const calcField = tr.querySelector(".row-pur-calc-taxable");
      if (calcField) {
        calcField.innerText = formatINR(taxable);
      }
    });

    const netAmount = subtotal + gstAmount;

    const purSubLabel = document.getElementById("label-pur-subtotal");
    const purGstLabel = document.getElementById("label-pur-gst");
    const purGrandLabel = document.getElementById("label-pur-grand");

    if (purSubLabel) purSubLabel.innerText = formatINR(subtotal);
    if (purGstLabel) purGstLabel.innerText = formatINR(gstAmount);
    if (purGrandLabel) purGrandLabel.innerText = formatINR(netAmount);
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
    
    filterPurchaseInvoicesList();
    if (window.updateNavigationBadges) window.updateNavigationBadges();
  };
})();
