/* Modul Ajar AI • GitHub Pages frontend. Set API_URL to your Apps Script Web App URL. */

const API_URL = 'https://script.google.com/macros/s/AKfycbwyd66NfVG5_TvbNTt88ixZrDH2kP5wfjXcVyyna9JdEV-bSzOXHQsTEtOCxEvrKYCP/exec';

let state = {
  user: null,
  profile: null,
  module: null,
  result: null,
  payment: null
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function showScreen(id) {
  $$('.screen').forEach(x => x.classList.remove('active'));
  $('#' + id)?.classList.add('active');
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function setMsg(id, text, type = '') {
  const el = $('#' + id);
  if (!el) return;

  el.textContent = text;
  el.className = 'msg ' + type;
}

async function api(action, payload = {}) {

  if (!API_URL || API_URL.includes('PASTE_')) {
    throw new Error(
      'API_URL belum diisi di app.js'
    );
  }

  try {

    const r = await fetch(API_URL, {
      method: 'POST',

      headers: {
        'Content-Type':
          'text/plain;charset=utf-8'
      },

      body: JSON.stringify({
        action,
        ...payload
      })
    });

    const text =
      await r.text();

    let d;

    try {

      d = JSON.parse(text);

    } catch (e) {

      throw new Error(
        'Respons server bukan JSON. ' +
        'Pastikan Apps Script sudah di-deploy sebagai Web App (/exec).'
      );
    }

    if (!d.ok) {

      throw new Error(
        d.error ||
        'Terjadi kesalahan pada server.'
      );
    }

    return d;

  } catch (err) {

    throw new Error(
      err.message ||
      'Gagal terhubung ke server.'
    );
  }
}


/* =========================================================
   UTILITAS
   ========================================================= */

function phaseFor(g) {

  return ['1', '2'].includes(
    String(g)
  )
    ? 'A'
    : ['3', '4'].includes(
        String(g)
      )
      ? 'B'
      : 'C';
}

function money(n) {

  return 'Rp ' +
    Number(n || 0)
      .toLocaleString('id-ID');
}

function renderUser() {

  if (state.user) {

    const badge =
      $('#userBadge');

    if (badge) {

      badge.textContent =
        state.user.name +
        ' • ' +
        (
          state.user.premium
            ? 'PREMIUM'
            : 'BELUM PREMIUM'
        );
    }
  }
}


/* =========================================================
   PEMBAYARAN
   ========================================================= */

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
      state.profile?.teacherNip || '';
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
          ).toLocaleString('id-ID')
        : '';
  }

  showScreen('payment');
}


/* =========================================================
   LOGIN
   ========================================================= */

const profileForm =
  $('#profileForm');

if (profileForm) {

  profileForm.addEventListener(
    'input',
    e => {

      if (
        e.target.name ===
        'grade'
      ) {

        const phase =
          $('#profileForm [name=phase]');

        if (phase) {

          phase.value =
            phaseFor(
              e.target.value
            );
        }
      }
    }
  );
}


const loginForm =
  $('#loginForm');

