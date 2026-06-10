// Views Rendering Engine for Zenterfy GST Accounting Workspace
(function() {
  
  function formatINR(val) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  }

  function formatDate(dStr) {
    if (!dStr) return "-";
    const date = new Date(dStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  window.Views = {
    // 1. DASHBOARD VIEW
    dashboard: function() {
      const sales = DB.getSales();
      const purchases = DB.getPurchases();
      const products = DB.getProducts();

      // Sum of all sales invoices this month
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      const thisMonthSales = sales.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).reduce((sum, s) => sum + s.grandTotal, 0);

      const totalPurchases = purchases.reduce((sum, p) => sum + p.total, 0);
      const stockValue = products.reduce((sum, p) => sum + (p.quantity * p.purchasePrice), 0);
      const totalSalesAllTime = sales.reduce((sum, s) => sum + s.grandTotal, 0);
      const profit = totalSalesAllTime - totalPurchases;

      // Pending invoices
      const pendingSales = sales.filter(s => s.paid === false || s.paid === "false");
      const pendingSalesTotal = pendingSales.reduce((sum, s) => sum + s.grandTotal, 0);

      // Recent Transactions (Last 5 sales/purchase combined, sorted by date)
      const transactions = [];
      sales.forEach(s => transactions.push({ type: "Sales", docNo: s.invoiceNo, party: s.customerName, date: s.date, amount: s.grandTotal, status: s.paid ? "Paid" : "Unpaid" }));
      purchases.forEach(p => transactions.push({ type: "Purchase", docNo: p.billNo, party: p.vendorName, date: p.date, amount: p.total, status: "Recorded" }));
      
      transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      const recentTransactions = transactions.slice(0, 5);

      return `
        <div class="space-y-4 animate-fade-in text-xs font-medium">
          <div>
            <h1 class="text-xl font-bold tracking-tight text-slate-900">Console Dashboard</h1>
            <p class="text-slate-500 text-[11px]">Real-time interactive monitoring of your Indian GST business accounts.</p>
          </div>

          <!-- Cards Summary Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <span class="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">Sales (This Month)</span>
              <span class="text-lg font-bold tracking-tight text-indigo-600 mt-2 block">${formatINR(thisMonthSales)}</span>
            </div>
            <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <span class="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">Total Purchases</span>
              <span class="text-lg font-bold tracking-tight text-slate-800 mt-2 block">${formatINR(totalPurchases)}</span>
            </div>
            <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <span class="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">Current Stock Value</span>
              <span class="text-lg font-bold tracking-tight text-emerald-600 mt-2 block">${formatINR(stockValue)}</span>
            </div>
            <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <span class="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]/normal">Net Profit (Sales - Purchases)</span>
              <span class="text-lg font-bold tracking-tight ${profit >= 0 ? "text-indigo-600" : "text-rose-600"} mt-2 block">${formatINR(profit)}</span>
            </div>
            <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <span class="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">Pending Invoices</span>
              <span class="text-lg font-bold tracking-tight text-rose-500 mt-2 block">${formatINR(pendingSalesTotal)}<span class="text-[9px] text-slate-400 font-medium ml-1">(${pendingSales.length} bills)</span></span>
            </div>
          </div>

          <!-- Ledger summary and recent transacts -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-3">
            <!-- Recent entries list -->
            <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-xs lg:col-span-2">
              <div class="flex items-center justify-between border-b pb-2 mb-3">
                <h3 class="font-bold text-slate-800 text-sm flex items-center gap-1.5"><i data-lucide="history" class="w-4 h-4 text-slate-500"></i> Recent Real-time Transactions</h3>
                <span class="text-[10px] text-slate-400">Latest 5 sales & purchases</span>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-left">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Doc/Bill No</th>
                      <th>Party Name</th>
                      <th>Date</th>
                      <th class="text-right">Amount</th>
                      <th class="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${recentTransactions.map(tx => `
                      <tr class="hover:bg-slate-50">
                        <td class="font-bold border-b border-slate-100">
                          <span class="px-1.5 py-0.5 rounded text-[10px] ${tx.type === 'Sales' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}">${tx.type}</span>
                        </td>
                        <td class="font-bold font-mono border-b border-slate-100">${tx.docNo}</td>
                        <td class="text-slate-600 border-b border-slate-100">${tx.party}</td>
                        <td class="text-slate-500 border-b border-slate-100">${formatDate(tx.date)}</td>
                        <td class="text-right font-bold text-slate-800 border-b border-slate-100">${formatINR(tx.amount)}</td>
                        <td class="text-center border-b border-slate-100">
                          <span class="text-[9px] uppercase font-bold px-1 py-0.2 rounded-full ${tx.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : tx.status === 'Unpaid' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}">${tx.status}</span>
                        </td>
                      </tr>
                    `).join('')}
                    ${recentTransactions.length === 0 ? '<tr><td colspan="6" class="text-center text-slate-400 py-8">No business bills logged. Start by recording a sales invoice or purchase entry!</td></tr>' : ''}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Dashboard shortcuts -->
            <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
              <div class="border-b pb-2">
                <h3 class="font-bold text-slate-800 text-sm flex items-center gap-1.5"><i data-lucide="zap" class="w-4 h-4 text-slate-500"></i> Workspace Shortcuts</h3>
              </div>
              <div class="grid grid-cols-1 gap-2">
                <button onclick="navigateTo('sales')" class="btn-primary text-center py-2 flex items-center justify-center gap-2"><i data-lucide="file-plus" class="w-4 h-4"></i> Create Sales Invoice</button>
                <button onclick="navigateTo('purchase')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-md flex items-center justify-center gap-2"><i data-lucide="shopping-bag" class="w-4 h-4"></i> Log Purchase Bill</button>
                <button onclick="navigateTo('companies')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-md flex items-center justify-center gap-2"><i data-lucide="users" class="w-4 h-4"></i> Add Customer/Vendor</button>
                <button onclick="navigateTo('stock')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-md flex items-center justify-center gap-2"><i data-lucide="boxes" class="w-4 h-4"></i> Check Inventory Stock</button>
                <button onclick="navigateTo('reports')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-md flex items-center justify-center gap-2"><i data-lucide="file-spreadsheet" class="w-4 h-4"></i> Generate Tax Reports</button>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    // 2. COMPANIES VIEW
    companies: function() {
      const companies = DB.getCompanies();
      const customers = companies.filter(c => c.type === 'customer');
      const vendors = companies.filter(c => c.type === 'vendor');

      return `
        <div class="space-y-4 animate-fade-in text-xs font-medium">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h1 class="text-xl font-bold tracking-tight text-slate-900">Companies & Contacts</h1>
              <p class="text-slate-500 text-[11px]">Manage business relations, suppliers, and customer profiles with opening ledger records.</p>
            </div>
            <button onclick="openCompanyForm()" class="btn-primary flex items-center gap-1.5"><i data-lucide="plus" class="w-4 h-4"></i> Add New Company</button>
          </div>

          <!-- Search or Filter Bar -->
          <div class="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
            <div class="relative flex-1">
              <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-2.5"></i>
              <input type="text" id="company-search-query" onkeyup="filterCompaniesList()" class="pl-9 pr-4 py-2 bg-slate-50 border rounded-md text-slate-700 font-semibold text-xs w-full" placeholder="Search contact profiles by name, email or GSTIN code..." />
            </div>
            <div class="flex bg-slate-100 p-0.5 rounded-md self-stretch">
              <button onclick="switchCompanyTabs('customer')" id="tab-btn-customer" class="active-company-tab px-3 py-1.5 text-xs font-bold rounded-md transition-colors bg-white text-indigo-600 shadow-xs">Customers (${customers.length})</button>
              <button onclick="switchCompanyTabs('vendor')" id="tab-btn-vendor" class="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors text-slate-500 hover:text-slate-800">Vendors (${vendors.length})</button>
            </div>
          </div>

          <!-- Customer profiles panel container -->
          <div id="company-list-wrapper" class="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <!-- Rendered dynamically below via script -->
            <div class="overflow-x-auto font-medium">
              <table class="w-full">
                <thead>
                  <tr>
                    <th>Company Name</th>
                    <th>GSTIN</th>
                    <th>Phone / Email</th>
                    <th>Billing Address</th>
                    <th class="text-right">Opening Balance</th>
                    <th class="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody id="company-tbody">
                  <!-- Filled by script filterCompaniesList() -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    // 2.5 ACCOUNTS VIEW (Chart of Accounts & Ledger)
    accounts: function() {
      return `
        <div class="space-y-4 animate-fade-in text-xs font-medium">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h1 class="text-xl font-bold tracking-tight text-slate-900">Chart of Accounts & Ledgers</h1>
              <p class="text-slate-500 text-[11px]">Mandatory double-entry account heads supporting capital investment, cash reserves, sales, purchase, stock assets, and individual party ledgers.</p>
            </div>
            <button onclick="openAccountHeadForm()" class="btn-primary flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-2 text-xs font-bold transition-all"><i data-lucide="plus" class="w-4 h-4"></i> Add Custom Ledger Account</button>
          </div>

          <!-- Statistics -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-white p-4 border border-slate-200 rounded-lg shadow-xs">
              <span class="text-slate-400 font-bold block mb-1">Total Account Heads</span>
              <span class="text-xl font-bold text-slate-800" id="stat-total-accounts">0</span>
            </div>
            <div class="bg-white p-4 border border-slate-200 rounded-lg shadow-xs">
              <span class="text-slate-400 font-bold block mb-1">Cash Current Balance</span>
              <span class="text-xl font-bold text-emerald-600 font-mono" id="stat-cash-balance">₹0.00</span>
            </div>
            <div class="bg-white p-4 border border-slate-200 rounded-lg shadow-xs">
              <span class="text-slate-400 font-bold block mb-1">Bank Current Balance</span>
              <span class="text-xl font-bold text-blue-600 font-mono" id="stat-bank-balance">₹0.00</span>
            </div>
          </div>

          <!-- Accounts table list -->
          <div class="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div class="p-3 border-b border-slate-100 flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center bg-slate-50/50">
              <span class="font-bold text-slate-800 text-xs">Chart of Accounts (Ledger Index)</span>
              <input type="text" id="account-search-query" onkeyup="filterAccountsList()" class="pl-3 pr-3 py-1.5 bg-white border rounded-md text-slate-700 font-semibold text-xs w-full sm:w-64" placeholder="Search account heads by name..." />
            </div>
            <div class="overflow-x-auto font-medium">
              <table class="w-full">
                <thead>
                  <tr class="bg-slate-50 text-left border-b border-slate-200">
                    <th class="p-3">Account Name</th>
                    <th class="p-3">Account Group</th>
                    <th class="p-3">Account Type</th>
                    <th class="p-3 text-right">Ledger Closing Balance (Running)</th>
                    <th class="p-3 text-center">Operations</th>
                  </tr>
                </thead>
                <tbody id="accounts-tbody" class="divide-y divide-slate-100">
                  <!-- Rendered dynamically by script in javascripts/accounts.js -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    // 3. SALES VIEW
    sales: function() {
      const sales = DB.getSales();
      return `
        <div class="space-y-4 animate-fade-in text-xs font-medium">
          <div class="flex justify-between items-center">
            <div>
              <h1 class="text-xl font-bold tracking-tight text-slate-900">GST Sales Invoices</h1>
              <p class="text-slate-500 text-[11px]">Generate corporate compliant GST sales ledger documents, print retail receipts, or export ledger bills to localStorage.</p>
            </div>
            <button onclick="openNewSalesInvoiceForm()" class="btn-primary flex items-center gap-2"><i data-lucide="file-plus-2" class="w-4 h-4"></i> Create GST Sales Invoice</button>
          </div>

          <!-- List Invoices Panel card -->
          <div class="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div class="p-3 border-b bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 class="font-bold text-slate-800 text-sm flex items-center gap-1.5"><i data-lucide="file-text" class="w-4 h-4 text-slate-500"></i> Corporate Sales Register Bill Log</h3>
              <div class="relative">
                <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2"></i>
                <input type="text" id="sales-search-query" onkeyup="filterSalesInvoicesList()" class="pl-7 pr-3 py-1 bg-white border rounded text-slate-600 font-semibold text-[11px]" placeholder="Search bill or customer..." />
              </div>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Invoice Date</th>
                    <th>Customer Name</th>
                    <th>GSTIN</th>
                    <th class="text-right">Subtotal</th>
                    <th class="text-right">GST Amount</th>
                    <th class="text-right">Grand Total</th>
                    <th class="text-center">Status</th>
                    <th class="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody id="sales-tbody">
                  <!-- Filled dynamically via JS filterSalesInvoicesList() -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    // 4. PURCHASE VIEW
    purchase: function() {
      return `
        <div class="space-y-4 animate-fade-in text-xs font-medium">
          <div class="flex justify-between items-center">
            <div>
              <h1 class="text-xl font-bold tracking-tight text-slate-900">Purchase Bills Register</h1>
              <p class="text-slate-500 text-[11px]">Log inward vendor invoices to increment inventory stock. Complete automatic SGST/CGST bookkeeping.</p>
            </div>
            <button onclick="openNewPurchaseBillForm()" class="btn-primary flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> Log Vendor Purchase Bill</button>
          </div>

          <!-- Purchases log table -->
          <div class="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div class="p-3 border-b bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 class="font-bold text-slate-800 text-sm flex items-center gap-1.5"><i data-lucide="shopping-cart" class="w-4 h-4 text-slate-500"></i> Vendor Inward Invoices Record</h3>
              <div class="relative">
                <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2"></i>
                <input type="text" id="purchase-search-query" onkeyup="filterPurchaseInvoicesList()" class="pl-7 pr-3 py-1 bg-white border rounded text-slate-600 font-semibold text-[11px]" placeholder="Search bills or vendors..." />
              </div>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr>
                    <th>Bill Number</th>
                    <th>Purchase Date</th>
                    <th>Vendor Supplier</th>
                    <th>GSTIN</th>
                    <th class="text-right">Subtotal</th>
                    <th class="text-right">GST Collected</th>
                    <th class="text-right">Total Invoice</th>
                    <th class="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody id="purchases-tbody">
                  <!-- JS calculated dynamic inward lines -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    // 5. STOCK VIEW
    stock: function() {
      return `
        <div class="space-y-4 animate-fade-in text-xs font-medium">
          <div class="flex justify-between items-center">
            <div>
              <h1 class="text-xl font-bold tracking-tight text-slate-900">Inventory Items Catalog</h1>
              <p class="text-slate-500 text-[11px]">Monitor physical stocks, adjust ledger quantity limits, and specify unified purchase/selling rates.</p>
            </div>
            <button onclick="openProductForm()" class="btn-primary flex items-center gap-1.5"><i data-lucide="plus" class="w-4 h-4"></i> Add New Product</button>
          </div>

          <!-- Stock metrics row -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
            <div class="relative flex-1">
              <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-2.5"></i>
              <input type="text" id="stock-search-query" onkeyup="filterProductsList()" class="pl-9 pr-4 py-2 bg-slate-50 border rounded-md text-slate-700 font-semibold text-xs w-full" placeholder="Search catalog items by name or HSN code..." />
            </div>
            <div class="bg-indigo-50 border border-indigo-100 rounded-md p-2 text-indigo-800 font-semibold flex items-center justify-between">
              <span>Catalog Catalog SKU Items:</span>
              <span id="stock-total-skus" class="text-base font-bold">0</span>
            </div>
            <div class="bg-amber-50 border border-amber-100 rounded-md p-2 text-amber-800 font-semibold flex items-center justify-between">
              <span>Low Stock Alerts (< 10):</span>
              <span id="stock-low-count" class="text-base font-bold">0</span>
            </div>
          </div>

          <!-- Catalog Log Table -->
          <div class="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr>
                    <th>Product / Catalog Particular Name</th>
                    <th>HSN / SAC</th>
                    <th class="text-center">Stock Unit</th>
                    <th class="text-center">Current Quantity</th>
                    <th class="text-right">Purchase Price</th>
                    <th class="text-right">Selling Price</th>
                    <th class="text-center">Adjust Stock</th>
                    <th class="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody id="stock-tbody">
                  <!-- Filled dynamically by filterProductsList() -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    // 6. REPORTS VIEW
    reports: function() {
      return `
        <div class="space-y-4 animate-fade-in text-xs font-medium">
          <div>
            <h1 class="text-xl font-bold tracking-tight text-slate-900">GST Filing & Financial Reports</h1>
            <p class="text-slate-500 text-[11px]">Synthesize GSTR-1, GSTR-3B monthly declarations, and evaluate complete corporate income profit margins.</p>
          </div>

          <!-- Date Query Range Selector -->
          <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap sm:flex-nowrap gap-3 items-end">
            <div class="w-full sm:w-auto flex-1">
              <label class="block text-slate-500 font-bold mb-1">Report Select Month</label>
              <select id="report-month-select" class="bg-slate-50 border rounded-lg p-2 w-full font-bold">
                <option value="0">January</option>
                <option value="1">February</option>
                <option value="2">March</option>
                <option value="3">April</option>
                <option value="4">May</option>
                <option value="5">June</option>
                <option value="6">July</option>
                <option value="7">August</option>
                <option value="8">September</option>
                <option value="9">October</option>
                <option value="10">November</option>
                <option value="11">December</option>
              </select>
            </div>
            <div class="w-full sm:w-auto flex-1">
              <label class="block text-slate-500 font-bold mb-1">Report Select Year</label>
              <select id="report-year-select" class="bg-slate-50 border rounded-lg p-2 w-full font-bold">
                <option value="2025">2025</option>
                <option value="2026" selected>2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
            <button onclick="compileBusinessStatementReports()" class="btn-primary w-full sm:w-auto font-bold py-2.5 px-4 flex items-center justify-center gap-1.5 shrink-0"><i data-lucide="refresh-cw" class="w-4 h-4 animate-spin-hover"></i> Compile Reports</button>
            <button onclick="exportReportsCSV()" class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-4 rounded-md text-xs flex items-center justify-center gap-1.5 shrink-0"><i data-lucide="file-spreadsheet" class="w-4 h-4"></i> Export to CSV</button>
            <button onclick="window.printInvoiceHTML('report-statement-view', { title: 'Compiled Business Statement Report' })" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-md text-xs flex items-center justify-center gap-1.5 shrink-0"><i data-lucide="printer" class="w-4 h-4"></i> Print Statement</button>
          </div>

          <!-- Tabs of reports statement views -->
          <div class="flex flex-wrap border-b border-slate-200 bg-white p-1 rounded-t-lg gap-1">
            <button onclick="switchReportSubtabs('trialbalance')" id="report-tab-trialbalance" class="px-3 py-2 font-bold text-xs rounded-t-md border-b-2 border-indigo-600 text-indigo-600">Trial Balance</button>
            <button onclick="switchReportSubtabs('partyledger')" id="report-tab-partyledger" class="px-3 py-2 font-semibold text-slate-500 hover:text-slate-800 text-xs rounded-t-md">Party Ledger</button>
            <button onclick="switchReportSubtabs('stocksummary')" id="report-tab-stocksummary" class="px-3 py-2 font-semibold text-slate-500 hover:text-slate-800 text-xs rounded-t-md">Stock Summary</button>
            <button onclick="switchReportSubtabs('gstr1')" id="report-tab-gstr1" class="px-3 py-2 font-semibold text-slate-500 hover:text-slate-800 text-xs rounded-t-md">GSTR-1 (Sales)</button>
            <button onclick="switchReportSubtabs('gstr3b')" id="report-tab-gstr3b" class="px-3 py-2 font-semibold text-slate-500 hover:text-slate-800 text-xs rounded-t-md">GSTR-3B (Tax Return)</button>
          </div>

          <!-- Dynamic Report Content Body View Card -->
          <div id="report-statement-view" class="bg-white p-5 rounded-lg border border-t-0 rounded-t-none border-slate-200 shadow-xs space-y-4 font-semibold text-slate-800">
            <!-- Compiled inside script.js -->
          </div>
        </div>
      `;
    },

    // 7. SETTINGS VIEW
    settings: function() {
      const sets = DB.getSettings();
      const isOnline = navigator.onLine;
      const userId = window.getSupabaseUserId ? window.getSupabaseUserId() : null;
      const pendingCount = window.DB && window.DB.getPendingSyncCount ? window.DB.getPendingSyncCount() : 0;
      
      let syncStatusHtml = "";
      if (!userId) {
        syncStatusHtml = `
          <span class="text-amber-500 font-bold flex items-center gap-1.5 text-[11px]">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Guest Mode (Local Cache)
          </span>
        `;
      } else if (isOnline) {
        if (pendingCount > 0) {
          syncStatusHtml = `
            <span class="text-amber-500 font-bold flex items-center gap-1.5 text-[11px]">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              Pending Sync Items (${pendingCount})
            </span>
          `;
        } else {
          syncStatusHtml = `
            <span class="text-emerald-600 font-bold flex items-center gap-1.5 text-[11px]">
              <span class="relative flex h-2 w-2">
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Connected & Cloud Synced
            </span>
          `;
        }
      } else {
        syncStatusHtml = `
          <span class="text-rose-500 font-bold flex items-center gap-1.5 text-[11px]">
            <span class="relative flex h-2 w-2">
              <span class="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            Connection Offline
          </span>
        `;
      }

      return `
        <div class="space-y-4 animate-fade-in text-xs font-semibold">
          <div>
            <h1 class="text-xl font-bold tracking-tight text-slate-900">Workspace Settings</h1>
            <p class="text-slate-500 text-[11px]">Specify company profiles to appear on print receipts, edit prefix sequences, and handle storage backups.</p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            <!-- Profile Settings Form -->
            <form id="settings-profile-form" onsubmit="saveWorkspaceSettingsProfile(event)" class="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
              <h3 class="font-bold text-slate-800 text-sm border-b pb-2 flex items-center gap-2">
                <i data-lucide="building" class="w-4 h-4 text-slate-500"></i> Corporate Company Profile Invoice Settings
              </h3>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-slate-600 mb-1">Company Registered Name *</label>
                  <input type="text" id="set-company-name" value="${sets.companyName || ''}" class="bg-slate-50 border rounded-md p-2 w-full font-bold" required />
                </div>
                <div>
                  <label class="block text-slate-600 mb-1">GSTIN Registry *</label>
                  <input type="text" id="set-gstin" value="${sets.gstin || ''}" class="bg-slate-50 border rounded-md p-2 w-full uppercase font-mono font-bold" required />
                </div>
              </div>

              <div>
                <label class="block text-slate-600 mb-1">Business Registry Address *</label>
                <textarea id="set-address" rows="2" class="bg-slate-50 border rounded-md p-2 w-full font-medium" required>${sets.address || ''}</textarea>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t pt-3">
                <div>
                  <label class="block text-slate-600 mb-1">Invoice Prefix</label>
                  <input type="text" id="set-inv-prefix" value="${sets.invoicePrefix || 'INV-'}" class="bg-slate-50 border rounded-md p-2 w-full font-bold" />
                </div>
                <div>
                  <label class="block text-slate-600 mb-1">Next Invoice No</label>
                  <input type="number" id="set-inv-next" value="${sets.nextInvoiceNo || 101}" class="bg-slate-50 border rounded-md p-2 w-full text-center font-bold" />
                </div>
                <div>
                  <label class="block text-slate-600 mb-1">Default GST Rate (%)</label>
                  <select id="set-gst-default" class="bg-slate-50 border rounded-md p-2 w-full font-bold">
                    <option value="5" ${sets.defaultGstRate == 5 ? 'selected' : ''}>5% (Retail)</option>
                    <option value="12" ${sets.defaultGstRate == 12 ? 'selected' : ''}>12% (Electronics/Services)</option>
                    <option value="18" ${sets.defaultGstRate == 18 || !sets.defaultGstRate ? 'selected' : ''}>18% (Standard Goods)</option>
                    <option value="28" ${sets.defaultGstRate == 28 ? 'selected' : ''}>28% (Luxury Goods)</option>
                  </select>
                </div>
              </div>

              <!-- Contact & Tax Subsections -->
              <div class="border-t pt-3 space-y-3">
                <h4 class="font-bold text-slate-700 text-xs flex items-center gap-1">
                  <i data-lucide="phone" class="w-3.5 h-3.5 text-slate-450"></i> Additional Contact & Business Details
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-[11px] text-slate-500 mb-0.5 font-bold">Phone Number</label>
                    <input type="text" id="set-phone" value="${sets.phone || ''}" class="bg-slate-50 border rounded-md p-1.5 w-full font-bold" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-slate-500 mb-0.5 font-bold">Email Address</label>
                    <input type="email" id="set-email" value="${sets.email || ''}" class="bg-slate-50 border rounded-md p-1.5 w-full font-bold" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-slate-500 mb-0.5 font-bold">Website Domain</label>
                    <input type="text" id="set-website" value="${sets.website || ''}" class="bg-slate-50 border rounded-md p-1.5 w-full font-bold" />
                  </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[11px] text-slate-500 mb-0.5 font-bold">PAN Registry Number</label>
                    <input type="text" id="set-pan" value="${sets.pan || ''}" class="bg-slate-50 border rounded-md p-1.5 w-full uppercase font-mono font-bold" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-slate-500 mb-0.5 font-bold">FSSAI / Registration Stamp</label>
                    <input type="text" id="set-fssai" value="${sets.fssai || ''}" class="bg-slate-50 border rounded-md p-1.5 w-full font-bold" />
                  </div>
                </div>
              </div>

              <!-- Settlements & Bank Coordinates -->
              <div class="border-t pt-3 space-y-3">
                <h4 class="font-bold text-slate-700 text-xs flex items-center gap-1">
                  <i data-lucide="credit-card" class="w-3.5 h-3.5 text-slate-450"></i> Settlement Bank Details
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-[11px] text-slate-500 mb-0.5 font-bold">Account Holder Name</label>
                    <input type="text" id="set-bank-holder" value="${sets.bankHolder || ''}" class="bg-slate-50 border rounded-md p-1.5 w-full font-bold" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-slate-500 mb-0.5 font-bold">Bank Institution Name</label>
                    <input type="text" id="set-bank-name" value="${sets.bankName || ''}" class="bg-slate-50 border rounded-md p-1.5 w-full font-bold" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-slate-500 mb-0.5 font-bold">Account Number</label>
                    <input type="text" id="set-bank-account" value="${sets.bankAccount || ''}" class="bg-slate-50 border rounded-md p-1.5 w-full font-bold" />
                  </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-[11px] text-slate-500 mb-0.5 font-bold">Branch Location</label>
                    <input type="text" id="set-bank-branch" value="${sets.bankBranch || ''}" class="bg-slate-50 border rounded-md p-1.5 w-full font-bold" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-slate-500 mb-0.5 font-bold">IFSC Routing Code</label>
                    <input type="text" id="set-bank-ifsc" value="${sets.bankIfsc || ''}" class="bg-slate-50 border rounded-md p-1.5 w-full uppercase font-mono font-bold" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-slate-500 mb-0.5 font-bold">UPI Phone Link</label>
                    <input type="text" id="set-bank-upi" value="${sets.bankUpi || ''}" class="bg-slate-50 border rounded-md p-1.5 w-full font-bold" />
                  </div>
                </div>
              </div>

              <!-- Rules section -->
              <div class="border-t pt-3">
                <label class="block text-slate-600 mb-1 font-bold">Standard Invoice Terms & Conditions (one per line)</label>
                <textarea id="set-terms" rows="3" class="bg-slate-50 border rounded-md p-2 w-full font-medium text-xs leading-5">${sets.terms || ''}</textarea>
              </div>

              <div class="pt-2 flex justify-end">
                <button type="submit" class="btn-primary font-bold px-4 py-2 flex items-center gap-1.5 shadow-sm"><i data-lucide="check" class="w-4 h-4"></i> Save Company Profile Settings</button>
              </div>
            </form>

            <!-- Column 2 utilities stack -->
            <div class="space-y-4">
              
              <!-- Supabase Cloud Synchronization & Desktop Wrapper Panel -->
              <div class="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
                <h3 class="font-bold text-slate-800 text-sm border-b pb-2 flex items-center gap-2">
                  <i data-lucide="cloud-lightning" class="w-4 h-4 text-sky-500"></i> Supabase Cloud Synchronization Panel
                </h3>
                
                <div class="space-y-3">
                  <div class="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                    <div>
                      <span class="block text-[10px] text-slate-400 font-bold uppercase">Sync Connection Status</span>
                      <div class="mt-1">${syncStatusHtml}</div>
                    </div>
                    ${userId ? `
                    <button onclick="if(window.DB && window.DB.syncWithCloud) window.DB.syncWithCloud(true)" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-md text-[10px] flex items-center gap-1 transition-all">
                      <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Manual Force Sync
                    </button>
                    ` : `
                    <span class="text-slate-400 text-[10px] italic">Sign in to activate</span>
                    `}
                  </div>

                  <div class="grid grid-cols-2 gap-2 text-center text-[11px]">
                    <div class="p-2.5 border rounded-lg bg-slate-50/50">
                      <span class="block text-[10px] text-slate-400 font-bold">Pending Sync Items</span>
                      <span class="block font-black text-sm text-slate-800 mt-1">${pendingCount} records</span>
                    </div>
                    <div class="p-2.5 border rounded-lg bg-slate-50/50">
                      <span class="block text-[10px] text-slate-400 font-bold">IndexedDB Sync Layer</span>
                      <span class="block font-black text-sm text-emerald-600 mt-1">Active (Dexie)</span>
                    </div>
                  </div>
                </div>

                <div class="border-t pt-3 space-y-2">
                  <h3 class="font-bold text-slate-800 text-xs pb-1 flex items-center gap-2">
                    <i data-lucide="monitor" class="w-4 h-4 text-indigo-500"></i> Local Desktop App Packaging Setup (Pake / Nativefier)
                  </h3>
                  <p class="text-slate-500 font-medium text-[10.5px] leading-relaxed">
                    Convert your live Bipin Petroleum Web Workspace into a desktop application featuring native tray menus and persistent taskbar icons:
                  </p>

                  <div class="space-y-3 mt-2 text-left">
                    <!-- Option 1: Pake -->
                    <div class="p-2.5 bg-slate-50 rounded border border-slate-100 font-mono text-[9px] select-all cursor-pointer" title="Click to copy compile command">
                      <div class="font-bold text-[10px] text-indigo-600 font-sans mb-1 flex items-center justify-between">
                        <span>📦 Option A: Pake-cli (Rust-based, ultra-lightweight)</span>
                        <span class="bg-indigo-100/50 text-indigo-700 font-mono px-1 rounded text-[8px]">terminal</span>
                      </div>
                      npx pake-cli ${window.location.origin} --name "Bipin Petroleum"
                    </div>

                    <!-- Option 2: Nativefier -->
                    <div class="p-2.5 bg-slate-50 rounded border border-slate-100 font-mono text-[9px] select-all cursor-pointer" title="Click to copy compile command">
                      <div class="font-bold text-[10px] text-emerald-600 font-sans mb-1 flex items-center justify-between">
                        <span>📦 Option B: Nativefier (Electron Wrapper)</span>
                        <span class="bg-emerald-100/50 text-emerald-700 font-mono px-1 rounded text-[8px]">terminal</span>
                      </div>
                      npx nativefier --name "Bipin Petroleum" --internal-urls ".*" "${window.location.origin}"
                    </div>
                  </div>
                </div>
              </div>

              <!-- Ledger Backup Utilities -->
              <div class="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
                <div class="space-y-4">
                  <h3 class="font-bold text-slate-800 text-sm border-b pb-2 flex items-center gap-2">
                    <i data-lucide="database" class="w-4 h-4 text-slate-500"></i> Local Ledger Storage & Backup Suite
                  </h3>
                  <p class="text-slate-500 font-medium text-[11px] leading-relaxed">
                    Your business accounting transactions are stored securely in your physical browser cache (IndexedDB and localStorage). Export a backup package frequently to keep copies of stock quantities and invoices safe.
                  </p>

                  <!-- Operations grid -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    <button onclick="downloadBackupDatabaseJSON()" class="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-150 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5">
                      <i data-lucide="download" class="w-4 h-4"></i> Export Ledger Backup JSON
                    </button>
                    <label class="cursor-pointer bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-150 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 text-center">
                      <i data-lucide="upload" class="w-4 h-4"></i> Import Ledger Backup FILE
                      <input type="file" id="ledger-import-picker" onchange="uploadBackupDatabaseJSON(this)" class="hidden" accept=".json" />
                    </label>
                  </div>
                </div>

                <div class="border-t pt-4 space-y-2 bg-red-50/40 p-4 rounded-lg border border-red-100">
                  <h4 class="text-red-800 font-bold text-xs flex items-center gap-1.5"><i data-lucide="alert-triangle" class="w-4 h-4"></i> Danger Control Warning Zone</h4>
                  <p class="text-red-650 font-medium text-[10px] leading-relaxed">Clearing your data terminates all companies lists, stock quantities, and historical files instantly.</p>
                  <div class="pt-2">
                    <button onclick="triggerResetFactoryLedger()" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5"><i data-lucide="rotate-ccw" class="w-4 h-4"></i> Factory Reset Workspace</button>
                  </div>
                </div>
              </div>
              
            </div>

          </div>
        </div>
      `;
    }
  };

  // Assign functions globally to easily use inside script.html
  window.formatINR = formatINR;
  window.formatDate = formatDate;

})();
