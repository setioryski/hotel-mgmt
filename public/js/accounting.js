// public/js/accounting.js

document.addEventListener('DOMContentLoaded', () => {
  // Grab hotelId from the page
  const hotelId = document
    .getElementById('accounting-page-data')
    .dataset.hotelId;

  // --- START: Date Logic ---
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed (0 for January)

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0); // Day 0 of next month is last day of current

  // Helper function to format date as YYYY-MM-DD for input fields
  const formatDate = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  };

  const defaultStartDate = formatDate(firstDayOfMonth);
  const defaultEndDate = formatDate(lastDayOfMonth);
  const todayDate = formatDate(today);
  // --- END: Date Logic ---

  // Elements
  const startInput = document.getElementById('start-date');
  const endInput   = document.getElementById('end-date');
  const genBtn     = document.getElementById('generate-report-btn');
  const clearBtn   = document.getElementById('clear-filter-btn');
  const addBtn     = document.getElementById('add-entry-btn');
  const modal      = document.getElementById('add-entry-modal');
  const cancelBtn  = document.getElementById('cancel-add-entry-btn');
  const form       = document.getElementById('add-entry-form');
  const tableBody  = document.getElementById('entries-tbody');
  const tableLoading = document.getElementById('entries-loading');
  const totalInc   = document.getElementById('total-income');
  const totalExp   = document.getElementById('total-expense');
  const netProfit  = document.getElementById('net-profit');

  // Set default values for date inputs
  startInput.value = defaultStartDate;
  endInput.value = defaultEndDate;

  // Fetch & render entries + summary
  async function loadEntries(startDate = '', endDate = '') {
    tableBody.innerHTML = ''; // Clear existing entries
    tableLoading.classList.remove('hidden'); // Show loader

    let url = `/api/accountings?hotel=${hotelId}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate)   url += `&endDate=${endDate}`;

    try {
      const res = await fetch(url);
      const { entries, totalIncome, totalExpense, netProfit: net } = await res.json();

      tableLoading.classList.add('hidden'); // Hide loader

      // Summary
      totalInc.textContent = `Total Income: Rp${totalIncome.toLocaleString()}`;
      totalExp.textContent = `Total Expense: Rp${totalExpense.toLocaleString()}`;
      netProfit.textContent = `Net Profit: Rp${net.toLocaleString()}`;

      // Handle empty state
      if (entries.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="4" class="text-center p-8">
              <h3 class="text-lg font-medium text-gray-800">No Entries Found</h3>
              <p class="text-sm text-gray-500 mt-1">Try adjusting the date filters or add a new entry.</p>
            </td>
          </tr>
        `;
        return;
      }

      // *** NEW: Sort entries by date descending (newest first) ***
      entries.sort((a, b) => b.date.localeCompare(a.date));

      // Table rows
      tableBody.innerHTML = entries
        .map(e => {
          const isIncome = e.type === 'income';
          const amountColorClass = isIncome ? 'text-green-600' : 'text-red-600';
          const amountPrefix = isIncome ? '+' : '-';

          return `
            <tr>
              <td class="px-6 py-4 whitespace-nowrap">${e.date}</td>
              <td class="px-6 py-4">${e.description || '-'}</td>
              <td class="px-6 py-4 capitalize">${e.type}</td>
              <td class="px-6 py-4 text-right font-medium ${amountColorClass}">
                ${amountPrefix} ${parseFloat(e.amount).toLocaleString()}
              </td>
            </tr>
          `;
        }).join('');

    } catch (error) {
      tableLoading.classList.add('hidden');
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center p-8 text-red-600">
            Failed to load data. Please try again later.
          </td>
        </tr>
      `;
      console.error('Error loading accounting entries:', error);
    }
  }

  // Generate report handler
  genBtn.addEventListener('click', () => {
    loadEntries(startInput.value, endInput.value);
  });

  // Clear filter handler
  clearBtn.addEventListener('click', () => {
    startInput.value = '';
    endInput.value = '';
    loadEntries();
  });

  // Show add-entry modal
  addBtn.addEventListener('click', () => {
    // Set default date to today when opening modal
    form.date.value = todayDate;
    modal.classList.remove('hidden');
  });

  // Hide add-entry modal
  cancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    form.reset();
  });

  // Submit new entry
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Adding...';

    const formData = {
      type:        form.type.value,
      date:        form.date.value,
      description: form.description.value,
      amount:      form.amount.value,
    };

    try {
      const response = await fetch(`/api/accountings?hotel=${hotelId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to add entry. The server responded with an error.');
      }

      modal.classList.add('hidden');
      form.reset();
      // Reload entries to show the new one, using the current date filters
      loadEntries(startInput.value, endInput.value);

    } catch (error) {
      console.error(error);
      alert('Could not add the entry. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Add Entry';
    }
  });

  // Initial load with default start and end dates of the current month
  loadEntries(defaultStartDate, defaultEndDate);
});