if (loginForm) {

  loginForm.addEventListener(
    'submit',
    async e => {

      e.preventDefault();

      setMsg(
        'loginMsg',
        'Memeriksa...'
      );

      try {

        const d =
          await api(
            'login',
            Object.fromEntries(
              new FormData(
                e.target
              )
            )
          );

        /*
         * Token dari Apps Script
         * berada di d.user.token
         */

        state.user = {

          ...(d.user || {}),

          token:
            d.token ||
            d.user?.token ||
            ''
        };

        localStorage.setItem(
          'ma_user',
          JSON.stringify(
            state.user
          )
        );

        console.log(
          'Login berhasil. Token tersedia:',
          !!state.user.token
        );

        renderUser();

        /*
         * ADMIN
         */

        if (
          state.user.role ===
          'admin'
        ) {

          return loadAdmin();
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
            d.paymentSummary,
            state.user,
            d.paymentToken
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

      } catch (err) {

        console.error(
          'Login error:',
          err
        );

        setMsg(
          'loginMsg',
          err.message,
          'error'
        );
      }
    }
  );
}


/* =========================================================
   LOAD PROFILE
   ========================================================= */

async function loadProfile() {

  const token =
    state.user?.token;

  if (!token) {

    throw new Error(
      'Token sesi tidak ditemukan. Silakan masuk lagi.'
    );
  }

  const d =
    await api(
      'me',
      {
        token: token
      }
    );

  /*
   * Jangan sampai token hilang
   * ketika data user dari /me masuk.
   */

  state.user = {

    ...(state.user || {}),

    ...(d.user || {}),

    token: token
  };

  state.profile =
    d.profile || {};

  localStorage.setItem(
    'ma_user',
    JSON.stringify(
      state.user
    )
  );

  localStorage.setItem(
    'ma_profile',
    JSON.stringify(
      state.profile || {}
    )
  );


  /*
   * Isi form profile
   */

  const f =
    $('#profileForm');

  if (f) {

    Object.entries(
      state.profile || {}
    ).forEach(
      ([k, v]) => {

        const el =
          f.elements[k];

        if (el) {

          el.value =
            v || '';
        }
      }
    );


    const teacherName =
      $('#teacherName');

    if (teacherName) {

      teacherName.value =
        state.user.name ||
        state.profile.teacherName ||
        '';
    }


    const phase =
      f.elements.phase;

    const grade =
      f.elements.grade;

    if (
      phase &&
      grade
    ) {

      phase.value =
        phaseFor(
          grade.value
        );
    }
  }


  console.log(
    'Profil berhasil dimuat. Token tersedia:',
    !!state.user.token
  );


  /*
   * Sinkronkan identitas
   * ke form Modul Ajar
   */

  if ($('#mSchool')) {

    $('#mSchool').value =
      state.profile.school ||
      '';
  }

  if ($('#mTeacher')) {

    $('#mTeacher').value =
      state.profile.teacherName ||
      state.user.name ||
      '';
  }

  if ($('#mTeacherNip')) {

    $('#mTeacherNip').value =
      state.profile.teacherNip ||
      '';
  }

  if ($('#mPrincipal')) {

    $('#mPrincipal').value =
      state.profile.principalName ||
      '';
  }

  if ($('#mPrincipalNip')) {

    $('#mPrincipalNip').value =
      state.profile.principalNip ||
      '';
  }

  if ($('#mSign')) {

    $('#mSign').value =
      state.profile.signPlaceDate ||
      '';
  }

  if ($('#mGrade')) {

    $('#mGrade').value =
      state.profile.grade ||
      '';
  }

  if ($('#moduleCP')) {

    $('#moduleCP').value =
      state.profile.cp ||
      '';
  }
}


/* =========================================================
   FILL PROFILE
   ========================================================= */

function fillProfile() {

  const f =
    $('#profileForm');

  if (!f) {

    console.error(
      'Form profileForm tidak ditemukan.'
    );

    return;
  }

  Object.entries(
    state.profile || {}
  ).forEach(
    ([k, v]) => {

      const el =
        f.elements[k];

      if (el) {

        el.value =
          v || '';
      }
    }
  );


  const teacherName =
    $('#teacherName');

  if (teacherName) {

    teacherName.value =
      state.user?.name ||
      state.profile?.teacherName ||
      '';
  }


  const phase =
    f.elements.phase;

  const grade =
    f.elements.grade;

  if (
    phase &&
    grade
  ) {

    phase.value =
      phaseFor(
        grade.value
      );
  }
}


/* =========================================================
   COLLECT PROFILE
   ========================================================= */

function collectProfileForm() {

  const f =
    $('#profileForm');

  if (!f) {

    throw new Error(
      'Form data satuan pendidikan tidak ditemukan.'
    );
  }

  const p =
    Object.fromEntries(
      new FormData(f)
    );

  p.phase =
    phaseFor(
      p.grade
    );

  return p;
}


/* =========================================================
   COLLECT MODULE
   ========================================================= */

function collectModuleForm() {

  const f =
    $('#moduleForm');

  if (!f) {

    throw new Error(
      'Form Modul Ajar tidak ditemukan.'
    );
  }

  const m =
    Object.fromEntries(
      new FormData(f)
    );


  /*
   * Ambil 8 dimensi profil lulusan
   */

  const dimensionInputs =
    $$('#dimensions input:checked');

  m.dimensions =
    dimensionInputs.map(
      x => x.value
    );


  /*
   * Jika memilih pedagogi lainnya
   */

  if (
    m.pedagogy ===
    'Lainnya'
  ) {

    m.pedagogy =
      m.otherPedagogy ||
      'Pendekatan lain';
  }

  return m;
}


/* =========================================================
   AMBIL CP OTOMATIS
   ========================================================= */

async function getCP(
  useModule = false
) {

  const token =
    state.user?.token;

  if (!token) {

    alert(
      'Sesi login tidak ditemukan. Silakan masuk lagi.'
    );

    showScreen(
      'login'
    );

    return;
  }


  let btn = null;


  if (useModule) {

    btn =
      document
        .querySelector(
          '#moduleCP'
        )
        ?.closest(
          '.compact'
        )
        ?.querySelector(
          'button'
        );

  } else {

    btn =
      document
        .querySelector(
          '#cp'
        )
        ?.closest(
          '.toolbar'
        )
        ?.querySelector(
          'button'
        );
  }


  const oldText =
    btn?.textContent;


  if (btn) {

    btn.disabled = true;

    btn.textContent =
      'Mengambil CP...';
  }


  try {

    let p;


    if (useModule) {

      p = {

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
          ''
      };

    } else {

      p =
        collectProfileForm();
    }


    const d =
      await api(
        'getCP',
        {
          token,
          profile: p
        }
      );


    const cp =
      d.cp ||
      d.result?.cp ||
      d.data?.cp ||
      '';


    const source =
      d.source ||
      d.cpSource ||
      d.result?.source ||
      '';


    if (!cp) {

      throw new Error(
        'CP tidak ditemukan dari server.'
      );
    }


    if (useModule) {

      if (
        $('#moduleCP')
      ) {

        $('#moduleCP').value =
          cp;
      }

      if (
        source &&
        $('#moduleCP')
      ) {

        $('#moduleCP')
          .dataset
          .source =
            source;
      }

    } else {

      if ($('#cp')) {

        $('#cp').value =
          cp;
      }

      if ($('#cpSource')) {

        $('#cpSource').textContent =
          source
            ? 'Sumber: ' +
              source
            : 'CP berhasil diambil otomatis.';
      }
    }

  } catch (err) {

    console.error(
      'getCP error:',
      err
    );

    alert(
      err.message ||
      'Gagal mengambil CP otomatis.'
    );

  } finally {

    if (btn) {

      btn.disabled = false;

      btn.textContent =
        oldText ||
        'Ambil CP Otomatis';
    }
  }
}


/* =========================================================
   SARAN TP DARI AI
   ========================================================= */

async function suggestTP() {

  const token =
    state.user?.token;

  if (!token) {

    alert(
      'Sesi login tidak ditemukan. Silakan masuk lagi.'
    );

    showScreen(
      'login'
    );

    return;
  }


  const btn =
    document
      .querySelector(
        '#tp'
      )
      ?.closest(
        '.compact'
      )
      ?.querySelector(
        'button'
      );


  const oldText =
    btn?.textContent;


  if (btn) {

    btn.disabled = true;

    btn.textContent =
      'AI sedang menyusun TP...';
  }


  try {

    const m =
      collectModuleForm();


    const cp =
      $('#moduleCP')?.value ||
      state.profile?.cp ||
      '';


    if (!cp) {

      throw new Error(
        'CP belum tersedia. Silakan klik "Ambil CP Otomatis" terlebih dahulu.'
      );
    }


    const d =
      await api(
        'suggestTP',
        {
          token,

          profile:
            state.profile || {},

          module: {
            ...m,
            cp: cp
          }
        }
      );


    const tp =
      d.tp ||
      d.result?.tp ||
      d.data?.tp ||
      '';


    if (!tp) {

      throw new Error(
        'AI tidak menghasilkan Tujuan Pembelajaran.'
      );
    }


    if ($('#tp')) {

      $('#tp').value =
        tp;
    }

  } catch (err) {

    console.error(
      'suggestTP error:',
      err
    );

    alert(
      err.message ||
      'Gagal membuat Tujuan Pembelajaran.'
    );

  } finally {

    if (btn) {

      btn.disabled = false;

      btn.textContent =
        oldText ||
        '✨ Saran TP AI';
    }
  }
}


/* =========================================================
   SIMPAN PROFILE
   ========================================================= */

async function saveProfile() {

  const token =
    state.user?.token;

  if (!token) {

    alert(
      'Sesi login tidak ditemukan. Silakan masuk lagi.'
    );

    showScreen(
      'login'
    );

    return;
  }


  try {

    const profile =
      collectProfileForm();


    const d =
      await api(
        'saveProfile',
        {
          token,
          profile
        }
      );


    state.profile =
      d.profile ||
      profile;


    localStorage.setItem(
      'ma_profile',
      JSON.stringify(
        state.profile
      )
    );


    /*
     * Sinkronkan Modul Ajar
     */

    if ($('#mSchool')) {

      $('#mSchool').value =
        state.profile.school ||
        '';
    }

    if ($('#mTeacher')) {

      $('#mTeacher').value =
        state.profile.teacherName ||
        state.user.name ||
        '';
    }

    if ($('#mTeacherNip')) {

      $('#mTeacherNip').value =
        state.profile.teacherNip ||
        '';
    }

    if ($('#mPrincipal')) {

      $('#mPrincipal').value =
        state.profile.principalName ||
        '';
    }

    if ($('#mPrincipalNip')) {

      $('#mPrincipalNip').value =
        state.profile.principalNip ||
        '';
    }

    if ($('#mSign')) {

      $('#mSign').value =
        state.profile.signPlaceDate ||
        '';
    }

    if ($('#mGrade')) {

      $('#mGrade').value =
        state.profile.grade ||
        '';
    }

    if ($('#moduleCP')) {

      $('#moduleCP').value =
        state.profile.cp ||
        '';
    }


    setMsg(
      'profileMsg',
      'Data berhasil disimpan.',
      'success'
    );

  } catch (err) {

    console.error(
      'saveProfile error:',
      err
    );

    setMsg(
      'profileMsg',
      err.message,
      'error'
    );
  }
}


/* =========================================================
   NAVIGASI DASHBOARD
   ========================================================= */

function openProfile() {

  showScreen(
    'profile'
  );

  fillProfile();
}


function openModule() {

  showScreen(
    'module'
  );

  /*
   * Pastikan identitas
   * dari profile tetap masuk
   */

  if ($('#mSchool')) {

    $('#mSchool').value =
      state.profile?.school ||
      '';
  }

  if ($('#mTeacher')) {

    $('#mTeacher').value =
      state.profile?.teacherName ||
      state.user?.name ||
      '';
  }

  if ($('#mTeacherNip')) {

    $('#mTeacherNip').value =
      state.profile?.teacherNip ||
      '';
  }

  if ($('#mPrincipal')) {

    $('#mPrincipal').value =
      state.profile?.principalName ||
      '';
  }

  if ($('#mPrincipalNip')) {

    $('#mPrincipalNip').value =
      state.profile?.principalNip ||
      '';
  }

  if ($('#mSign')) {

    $('#mSign').value =
      state.profile?.signPlaceDate ||
      '';
  }

  if ($('#mGrade')) {

    $('#mGrade').value =
      state.profile?.grade ||
      '';
  }

  if ($('#moduleCP')) {

    $('#moduleCP').value =
      state.profile?.cp ||
      '';
  }
}


/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {

  state.user = null;
  state.profile = null;
  state.module = null;
  state.result = null;
  state.payment = null;

  localStorage.removeItem(
    'ma_user'
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

  showScreen(
    'login'
  );
}


/* =========================================================
   SUBMIT PAYMENT
   ========================================================= */

async function submitPayment() {

  const token =
    sessionStorage.getItem(
      'payment_token'
    );

  if (!token) {

    alert(
      'Token pembayaran tidak ditemukan. Silakan login kembali.'
    );

    showScreen(
      'login'
    );

    return;
  }


  const file =
    $('#paymentProof')
      ?.files?.[0];


  if (!file) {

    alert(
      'Silakan pilih bukti pembayaran terlebih dahulu.'
    );

    return;
  }


  const maxSize =
    10 * 1024 * 1024;


  if (
    file.size >
    maxSize
  ) {

    alert(
      'Ukuran bukti pembayaran maksimal 10 MB.'
    );

    return;
  }


  try {

    const reader =
      new FileReader();


    const base64 =
      await new Promise(
        (resolve, reject) => {

          reader.onload =
            () => {

              const result =
                String(
                  reader.result ||
                  ''
                );

              const comma =
                result.indexOf(',');

              resolve(
                comma >= 0
                  ? result.slice(
                      comma + 1
                    )
                  : result
              );
            };

          reader.onerror =
            () =>
              reject(
                new Error(
                  'Gagal membaca file bukti pembayaran.'
                )
              );

          reader.readAsDataURL(
            file
          );
        }
      );


    const d =
      await api(
        'submitPayment',
        {
          token,

          paymentToken:
            token,

          fileName:
            file.name,

          mimeType:
            file.type ||
            'application/octet-stream',

          fileBase64:
            base64
        }
      );


    alert(
      d.message ||
      'Bukti pembayaran berhasil dikirim dan sedang diperiksa admin.'
    );


    showScreen(
      'login'
    );

  } catch (err) {

    console.error(
      'submitPayment error:',
      err
    );

    alert(
      err.message ||
      'Gagal mengirim bukti pembayaran.'
    );
  }
}


/* =========================================================
   GENERATE 7 DOKUMEN
   ========================================================= */

async function generateDocuments() {

  const token =
    state.user?.token;

  if (!token) {

    alert(
      'Sesi login tidak ditemukan. Silakan masuk lagi.'
    );

    showScreen(
      'login'
    );

    return;
  }


  try {

    const profile =
      state.profile ||
      collectProfileForm();


    const module =
      collectModuleForm();


    /*
     * Simpan data module
     */

    state.module =
      module;


    /*
     * Jika CP di form Modul Ajar
     * kosong, ambil dari profile.
     */

    module.cp =
      module.cp ||
      $('#moduleCP')?.value ||
      profile.cp ||
      '';


    /*
     * Validasi minimal
     */

    if (!profile.school) {

      throw new Error(
        'Nama satuan pendidikan belum diisi.'
      );
    }

    if (!profile.subject) {

      throw new Error(
        'Mata pelajaran belum diisi.'
      );
    }

    if (!module.meetings) {

      throw new Error(
        'Jumlah pertemuan belum diisi.'
      );
    }

    if (!module.jp) {

      throw new Error(
        'JP per pertemuan belum diisi.'
      );
    }

    if (!module.material) {

      throw new Error(
        'Materi pembelajaran belum diisi.'
      );
    }


    const btn =
      document.querySelector(
        '#moduleForm button[type="submit"]'
      );


    const oldText =
      btn?.textContent;


    if (btn) {

      btn.disabled = true;

      btn.textContent =
        'AI sedang membuat 7 dokumen...';
    }


    const d =
      await api(
        'generateDocuments',
        {
          token,
          profile,
          module
        }
      );


    if (!d.result) {

      throw new Error(
        'Server tidak mengembalikan hasil dokumen.'
      );
    }


    /*
     * Simpan hasil.
     */

    state.result =
      d.result;


    /*
     * Tampilkan hasil.
     */

    renderResult();


    showScreen(
      'result'
    );

  } catch (err) {

    console.error(
      'generateDocuments error:',
      err
    );

    alert(
      err.message ||
      'Gagal membuat dokumen.'
    );

  } finally {

    const btn =
      document.querySelector(
        '#moduleForm button[type="submit"]'
      );

    if (btn) {

      btn.disabled = false;

      btn.textContent =
        '📚 Buat Modul Ajar';
    }
  }
}


/* =========================================================
   HASIL DOKUMEN
   ========================================================= */

function esc(s) {

  return String(
    s ?? ''
  ).replace(
    /[&<>"']/g,
    m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m])
  );
}


function valueText(v) {

  if (
    v === null ||
    v === undefined
  ) {
    return '';
  }

  if (
    typeof v === 'string' ||
    typeof v === 'number' ||
    typeof v === 'boolean'
  ) {

    return String(v);
  }

  if (Array.isArray(v)) {

    return v
      .map(valueText)
      .filter(Boolean)
      .join('\n');
  }

  if (
    typeof v === 'object'
  ) {

    return Object.entries(v)
      .map(
        ([k, val]) =>
          k + ': ' +
          valueText(val)
      )
      .join('\n');
  }

  return String(v);
}


function md(s) {

  return esc(
    valueText(s)
  )
    .replace(
      /\*\*(.*?)\*\*/g,
      '<strong>$1</strong>'
    )
    .replace(
      /^### (.*)$/gm,
      '<h3>$1</h3>'
    )
    .replace(
      /^## (.*)$/gm,
      '<h2>$1</h2>'
    )
    .replace(
      /^# (.*)$/gm,
      '<h1>$1</h1>'
    )
    .replace(
      /\n/g,
      '<br>'
    );
}


function prettyLabel(key) {

  return String(
    key || ''
  )
    .replace(
      /([A-Z])/g,
      ' $1'
    )
    .replace(
      /^./,
      x => x.toUpperCase()
    )
    .replace(
      /Cp/g,
      'CP'
    )
    .replace(
      /Tp/g,
      'TP'
    )
    .replace(
      /Atp/g,
      'ATP'
    )
    .replace(
      /Kktp/g,
      'KKTP'
    );
}


function renderTable(rows) {

  if (
    !Array.isArray(rows) ||
    !rows.length
  ) {

    return '';
  }


  const normalized =
    rows.map(
      row => {

        if (
          Array.isArray(row)
        ) {

          return row.map(
            valueText
          );
        }

        if (
          row &&
          typeof row ===
            'object'
        ) {

          return row;
        }

        return {
          isi:
            valueText(row)
        };
      }
    );


  const headers = [];


  normalized.forEach(
    row => {

      if (
        row &&
        typeof row ===
          'object' &&
        !Array.isArray(row)
      ) {

        Object.keys(
          row
        ).forEach(
          k => {

            if (
              !headers.includes(k)
            ) {

              headers.push(k);
            }
          }
        );
      }
    }
  );


  if (
    !headers.length
  ) {

    return `
      <table>
        <tbody>
          ${
            normalized
              .map(
                row =>
                  `<tr>
                    <td>
                      ${md(row)}
                    </td>
                  </tr>`
              )
              .join('')
          }
        </tbody>
      </table>
    `;
  }


  return `
    <table class="doc-table">

      <thead>

        <tr>

          ${
            headers
              .map(
                h =>
                  `<th>
                    ${esc(
                      prettyLabel(h)
                    )}
                  </th>`
              )
              .join('')
          }

        </tr>

      </thead>

      <tbody>

        ${
          normalized
            .map(
              row => `
                <tr>

                  ${
                    headers
                      .map(
                        h =>
                          `<td>
                            ${md(
                              row?.[h] ?? ''
                            )}
                          </td>`
                      )
                      .join('')
                  }

                </tr>
              `
            )
            .join('')
        }

      </tbody>

    </table>
  `;
}


function renderStructured(
  value,
  level = 0
) {

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {

    return '';
  }


  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {

    return `
      <div class="doc-text">
        ${md(value)}
      </div>
    `;
  }


  if (
    Array.isArray(value)
  ) {

    if (!value.length) {

      return '';
    }


    const allObjects =
      value.every(
        x =>
          x &&
          typeof x ===
            'object' &&
          !Array.isArray(x)
      );


    if (allObjects) {

      return renderTable(
        value
      );
    }


    return `
      <ol class="doc-list">

        ${
          value
            .map(
              x =>
                `<li>
                  ${renderStructured(
                    x,
                    level + 1
                  )}
                </li>`
            )
            .join('')
        }

      </ol>
    `;
  }


  if (
    typeof value ===
    'object'
  ) {

    let html = '';


    Object.entries(
      value
    ).forEach(
      ([key, val]) => {

        /*
         * Judul dokumen tidak perlu
         * dicetak ulang sebagai isi.
         */

        if (
          key === 'judul' ||
          key === 'title'
        ) {

          return;
        }


        /*
         * IDENTITAS
         */

        if (
          key === 'identitas' &&
          val &&
          typeof val ===
            'object' &&
          !Array.isArray(val)
        ) {

          html += `
            <div class="identity-grid">
          `;


          Object.entries(
            val
          ).forEach(
            ([k, v]) => {

              html += `
                <div class="identity-item">

                  <b>
                    ${esc(
                      prettyLabel(k)
                    )}
                  </b>

                  <span>
                    ${md(v)}
                  </span>

                </div>
              `;
            }
          );


          html += `
            </div>
          `;

          return;
        }


        /*
         * TABEL
         */

        if (
          key === 'tabel' ||
          key === 'table' ||
          key === 'rows'
        ) {

          html +=
            renderTable(val);

          return;
        }


        /*
         * BAGIAN MODUL AJAR
         */

        if (
          key === 'bagian' ||
          key === 'sections'
        ) {

          if (
            Array.isArray(val)
          ) {

            val.forEach(
              part => {

                if (
                  part &&
                  typeof part ===
                    'object'
                ) {

                  const title =
                    part.judul ||
                    part.title ||
                    part.nama ||
                    '';

                  const body =
                    part.isi ??
                    part.content ??
                    part.body ??
                    part.teks ??
                    part.text;


                  html += `
                    <section
                      class="doc-subsection"
                    >

                      ${
                        title
                          ? `<h3>
                              ${esc(title)}
                             </h3>`
                          : ''
                      }

                      ${
                        body !== undefined
                          ? renderStructured(
                              body,
                              level + 1
                            )
                          : renderStructured(
                              part,
                              level + 1
                            )
                      }

                    </section>
                  `;
                }

                else {

                  html += `
                    <section
                      class="doc-subsection"
                    >
                      ${renderStructured(
                        part,
                        level + 1
                      )}
                    </section>
                  `;
                }
              }
            );

          } else {

            html +=
              renderStructured(
                val,
                level + 1
              );
          }

          return;
        }


        /*
         * FIELD LAIN
         */

        html += `
          <section
            class="doc-subsection"
          >

            <h3>
              ${esc(
                prettyLabel(key)
              )}
            </h3>

            ${renderStructured(
              val,
              level + 1
            )}

          </section>
        `;
      }
    );


    return html;
  }


  return '';
}
/* =========================================================
   DEFINISI 7 DOKUMEN
   ========================================================= */

const DOCUMENT_DEFS = [

  {
    key: 'analisisCP',
    title: '1. Analisis Capaian Pembelajaran',
    shortTitle: 'Analisis CP',
    file: 'Analisis_CP'
  },

  {
    key: 'tujuanPembelajaran',
    title: '2. Tujuan Pembelajaran',
    shortTitle: 'Tujuan Pembelajaran',
    file: 'Tujuan_Pembelajaran'
  },

  {
    key: 'atp',
    title: '3. Alur Tujuan Pembelajaran',
    shortTitle: 'ATP',
    file: 'ATP'
  },

  {
    key: 'prota',
    title: '4. Program Tahunan',
    shortTitle: 'Prota',
    file: 'Prota'
  },

  {
    key: 'promes',
    title: '5. Program Semester',
    shortTitle: 'Promes',
    file: 'Promes'
  },

  {
    key: 'kktp',
    title: '6. Kriteria Ketercapaian Tujuan Pembelajaran',
    shortTitle: 'KKTP',
    file: 'KKTP'
  },

  {
    key: 'modulAjar',
    title: '7. Modul Ajar',
    shortTitle: 'Modul Ajar',
    file: 'Modul_Ajar'
  }

];


/* =========================================================
   HTML SATU DOKUMEN
   ========================================================= */

function getDocumentHtml(key) {

  const r =
    state.result || {};

  const p =
    state.profile || {};

  const def =
    DOCUMENT_DEFS.find(
      x => x.key === key
    );


  if (!def) {

    return `
      <div class="error">
        Dokumen tidak ditemukan.
      </div>
    `;
  }


  const data =
    r[key];


  if (
    data === undefined ||
    data === null
  ) {

    return `
      <article
        class="single-document"
      >

        <h1>
          ${esc(def.title)}
        </h1>

        <p>
          Dokumen belum tersedia.
        </p>

      </article>
    `;
  }


  const title =
    data?.judul ||
    data?.title ||
    def.title;


  return `

    <article
      class="single-document"
      data-document-key="${esc(key)}"
    >

      <!-- COVER -->

      <div
        class="document-cover"
      >

        <h1>
          ${esc(title)}
        </h1>

        <h2>
          ${esc(
            p.subject || ''
          )}
        </h2>

        <h2>
          ${esc(
            p.school || ''
          )}
        </h2>

        <p>
          Kelas
          ${esc(
            p.grade || ''
          )}
          • Fase
          ${esc(
            phaseFor(
              p.grade || ''
            )
          )}
          •
          ${esc(
            p.year || ''
          )}
        </p>

      </div>


      <!-- IDENTITAS -->

      <div
        class="document-identity"
      >

        <table>

          <tr>
            <th>
              Nama Satuan Pendidikan
            </th>

            <td>
              ${esc(
                p.school || ''
              )}
            </td>
          </tr>


          <tr>
            <th>
              Mata Pelajaran
            </th>

            <td>
              ${esc(
                p.subject || ''
              )}
            </td>
          </tr>


          <tr>
            <th>
              Kelas
            </th>

            <td>
              ${esc(
                p.grade || ''
              )}
            </td>
          </tr>


          <tr>
            <th>
              Fase
            </th>

            <td>
              ${esc(
                phaseFor(
                  p.grade || ''
                )
              )}
            </td>
          </tr>


          <tr>
            <th>
              Tahun Pelajaran
            </th>

            <td>
              ${esc(
                p.year || ''
              )}
            </td>
          </tr>

        </table>

      </div>


      <!-- ISI DOKUMEN -->

      <div
        class="document-body"
      >

        ${renderStructured(
          data
        )}

      </div>


      <!-- TANDA TANGAN -->

      <div
        class="signature-table"
      >

        <table>

          <tr>

            <td>

              Mengetahui,<br>

              Kepala Sekolah

              <br><br><br>

              <strong>
                ${esc(
                  p.principalName || ''
                )}
              </strong>

              <br>

              NIP.
              ${esc(
                p.principalNip || ''
              )}

            </td>


            <td>

              ${esc(
                p.signPlaceDate || ''
              )}

              <br>

              Guru Mata Pelajaran

              <br><br><br>

              <strong>
                ${esc(
                  p.teacherName ||
                  state.user?.name ||
                  ''
                )}
              </strong>

              <br>

              NIP.
              ${esc(
                p.teacherNip || ''
              )}

            </td>

          </tr>

        </table>

      </div>

    </article>

  `;
}


/* =========================================================
   CSS DOKUMEN
   ========================================================= */

function documentCss() {

  return `

    * {
      box-sizing: border-box;
    }


    body {

      font-family:
        Arial,
        Helvetica,
        sans-serif;

      font-size:
        11pt;

      line-height:
        1.5;

      margin:
        0;

      color:
        #111;

      background:
        #fff;
    }


    h1 {

      font-size:
        20pt;

      margin:
        0 0 14px;

      text-align:
        center;
    }


    h2 {

      font-size:
        15pt;

      margin:
        8px 0;

      text-align:
        center;
    }


    h3 {

      font-size:
        12pt;

      margin:
        18px 0 8px;

      font-weight:
        700;
    }


    p {

      margin:
        6px 0;
    }


    table {

      border-collapse:
        collapse;

      width:
        100%;

      margin:
        12px 0;
    }


    th,
    td {

      border:
        1px solid #222;

      padding:
        7px;

      vertical-align:
        top;
    }


    th {

      font-weight:
        700;
    }


    .document-cover {

      text-align:
        center;

      margin-bottom:
        25px;

      page-break-after:
        avoid;
    }


    .document-cover h1 {

      margin-bottom:
        18px;
    }


    .document-cover h2 {

      margin:
        5px 0;
    }


    .document-identity {

      margin:
        15px 0 20px;
    }


    .document-identity th {

      width:
        32%;

      text-align:
        left;
    }


    .identity-grid {

      display:
        grid;

      grid-template-columns:
        1fr 2fr;

      width:
        100%;

      border:
        1px solid #222;

      margin:
        12px 0;
    }


    .identity-item {

      display:
        contents;
    }


    .identity-item b,
    .identity-item span {

      padding:
        7px;

      border-bottom:
        1px solid #222;
    }


    .identity-item b {

      border-right:
        1px solid #222;
    }


    .doc-text {

      margin:
        7px 0;

      white-space:
        normal;
    }


    .doc-list {

      padding-left:
        25px;
    }


    .doc-subsection {

      margin:
        12px 0 18px;

      page-break-inside:
        avoid;
    }


    .doc-table {

      margin:
        14px 0;

      page-break-inside:
        auto;
    }


    .doc-table tr {

      page-break-inside:
        avoid;

      page-break-after:
        auto;
    }


    .doc-table th {

      background:
        #f3f3f3;
    }


    .signature-table {

      margin-top:
        40px;

      page-break-inside:
        avoid;
    }


    .signature-table td {

      width:
        50%;

      height:
        130px;

      border:
        none;

      text-align:
        center;

      vertical-align:
        top;
    }


    .error {

      padding:
        15px;

      border:
        1px solid #c00;

      color:
        #900;
    }


    @media print {

      body {

        margin:
          15mm;
      }

      .document-cover {

        page-break-after:
          always;
      }

    }

  `;
}


/* =========================================================
   HTML LENGKAP UNTUK WORD / PDF
   ========================================================= */

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


  return `

<!DOCTYPE html>

<html>

<head>

  <meta charset="utf-8">

  <title>
    ${esc(def.title)}
  </title>

  <style>

    ${documentCss()}

  </style>

</head>


<body>

  ${getDocumentHtml(key)}

</body>

</html>

  `;
}


