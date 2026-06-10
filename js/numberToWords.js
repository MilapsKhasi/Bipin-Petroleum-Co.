// Indian Numbering System Currency Word Converter

function numberToWords(num) {
  if (num === 0) return 'Rupees Zero Only';
  const rounded = Math.round(num * 100) / 100;
  const parts = rounded.toString().split('.');
  const rupees = parseInt(parts[0], 10);
  const paise = parts[1] ? parseInt(parts[1].padEnd(2, '0').slice(0, 2), 10) : 0;

  function convertLessThanOneThousand(n) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                   'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 105 || n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  }

  function convertIndian(n) {
    if (n === 0) return '';
    let result = '';
    
    // Crores (1,00,00,000)
    if (n >= 10000000) {
      result += convertIndian(Math.floor(n / 10000000)) + ' Crore ';
      n %= 10000000;
    }
    // Lakhs (1,00,000)
    if (n >= 100000) {
      result += convertLessThanOneThousand(Math.floor(n / 100000)) + ' Lakh ';
      n %= 100000;
    }
    // Thousands (1,000)
    if (n >= 1000) {
      result += convertLessThanOneThousand(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }
    // Hundreds & units
    if (n > 0) {
      result += convertLessThanOneThousand(n) + ' ';
    }
    return result.trim();
  }

  let words = '';
  if (rupees > 0) {
    words += convertIndian(rupees) + ' Rupees';
  }
  if (paise > 0) {
    if (rupees > 0) words += ' and ';
    words += convertLessThanOneThousand(paise) + ' Paise';
  }
  return words ? words + ' Only' : 'Rupees Zero Only';
}

window.numberToWords = numberToWords;
