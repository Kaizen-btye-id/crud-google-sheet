function doPost(e) {
  console.log(JSON.stringify(e));

  try {
    const request = JSON.parse(e.postData.contents);
    console.log(JSON.stringify(request));

    // kode create/update/delete Anda di sini
  } catch (error) {
    console.error(error.message);

    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
const API_URL =
  'https://script.google.com/macros/s/AKfycbyXPD6-Q7uOkloLqS1NhHBPPPCxekAVq-eAxnnS4OB5UpDY0u4L5zIupKTiLC2OiGBR/exec';

const state = {
  records: [],
  filteredRecords: [],
  editingId: null
};

const elements = {
  form: document.getElementById('dataForm'),
  recordId: document.getElementById('recordId'),
  nama: document.getElementById('nama'),
  email: document.getElementById('email'),
  kategori: document.getElementById('kategori'),
  catatan: document.getElementById('catatan'),
  submitText: document.getElementById('submitText'),
  cancelEditButton: document.getElementById('cancelEditButton'),
  searchInput: document.getElementById('searchInput'),
  refreshButton: document.getElementById('refreshButton'),
  exportButton: document.getElementById('exportButton'),
  tableBody: document.getElementById('dataTableBody'),
  emptyState: document.getElementById('emptyState'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  alertContainer: document.getElementById('alertContainer')
};

document.addEventListener('DOMContentLoaded', () => {
  elements.form.addEventListener('submit', handleSubmit);
  elements.cancelEditButton.addEventListener('click', resetForm);
  elements.searchInput.addEventListener('input', applySearch);
  elements.refreshButton.addEventListener('click', loadData);
  elements.exportButton.addEventListener('click', exportCsv);

  loadData();
});

async function loadData() {
  setLoading(true);

  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Gagal mengambil data.');
    }

    state.records = Array.isArray(result.data) ? result.data : [];
    applySearch();
  } catch (error) {
    showAlert(error.message, 'danger');
  } finally {
    setLoading(false);
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!elements.form.checkValidity()) {
    elements.form.classList.add('was-validated');
    return;
  }

  const isEdit = Boolean(state.editingId);

  const payload = {
    action: isEdit ? 'update' : 'create',
    ID: state.editingId || '',
    Nama: elements.nama.value.trim(),
    Email: elements.email.value.trim(),
    Kategori: elements.kategori.value,
    Catatan: elements.catatan.value.trim()
  };

  setLoading(true);

  try {
    const result = await sendRequest(payload);

    showAlert(
      result.message || 'Operasi berhasil.',
      'success'
    );

    resetForm();
    await loadData();
  } catch (error) {
    showAlert(error.message, 'danger');
  } finally {
    setLoading(false);
  }
}

async function deleteRecord(id) {
  const confirmed = window.confirm(
    'Apakah Anda yakin ingin menghapus data ini?'
  );

  if (!confirmed) {
    return;
  }

  setLoading(true);

  try {
    const result = await sendRequest({
      action: 'delete',
      ID: id
    });

    showAlert(
      result.message || 'Data berhasil dihapus.',
      'success'
    );

    await loadData();
  } catch (error) {
    showAlert(error.message, 'danger');
  } finally {
    setLoading(false);
  }
}

async function sendRequest(payload) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || 'Operasi gagal.');
  }

  return result;
}

function applySearch() {
  const keyword = elements.searchInput.value
    .trim()
    .toLowerCase();

  state.filteredRecords = state.records.filter(record => {
    const searchableText = [
      record.Nama,
      record.Email,
      record.Kategori,
      record.Catatan
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(keyword);
  });

  renderTable();
}

function renderTable() {
  elements.tableBody.innerHTML = '';

  if (state.filteredRecords.length === 0) {
    elements.emptyState.classList.remove('d-none');
    return;
  }

  elements.emptyState.classList.add('d-none');

  state.filteredRecords.forEach((record, index) => {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeHtml(record.Nama)}</td>
      <td>${escapeHtml(record.Email)}</td>
      <td>
        <span class="badge text-bg-secondary">
          ${escapeHtml(record.Kategori)}
        </span>
      </td>
      <td class="truncate" title="${escapeHtml(record.Catatan)}">
        ${escapeHtml(record.Catatan)}
      </td>
      <td>${formatDate(record.UpdatedAt)}</td>
      <td>
        <div class="d-flex gap-1">
          <button
            class="btn btn-sm btn-outline-primary"
            data-action="edit"
            data-id="${escapeHtml(record.ID)}"
          >
            Edit
          </button>

          <button
            class="btn btn-sm btn-outline-danger"
            data-action="delete"
            data-id="${escapeHtml(record.ID)}"
          >
            Hapus
          </button>
        </div>
      </td>
    `;

    row.querySelector('[data-action="edit"]')
      .addEventListener('click', () => startEdit(record));

    row.querySelector('[data-action="delete"]')
      .addEventListener('click', () => deleteRecord(record.ID));

    elements.tableBody.appendChild(row);
  });
}

function startEdit(record) {
  state.editingId = record.ID;

  elements.recordId.value = record.ID;
  elements.nama.value = record.Nama || '';
  elements.email.value = record.Email || '';
  elements.kategori.value = record.Kategori || '';
  elements.catatan.value = record.Catatan || '';

  elements.submitText.textContent = 'Update Data';
  elements.cancelEditButton.classList.remove('d-none');

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function resetForm() {
  state.editingId = null;

  elements.form.reset();
  elements.form.classList.remove('was-validated');
  elements.recordId.value = '';

  elements.submitText.textContent = 'Simpan Data';
  elements.cancelEditButton.classList.add('d-none');
}

function exportCsv() {
  if (state.filteredRecords.length === 0) {
    showAlert('Tidak ada data untuk diekspor.', 'warning');
    return;
  }

  const headers = [
    'ID',
    'Nama',
    'Email',
    'Kategori',
    'Catatan',
    'CreatedAt',
    'UpdatedAt'
  ];

  const rows = state.filteredRecords.map(record => [
    record.ID,
    record.Nama,
    record.Email,
    record.Kategori,
    record.Catatan,
    record.CreatedAt,
    record.UpdatedAt
  ]);

  const csv = [
    headers,
    ...rows
  ]
    .map(row => row.map(csvEscape).join(','))
    .join('\n');

  const blob = new Blob(
    ['\uFEFF' + csv],
    { type: 'text/csv;charset=utf-8;' }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `data-${getDateForFilename()}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
  }

  return date.toLocaleString('id-ID');
}

function getDateForFilename() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function setLoading(isLoading) {
  elements.loadingOverlay.classList.toggle('show', isLoading);
}

function showAlert(message, type) {
  elements.alertContainer.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${escapeHtml(message)}
      <button
        type="button"
        class="btn-close"
        data-bs-dismiss="alert"
      ></button>
    </div>
  `;
}