/* =========================================================
   NAMA FILE AMAN
   ========================================================= */

function safeFileName(
  name
) {

  return String(
    name || 'dokumen'
  )

    .replace(
      /[^a-z0-9_-]+/gi,
      '_'
    )

    .replace(
      /^_+|_+$/g,
      ''
    )

    ||
    'dokumen';
}


/* =========================================================
   PREVIEW 1 DOKUMEN
   ========================================================= */

function previewDocument(
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
    getDocumentHtml(key);


  const modal =
    document.createElement(
      'div'
    );


  modal.id =
    'documentPreviewModal';


  modal.innerHTML = `

    <div
      class="document-modal-overlay"
      onclick="closeDocumentPreview(event)"
    >

      <div
        class="document-modal"
        onclick="event.stopPropagation()"
      >

        <div
          class="document-modal-header"
        >

          <h2>
            ${esc(
              def.title
            )}
          </h2>


          <button
            type="button"
            onclick="closeDocumentPreview()"
          >
            ✕
          </button>

        </div>


        <div
          class="document-modal-body"
        >

          ${html}

        </div>

      </div>

    </div>

  `;


  document.body.appendChild(
    modal
  );


  if (
    !document.getElementById(
      'documentPreviewStyles'
    )
  ) {

    const style =
      document.createElement(
        'style'
      );

    style.id =
      'documentPreviewStyles';


    style.textContent = `

      #documentPreviewModal {

        position:
          fixed;

        inset:
          0;

        z-index:
          99999;
      }


      .document-modal-overlay {

        position:
          absolute;

        inset:
          0;

        background:
          rgba(0,0,0,.65);

        overflow:
          auto;

        padding:
          30px;
      }


      .document-modal {

        width:
          min(900px, 100%);

        margin:
          0 auto;

        background:
          #fff;

        border-radius:
          12px;

        overflow:
          hidden;

        box-shadow:
          0 20px 60px
          rgba(0,0,0,.3);
      }


      .document-modal-header {

        position:
          sticky;

        top:
          0;

        z-index:
          2;

        display:
          flex;

        justify-content:
          space-between;

        align-items:
          center;

        gap:
          10px;

        padding:
          14px 18px;

        background:
          #fff;

        border-bottom:
          1px solid #ddd;
      }


      .document-modal-header h2 {

        margin:
          0;

        text-align:
          left;

        font-size:
          18px;
      }


      .document-modal-header button {

        border:
          0;

        background:
          #eee;

        width:
          36px;

        height:
          36px;

        border-radius:
          50%;

        cursor:
          pointer;

        font-size:
          18px;
      }


      .document-modal-body {

        padding:
          30px;

        background:
          #fff;
      }


      .document-modal-body
      .single-document {

        max-width:
          794px;

        margin:
          0 auto;
      }

    `;


    document.head.appendChild(
      style
    );
  }
}


