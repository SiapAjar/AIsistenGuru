/* ============================================================
   MODUL AJAR AI - APP.JS FINAL
   Kompatibel dengan index.html terbaru
   ============================================================ */


/* ============================================================
   KONFIGURASI
   ============================================================ */

const API_URL =
  'https://script.google.com/macros/s/AKfycbwyd66NfVG5_TvbNTt88ixZrDH2kP5wfjXcVyyna9JdEV-bSzOXHQsTEtOCxEvrKYCP/exec';


/* ============================================================
   STATE
   ============================================================ */

let state = {
  user: null,
  profile: null,
  module: null,
  result: null,
  payment: null
};


/* ============================================================
   DOM HELPER
   ============================================================ */

const $ = selector =>
  document.querySelector(selector);

const $$ = selector =>
  Array.from(
    document.querySelectorAll(selector)
  );


/* ============================================================
   SCREEN
   ============================================================ */

function showScreen(id) {

  $$('.screen').forEach(screen => {
    screen.classList.remove('active');
  });

  const target =
    document.getElementById(id);

  if (target) {
    target.classList.add('active');
  }

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


/* ============================================================
   MESSAGE
   ============================================================ */

function setMsg(
  id,
  text,
  type = ''
) {

  const el =
    document.getElementById(id);

  if (!el) return;

  el.textContent =
    text || '';

  el.className =
    'msg ' + type;
}


/* ============================================================
   API
   ============================================================ */

async function api(
  action,
  payload = {}
) {

  if (
    !API_URL ||
    API_URL.includes('PASTE_')
  ) {

    throw new Error(
      'API_URL belum diisi di app.js.'
    );
  }

  let response;

  try {

    response =
      await fetch(
        API_URL,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'text/plain;charset=utf-8'
          },

          body: JSON.stringify({
            action,
            ...payload
          })
        }
      );

  } catch (error) {

    console.error(
      'FETCH ERROR:',
      error
    );

    throw new Error(
      'Tidak dapat terhubung ke server Apps Script. Periksa deployment Web App dan URL API.'
    );
  }


  const text =
    await response.text();


  let data;

  try {

    data =
      JSON.parse(text);

  } catch (error) {

    console.error(
      'SERVER RESPONSE:',
      text
    );

    throw new Error(
      'Server tidak mengembalikan JSON. Pastikan Apps Script sudah di-deploy sebagai Web App dan aksesnya "Anyone".'
    );
  }


  if (
    data &&
    data.ok === false
  ) {

    throw new Error(
      data.error ||
      data.message ||
      'Terjadi kesalahan pada server.'
    );
  }


  return data;
}


/* ============================================================
   TOKEN
   ============================================================ */

function getToken() {

  return (
    state.user?.token ||
    localStorage.getItem('ma_token') ||
    ''
  );
}


/* ============================================================
   PHASE
   ============================================================ */

function phaseFor(grade) {

  const g =
    String(grade || '');

  if (
    g === '1' ||
    g === '2'
  ) {
    return 'A';
  }

  if (
    g === '3' ||
    g === '4'
  ) {
    return 'B';
  }

  if (
    g === '5' ||
    g === '6'
  ) {
    return 'C';
  }

  return '';
}


/* ============================================================
   MONEY
   ============================================================ */

function money(value) {

  return (
    'Rp ' +
    Number(value || 0)
      .toLocaleString('id-ID')
  );
}


/* ============================================================
   ESCAPE HTML
   ============================================================ */

function esc(value) {

  return String(
    value ?? ''
  ).replace(
    /[&<>"']/g,
    char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char])
  );
}


/* ============================================================
   FORMAT VALUE
   Menghindari [object Object]
   ============================================================ */

function valueText(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }


  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {

    return String(value);
  }


  if (Array.isArray(value)) {

    return value
      .map(item =>
        valueText(item)
      )
      .join('\n');
  }


  if (
    typeof value === 'object'
  ) {

    const parts = [];

    Object.entries(value)
      .forEach(
        ([key, val]) => {

          if (
            val === null ||
            val === undefined ||
            val === ''
          ) {
            return;
          }

          parts.push(
            `${prettyLabel(key)}: ${valueText(val)}`
          );
        }
      );

    return parts.join('\n');
  }


  return String(value);
}


/* ============================================================
   LABEL
   ============================================================ */

function prettyLabel(key) {

  return String(key || '')
    .replace(
      /([a-z])([A-Z])/g,
      '$1 $2'
    )
    .replace(
      /_/g,
      ' '
    )
    .replace(
      /^./,
      c => c.toUpperCase()
    );
}


/* ============================================================
   MARKDOWN SEDERHANA
   ============================================================ */

function md(value) {

  const text =
    valueText(value);

  return esc(text)
    .replace(
      /\*\*(.*?)\*\*/g,
      '<strong>$1</strong>'
    )
    .replace(
      /^### (.*)$/gm,
      '<h4>$1</h4>'
    )
    .replace(
      /^## (.*)$/gm,
      '<h3>$1</h3>'
    )
    .replace(
      /^# (.*)$/gm,
      '<h2>$1</h2>'
    )
    .replace(
      /^[-•] (.*)$/gm,
      '<li>$1</li>'
    )
    .replace(
      /\n/g,
      '<br>'
    );
}


/* ============================================================
   RENDER TABLE
   ============================================================ */

function renderTable(rows) {

  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    return '';
  }


  const normalized =
    rows.map(row => {

      if (
        Array.isArray(row)
      ) {

        return row.map(
          valueText
        );
      }


      if (
        row &&
        typeof row === 'object'
      ) {

        return Object.entries(row)
          .map(
            ([key, value]) =>
              ({
                key:
                  prettyLabel(key),
                value:
                  valueText(value)
              })
          );
      }


      return [
        {
          key: '',
          value:
            valueText(row)
        }
      ];
    });


  const objectRows =
    normalized.filter(
      row =>
        row.length &&
        typeof row[0] === 'object'
    );


  if (
    objectRows.length > 0
  ) {

    const headers = [
      ...new Set(
        objectRows.flatMap(
          row =>
            row.map(
              x => x.key
            )
        )
      )
    ];


    let html =
      '<table class="doc-table"><thead><tr>';


    headers.forEach(
      header => {

        html +=
          `<th>${esc(header)}</th>`;
      }
    );


    html +=
      '</tr></thead><tbody>';


    objectRows.forEach(
      row => {

        html += '<tr>';

        headers.forEach(
          header => {

            const found =
              row.find(
                x =>
                  x.key ===
                  header
              );

            html +=
              `<td>${md(found?.value || '')}</td>`;
          }
        );

        html += '</tr>';
      }
    );


    html +=
      '</tbody></table>';

    return html;
  }


  let html =
    '<table class="doc-table"><tbody>';


  normalized.forEach(
    row => {

      html += '<tr>';

      row.forEach(
        cell => {

          html +=
            `<td>${md(cell)}</td>`;
        }
      );

      html += '</tr>';
    }
  );


  html +=
    '</tbody></table>';

  return html;
}


