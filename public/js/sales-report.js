document.addEventListener('DOMContentLoaded', () => {
    const selectAllCheckbox = document.getElementById('selectAll');
    const bookingCheckboxes = document.querySelectorAll('.booking-checkbox');
    const printInvoiceBtn = document.getElementById('print-invoice-btn');
    const totalAmountEl = document.getElementById('total-amount');
    const selectedCountEl = document.getElementById('selected-count');
    const companyNameInput = document.getElementById('companyName');

    function formatRupiah(number) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(number);
    }

    function updateTotals() {
        let total = 0;
        let count = 0;
        bookingCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                total += parseFloat(checkbox.dataset.price);
                count++;
            }
        });

        totalAmountEl.textContent = formatRupiah(total);
        selectedCountEl.textContent = count;
        printInvoiceBtn.disabled = count <= 0;
    }

    selectAllCheckbox.addEventListener('change', (e) => {
        bookingCheckboxes.forEach(checkbox => { checkbox.checked = e.target.checked; });
        updateTotals();
    });

    bookingCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            selectAllCheckbox.checked = Array.from(bookingCheckboxes).every(cb => cb.checked);
            updateTotals();
        });
    });

    printInvoiceBtn.addEventListener('click', async () => {
        const selectedRows = Array.from(bookingCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.closest('tr'));

        if (selectedRows.length === 0) {
            alert('Please select at least one booking to generate a document.');
            return;
        }

        let settings = {};
        try {
            const urlParts = window.location.pathname.split('/');
            const hotelId = urlParts[3];
            const response = await fetch(`/api/settings/${hotelId}/invoice`);
            if (!response.ok) throw new Error('Could not load invoice settings.');
            settings = await response.json();
        } catch (error) {
            console.error(error);
            alert(error.message);
            return;
        }

        const companyName = companyNameInput.value.trim();
        const hotelName = document.title.split(' - ')[0] || 'Hotel Management';
        const printDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        
        let totalForPrint = 0;
        let itemsHtml = '';
        selectedRows.forEach(row => {
            const bookingData = row.dataset;
            const price = parseFloat(bookingData.totalPrice);
            totalForPrint += price;
            itemsHtml += `
                <tr class="item">
                    <td>${bookingData.guestName}</td>
                    <td>${bookingData.roomName}</td>
                    <td>${bookingData.checkIn} - ${bookingData.checkOut}</td>
                    <td class="text-right">${formatRupiah(price)}</td>
                </tr>
            `;
        });
        
        const totalAmountFormatted = formatRupiah(totalForPrint);

        // ## LOGIKA DIPERBARUI ##
        // Jika nama perusahaan diisi, buat blok "Billed To". Jika tidak, biarkan kosong.
        let clientInfoHtml = ''; 
        if (companyName) {
            clientInfoHtml = `
                <div style="margin: 40px 0;">
                    <strong>Billed To:</strong><br>
                    <b>${companyName}</b>
                </div>
            `;
        }

        const invoiceHtml = `
            <html>
            <head>
                <title>Report - ${hotelName}</title>
                <style>
                    body { font-family: Arial, sans-serif; color: #333; }
                    .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 16px; line-height: 24px; }
                    .invoice-box table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; }
                    .invoice-box table td { padding: 8px; vertical-align: top; }
                    .header-table td { padding: 5px; }
                    .items-table td { border-bottom: 1px solid #eee; }
                    .items-table .heading td { background: #f2f2f2; border-bottom: 2px solid #ddd; font-weight: bold; }
                    .items-table .item.last td { border-bottom: none; }
                    .totals-table td { border-top: 2px solid #eee; font-weight: bold; }
                    .text-right { text-align: right; }
                    .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #777; }
                </style>
            </head>
            <body>
                <div class="invoice-box">
                    <table class="header-table">
                        <tr>
                            <td style="width: 60%;">
                                <h1 style="font-size: 2.5em; margin: 0;">${hotelName}</h1>
                                ${settings.address || ''}<br>
                                ${settings.email || ''}<br>
                                ${settings.phone || ''}
                            </td>
                            <td class="text-right">
                                <strong>Report</strong><br>
                                Date: ${printDate}
                            </td>
                        </tr>
                    </table>
                    
                    ${clientInfoHtml}

                    <table class="items-table">
                        <tr class="heading">
                            <td>Guest</td>
                            <td>Room</td>
                            <td>Stay Period</td>
                            <td class="text-right">Price</td>
                        </tr>
                        ${itemsHtml}
                    </table>

                    <table style="width: 100%; margin-top: 20px;">
                        <tr>
                            <td style="width: 60%;"></td>
                            <td style="width: 40%;">
                                <table class="totals-table" style="width: 100%;">
                                    <tr>
                                        <td><strong>Grand Total</strong></td>
                                        <td class="text-right"><strong>${totalAmountFormatted}</strong></td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <div class="footer">
                        ${settings.footerQuote || 'Thank you for your business.'}
                    </div>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(invoiceHtml);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { 
            printWindow.print();
            printWindow.close();
        }, 250);
    });

    // Initial update on page load
    updateTotals();
});