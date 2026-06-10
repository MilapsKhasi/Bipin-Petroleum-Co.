// JavaScript for Reports Module
(function() {
  let activeReportSubtab = "gstr1"; // gstr1, gstr3b, or pl

  document.addEventListener("DOMContentLoaded", () => {
    // Render the view
    const container = document.getElementById("view-container");
    if (container && window.Views) {
      container.innerHTML = Views.reports();
    }

    // Highlight sidebar active item
    const sidebarItem = document.querySelector('[data-route="reports"]');
    if (sidebarItem) {
      sidebarItem.classList.add("bg-slate-800", "text-white", "border-l-4", "border-blue-600");
      sidebarItem.classList.remove("text-slate-400");
    }

    // Base initializations
    if (window.updateNavigationBadges) window.updateNavigationBadges();
    compileBusinessStatementReports();
  });

  // FINANCIAL STATEMENTS DIRECT RECONCILIATIONS
  window.switchReportSubtabs = function(subtab) {
    activeReportSubtab = subtab;
    
    const r1 = document.getElementById("report-tab-gstr1");
    const r3b = document.getElementById("report-tab-gstr3b");
    const pl = document.getElementById("report-tab-pl");

    if (r1 && r3b && pl) {
      [r1, r3b, pl].forEach(btn => {
        btn.className = "px-4 py-2 font-semibold text-slate-500 hover:text-slate-800 text-xs rounded-t-lg";
      });

      if (subtab === 'gstr1') {
        r1.className = "px-4 py-2 font-bold text-xs rounded-t-md border-b-2 border-indigo-600 text-indigo-600 bg-white";
      } else if (subtab === 'gstr3b') {
        r3b.className = "px-4 py-2 font-bold text-xs rounded-t-md border-b-2 border-indigo-600 text-indigo-600 bg-white";
      } else if (subtab === 'pl') {
        pl.className = "px-4 py-2 font-bold text-xs rounded-t-md border-b-2 border-indigo-600 text-indigo-600 bg-white";
      }
    }

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

    if (activeReportSubtab === 'gstr1') {
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
          <div class="bg-indigo-50/50 p-3.5 rounded border border-indigo-100/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h4 class="text-indigo-900 font-bold text-xs uppercase tracking-wider">Outward Supplies GSTR-1 Ledger Statement</h4>
              <p class="text-slate-500 font-medium text-[10px] mt-0.5">Categorized breakdown of commerce sales transactions during selected slot.</p>
            </div>
            <span class="text-xs bg-indigo-100 text-indigo-800 px-3 py-1 rounded-md font-bold">Filing Period: ${month + 1}/${year}</span>
          </div>

          <!-- Tables -->
          <div class="space-y-2">
            <h5 class="text-xs font-bold text-slate-800 flex items-center gap-1"><i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-600"></i> Section 4: Registered B2B Outward Corporate Supplies (Recipient has GSTIN)</h5>
            <div class="overflow-x-auto border rounded bg-white">
              <table class="w-full text-xs">
                <thead class="bg-slate-50 border-b">
                  <tr class="text-slate-500 font-bold">
                    <th class="py-2 px-3 text-left">Invoice No</th>
                    <th class="py-2 px-3 text-left">Recipient GSTIN</th>
                    <th class="py-2 px-3 text-left">Customer Name</th>
                    <th class="py-2 px-3 text-right">Taxable Worth (₹)</th>
                    <th class="py-2 px-3 text-right">SGST (₹)</th>
                    <th class="py-2 px-3 text-right">CGST (₹)</th>
                    <th class="py-2 px-3 text-right">Total Invoice (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${b2b.map(s => `
                    <tr class="border-b hover:bg-slate-50/50">
                      <td class="font-bold text-slate-900 font-mono py-2 px-3">${s.invoiceNo}</td>
                      <td class="font-mono text-slate-700 font-bold uppercase py-2 px-3">${s.customerGst}</td>
                      <td class="text-slate-600 font-bold py-2 px-3">${s.customerName}</td>
                      <td class="text-right text-slate-550 py-2 px-3">${formatINR(s.subtotal)}</td>
                      <td class="text-right text-slate-500 font-mono py-2 px-3">${formatINR(s.gstAmount / 2)}</td>
                      <td class="text-right text-slate-500 font-mono py-2 px-3">${formatINR(s.gstAmount / 2)}</td>
                      <td class="text-right font-black text-indigo-700 py-2 px-3">${formatINR(s.grandTotal)}</td>
                    </tr>
                  `).join('')}
                  ${b2b.length === 0 ? '<tr><td colspan="7" class="text-center text-slate-400 py-6">No B2B invoices recorded in this block.</td></tr>' : ''}
                  <tr class="bg-indigo-50/20 font-bold text-slate-900 border-t">
                    <td colspan="3" class="text-left font-black py-2 px-3">B2B Summary Total:</td>
                    <td class="text-right py-2 px-3">${formatINR(b2bTaxable)}</td>
                    <td class="text-right font-mono py-2 px-3">${formatINR(b2bGST / 2)}</td>
                    <td class="text-right font-mono py-2 px-3">${formatINR(b2bGST / 2)}</td>
                    <td class="text-right text-indigo-600 font-black py-2 px-3">${formatINR(b2bTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="space-y-2 pt-2">
            <h5 class="text-xs font-bold text-slate-800 flex items-center gap-1"><i data-lucide="user" class="w-3.5 h-3.5 text-indigo-500"></i> Section 5: Unregistered B2C Retail Outlet Supplies (Recipient has NO GSTIN)</h5>
            <div class="overflow-x-auto border rounded bg-white">
              <table class="w-full text-xs">
                <thead class="bg-slate-50 border-b">
                  <tr class="text-slate-500 font-bold">
                    <th class="py-2 px-3 text-left">Invoice No</th>
                    <th class="py-2 px-3 text-left">Customer Name</th>
                    <th class="py-2 px-3 text-right">Taxable Worth (₹)</th>
                    <th class="py-2 px-3 text-right">CGST (₹)</th>
                    <th class="py-2 px-3 text-right">SGST (₹)</th>
                    <th class="py-2 px-3 text-right">Total Outward Receipt (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${b2c.map(s => `
                    <tr class="border-b hover:bg-slate-50/50">
                      <td class="font-bold text-slate-900 font-mono py-2 px-3">${s.invoiceNo}</td>
                      <td class="text-slate-600 font-bold py-2 px-3">${s.customerName}</td>
                      <td class="text-right text-slate-550 py-2 px-3">${formatINR(s.subtotal)}</td>
                      <td class="text-right text-slate-500 font-mono py-2 px-3">${formatINR(s.gstAmount / 2)}</td>
                      <td class="text-right text-slate-500 font-mono py-2 px-3">${formatINR(s.gstAmount / 2)}</td>
                      <td class="text-right font-bold text-slate-800 py-2 px-3">${formatINR(s.grandTotal)}</td>
                    </tr>
                  `).join('')}
                  ${b2c.length === 0 ? '<tr><td colspan="6" class="text-center text-slate-400 py-6">No retail B2C invoices recorded in this block.</td></tr>' : ''}
                  <tr class="bg-slate-50 font-bold text-slate-900 border-t">
                    <td colspan="2" class="text-left font-black py-2 px-3">B2C Summary Total:</td>
                    <td class="text-right py-2 px-3">${formatINR(b2cTaxable)}</td>
                    <td class="text-right font-mono py-2 px-3">${formatINR(b2cGST / 2)}</td>
                    <td class="text-right font-mono py-2 px-3">${formatINR(b2cGST / 2)}</td>
                    <td class="text-right text-indigo-600 font-black py-2 px-3">${formatINR(b2cTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } else if (activeReportSubtab === 'gstr3b') {
      const outboundTaxable = sales.reduce((sum, s) => sum + s.subtotal, 0);
      const outboundTaxVal = sales.reduce((sum, s) => sum + s.gstAmount, 0);

      const inboundTaxable = purchases.reduce((sum, p) => sum + p.subtotal, 0);
      const inboundTaxVal = purchases.reduce((sum, p) => sum + p.gstAmount, 0);

      const netTaxCreditAvailed = inboundTaxVal;
      const taxLiabilityDue = outboundTaxVal;
      const netTaxPayable = Math.max(0, taxLiabilityDue - netTaxCreditAvailed);

      reportBox.innerHTML = `
        <div class="space-y-4">
          <div class="bg-indigo-50/50 p-3.5 rounded border border-indigo-100/55">
            <h4 class="text-indigo-900 font-bold text-xs uppercase tracking-wider">Consolidated GSTR-3B Tax Return Summary</h4>
            <p class="text-slate-500 font-medium text-[10px] mt-0.5">Calculations of Outward collection liability matched against Inward input tax credits (ITC).</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="bg-slate-50 p-3 rounded border border-slate-100">
              <span class="text-slate-400 block text-[9px] uppercase font-bold">Total Collection Liability (Outward)</span>
              <span class="text-sm font-black text-slate-800 block mt-1">${formatINR(taxLiabilityDue)}</span>
            </div>
            <div class="bg-slate-50 p-3 rounded border border-slate-100">
              <span class="text-slate-400 block text-[9px] uppercase font-bold">Input Tax Credit (ITC Availed)</span>
              <span class="text-sm font-black text-emerald-600 block mt-1">${formatINR(netTaxCreditAvailed)}</span>
            </div>
            <div class="bg-indigo-50 text-indigo-900 p-3 rounded border border-indigo-100/60">
              <span class="text-indigo-600 block text-[9px] uppercase font-bold">Net GST Payable Cash Ledger</span>
              <span class="text-sm font-black block mt-1">${formatINR(netTaxPayable)}</span>
            </div>
          </div>

          <div class="overflow-x-auto border rounded bg-white mt-1">
            <table class="w-full text-xs">
              <thead class="bg-slate-50 border-b text-slate-500 font-bold">
                <tr>
                  <th class="py-2 px-3 text-left">Nature of Supply Operations</th>
                  <th class="py-2 px-3 text-right">Total Taxable Value (₹)</th>
                  <th class="py-2 px-3 text-right">Central Tax CGST Outstanding (₹)</th>
                  <th class="py-2 px-3 text-right">State Tax SGST Outstanding (₹)</th>
                  <th class="py-2 px-3 text-right font-black">Consolidated Total Tax Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b">
                  <td class="font-bold text-slate-850 py-2 px-3">3.1 Outward supplies (Sales invoices logged)</td>
                  <td class="text-right py-2 px-3">${formatINR(outboundTaxable)}</td>
                  <td class="text-right text-slate-600 font-mono py-2 px-3">${formatINR(outboundTaxVal / 2)}</td>
                  <td class="text-right text-slate-600 font-mono py-2 px-3">${formatINR(outboundTaxVal / 2)}</td>
                  <td class="text-right font-black text-indigo-705 py-2 px-3">${formatINR(outboundTaxVal)}</td>
                </tr>
                <tr class="border-b bg-emerald-50/5">
                  <td class="font-bold text-slate-855 py-2 px-3">4.1 Eligible Inward Input Tax Credit (ITC matching purchase bills)</td>
                  <td class="text-right py-2 px-3">${formatINR(inboundTaxable)}</td>
                  <td class="text-right text-slate-600 font-mono py-2 px-3">${formatINR(inboundTaxVal / 2)}</td>
                  <td class="text-right text-slate-600 font-mono py-2 px-3">${formatINR(inboundTaxVal / 2)}</td>
                  <td class="text-right font-black text-emerald-600 py-2 px-3">${formatINR(inboundTaxVal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (activeReportSubtab === 'pl') {
      const grossIncome = sales.reduce((sum, s) => sum + s.subtotal, 0);
      const gstCollected = sales.reduce((sum, s) => sum + s.gstAmount, 0);

      const purchaseExpenses = purchases.reduce((sum, p) => sum + p.subtotal, 0);
      const gstExpenses = purchases.reduce((sum, p) => sum + p.gstAmount, 0);

      const netIncomeProfit = grossIncome - purchaseExpenses;
      const profitMarginPct = grossIncome > 0 ? ((netIncomeProfit / grossIncome) * 100).toFixed(1) : "0.0";

      reportBox.innerHTML = `
        <div class="space-y-4">
          <div class="bg-indigo-50/50 p-3.5 rounded border border-indigo-100/55">
            <h4 class="text-indigo-900 font-bold text-xs uppercase tracking-wider">Trading Income Profit & Loss statement</h4>
            <p class="text-slate-500 font-medium text-[10px] mt-0.5">Calculated evaluate metrics of business volume transactions (excluding cash tax flows).</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div class="bg-indigo-50/55 border rounded p-3 text-indigo-950">
              <span class="block text-slate-400 text-[9px] uppercase font-bold">Total Operating Revenue</span>
              <span class="block text-sm font-black mt-1">${formatINR(grossIncome)}</span>
            </div>
            <div class="bg-rose-50/50 border rounded p-3 text-rose-950">
              <span class="block text-slate-400 text-[9px] uppercase font-bold">Total Operating Expenses</span>
              <span class="block text-sm font-black mt-1">${formatINR(purchaseExpenses)}</span>
            </div>
            <div class="bg-emerald-50 border border-emerald-100 text-emerald-990 rounded p-3">
              <span class="block text-slate-400 text-[9px] uppercase font-bold">Trading Margin Profit (EBIT)</span>
              <span class="block text-sm font-black mt-1 ${netIncomeProfit >= 0 ? "text-emerald-700" : "text-rose-600"}">${formatINR(netIncomeProfit)} <span class="text-[9px] font-bold text-slate-400 ml-1">(${profitMarginPct}%)</span></span>
            </div>
          </div>

          <div class="border rounded bg-white mt-1 text-xs">
            <div class="px-3.5 py-2 border-b font-bold text-slate-800 uppercase tracking-wider bg-slate-50/40">Operating Balance Statement Grid</div>
            <div class="p-3.5 space-y-3 font-semibold text-slate-700">
              <div class="flex items-center justify-between">
                <span>Total Corporate Sales Revenue (A):</span>
                <span class="font-bold text-slate-900">${formatINR(grossIncome)}</span>
              </div>
              <div class="flex items-center justify-between border-b pb-2 text-slate-400 font-normal text-[11px]">
                <span>* Add: GST Taxes collected on sales:</span>
                <span class="text-slate-500 font-medium">${formatINR(gstCollected)}</span>
              </div>
              
              <div class="flex items-center justify-between pt-1">
                <span>Total Cost of Inward Purchase Inventory Goods (B):</span>
                <span class="font-bold text-slate-900">${formatINR(purchaseExpenses)}</span>
              </div>
              <div class="flex items-center justify-between border-b pb-2 text-slate-400 font-normal text-[11px]">
                <span>* Add: GST Taxes paid to vendors:</span>
                <span class="text-slate-500 font-medium">${formatINR(gstExpenses)}</span>
              </div>

              <div class="flex items-center justify-between pt-2 text-xs text-indigo-800 font-black">
                <span>NET ACCOUNTING PROFIT (A - B):</span>
                <span class="${netIncomeProfit >= 0 ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}">${formatINR(netIncomeProfit)}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (window.lucide) window.lucide.createIcons();
  };

  window.exportReportsCSV = function() {
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
})();