/* ============================================================
   RENDER STRUCTURED DOCUMENT
   ============================================================ */

function renderStructured(
  value,
  level = 0
) {

  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }


  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {

    return md(value);
  }


  if (
    Array.isArray(value)
  ) {

    if (
      value.length === 0
    ) {
      return '';
    }


    const table =
      renderTable(value);

    if (table) {
      return table;
    }


    return value
      .map(
        item =>
          `<div class="doc-item">
            ${renderStructured(
              item,
              level + 1
            )}
          </div>`
      )
      .join('');
  }


  if (
    typeof value === 'object'
  ) {

    let html = '';


    Object.entries(value)
      .forEach(
        ([key, val]) => {

          if (
            val === null ||
            val === undefined ||
            val === ''
          ) {
            return;
          }


          const label =
            prettyLabel(key);


          if (
            Array.isArray(val)
          ) {

            html += `
              <div class="doc-block">
                <h3>${esc(label)}</h3>
                ${renderStructured(val, level + 1)}
              </div>
            `;

            return;
          }


          if (
            typeof val === 'object'
          ) {

            html += `
              <div class="doc-block">
                <h3>${esc(label)}</h3>
                ${renderStructured(val, level + 1)}
              </div>
            `;

            return;
          }


          html += `
            <div class="doc-block">
              <h3>${esc(label)}</h3>
              <div>${md(val)}</div>
            </div>
          `;
        }
      );


    return html;
  }


  return md(value);
}


/* ============================================================
   DOKUMEN DEFINITIONS
   ============================================================ */

const DOCUMENT_DEFS = [

  {
    key: 'analisisCP',
    number: '1',
    title: 'Analisis CP',
    file: 'Analisis_CP'
  },

  {
    key: 'tujuanPembelajaran',
    number: '2',
    title: 'Tujuan Pembelajaran',
    file: 'Tujuan_Pembelajaran'
  },

  {
    key: 'atp',
    number: '3',
    title: 'Alur Tujuan Pembelajaran (ATP)',
    file: 'ATP'
  },

  {
    key: 'prota',
    number: '4',
    title: 'Program Tahunan (Prota)',
    file: 'Prota'
  },

  {
    key: 'promes',
    number: '5',
    title: 'Program Semester (Promes)',
    file: 'Promes'
  },

  {
    key: 'kktp',
    number: '6',
    title: 'KKTP',
    file: 'KKTP'
  },

  {
    key: 'modulAjar',
    number: '7',
    title: 'Modul Ajar',
    file: 'Modul_Ajar'
  }

];


/* ============================================================
   USER BADGE
   ============================================================ */

function renderUser() {

  const badge =
    $('#userBadge');

  if (!badge) return;


  if (!state.user) {

    badge.textContent = '';

    return;
  }


  badge.textContent =
    `${state.user.name || state.user.email || ''} • ${
      state.user.role === 'admin'
        ? 'ADMIN'
        : state.user.premium
          ? 'PREMIUM'
          : 'BELUM PREMIUM'
    }`;
}


/* ============================================================
   PAYMENT SCREEN
   ============================================================ */

function setupPaymentScreen(
  summary,
  user,
  paymentToken
) {

  state.payment =
    summary || null;


  if (paymentToken) {

    sessionStorage.setItem(
      'payment_token',
      paymentToken
    );
  }


  sessionStorage.setItem(
    'payment_user',
    JSON.stringify(
      user || {}
    )
  );


  if ($('#payName')) {

    $('#payName').value =
      user?.name || '';
  }


  if ($('#payEmail')) {

    $('#payEmail').value =
      user?.email || '';
  }


  if ($('#payNip')) {

    $('#payNip').value =
      state.profile?.teacherNip ||
      '';
  }


  if ($('#payBase')) {

    $('#payBase').textContent =
      money(
        summary?.basePrice
      );
  }


  if ($('#payCode')) {

    $('#payCode').textContent =
      money(
        summary?.uniqueCode
      );
  }


  if ($('#payTotal')) {

    $('#payTotal').textContent =
      money(
        summary?.totalAmount
      );
  }


  if ($('#payExpiry')) {

    $('#payExpiry').textContent =
      summary?.expiresAt
        ? 'Kode berlaku sampai ' +
          new Date(
            summary.expiresAt
          ).toLocaleString(
            'id-ID'
          )
        : '';
  }


  showScreen(
    'payment'
  );
}


/* ============================================================
   LOAD PROFILE
   ============================================================ */

async function loadProfile() {

  const token =
    getToken();


  if (!token) {

    throw new Error(
      'Token sesi tidak ditemukan. Silakan masuk lagi.'
    );
  }


  const data =
    await api(
      'me',
      {
        token
      }
    );


  state.user = {
    ...(state.user || {}),
    ...(data.user || {}),
    token
  };


  state.profile =
    data.profile || {};


  localStorage.setItem(
    'ma_user',
    JSON.stringify(
      state.user
    )
  );


  localStorage.setItem(
    'ma_profile',
    JSON.stringify(
      state.profile
    )
  );


  fillProfile();

  syncModuleIdentity();
}


/* ============================================================
   FILL PROFILE
   ============================================================ */

function fillProfile() {

  const form =
    $('#profileForm');

  if (!form) return;


  Object.entries(
    state.profile || {}
  ).forEach(
    ([key, value]) => {

      const field =
        form.elements[key];

      if (!field) return;

      field.value =
        value ?? '';
    }
  );


  const teacher =
    $('#teacherName');

  if (teacher) {

    teacher.value =
      state.user?.name ||
      state.profile?.teacherName ||
      '';
  }


  const grade =
    form.elements.grade;

  const phase =
    form.elements.phase;

  if (
    grade &&
    phase
  ) {

    phase.value =
      phaseFor(
        grade.value
      );
  }
}