function closeDocumentPreview(
  event
) {

  if (
    event &&
    event.target &&
    !event.target.classList.contains(
      'document-modal-overlay'
    )
  ) {

    return;
  }


  const modal =
    document.getElementById(
      'documentPreviewModal'
    );


  if (modal) {

    modal.remove();
  }
}


/* =========================================================
   DOWNLOAD WORD
   ========================================================= */

function downloadWord(
  key
) {

  if (!key) {

    alert(
      'Pilih salah satu dari 7 dokumen terlebih dahulu.'
    );

    return;
  }


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
    documentFullHtml(key);


  /*
   * Format HTML yang dapat dibuka
   * langsung oleh Microsoft Word.
   */

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


  const a =
    document.createElement(
      'a'
    );


  const p =
    state.profile || {};


  a.href =
    url;


  a.download =
    `${def.file}_${
      safeFileName(
        p.abbr ||
        'SD'
      )
    }_Kelas_${
      safeFileName(
        p.grade ||
        ''
      )
    }.doc`;


  document.body.appendChild(
    a
  );


  a.click();


  a.remove();


  setTimeout(
    () => {

      URL.revokeObjectURL(
        url
      );

    },
    1000
  );
}


/* =========================================================
   DOWNLOAD PDF
   ========================================================= */

