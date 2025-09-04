document.addEventListener('DOMContentLoaded', () => {
    const selectAllCheckbox = document.getElementById('selectAll');
    const bookingCheckboxes = document.querySelectorAll('.booking-checkbox');
    const printInvoiceBtn = document.getElementById('print-invoice-btn');
    const totalAmountEl = document.getElementById('total-amount');
    const selectedCountEl = document.getElementById('selected-count');

    function updateTotals() {
        let total = 0;
        let count = 0;
        bookingCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                total += parseFloat(checkbox.dataset.price);
                count++;
            }
        });

        totalAmountEl.textContent = total.toFixed(2);
        selectedCountEl.textContent = count;

        if (count > 0) {
            printInvoiceBtn.disabled = false;
        } else {
            printInvoiceBtn.disabled = true;
        }
    }

    selectAllCheckbox.addEventListener('change', (e) => {
        bookingCheckboxes.forEach(checkbox => {
            checkbox.checked = e.target.checked;
        });
        updateTotals();
    });

    bookingCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (!checkbox.checked) {
                selectAllCheckbox.checked = false;
            } else {
                const allChecked = Array.from(bookingCheckboxes).every(cb => cb.checked);
                selectAllCheckbox.checked = allChecked;
            }
            updateTotals();
        });
    });

    printInvoiceBtn.addEventListener('click', () => {
        const selectedRows = Array.from(bookingCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.closest('tr'));

        if (selectedRows.length === 0) {
            alert('Please select at least one booking to generate an invoice.');
            return;
        }

        const hotelName = document.title.split(' - ')[0] || 'Hotel Management'; // Simple way to get hotel name
        const invoiceDate = new Date().toLocaleDateString();
        const totalAmount = totalAmountEl.textContent;
        
        let itemsHtml = '';
        selectedRows.forEach(row => {
            const bookingData = row.dataset;
            itemsHtml += `
                <tr class="item">
                    <td>${bookingData.guestName}</td>
                    <td>${bookingData.roomName}</td>
                    <td>${bookingData.checkIn} - ${bookingData.checkOut}</td>
                    <td class="text-right">$${parseFloat(bookingData.totalPrice).toFixed(2)}</td>
                </tr>
            `;
        });

        const invoiceHtml = `
            <html>
            <head>
                <title>Invoice</title>
                <style>
                    body { font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; text-align: center; color: #777; }
                    .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 16px; line-height: 24px; color: #555; }
                    .invoice-box table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; }
                    .invoice-box table td { padding: 5px; vertical-align: top; }
                    .invoice-box table tr.top table td { padding-bottom: 20px; }
                    .invoice-box table tr.top table td.title { font-size: 45px; line-height: 45px; color: #333; }
                    .invoice-box table tr.information table td { padding-bottom: 40px; }
                    .invoice-box table tr.heading td { background: #eee; border-bottom: 1px solid #ddd; font-weight: bold; }
                    .invoice-box table tr.details td { padding-bottom: 20px; }
                    .invoice-box table tr.item td { border-bottom: 1px solid #eee; }
                    .invoice-box table tr.item.last td { border-bottom: none; }
                    .invoice-box table tr.total td:nth-child(2) { border-top: 2px solid #eee; font-weight: bold; }
                    .text-right { text-align: right; }
                    @media print {
                        body, .invoice-box { -webkit-print-color-adjust: exact; }
                        .invoice-box { box-shadow: none; border: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="invoice-box">
                    <table>
                        <tr class="top">
                            <td colspan="4">
                                <table>
                                    <tr>
                                        <td class="title">
                                            <h2>${hotelName}</h2>
                                        </td>
                                        <td class="text-right">
                                            Invoice #: ${Date.now()}<br>
                                            Created: ${invoiceDate}<br>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr class="information">
                             <td colspan="4">
                                <table>
                                    <tr>
                                        <td>
                                            Consolidated Invoice<br>
                                            Multiple Guests
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr class="heading">
                            <td>Guest</td>
                            <td>Room</td>
                            <td>Stay Period</td>
                            <td class="text-right">Price</td>
                        </tr>
                        ${itemsHtml}
                         <tr class="total">
                            <td colspan="3" class="text-right" style="font-weight: bold;">Grand Total</td>
                            <td class="text-right" style="font-weight: bold;">$${totalAmount}</td>
                        </tr>
                    </table>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(invoiceHtml);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { // Allow content to load before printing
            printWindow.print();
            printWindow.close();
        }, 250);
    });
});