/* ============================================================
   SYNC MODULE IDENTITY
   ============================================================ */

function syncModuleIdentity() {

  const p =
    state.profile || {};

  if ($('#mSchool')) {

    $('#mSchool').value =
      p.school || '';
  }


  if ($('#mTeacher')) {

    $('#mTeacher').value =
      p.teacherName ||
      state.user?.name ||
      '';
  }


  if ($('#mTeacherNip')) {

    $('#mTeacherNip').value =
      p.teacherNip || '';
  }


  if ($('#mPrincipal')) {

    $('#mPrincipal').value =
      p.principalName || '';
  }


  if ($('#mPrincipalNip')) {

    $('#mPrincipalNip').value =
      p.principalNip || '';
  }


  if ($('#mSign')) {

    $('#mSign').value =
      p.signPlaceDate || '';
  }


  if ($('#mGrade')) {

    $('#mGrade').value =
      p.grade || '';
  }


  if ($('#moduleCP')) {

    $('#moduleCP').value =
      p.cp || '';
  }
}


/* ============================================================
   COLLECT PROFILE
   ============================================================ */

function collectProfileForm() {

  const form =
    $('#profileForm');


  if (!form) {

    throw new Error(
      'Form data satuan pendidikan tidak ditemukan.'
    );
  }


  const profile =
    Object.fromEntries(
      new FormData(form)
    );


  profile.phase =
    phaseFor(
      profile.grade
    );


  return profile;
}


/* ============================================================
   COLLECT MODULE
   ============================================================ */

function collectModuleForm() {

  const form =
    $('#moduleForm');


  if (!form) {

    throw new Error(
      'Form Modul Ajar tidak ditemukan.'
    );
  }


  const module =
    Object.fromEntries(
      new FormData(form)
    );


  module.dimensions =
    $$('#dimensions input:checked')
      .map(
        input =>
          input.value
      );


  if (
    module.pedagogy ===
    'Lainnya'
  ) {

    module.pedagogy =
      module.otherPedagogy ||
      'Pendekatan lain';
  }


  return module;
}


/* ============================================================
   LOGIN
   ============================================================ */

async function handleLogin(
  event
) {

  event.preventDefault();


  setMsg(
    'loginMsg',
    'Memeriksa akun...'
  );


  const form =
    event.target;


  const data =
    Object.fromEntries(
      new FormData(form)
    );


  try {

    const response =
      await api(
        'login',
        data
      );


    /*
     * Backend Anda sebelumnya
     * mengembalikan token di:
     *
     * response.token
     *
     * atau:
     *
     * response.user.token
     */

    const token =
      response.token ||
      response.user?.token ||
      '';


    if (!token) {

      throw new Error(
        'Login berhasil tetapi token sesi tidak diterima dari server.'
      );
    }


    state.user = {
      ...(response.user || {}),
      token
    };


    localStorage.setItem(
      'ma_user',
      JSON.stringify(
        state.user
      )
    );


    localStorage.setItem(
      'ma_token',
      token
    );


    renderUser();


    /*
     * ADMIN
     */

    if (
      state.user.role ===
      'admin'
    ) {

      await loadAdmin();

      return;
    }


    /*
     * BELUM PREMIUM
     */

    if (
      !state.user.premium
    ) {

      if (
        state.user.status ===
        'payment_review'
      ) {

        setMsg(
          'loginMsg',
          'Pembayaran sedang diperiksa admin. Silakan tunggu persetujuan.',
          'success'
        );

        return;
      }


      setupPaymentScreen(
        response.paymentSummary ||
        {},
        state.user,
        response.paymentToken
      );

      return;
    }


    /*
     * PREMIUM
     */

    await loadProfile();

    showScreen(
      'dashboard'
    );


  } catch (error) {

    console.error(
      'LOGIN ERROR:',
      error
    );


    setMsg(
      'loginMsg',
      error.message ||
      'Login gagal.',
      'error'
    );
  }
}


/* ============================================================
   SAVE PROFILE
   ============================================================ */

async function handleProfileSubmit(
  event
) {

  event.preventDefault();


  const button =
    event.target.querySelector(
      'button[type="submit"]'
    );


  const oldText =
    button?.textContent;


  try {

    const token =
      getToken();


    if (!token) {

      throw new Error(
        'Sesi login tidak ditemukan. Silakan masuk lagi.'
      );
    }


    const profile =
      collectProfileForm();


    if (
      !profile.school ||
      !profile.subject ||
      !profile.abbr ||
      !profile.grade ||
      !profile.hours ||
      !profile.year ||
      !profile.signPlaceDate ||
      !profile.teacherName ||
      !profile.principalName
    ) {

      throw new Error(
        'Mohon lengkapi semua data wajib.'
      );
    }


    if (button) {

      button.disabled =
        true;

      button.textContent =
        'Menyimpan data...';
    }


    const response =
      await api(
        'saveProfile',
        {
          token,
          profile
        }
      );


    state.profile =
      response.profile ||
      profile;


    localStorage.setItem(
      'ma_profile',
      JSON.stringify(
        state.profile
      )
    );


    syncModuleIdentity();


    showScreen(
      'module'
    );


  } catch (error) {

    console.error(
      'SAVE PROFILE ERROR:',
      error
    );


    alert(
      error.message ||
      'Gagal menyimpan data.'
    );


  } finally {

    if (button) {

      button.disabled =
        false;

      button.textContent =
        oldText ||
        'Lanjut ke Modul Ajar →';
    }
  }
}


/* ============================================================
   GET CP
   ============================================================ */