async function downloadPDF(
  key
) {

  if (!key) {

    alert(
      'Pilih salah satu dari 7 dokumen terlebih dahulu.'
    );

    return;
  }


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


  /*
   * Cek jsPDF
   */

  if (
    !window.jspdf ||
    !window.jspdf.jsPDF
  ) {

    alert(
      'Library PDF belum tersedia. Pastikan jsPDF sudah dimuat di index.html.'
    );

    return;
  }


  const {
    jsPDF
  } =
    window.jspdf;


  const pdf =
    new jsPDF(
      {
        unit:
          'mm',

        format:
          'a4',

        orientation:
          'portrait'
      }
    );


  /*
   * Container sementara.
   * Tidak terlihat oleh pengguna.
   */

  const holder =
    document.createElement(
      'div'
    );


  holder.style.position =
    'fixed';

  holder.style.left =
    '-100000px';

  holder.style.top =
    '0';

  holder.style.width =
    '794px';

  holder.style.background =
    '#fff';

  holder.style.padding =
    '0';


  holder.innerHTML =
    getDocumentHtml(key);


  document.body.appendChild(
    holder
  );


  try {

    await pdf.html(
      holder,
      {

        margin:
          [
            12,
            12,
            12,
            12
          ],

        autoPaging:
          'text',

        html2canvas:
          {
            scale:
              0.7,

            useCORS:
              true
          },

        callback:
          function(doc) {

            const p =
              state.profile ||
              {};


            doc.save(

              `${def.file}_${
                safeFileName(
                  p.abbr ||
                  'SD'
                )
              }_Kelas_${
                safeFileName(
                  p.grade ||
                  ''
                )
              }.pdf`

            );

          }

      }
    );

  } catch (err) {

    console.error(
      'PDF error:',
      err
    );

    alert(
      'Gagal membuat PDF: ' +
      err.message
    );

  } finally {

    holder.remove();
  }
}


/* =========================================================
   DOWNLOAD SEMUA 7 WORD
   ========================================================= */

