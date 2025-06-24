// public/js/accounting.js

document.addEventListener('DOMContentLoaded', () => {
  const hotelId = document.getElementById('accounting-page-data').dataset.hotelId;
  const generateReportBtn = document.getElementById('generate-report-btn');
  const startDateInput = document.getElementById('start-date');
  const endDateInput = document.getElementById('end-date');
  const entriesTbody = document.getElementById('entries-tbody');
  const netProfitEl = document.getElementById('net-profit');
  const totalIncomeEl = document.getElementById('total-income');
  const totalExpenseEl = document.getElementById('total-expense');

  // Helper function to format a Date object to a 'YYYY-MM-DD' string,
  // adjusting for the local timezone.
  const toISODateString = (date) => {
    const tzOffset = date.getTimezoneOffset() * 60000; // Timezone offset in milliseconds.
    const localISOTime = (new Date(date - tzOffset)).toISOString().slice(0, 10);
    return localISOTime;
  };

  // Set default dates to the current month
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  startDateInput.value = toISODateString(firstDay);
  endDateInput.value = toISODateString(lastDay);

  // Helper function to format currency in Indonesian Rupiah
  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(number).replace(/\s?IDR/, 'Rp'); // Format to 'Rp'
  };

  const fetchAndRenderEntries = async () => {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    let url = `/api/accountings?hotel=${hotelId}`;
    if (startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch accounting data');
      }
      const data = await response.json();

      // Clear existing table rows
      entriesTbody.innerHTML = '';

      // Render new rows
      data.entries.forEach(entry => {
        const row = document.createElement('tr');
        const amount = parseFloat(entry.amount);
        row.innerHTML = `
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${new Date(entry.date).toLocaleDateString('id-ID')}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${entry.description}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm ${entry.type === 'income' ? 'text-green-600' : 'text-red-600'}">${entry.type === 'income' ? 'Income' : 'Expense'}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${amount.toLocaleString('id-ID')}</td>
        `;
        entriesTbody.appendChild(row);
      });

      // Update summary
      totalIncomeEl.textContent = `Total Income: ${formatRupiah(data.totalIncome)}`;
      totalExpenseEl.textContent = `Total Expense: ${formatRupiah(data.totalExpense)}`;
      netProfitEl.textContent = `Net Profit: ${formatRupiah(data.netProfit)}`;

    } catch (error) {
      console.error('Error fetching accounting data:', error);
      alert('Could not load accounting data.');
    }
  };

  // Fetch initial data on page load using the default dates
  fetchAndRenderEntries();

  // Add event listener for the button to generate reports for different date ranges
  generateReportBtn.addEventListener('click', fetchAndRenderEntries);
});