async function getCP(
  useModule = false
) {

  const token =
    getToken();


  if (!token) {

    alert(
      'Sesi login tidak ditemukan. Silakan masuk lagi.'
    );

    showScreen(
      'login'
    );

    return;
  }


  let button;


  if (useModule) {

    button =
      document.querySelector(
        '#moduleCP'
      )
        ?.closest('.grid-form')
        ?.querySelector(
          'button'
        );

  } else {

    button =
      document.querySelector(
        '#cp'
      )
        ?.closest('.toolbar')
        ?.querySelector(
          'button'
        );
  }


  const oldText =
    button?.textContent;


  if (button) {

    button.disabled =
      true;

    button.textContent =
      'Mengambil CP...';
  }


  try {

    let profile;


    if (useModule) {

      profile = {
        ...(state.profile || {}),

        grade:
          $('#mGrade')?.value ||
          state.profile?.grade ||
          '',

        subject:
          state.profile?.subject ||
          '',

        abbr:
          state.profile?.abbr ||
          '',

        phase:
          phaseFor(
            $('#mGrade')?.value ||
            state.profile?.grade
          )
      };

    } else {

      profile =
        collectProfileForm();
    }


    const response =
      await api(
        'getCP',
        {
          token,
          profile
        }
      );


    const cp =
      response.cp ||
      response.result?.cp ||
      response.data?.cp ||
      '';


    if (!cp) {

      throw new Error(
        'CP belum tersedia dari database/server.'
      );
    }


    if (useModule) {

      if ($('#moduleCP')) {

        $('#moduleCP').value =
          cp;
      }

    } else {

      if ($('#cp')) {

        $('#cp').value =
          cp;
      }


      if ($('#cpSource')) {

        $('#cpSource').textContent =
          response.source ||
          response.cpSource ||
          'CP berhasil diambil otomatis.';
      }
    }


  } catch (error) {

    console.error(
      'GET CP ERROR:',
      error
    );


    alert(
      error.message ||
      'Gagal mengambil CP.'
    );


  } finally {

    if (button) {

      button.disabled =
        false;

      button.textContent =
        oldText ||
        'Ambil CP Otomatis';
    }
  }
}


/* ============================================================
   SUGGEST TP
   ============================================================ */

async function suggestTP() {

  const token =
    getToken();


  if (!token) {

    alert(
      'Sesi login tidak ditemukan.'
    );

    showScreen(
      'login'
    );

    return;
  }


  const button =
    document.querySelector(
      '#tp'
    )
      ?.closest('.compact')
      ?.querySelector(
        'button'
      );


  const oldText =
    button?.textContent;


  if (button) {

    button.disabled =
      true;

    button.textContent =
      'AI sedang menyusun TP...';
  }


  try {

    const module =
      collectModuleForm();


    const response =
      await api(
        'suggestTP',
        {
          token,

          profile:
            state.profile || {},

          module
        }
      );


    const tp =
      response.tp ||
      response.result?.tp ||
      response.data?.tp ||
      '';


    if (!tp) {

      throw new Error(
        'Saran TP tidak dikembalikan server.'
      );
    }


    $('#tp').value =
      tp;


  } catch (error) {

    console.error(
      'SUGGEST TP ERROR:',
      error
    );


    alert(
      error.message ||
      'Gagal membuat saran TP.'
    );


  } finally {

    if (button) {

      button.disabled =
        false;

      button.textContent =
        oldText ||
        '✨ Saran TP dari AI';
    }
  }
}


/* ============================================================
   GENERATE 7 DOCUMENTS
   ============================================================ */

async function handleModuleSubmit(
  event
) {

  event.preventDefault();


  const token =
    getToken();


  if (!token) {

    alert(
      'Sesi login tidak ditemukan. Silakan masuk lagi.'
    );

    showScreen(
      'login'
    );

    return;
  }


  const button =
    event.target.querySelector(
      'button[type="submit"]'
    );


  const oldText =
    button?.textContent;


  try {

    const module =
      collectModuleForm();


    state.module =
      module;


    if (button) {

      button.disabled =
        true;

      button.textContent =
        '🚀 AI sedang menyusun 7 dokumen...';
    }


    const response =
      await api(
        'generateDocuments',
        {
          token,

          profile:
            state.profile || {},

          module
        }
      );


    if (
      !response.result
    ) {

      throw new Error(
        'Server tidak mengembalikan hasil 7 dokumen.'
      );
    }


    state.result =
      response.result;


    renderResult();


    showScreen(
      'result'
    );


  } catch (error) {

    console.error(
      'GENERATE DOCUMENT ERROR:',
      error
    );


    alert(
      error.message ||
      'Gagal membuat perangkat ajar.'
    );


  } finally {

    if (button) {

      button.disabled =
        false;

      button.textContent =
        oldText ||
        '🚀 Buat Modul Ajar dengan AI';
    }
  }
}


/* ============================================================
   DOCUMENT IDENTITY
   ============================================================ */

function documentIdentity() {

  const p =
    state.profile || {};


  return `
    <div class="doc-identity">

      <table>

        <tr>
          <td><b>Satuan Pendidikan</b></td>
          <td>${esc(p.school)}</td>
        </tr>

        <tr>
          <td><b>Mata Pelajaran</b></td>
          <td>${esc(p.subject)}</td>
        </tr>

        <tr>
          <td><b>Kelas</b></td>
          <td>${esc(p.grade)}</td>
        </tr>

        <tr>
          <td><b>Fase</b></td>
          <td>${esc(p.phase || phaseFor(p.grade))}</td>
        </tr>

        <tr>
          <td><b>Tahun Pelajaran</b></td>
          <td>${esc(p.year)}</td>
        </tr>

      </table>

    </div>
  `;
}


/* ============================================================
   SIGNATURE
   ============================================================ */

function signatureBlock() {

  const p =
    state.profile || {};


  return `
    <div class="doc-signature">

      <table>

        <tr>

          <td>

            Mengetahui,<br>
            Kepala Sekolah

            <br><br><br><br>

            <strong>
              ${esc(p.principalName)}
            </strong>

            <br>

            NIP.
            ${esc(p.principalNip)}

          </td>


          <td>

            ${esc(p.signPlaceDate)}

            <br>

            Guru Mata Pelajaran

            <br><br><br><br>

            <strong>
              ${esc(p.teacherName)}
            </strong>

            <br>

            NIP.
            ${esc(p.teacherNip)}

          </td>

        </tr>

      </table>

    </div>
  `;
}


/* ============================================================
   DOCUMENT BODY
   ============================================================ */

function documentBody(
  key
) {

  const value =
    state.result?.[key];


  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {

    return `
      <p class="muted">
        Dokumen belum memiliki isi.
      </p>
    `;
  }


  return renderStructured(
    value
  );
}


