// JavaScript for Stock Module
(function() {
  document.addEventListener("DOMContentLoaded", () => {
    // Render the view
    const container = document.getElementById("view-container");
    if (container && window.Views) {
      container.innerHTML = Views.stock();
    }

    // Highlight sidebar active item
    const sidebarItem = document.querySelector('[data-route="stock"]');
    if (sidebarItem) {
      sidebarItem.classList.add("bg-slate-800", "text-white", "border-l-4", "border-blue-600");
      sidebarItem.classList.remove("text-slate-400");
    }

    // Base initializations
    if (window.updateNavigationBadges) window.updateNavigationBadges();
    filterProductsList();
  });

  // STOCK / PRODUCTS MODULE
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
    if (window.updateNavigationBadges) window.updateNavigationBadges();
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
    if (window.updateNavigationBadges) window.updateNavigationBadges();
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
        if (window.updateNavigationBadges) window.updateNavigationBadges();
      }
    );
  };
})();