async function downloadAllDocumentsWord() {

  if (
    !state.result
  ) {

    alert(
      'Belum ada hasil dokumen.'
    );

    return;
  }


  /*
   * Browser dapat meminta izin
   * untuk beberapa download sekaligus.
   */

  for (
    let i = 0;
    i < DOCUMENT_DEFS.length;
    i++
  ) {

    const def =
      DOCUMENT_DEFS[i];


    downloadWord(
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


/* =========================================================
   DOWNLOAD SEMUA 7 PDF
   ========================================================= */

async function downloadAllDocumentsPDF() {

  if (
    !state.result
  ) {

    alert(
      'Belum ada hasil dokumen.'
    );

    return;
  }


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


/* =========================================================
   RENDER HASIL 7 DOKUMEN
   ========================================================= */

function renderResult() {

  const r =
    state.result || {};

  const p =
    state.profile || {};


  /*
   * Meta hasil
   */

  const meta =
    $('#resultMeta');


  if (meta) {

    meta.textContent =
      `${p.school || ''} • ` +
      `${p.subject || ''} • ` +
      `Kelas ${p.grade || ''} • ` +
      `Fase ${phaseFor(
        p.grade || ''
      )}`;
  }


  const preview =
    $('#preview');


  if (!preview) {

    console.error(
      'Elemen #preview tidak ditemukan.'
    );

    return;
  }


  /*
   * Tombol semua dokumen
   */

  let html = `

    <div
      class="result-actions"
      style="
        margin-bottom:20px;
        display:flex;
        gap:10px;
        flex-wrap:wrap;
      "
    >

      <button
        type="button"
        class="primary"
        onclick="
          downloadAllDocumentsWord()
        "
      >
        ⬇ Word Semua 7 Dokumen
      </button>


      <button
        type="button"
        class="secondary"
        onclick="
          downloadAllDocumentsPDF()
        "
      >
        ⬇ PDF Semua 7 Dokumen
      </button>

    </div>

  `;


  /*
   * BUAT 7 CARD TERPISAH
   */

  DOCUMENT_DEFS.forEach(
    def => {

      const data =
        r[def.key];


      html += `

        <div
          class="document-card"
          style="
            margin-bottom:28px;
            border:1px solid #ddd;
            border-radius:12px;
            overflow:hidden;
            background:#fff;
          "
        >


          <!-- HEADER -->

          <div
            class="document-card-header"
            style="
              display:flex;
              justify-content:space-between;
              align-items:center;
              gap:10px;
              flex-wrap:wrap;
              padding:16px;
              background:#f7f7f7;
              border-bottom:1px solid #ddd;
            "
          >

            <h2
              style="
                margin:0;
                font-size:18px;
              "
            >
              ${esc(
                def.title
              )}
            </h2>


            <div
              class="document-card-actions"
              style="
                display:flex;
                gap:8px;
                flex-wrap:wrap;
              "
            >

              <button
                type="button"
                class="secondary"
                onclick="
                  previewDocument(
                    '${def.key}'
                  )
                "
              >
                👁 Preview
              </button>


              <button
                type="button"
                class="secondary"
                onclick="
                  downloadWord(
                    '${def.key}'
                  )
                "
              >
                ⬇ Word
              </button>


              <button
                type="button"
                class="secondary"
                onclick="
                  downloadPDF(
                    '${def.key}'
                  )
                "
              >
                ⬇ PDF
              </button>

            </div>

          </div>


          <!-- ISI -->

          <div
            class="document-preview-content"
            id="
              docPreview_${def.key}
            "
            style="
              padding:20px;
              max-height:700px;
              overflow:auto;
            "
          >

            ${
              data

                ? getDocumentHtml(
                    def.key
                  )

                : `
                    <p
                      style="
                        color:#777;
                      "
                    >
                      Dokumen belum tersedia.
                    </p>
                  `
            }

          </div>

        </div>

      `;
    }
  );


  preview.innerHTML =
    html;
}


/* =========================================================
   EKSPOR GLOBAL
   ========================================================= */

window.showScreen =
  showScreen;

window.logout =
  logout;

window.openProfile =
  openProfile;

window.openModule =
  openModule;

window.saveProfile =
  saveProfile;

window.getCP =
  getCP;

window.suggestTP =
  suggestTP;

window.generateDocuments =
  generateDocuments;

window.submitPayment =
  submitPayment;

window.previewDocument =
  previewDocument;

window.closeDocumentPreview =
  closeDocumentPreview;

window.downloadWord =
  downloadWord;

window.downloadPDF =
  downloadPDF;

window.downloadAllDocumentsWord =
  downloadAllDocumentsWord;

window.downloadAllDocumentsPDF =
  downloadAllDocumentsPDF;
/* =========================================================
   NAVIGASI HALAMAN
   ========================================================= */

function openProfile() {

  if (!state.user) {
    showScreen('login');
    return;
  }

  if (!state.profile) {
    loadProfile()
      .then(() => {
        showScreen('profile');
      })
      .catch(err => {
        console.error(err);

        if (
          String(err.message || '')
            .toLowerCase()
            .includes('sesi')
        ) {
          logout();
        } else {
          alert(err.message);
        }
      });

    return;
  }

  fillProfile();

  showScreen('profile');
}


function openModule() {

  if (!state.user) {
    showScreen('login');
    return;
  }

  if (!state.profile) {

    loadProfile()
      .then(() => {
        fillModule();
        showScreen('module');
      })
      .catch(err => {

        console.error(err);

        if (
          String(err.message || '')
            .toLowerCase()
            .includes('sesi')
        ) {
          logout();
        } else {
          alert(err.message);
        }

      });

    return;
  }

  fillModule();

  showScreen('module');
}


/* =========================================================
   LOAD PROFILE
   ========================================================= */

async function loadProfile() {

  if (
    !state.user ||
    !state.user.token
  ) {

    throw new Error(
      'Sesi login tidak ditemukan. Silakan masuk kembali.'
    );
  }


  const d =
    await api(
      'me',
      {
        token:
          state.user.token
      }
    );


  if (!d || !d.user) {

    throw new Error(
      'Data akun tidak ditemukan.'
    );
  }


  state.user =
    d.user;


  state.profile =
    d.profile || {};


  localStorage.setItem(
    'ma_user',
    JSON.stringify(
      state.user
    )
  );


  fillProfile();

  return d;
}


/* =========================================================
   ISI FORM PROFILE
   ========================================================= */

function fillProfile() {

  const form =
    $('#profileForm');


  if (!form) {
    return;
  }


  const profile =
    state.profile || {};


  Object.entries(
    profile
  ).forEach(
    ([key, value]) => {

      const element =
        form.elements[key];


      if (element) {

        element.value =
          value ?? '';

      }

    }
  );


  const teacherName =
    $('#teacherName');


  if (teacherName) {

    teacherName.value =
      state.user?.name ||
      profile.teacherName ||
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


/* =========================================================
   ISI DATA MODUL
   ========================================================= */

function fillModule() {

  const p =
    state.profile || {};


  const fields = [

    ['mSchool', 'school'],

    ['mTeacher', 'teacherName'],

    ['mTeacherNip', 'teacherNip'],

    ['mPrincipal', 'principalName'],

    ['mPrincipalNip', 'principalNip'],

    ['mSign', 'signPlaceDate'],

    ['mGrade', 'grade']

  ];


  fields.forEach(
    ([id, key]) => {

      const element =
        $('#' + id);


      if (element) {

        element.value =
          p[key] || '';

      }

    }
  );


  const moduleCP =
    $('#moduleCP');


  if (moduleCP) {

    moduleCP.value =
      p.cp || '';

  }


  /*
   * Jika data profile sudah memiliki
   * mata pelajaran, isi otomatis.
   */

  const subject =
    $('#moduleForm [name="subject"]');


  if (
    subject &&
    p.subject
  ) {

    subject.value =
      p.subject;

  }


  const grade =
    $('#moduleForm [name="grade"]');


  if (
    grade &&
    p.grade
  ) {

    grade.value =
      p.grade;

  }
}


/* =========================================================
   SIMPAN PROFILE
   ========================================================= */

async function saveProfile() {

  if (
    !state.user ||
    !state.user.token
  ) {

    throw new Error(
      'Sesi login tidak ditemukan.'
    );
  }


  const form =
    $('#profileForm');


  if (!form) {

    throw new Error(
      'Form profil tidak ditemukan.'
    );
  }


  const profile =
    Object.fromEntries(
      new FormData(form)
    );


  profile.teacherName =
    state.user.name ||
    profile.teacherName ||
    '';


  if (
    profile.grade
  ) {

    profile.phase =
      phaseFor(
        profile.grade
      );

  }


  const d =
    await api(
      'saveProfile',
      {
        token:
          state.user.token,

        profile:
          profile
      }
    );


  state.profile = {
    ...(state.profile || {}),
    ...profile
  };


  fillProfile();


  return d;
}


/* =========================================================
   AMBIL CP
   ========================================================= */

async function getCP(
  fromModule = false
) {

  try {

    if (
      !state.user ||
      !state.user.token
    ) {

      throw new Error(
        'Sesi login tidak ditemukan. Silakan masuk kembali.'
      );
    }


    let sourceForm;


    /*
     * Jika tombol Ambil CP berada di
     * form modul, ambil dari moduleForm.
     * Jika tidak, ambil dari profileForm.
     */

    if (fromModule) {

      sourceForm =
        $('#moduleForm');

    } else {

      sourceForm =
        $('#profileForm');

    }


    if (!sourceForm) {

      throw new Error(
        'Form data tidak ditemukan.'
      );
    }


    const formData =
      Object.fromEntries(
        new FormData(
          sourceForm
        )
      );


    /*
     * Gabungkan data form dengan profile
     */

    const p = {

      ...(state.profile || {}),

      ...formData

    };


    const subject =
      String(
        p.subject || ''
      ).trim();


    const grade =
      String(
        p.grade || ''
      ).trim();


    const abbr =
      String(
        p.abbr || ''
      ).trim();


    if (
      !subject ||
      !grade
    ) {

      alert(
        'Isi mata pelajaran dan kelas dahulu.'
      );

      return;

    }


    const phase =
      phaseFor(
        grade
      );


    console.log(
      'Mengambil CP:',
      {
        subject,
        grade,
        phase,
        abbr
      }
    );


    /*
     * Tampilkan status jika elemen tersedia
     */

    const cpSource =
      $('#cpSource');


    if (cpSource) {

      cpSource.textContent =
        'Sedang mengambil CP...';

    }


    const d =
      await api(
        'getCP',
        {
          token:
            state.user.token,

          subject:
            subject,

          grade:
            grade,

          phase:
            phase,

          abbr:
            abbr
        }
      );


    if (
      !d ||
      !d.cp
    ) {

      throw new Error(
        'CP tidak ditemukan di database.'
      );

    }


    /*
     * Masukkan CP ke field yang sesuai
     */

    if (fromModule) {

      const moduleCP =
        $('#moduleCP');


      if (moduleCP) {

        moduleCP.value =
          d.cp;

      }

    } else {

      const cp =
        $('#cp');


      if (cp) {

        cp.value =
          d.cp;

      }


      if (cpSource) {

        cpSource.textContent =
          d.source || 'Database CP';

      }

    }


    /*
     * Simpan ke state
     */

    state.profile = {

      ...(state.profile || {}),

      ...formData,

      subject:
        subject,

      grade:
        grade,

      phase:
        phase,

      abbr:
        abbr,

      cp:
        d.cp

    };


    console.log(
      'CP berhasil diambil.'
    );


    return d;

  } catch (error) {

    console.error(
      'getCP error:',
      error
    );


    /*
     * Jika session benar-benar habis,
     * jangan langsung menghapus data profil.
     */

    if (
      String(
        error.message || ''
      )
        .toLowerCase()
        .includes(
          'sesi berakhir'
        )
    ) {

      alert(
        'Sesi login telah berakhir. Silakan masuk kembali.'
      );

      logout();

      return;

    }


    alert(
      error.message ||
      'Gagal mengambil CP.'
    );

  }

}


/* =========================================================
   SARAN TUJUAN PEMBELAJARAN
   ========================================================= */

async function suggestTP() {

  try {

    if (
      !state.user ||
      !state.user.token
    ) {

      throw new Error(
        'Sesi login tidak ditemukan.'
      );

    }


    const form =
      $('#moduleForm');


    if (!form) {

      throw new Error(
        'Form Modul Ajar tidak ditemukan.'
      );

    }


    const moduleData =
      Object.fromEntries(
        new FormData(form)
      );


    /*
     * Ambil dimensi profil lulusan
     */

    const dimensions =
      $$('#dimensions input:checked')
        .map(
          x => x.value
        );


    moduleData.dimensions =
      dimensions;


    const d =
      await api(
        'suggestTP',
        {

          token:
            state.user.token,

          profile:
            state.profile || {},

          module:
            moduleData

        }
      );


    if (
      !d ||
      !d.tp
    ) {

      throw new Error(
        'AI tidak menghasilkan Tujuan Pembelajaran.'
      );

    }


    const tp =
      $('#tp');


    if (tp) {

      tp.value =
        d.tp;

    }


    /*
     * Simpan ke module state
     */

    state.module = {

      ...(state.module || {}),

      ...moduleData,

      tp:
        d.tp

    };


    return d;

  } catch (error) {

    console.error(
      'suggestTP error:',
      error
    );


    if (
      String(
        error.message || ''
      )
        .toLowerCase()
        .includes(
          'sesi berakhir'
        )
    ) {

      alert(
        'Sesi login telah berakhir. Silakan masuk kembali.'
      );

      logout();

      return;

    }


    alert(
      error.message ||
      'Gagal membuat Tujuan Pembelajaran.'
    );

  }

}


/* =========================================================
   BUAT 7 DOKUMEN
   ========================================================= */

async function generateDocuments() {

  try {

    if (
      !state.user ||
      !state.user.token
    ) {

      throw new Error(
        'Sesi login tidak ditemukan. Silakan masuk kembali.'
      );

    }


    const form =
      $('#moduleForm');


    if (!form) {

      throw new Error(
        'Form Modul Ajar tidak ditemukan.'
      );

    }


    const moduleData =
      Object.fromEntries(
        new FormData(form)
      );


    /*
     * Ambil dimensi yang dicentang
     */

    moduleData.dimensions =
      $$('#dimensions input:checked')
        .map(
          x => x.value
        );


    /*
     * Jika memilih Lainnya
     */

    if (
      moduleData.pedagogy ===
      'Lainnya'
    ) {

      moduleData.pedagogy =
        moduleData.otherPedagogy ||
        'Pendekatan pembelajaran lainnya';

    }


    /*
     * Pastikan CP tersedia
     */

    const cp =
      String(
        moduleData.cp ||
        state.profile?.cp ||
        $('#moduleCP')?.value ||
        $('#cp')?.value ||
        ''
      ).trim();


    if (!cp) {

      alert(
        'CP belum tersedia. Silakan klik "Ambil CP" terlebih dahulu.'
      );

      return;

    }


    moduleData.cp =
      cp;


    /*
     * Jika TP sudah dibuat
     * gunakan TP tersebut.
     */

    const tp =
      String(
        moduleData.tp ||
        $('#tp')?.value ||
        ''
      ).trim();


    if (tp) {

      moduleData.tp =
        tp;

    }


    state.module =
      moduleData;


    /*
     * Tombol submit
     */

    const button =
      form.querySelector(
        'button[type="submit"]'
      );


    const oldText =
      button
        ? button.textContent
        : '';


    if (button) {

      button.disabled =
        true;

      button.textContent =
        '⏳ AI sedang menyusun 7 dokumen...';

    }


    const d =
      await api(
        'generateDocuments',
        {

          token:
            state.user.token,

          profile:
            state.profile || {},

          module:
            moduleData

        }
      );


    if (
      !d ||
      !d.result
    ) {

      throw new Error(
        'Server tidak mengembalikan hasil dokumen.'
      );

    }


    /*
     * Pastikan 7 dokumen ada
     */

    const missing =
      DOCUMENT_DEFS
        .filter(
          x =>
            !Object.prototype
              .hasOwnProperty
              .call(
                d.result,
                x.key
              )
        )
        .map(
          x =>
            x.shortTitle
        );


    if (
      missing.length
    ) {

      throw new Error(
        'Hasil AI belum lengkap. Dokumen yang hilang: ' +
        missing.join(', ')
      );

    }


    state.result =
      d.result;


    /*
     * Tampilkan hasil
     */

    renderResult();


    showScreen(
      'result'
    );


  } catch (error) {

    console.error(
      'generateDocuments error:',
      error
    );


    if (
      String(
        error.message || ''
      )
        .toLowerCase()
        .includes(
          'sesi berakhir'
        )
    ) {

      alert(
        'Sesi login telah berakhir. Silakan masuk kembali.'
      );

      logout();

      return;

    }


    alert(
      error.message ||
      'Gagal membuat dokumen.'
    );


  } finally {

    const form =
      $('#moduleForm');


    const button =
      form?.querySelector(
        'button[type="submit"]'
      );


    if (button) {

      button.disabled =
        false;

      button.textContent =
        '🚀 Buat Modul Ajar dengan AI';

    }

  }

}


/* =========================================================
   SUBMIT PAYMENT
   ========================================================= */

async function submitPayment(
  event
) {

  if (event) {

    event.preventDefault();

  }


  const form =
    $('#paymentForm');


  if (!form) {

    return;

  }


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


  try {

    setMsg(
      'paymentMsg',
      'Mengunggah bukti pembayaran...'
    );


    const data =
      await fileToDataUrl_(
        file
      );


    const token =
      sessionStorage.getItem(
        'payment_token'
      );


    if (!token) {

      throw new Error(
        'Token pembayaran tidak ditemukan. Silakan login kembali.'
      );

    }


    const d =
      await api(
        'submitPayment',
        {

          token:
            token,

          name:
            form.name.value.trim(),

          nip:
            form.nip.value.trim(),

          email:
            form.email.value,

          fileName:
            file.name,

          mimeType:
            file.type,

          fileData:
            data

        }
      );


    setMsg(
      'paymentMsg',
      d.message +
      ' Total: ' +
      money(
        d.payment.totalAmount
      ),
      'success'
    );


    const paymentWa =
      $('#paymentWa');


    if (paymentWa) {

      paymentWa.classList.remove(
        'hidden'
      );


      paymentWa.onclick =
        () => {

          const msg =
`Konfirmasi Pembayaran Modul Ajar AI

Nama: ${form.name.value.trim()}
NIP: ${form.nip.value.trim()}
Email: ${form.email.value}

Harga: ${money(d.payment.basePrice)}
Kode unik: ${money(d.payment.uniqueCode)}
Total: ${money(d.payment.totalAmount)}

Bukti pembayaran sudah saya upload ke sistem.`;

          window.open(
            'https://wa.me/6285722228896?text=' +
            encodeURIComponent(
              msg
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
      'submitPayment error:',
      error
    );


    setMsg(
      'paymentMsg',
      error.message ||
      'Gagal mengirim pembayaran.',
      'error'
    );

  }

}


/* =========================================================
   EVENT PROFILE
   ========================================================= */

const profileForm =
  $('#profileForm');


if (profileForm) {

  profileForm.addEventListener(
    'input',
    function(event) {

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


  profileForm.addEventListener(
    'submit',
    async function(event) {

      event.preventDefault();


      try {

        await saveProfile();


        fillModule();


        showScreen(
          'module'
        );


      } catch (error) {

        console.error(
          error
        );


        if (
          String(
            error.message || ''
          )
            .toLowerCase()
            .includes(
              'sesi'
            )
        ) {

          alert(
            'Sesi login telah berakhir. Silakan masuk kembali.'
          );

          logout();

        } else {

          alert(
            error.message
          );

        }

      }

    }
  );

}


/* =========================================================
   EVENT MODULE
   ========================================================= */

const moduleForm =
  $('#moduleForm');


if (moduleForm) {

  moduleForm.addEventListener(
    'submit',
    async function(event) {

      event.preventDefault();

      await generateDocuments();

    }
  );

}


/* =========================================================
   EVENT PEDAGOGY
   ========================================================= */

const pedagogy =
  $('#pedagogy');


if (pedagogy) {

  pedagogy.addEventListener(
    'change',
    function(event) {

      const wrap =
        $('#otherPedagogyWrap');


      if (wrap) {

        wrap.classList.toggle(
          'hidden',
          event.target.value !==
          'Lainnya'
        );

      }

    }
  );

}


/* =========================================================
   EVENT PAYMENT
   ========================================================= */

const paymentForm =
  $('#paymentForm');


if (paymentForm) {

  paymentForm.addEventListener(
    'submit',
    submitPayment
  );

}


/* =========================================================
   EVENT LOGIN
   ========================================================= */

const loginForm =
  $('#loginForm');


if (loginForm) {

  loginForm.addEventListener(
    'submit',
    async function(event) {

      event.preventDefault();


      setMsg(
        'loginMsg',
        'Memeriksa...'
      );


      try {

        const data =
          Object.fromEntries(
            new FormData(
              event.target
            )
          );


        const d =
          await api(
            'login',
            data
          );


        state.user =
          d.user;


        localStorage.setItem(
          'ma_user',
          JSON.stringify(
            state.user
          )
        );


        renderUser();


        /*
         * ADMIN
         */

        if (
          d.user.role ===
          'admin'
        ) {

          await loadAdmin();

          return;

        }


        /*
         * BELUM PREMIUM
         */

        if (
          !d.user.premium
        ) {

          if (
            d.user.status ===
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
            d.paymentSummary,
            d.user,
            d.paymentToken
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
          'Login error:',
          error
        );


        setMsg(
          'loginMsg',
          error.message ||
          'Gagal masuk.',
          'error'
        );

      }

    }
  );

}


/* =========================================================
   EVENT REGISTER
   ========================================================= */

const registerForm =
  $('#registerForm');


if (registerForm) {

  registerForm.addEventListener(
    'submit',
    async function(event) {

      event.preventDefault();


      const data =
        Object.fromEntries(
          new FormData(
            event.target
          )
        );


      if (
        String(
          data.password || ''
        ).length < 10
      ) {

        setMsg(
          'registerMsg',
          'Password minimal 10 karakter.',
          'error'
        );

        return;

      }


      setMsg(
        'registerMsg',
        'Mengirim...'
      );


      try {

        await api(
          'register',
          data
        );


        setMsg(
          'registerMsg',
          'Pendaftaran berhasil. Silakan cek email untuk verifikasi.',
          'success'
        );


        event.target.reset();


      } catch (error) {

        console.error(
          'Register error:',
          error
        );


        setMsg(
          'registerMsg',
          error.message ||
          'Pendaftaran gagal.',
          'error'
        );

      }

    }
  );

}


/* =========================================================
   EVENT LUPA PASSWORD
   ========================================================= */

const forgotForm =
  $('#forgotForm');


if (forgotForm) {

  forgotForm.addEventListener(
    'submit',
    async function(event) {

      event.preventDefault();


      setMsg(
        'forgotMsg',
        'Mengirim...'
      );


      try {

        const d =
          await api(
            'requestPasswordReset',
            Object.fromEntries(
              new FormData(
                event.target
              )
            )
          );


        setMsg(
          'forgotMsg',
          d.message,
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
  );

}


/* =========================================================
   EVENT RESET PASSWORD
   ========================================================= */

const resetForm =
  $('#resetForm');


if (resetForm) {

  resetForm.addEventListener(
    'submit',
    async function(event) {

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
          'Password tidak sama.',
          'error'
        );

        return;

      }


      setMsg(
        'resetMsg',
        'Menyimpan...'
      );


      try {

        const d =
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
          d.message,
          'success'
        );


        event.target.reset();


        history.replaceState(
          {},
          '',
          location.pathname
        );


        setTimeout(
          () => {

            showScreen(
              'login'
            );

          },
          900
        );


      } catch (error) {

        setMsg(
          'resetMsg',
          error.message,
          'error'
        );

      }

    }
  );

}


/* =========================================================
   HANDLE LINK EMAIL
   ========================================================= */

function queryParam_(name) {

  const hash =
    location.hash.replace(
      /^#/,
      ''
    );


  return new URLSearchParams(
    hash
  ).get(name);
}


async function handleEmailLink_() {

  const verify =
    queryParam_(
      'verify'
    );


  const reset =
    queryParam_(
      'reset'
    );


  const payment =
    queryParam_(
      'payment'
    );


  /*
   * VERIFIKASI EMAIL
   */

  if (verify) {

    try {

      const d =
        await api(
          'verifyEmail',
          {
            token:
              verify
          }
        );


      setupPaymentScreen(
        d.paymentSummary || {
          basePrice:
            0,

          uniqueCode:
            0,

          totalAmount:
            0
        },

        d.user,

        d.paymentToken
      );


      alert(
        d.message ||
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


  /*
   * RESET PASSWORD
   */

  if (reset) {

    const token =
      $('#resetToken');


    if (token) {

      token.value =
        reset;

    }


    showScreen(
      'resetPassword'
    );


    return;
  }


  /*
   * PAYMENT
   */

  if (payment) {

    try {

      const d =
        await api(
          'paymentInfo',
          {
            token:
              payment
          }
        );


      setupPaymentScreen(
        d.paymentSummary,
        d.user,
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


/* =========================================================
   PEMULIHAN SESI LOGIN
   ========================================================= */

(async function initApp() {

  try {

    const saved =
      localStorage.getItem(
        'ma_user'
      );


    /*
     * Tidak ada sesi tersimpan.
     */

    if (!saved) {

      handleEmailLink_();

      return;

    }


    state.user =
      JSON.parse(
        saved
      );


    if (
      !state.user ||
      !state.user.token
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
     * Coba validasi sesi
     * dengan backend.
     */

    try {

      const d =
        await api(
          'me',
          {
            token:
              state.user.token
          }
        );


      if (
        d &&
        d.user
      ) {

        state.user =
          d.user;


        state.profile =
          d.profile || {};


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

          fillProfile();

          showScreen(
            'dashboard'
          );


          handleEmailLink_();

          return;

        }


        /*
         * BELUM PREMIUM
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


          handleEmailLink_();

          return;

        }


        /*
         * Belum premium →
         * halaman pembayaran.
         */

        try {

          const pay =
            await api(
              'me',
              {
                token:
                  state.user.token
              }
            );


          if (
            pay.paymentSummary
          ) {

            setupPaymentScreen(
              pay.paymentSummary,
              pay.user,
              pay.paymentToken
            );

          } else {

            showScreen(
              'dashboard'
            );

          }

        } catch (paymentError) {

          console.warn(
            'Payment restore:',
            paymentError
          );


          showScreen(
            'dashboard'
          );

        }


        handleEmailLink_();

        return;

      }

    } catch (sessionError) {

      console.warn(
        'Sesi tidak valid:',
        sessionError
      );


      /*
       * Hanya hapus sesi jika backend
       * benar-benar mengatakan sesi
       * sudah berakhir.
       */

      if (
        String(
          sessionError.message || ''
        )
          .toLowerCase()
          .includes(
            'sesi berakhir'
          )
      ) {

        localStorage.removeItem(
          'ma_user'
        );

        state.user =
          null;

        state.profile =
          null;

        showScreen(
          'login'
        );


        setMsg(
          'loginMsg',
          'Sesi berakhir, silakan masuk lagi',
          'error'
        );


        return;

      }


      /*
       * Jika error lain, jangan
       * langsung logout.
       */

      console.error(
        sessionError
      );

    }


  } catch (error) {

    console.error(
      'initApp error:',
      error
    );

  }

})();


/* =========================================================
   ADMIN
   ========================================================= */

async function loadAdmin() {

  showScreen(
    'admin'
  );


  try {

    const [
      usersData,
      paymentsData
    ] = await Promise.all([

      api(
        'adminUsers',
        {
          token:
            state.user.token
        }
      ),

      api(
        'adminPayments',
        {
          token:
            state.user.token
        }
      )

    ]);


    const summary =
      paymentsData.summary ||
      {};


    const stats =
      $('#adminStats');


    if (stats) {

      stats.innerHTML = [

        [
          'Menunggu Pemeriksaan',
          summary.waiting || 0
        ],

        [
          'Sudah ACC',
          summary.approved || 0
        ],

        [
          'Ditolak',
          summary.rejected || 0
        ],

        [
          'Premium Aktif',
          summary.premium || 0
        ]

      ]

        .map(
          item => `

            <div
              class="stat"
            >

              <span>
                ${esc(
                  item[0]
                )}
              </span>

              <strong>
                ${item[1]}
              </strong>

            </div>

          `
        )

        .join('');

    }


    const users =
      $('#adminUsers');


    if (users) {

      users.innerHTML =
        (
          usersData.users || []
        )

          .map(
            user => `

              <div
                class="admin-row"
              >

                <div>

                  <b>
                    ${esc(
                      user.name
                    )}
                  </b>

                  <br>

                  <span
                    class="muted"
                  >
                    ${esc(
                      user.email
                    )}
                    •
                    ${esc(
                      user.status
                    )}
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
          )

          .join('') ||

        '<p class="muted">Belum ada pendaftar.</p>';

    }


    const payments =
      $('#adminPayments');


    if (payments) {

      payments.innerHTML =
        (
          paymentsData.payments ||
          []
        )

          .map(
            payment => {

              const waiting =
                payment.status ===
                'payment_review';


              return `

                <div
                  class="admin-row"
                >

                  <div>

                    <b>
                      ${esc(
                        payment.name
                      )}
                    </b>

                    <br>

                    <span
                      class="muted"
                    >
                      NIP
                      ${esc(
                        payment.nip
                      )}
                      •
                      ${esc(
                        payment.email
                      )}
                    </span>

                    <br>

                    <span
                      class="muted"
                    >
                      Harga
                      ${money(
                        payment.basePrice
                      )}

                      +

                      kode
                      ${money(
                        payment.uniqueCode
                      )}

                      =

                      <b>
                        ${money(
                          payment.totalAmount
                        )}
                      </b>

                    </span>

                    <br>

                    <span
                      class="muted"
                    >

                      ${
                        payment.createdAt
                          ? new Date(
                              payment.createdAt
                            ).toLocaleString(
                              'id-ID'
                            )
                          : ''
                      }

                      •

                      <span
                        class="
                          badge
                          ${
                            waiting
                              ? 'waiting'
                              : payment.status ===
                                'approved'
                              ? 'approved'
                              : 'rejected'
                          }
                        "
                      >
                        ${esc(
                          payment.status
                        )}
                      </span>

                    </span>

                    ${
                      payment.reviewNote
                        ? `

                          <br>

                          <span
                            class="muted"
                          >
                            Catatan:
                            ${esc(
                              payment.reviewNote
                            )}
                          </span>

                        `
                        : ''
                    }

                  </div>


                  <div
                    class="actions"
                  >

                    ${
                      payment.driveUrl

                        ? `

                          <a
                            class="secondary"
                            href="${esc(
                              payment.driveUrl
                            )}"
                            target="_blank"
                            rel="noopener"
                          >
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
                            onclick="
                              reviewPayment(
                                '${esc(
                                  payment.id
                                )}',
                                'approved'
                              )
                            "
                          >
                            ACC Premium
                          </button>


                          <button
                            class="secondary"
                            type="button"
                            onclick="
                              reviewPayment(
                                '${esc(
                                  payment.id
                                )}',
                                'rejected'
                              )
                            "
                          >
                            Tolak
                          </button>

                        `

                        : ''
                    }

                  </div>

                </div>

              `;

            }
          )

          .join('') ||

        '<p class="muted">Belum ada pembayaran.</p>';

    }


  } catch (error) {

    console.error(
      'loadAdmin error:',
      error
    );


    const users =
      $('#adminUsers');


    const payments =
      $('#adminPayments');


    if (users) {

      users.textContent =
        error.message;

    }


    if (payments) {

      payments.textContent =
        error.message;

    }

  }

}


/* =========================================================
   REVIEW PEMBAYARAN
   ========================================================= */

async function reviewPayment(
  id,
  status
) {

  try {

    let note = '';


    if (
      status ===
      'rejected'
    ) {

      note =
        prompt(
          'Alasan penolakan:'
        ) || '';

    }


    await api(
      'reviewPayment',
      {

        token:
          state.user.token,

        paymentId:
          id,

        status:
          status,

        note:
          note

      }
    );


    await loadAdmin();


  } catch (error) {

    alert(
      error.message
    );

  }

}


/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {

  state = {

    user:
      null,

    profile:
      null,

    module:
      null,

    result:
      null,

    payment:
      null

  };


  localStorage.removeItem(
    'ma_user'
  );


  sessionStorage.removeItem(
    'payment_token'
  );


  sessionStorage.removeItem(
    'payment_user'
  );


  const badge =
    $('#userBadge');


  if (badge) {

    badge.textContent =
      '';

  }


  showScreen(
    'landing'
  );

}


/* =========================================================
   FILE → DATA URL
   ========================================================= */

function fileToDataUrl_(
  file
) {

  return new Promise(
    function(resolve, reject) {

      const reader =
        new FileReader();


      reader.onload =
        function() {

          resolve(
            reader.result
          );

        };


      reader.onerror =
        reject;


      reader.readAsDataURL(
        file
      );

    }
  );

}


/* =========================================================
   SETUP PAYMENT
   ========================================================= */

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


  const payName =
    $('#payName');


  const payEmail =
    $('#payEmail');


  const payNip =
    $('#payNip');


  const payBase =
    $('#payBase');


  const payCode =
    $('#payCode');


  const payTotal =
    $('#payTotal');


  const payExpiry =
    $('#payExpiry');


  if (payName) {

    payName.value =
      user?.name || '';

  }


  if (payEmail) {

    payEmail.value =
      user?.email || '';

  }


  if (payNip) {

    payNip.value =
      state.profile?.teacherNip ||
      '';

  }


  if (payBase) {

    payBase.textContent =
      money(
        summary?.basePrice
      );

  }


  if (payCode) {

    payCode.textContent =
      money(
        summary?.uniqueCode
      );

  }


  if (payTotal) {

    payTotal.textContent =
      money(
        summary?.totalAmount
      );

  }


  if (payExpiry) {

    payExpiry.textContent =
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


/* =========================================================
   FINAL CHECK
   ========================================================= */

console.log(
  'Modul Ajar AI app.js berhasil dimuat.'
);