/* ============================================================
   FULL DOCUMENT HTML
   ============================================================ */

function documentFullHtml(
  key
) {

  const def =
    DOCUMENT_DEFS.find(
      x => x.key === key
    );


  if (!def) {

    throw new Error(
      'Dokumen tidak ditemukan.'
    );
  }


  const p =
    state.profile || {};


  return `
<!doctype html>

<html lang="id">

<head>

<meta charset="utf-8">

<title>
${esc(def.title)}
</title>

<style>

@page {
  size: A4;
  margin: 18mm;
}

body {
  font-family: Arial, Helvetica, sans-serif;
  color: #111;
  font-size: 11pt;
  line-height: 1.5;
}

h1 {
  text-align: center;
  font-size: 20pt;
  margin-bottom: 8px;
}

h2 {
  text-align: center;
  font-size: 16pt;
  margin-top: 10px;
}

h3 {
  font-size: 13pt;
  margin-top: 18px;
}

h4 {
  font-size: 12pt;
}

.cover {
  text-align: center;
  margin-top: 80px;
  margin-bottom: 60px;
}

.cover h1 {
  font-size: 22pt;
}

.cover p {
  font-size: 12pt;
}

.doc-identity {
  margin-bottom: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0 18px;
}

td,
th {
  border: 1px solid #222;
  padding: 6px;
  vertical-align: top;
}

.doc-table th {
  font-weight: bold;
  text-align: center;
}

.doc-block {
  margin-bottom: 14px;
}

.doc-item {
  margin-bottom: 8px;
}

.doc-signature {
  margin-top: 40px;
}

.muted {
  color: #555;
}

strong {
  font-weight: bold;
}

ul {
  margin-top: 5px;
}

</style>

</head>

<body>

<div class="cover">

  <h1>
    ${esc(def.title).toUpperCase()}
  </h1>

  <h2>
    ${esc(p.subject || '')}
  </h2>

  <p>
    ${esc(p.school || '')}
  </p>

  <p>
    Kelas ${esc(p.grade || '')}
    • Fase ${esc(p.phase || phaseFor(p.grade))}
    • ${esc(p.year || '')}
  </p>

</div>


${documentIdentity()}


<div class="document-content">

  ${documentBody(key)}

</div>


${signatureBlock()}


</body>

</html>
  `;
}


/* ============================================================
   PREVIEW SATU DOKUMEN
   ============================================================ */

function previewDocument(
  key
) {

  const html =
    documentFullHtml(
      key
    );


  const win =
    window.open(
      '',
      '_blank'
    );


  if (!win) {

    alert(
      'Popup diblokir browser. Izinkan popup untuk melihat preview.'
    );

    return;
  }


  win.document.open();

  win.document.write(
    html
  );

  win.document.close();
}


/* ============================================================
   RENDER 7 DOKUMEN
   ============================================================ */

function renderResult() {

  const preview =
    $('#preview');


  if (!preview) {
    return;
  }


  const p =
    state.profile || {};


  $('#resultMeta').textContent =
    `${p.school || ''} • ${
      p.subject || ''
    } • Kelas ${
      p.grade || ''
    } • Fase ${
      p.phase ||
      phaseFor(p.grade)
    }`;


  preview.innerHTML = '';


  DOCUMENT_DEFS.forEach(
    def => {

      const card =
        document.createElement(
          'div'
        );


      card.className =
        'card document-card';


      card.innerHTML = `

        <div class="section-head">

          <div>

            <span class="pill">
              Dokumen ${def.number}
            </span>

            <h2>
              ${esc(def.title)}
            </h2>

          </div>


          <div class="actions">

            <button
              type="button"
              class="secondary"
              onclick="previewDocument('${def.key}')">
              👁 Preview
            </button>


            <button
              type="button"
              class="secondary"
              onclick="downloadWord('${def.key}')">
              ⬇ Word
            </button>


            <button
              type="button"
              class="primary"
              onclick="downloadPDF('${def.key}')">
              ⬇ PDF
            </button>

          </div>

        </div>


        <div class="paper document-paper">

          ${documentIdentity()}

          <div class="document-content">

            ${documentBody(def.key)}

          </div>

        </div>

      `;


      preview.appendChild(
        card
      );
    }
  );
}


/* ============================================================
   DOWNLOAD WORD
   ============================================================ */

function downloadWord(
  key
) {

  const def =
    DOCUMENT_DEFS.find(
      x => x.key === key
    );


  if (!def) {

    alert(
      'Dokumen tidak ditemukan.'
    );

    return;
  }


  const html =
    documentFullHtml(
      key
    );


  const blob =
    new Blob(
      [
        '\ufeff',
        html
      ],
      {
        type:
          'application/msword'
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      'a'
    );


  link.href =
    url;


  link.download =
    `${def.file}_${state.profile?.abbr || 'SD'}_Kelas_${state.profile?.grade || ''}.doc`;


  document.body.appendChild(
    link
  );


  link.click();


  link.remove();


  setTimeout(
    () =>
      URL.revokeObjectURL(url),
    1000
  );
}


/* ============================================================
   DOWNLOAD PDF
   ============================================================ */

async function downloadPDF(
  key
) {

  const def =
    DOCUMENT_DEFS.find(
      x => x.key === key
    );


  if (!def) {

    alert(
      'Dokumen tidak ditemukan.'
    );

    return;
  }


  if (
    !window.jspdf ||
    !window.jspdf.jsPDF
  ) {

    alert(
      'Library PDF belum berhasil dimuat. Silakan refresh halaman.'
    );

    return;
  }


  try {

    const {
      jsPDF
    } = window.jspdf;


    const pdf =
      new jsPDF({
        unit: 'mm',
        format: 'a4'
      });


    const container =
      document.createElement(
        'div'
      );


    container.style.position =
      'absolute';

    container.style.left =
      '-100000px';

    container.style.top =
      '0';

    container.style.width =
      '794px';

    container.innerHTML =
      documentFullHtml(
        key
      );


    document.body.appendChild(
      container
    );


    await pdf.html(
      container,
      {

        margin: [
          12,
          12,
          12,
          12
        ],

        autoPaging:
          'text',

        html2canvas: {
          scale: 0.8
        },

        callback: doc => {

          doc.save(
            `${def.file}_${state.profile?.abbr || 'SD'}_Kelas_${state.profile?.grade || ''}.pdf`
          );
        }

      }
    );


    container.remove();


  } catch (error) {

    console.error(
      'PDF ERROR:',
      error
    );


    alert(
      'Gagal membuat PDF: ' +
      error.message
    );
  }
}


/* ============================================================
   DOWNLOAD SEMUA WORD
   ============================================================ */

async function downloadAllDocumentsWord() {

  for (
    const def
    of DOCUMENT_DEFS
  ) {

    downloadWord(
      def.key
    );

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          500
        )
    );
  }
}


/* ============================================================
   DOWNLOAD SEMUA PDF
   ============================================================ */

async function downloadAllDocumentsPDF() {

  for (
    const def
    of DOCUMENT_DEFS
  ) {

    await downloadPDF(
      def.key
    );

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          700
        )
    );
  }
}


/* ============================================================
   ADMIN
   ============================================================ */

async function loadAdmin() {

  showScreen(
    'admin'
  );


  const token =
    getToken();


  if (!token) {

    showScreen(
      'login'
    );

    return;
  }


  try {

    const [
      usersData,
      paymentsData
    ] =
      await Promise.all([

        api(
          'adminUsers',
          {
            token
          }
        ),

        api(
          'adminPayments',
          {
            token
          }
        )

      ]);


    const summary =
      paymentsData.summary ||
      {};


    if ($('#adminStats')) {

      $('#adminStats').innerHTML = `

        <div class="stat">
          <span>Menunggu Pemeriksaan</span>
          <strong>${summary.waiting || 0}</strong>
        </div>

        <div class="stat">
          <span>Sudah ACC</span>
          <strong>${summary.approved || 0}</strong>
        </div>

        <div class="stat">
          <span>Ditolak</span>
          <strong>${summary.rejected || 0}</strong>
        </div>

        <div class="stat">
          <span>Premium Aktif</span>
          <strong>${summary.premium || 0}</strong>
        </div>

      `;
    }


    const users =
      usersData.users ||
      [];


    if ($('#adminUsers')) {

      $('#adminUsers').innerHTML =
        users.length
          ? users.map(
              user => `

                <div class="admin-row">

                  <div>

                    <b>
                      ${esc(user.name)}
                    </b>

                    <br>

                    <span class="muted">

                      ${esc(user.email)}

                      •

                      ${esc(user.status)}

                      •

                      ${
                        user.premium
                          ? 'PREMIUM'
                          : 'Belum premium'
                      }

                    </span>

                  </div>

                </div>

              `
            ).join('')
          : `
              <p class="muted">
                Belum ada akun.
              </p>
            `;
    }


    const payments =
      paymentsData.payments ||
      [];


    if ($('#adminPayments')) {

      $('#adminPayments').innerHTML =
        payments.length
          ? payments.map(
              payment =>
                renderAdminPayment(
                  payment
                )
            ).join('')
          : `
              <p class="muted">
                Belum ada pembayaran.
              </p>
            `;
    }


  } catch (error) {

    console.error(
      'ADMIN ERROR:',
      error
    );


    if ($('#adminUsers')) {

      $('#adminUsers').innerHTML =
        `<p class="msg error">${esc(error.message)}</p>`;
    }


    if ($('#adminPayments')) {

      $('#adminPayments').innerHTML =
        `<p class="msg error">${esc(error.message)}</p>`;
    }
  }
}


/* ============================================================
   ADMIN PAYMENT ROW
   ============================================================ */

function renderAdminPayment(
  payment
) {

  const waiting =
    payment.status ===
    'payment_review';


  const date =
    payment.createdAt
      ? new Date(
          payment.createdAt
        ).toLocaleString(
          'id-ID'
        )
      : '';


  return `

    <div class="admin-row">

      <div>

        <b>
          ${esc(payment.name)}
        </b>

        <br>

        <span class="muted">

          NIP:
          ${esc(payment.nip)}

          •

          ${esc(payment.email)}

        </span>

        <br>

        <span class="muted">

          Harga:
          ${money(payment.basePrice)}

          +

          Kode:
          ${money(payment.uniqueCode)}

          =

          <b>
            ${money(payment.totalAmount)}
          </b>

        </span>

        <br>

        <span class="muted">

          ${esc(date)}

          •

          ${esc(payment.status)}

        </span>


        ${
          payment.reviewNote
            ? `
              <br>

              <span class="muted">
                Catatan:
                ${esc(payment.reviewNote)}
              </span>
            `
            : ''
        }

      </div>


      <div class="actions">

        ${
          payment.driveUrl
            ? `
              <a
                class="secondary"
                href="${esc(payment.driveUrl)}"
                target="_blank"
                rel="noopener">
                Lihat Bukti
              </a>
            `
            : ''
        }


        ${
          waiting
            ? `

              <button
                class="primary"
                type="button"
                onclick="reviewPayment('${esc(payment.id)}','approved')">
                ACC Premium
              </button>


              <button
                class="secondary"
                type="button"
                onclick="reviewPayment('${esc(payment.id)}','rejected')">
                Tolak
              </button>

            `
            : ''
        }

      </div>

    </div>

  `;
}


/* ============================================================
   REVIEW PAYMENT
   ============================================================ */

async function reviewPayment(
  id,
  status
) {

  const token =
    getToken();


  if (!token) {

    alert(
      'Sesi admin tidak ditemukan.'
    );

    showScreen(
      'login'
    );

    return;
  }


  let note = '';


  if (
    status ===
    'rejected'
  ) {

    note =
      prompt(
        'Masukkan alasan penolakan:'
      ) || '';
  }


  try {

    await api(
      'reviewPayment',
      {
        token,

        paymentId:
          id,

        status,

        note
      }
    );


    alert(
      status === 'approved'
        ? 'Pembayaran berhasil di-ACC.'
        : 'Pembayaran ditolak.'
    );


    await loadAdmin();


  } catch (error) {

    console.error(
      'REVIEW PAYMENT ERROR:',
      error
    );


    alert(
      error.message
    );
  }
}


/* ============================================================
   FILE -> DATA URL
   ============================================================ */

function fileToDataUrl(
  file
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const reader =
        new FileReader();


      reader.onload =
        () =>
          resolve(
            reader.result
          );


      reader.onerror =
        reject;


      reader.readAsDataURL(
        file
      );
    }
  );
}


/* ============================================================
   PAYMENT FORM
   ============================================================ */

async function handlePaymentSubmit(
  event
) {

  event.preventDefault();


  const form =
    event.target;


  const file =
    form.proof?.files?.[0];


  if (!file) {

    setMsg(
      'paymentMsg',
      'Pilih bukti pembayaran.',
      'error'
    );

    return;
  }


  if (
    file.size >
    5 * 1024 * 1024
  ) {

    setMsg(
      'paymentMsg',
      'Ukuran file maksimal 5 MB.',
      'error'
    );

    return;
  }


  setMsg(
    'paymentMsg',
    'Mengunggah bukti pembayaran...'
  );


  try {

    const fileData =
      await fileToDataUrl(
        file
      );


    const token =
      sessionStorage.getItem(
        'payment_token'
      );


    if (!token) {

      throw new Error(
        'Token pembayaran tidak ditemukan. Silakan login/verifikasi email kembali.'
      );
    }


    const response =
      await api(
        'submitPayment',
        {

          token,

          name:
            form.name.value.trim(),

          nip:
            form.nip.value.trim(),

          email:
            form.email.value.trim(),

          fileName:
            file.name,

          mimeType:
            file.type,

          fileData
        }
      );


    setMsg(
      'paymentMsg',
      `${
        response.message ||
        'Bukti pembayaran berhasil dikirim.'
      } Total: ${
        money(
          response.payment?.totalAmount
        )
      }`,
      'success'
    );


    const waButton =
      $('#paymentWa');


    if (waButton) {

      waButton.classList.remove(
        'hidden'
      );


      waButton.onclick =
        () => {

          const message = `Konfirmasi Pembayaran Modul Ajar AI

Nama: ${form.name.value.trim()}
NIP: ${form.nip.value.trim()}
Email: ${form.email.value.trim()}
Harga: ${money(response.payment?.basePrice)}
Kode unik: ${money(response.payment?.uniqueCode)}
Total: ${money(response.payment?.totalAmount)}

Bukti pembayaran sudah saya upload ke sistem.
`;

          window.open(
            'https://wa.me/6285722228896?text=' +
            encodeURIComponent(
              message
            ),
            '_blank'
          );
        };
    }


    sessionStorage.removeItem(
      'payment_token'
    );


  } catch (error) {

    console.error(
      'PAYMENT ERROR:',
      error
    );


    setMsg(
      'paymentMsg',
      error.message ||
      'Gagal mengirim bukti pembayaran.',
      'error'
    );
  }
}


/* ============================================================
   REGISTER
   ============================================================ */

async function handleRegister(
  event
) {

  event.preventDefault();


  setMsg(
    'registerMsg',
    'Mengirim pendaftaran...'
  );


  try {

    const data =
      Object.fromEntries(
        new FormData(
          event.target
        )
      );


    const response =
      await api(
        'register',
        data
      );


    setMsg(
      'registerMsg',
      response.message ||
      'Pendaftaran berhasil. Silakan cek email Anda.',
      'success'
    );


    event.target.reset();


  } catch (error) {

    console.error(
      'REGISTER ERROR:',
      error
    );


    setMsg(
      'registerMsg',
      error.message,
      'error'
    );
  }
}


/* ============================================================
   FORGOT PASSWORD
   ============================================================ */

async function handleForgot(
  event
) {

  event.preventDefault();


  setMsg(
    'forgotMsg',
    'Mengirim tautan reset...'
  );


  try {

    const data =
      Object.fromEntries(
        new FormData(
          event.target
        )
      );


    const response =
      await api(
        'requestPasswordReset',
        data
      );


    setMsg(
      'forgotMsg',
      response.message ||
      'Jika email terdaftar, tautan reset akan dikirim.',
      'success'
    );


    event.target.reset();


  } catch (error) {

    setMsg(
      'forgotMsg',
      error.message,
      'error'
    );
  }
}


/* ============================================================
   RESET PASSWORD
   ============================================================ */

async function handleReset(
  event
) {

  event.preventDefault();


  const data =
    Object.fromEntries(
      new FormData(
        event.target
      )
    );


  if (
    data.password !==
    data.password2
  ) {

    setMsg(
      'resetMsg',
      'Password baru tidak sama.',
      'error'
    );

    return;
  }


  setMsg(
    'resetMsg',
    'Menyimpan password baru...'
  );


  try {

    const response =
      await api(
        'resetPassword',
        {
          token:
            data.token,

          password:
            data.password
        }
      );


    setMsg(
      'resetMsg',
      response.message ||
      'Password berhasil diubah.',
      'success'
    );


    event.target.reset();


    history.replaceState(
      {},
      '',
      location.pathname
    );


    setTimeout(
      () =>
        showScreen(
          'login'
        ),
      1000
    );


  } catch (error) {

    setMsg(
      'resetMsg',
      error.message,
      'error'
    );
  }
}


/* ============================================================
   EMAIL LINK
   ============================================================ */

function queryParam(
  name
) {

  const hash =
    location.hash.replace(
      /^#/,
      ''
    );


  return new URLSearchParams(
    hash
  ).get(name);
}


async function handleEmailLink() {

  const verify =
    queryParam(
      'verify'
    );


  const reset =
    queryParam(
      'reset'
    );


  const payment =
    queryParam(
      'payment'
    );


  if (verify) {

    try {

      const response =
        await api(
          'verifyEmail',
          {
            token:
              verify
          }
        );


      setupPaymentScreen(
        response.paymentSummary ||
        {
          basePrice: 0,
          uniqueCode: 0,
          totalAmount: 0
        },

        response.user,

        response.paymentToken
      );


      alert(
        response.message ||
        'Email berhasil diverifikasi.'
      );


      history.replaceState(
        {},
        '',
        location.pathname
      );


    } catch (error) {

      alert(
        error.message
      );


      history.replaceState(
        {},
        '',
        location.pathname
      );


      showScreen(
        'login'
      );
    }


    return;
  }


  if (reset) {

    if ($('#resetToken')) {

      $('#resetToken').value =
        reset;
    }


    showScreen(
      'resetPassword'
    );


    return;
  }


  if (payment) {

    try {

      const response =
        await api(
          'paymentInfo',
          {
            token:
              payment
          }
        );


      setupPaymentScreen(
        response.paymentSummary,
        response.user,
        payment
      );


    } catch (error) {

      alert(
        error.message
      );


      showScreen(
        'login'
      );
    }
  }
}


/* ============================================================
   LOGOUT
   ============================================================ */

function logout() {

  state = {
    user: null,
    profile: null,
    module: null,
    result: null,
    payment: null
  };


  localStorage.removeItem(
    'ma_user'
  );


  localStorage.removeItem(
    'ma_token'
  );


  localStorage.removeItem(
    'ma_profile'
  );


  sessionStorage.removeItem(
    'payment_token'
  );


  sessionStorage.removeItem(
    'payment_user'
  );


  if ($('#userBadge')) {

    $('#userBadge').textContent =
      '';
  }


  showScreen(
    'landing'
  );
}


/* ============================================================
   RESTORE SESSION
   ============================================================ */

async function restoreSession() {

  const stored =
    localStorage.getItem(
      'ma_user'
    );


  if (!stored) {
    return;
  }


  try {

    state.user =
      JSON.parse(
        stored
      );


    if (
      !state.user?.token
    ) {

      const token =
        localStorage.getItem(
          'ma_token'
        );

      if (token) {

        state.user.token =
          token;
      }
    }


    if (
      !state.user?.token
    ) {

      logout();

      return;
    }


    renderUser();


    /*
     * ADMIN
     */

    if (
      state.user.role ===
      'admin'
    ) {

      await loadAdmin();

      return;
    }


    /*
     * CEK SERVER
     */

    const response =
      await api(
        'me',
        {
          token:
            state.user.token
        }
      );


    const serverUser =
      response.user ||
      {};


    state.user = {
      ...state.user,
      ...serverUser,
      token:
        state.user.token
    };


    localStorage.setItem(
      'ma_user',
      JSON.stringify(
        state.user
      )
    );


    renderUser();


    /*
     * PREMIUM
     */

    if (
      state.user.premium
    ) {

      await loadProfile();

      showScreen(
        'dashboard'
      );

      return;
    }


    /*
     * PAYMENT REVIEW
     */

    if (
      state.user.status ===
      'payment_review'
    ) {

      showScreen(
        'login'
      );


      setMsg(
        'loginMsg',
        'Pembayaran sedang diperiksa admin.',
        'success'
      );


      return;
    }


    /*
     * BELUM PREMIUM
     */

    setupPaymentScreen(
      response.paymentSummary ||
      {},
      state.user,
      response.paymentToken ||
      sessionStorage.getItem(
        'payment_token'
      )
    );


  } catch (error) {

    console.warn(
      'Session tidak dapat dipulihkan:',
      error
    );


    /*
     * Jangan langsung menghapus
     * akun jika server sedang
     * bermasalah.
     *
     * Tetapi jika token benar-benar
     * invalid, kembali ke landing.
     */

    logout();
  }
}


/* ============================================================
   PEDAGOGY TOGGLE
   ============================================================ */

function setupPedagogy() {

  const select =
    $('#pedagogy');


  const wrap =
    $('#otherPedagogyWrap');


  if (
    !select ||
    !wrap
  ) {
    return;
  }


  function update() {

    if (
      select.value ===
      'Lainnya'
    ) {

      wrap.classList.remove(
        'hidden'
      );

    } else {

      wrap.classList.add(
        'hidden'
      );
    }
  }


  select.addEventListener(
    'change',
    update
  );


  update();
}


/* ============================================================
   INITIALIZE
   ============================================================ */

function initializeApp() {

  /*
   * LOGIN
   */

  const loginForm =
    $('#loginForm');

  if (loginForm) {

    loginForm.addEventListener(
      'submit',
      handleLogin
    );
  }


  /*
   * REGISTER
   */

  const registerForm =
    $('#registerForm');

  if (registerForm) {

    registerForm.addEventListener(
      'submit',
      handleRegister
    );
  }


  /*
   * PROFILE
   */

  const profileForm =
    $('#profileForm');

  if (profileForm) {

    profileForm.addEventListener(
      'submit',
      handleProfileSubmit
    );


    profileForm.addEventListener(
      'change',
      event => {

        if (
          event.target.name ===
          'grade'
        ) {

          const phase =
            profileForm.elements.phase;

          if (phase) {

            phase.value =
              phaseFor(
                event.target.value
              );
          }
        }
      }
    );
  }


  /*
   * MODULE
   */

  const moduleForm =
    $('#moduleForm');

  if (moduleForm) {

    moduleForm.addEventListener(
      'submit',
      handleModuleSubmit
    );
  }


  /*
   * PAYMENT
   */

  const paymentForm =
    $('#paymentForm');

  if (paymentForm) {

    paymentForm.addEventListener(
      'submit',
      handlePaymentSubmit
    );
  }


  /*
   * FORGOT
   */

  const forgotForm =
    $('#forgotForm');

  if (forgotForm) {

    forgotForm.addEventListener(
      'submit',
      handleForgot
    );
  }


  /*
   * RESET
   */

  const resetForm =
    $('#resetForm');

  if (resetForm) {

    resetForm.addEventListener(
      'submit',
      handleReset
    );
  }


  /*
   * PEDAGOGY
   */

  setupPedagogy();


  /*
   * EMAIL LINK
   */

  handleEmailLink();


  /*
   * SESSION
   */

  restoreSession();
}


/* ============================================================
   GLOBAL FUNCTIONS
   Supaya onclick pada index.html tetap bekerja
   ============================================================ */

window.showScreen =
  showScreen;

window.logout =
  logout;

window.getCP =
  getCP;

window.suggestTP =
  suggestTP;

window.previewDocument =
  previewDocument;

window.downloadWord =
  downloadWord;

window.downloadPDF =
  downloadPDF;

window.downloadAllDocumentsWord =
  downloadAllDocumentsWord;

window.downloadAllDocumentsPDF =
  downloadAllDocumentsPDF;

window.loadAdmin =
  loadAdmin;

window.reviewPayment =
  reviewPayment;


/* ============================================================
   START
   ============================================================ */

if (
  document.readyState ===
  'loading'
) {

  document.addEventListener(
    'DOMContentLoaded',
    initializeApp
  );

} else {

  initializeApp();
}
