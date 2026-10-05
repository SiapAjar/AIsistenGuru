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
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setMsg(id, text, type = '') {
  const el = $('#' + id);
  if (!el) return;
  el.textContent = text;
  el.className = 'msg ' + type;
}

async function api(action, payload = {}) {
  if (!API_URL || API_URL.includes('PASTE_')) {
    throw new Error('API_URL belum diisi di app.js');
  }

  try {
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action,
        ...payload
      })
    });

    const text = await r.text();

    let d;

    try {
      d = JSON.parse(text);
    } catch (e) {
      throw new Error(
        'Respons server bukan JSON. Pastikan Apps Script sudah di-deploy sebagai Web App (/exec).'
      );
    }

    if (!d.ok) {
      throw new Error(
        d.error || 'Terjadi kesalahan pada server.'
      );
    }

    return d;

  } catch (err) {
    throw new Error(
      err.message || 'Gagal terhubung ke server.'
    );
  }
}

function phaseFor(g) {
  return ['1', '2'].includes(String(g))
    ? 'A'
    : ['3', '4'].includes(String(g))
      ? 'B'
      : 'C';
}

function money(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

function renderUser() {
  if (state.user) {
    $('#userBadge').textContent =
      state.user.name +
      ' • ' +
      (state.user.premium ? 'PREMIUM' : 'BELUM PREMIUM');
  }
}

function setupPaymentScreen(summary, user, paymentToken) {
  state.payment = summary || null;

  if (paymentToken) {
    sessionStorage.setItem(
      'payment_token',
      paymentToken
    );
  }

  sessionStorage.setItem(
    'payment_user',
    JSON.stringify(user || {})
  );

  $('#payName').value = user?.name || '';
  $('#payEmail').value = user?.email || '';
  $('#payNip').value = state.profile?.teacherNip || '';

  $('#payBase').textContent =
    money(summary?.basePrice);

  $('#payCode').textContent =
    money(summary?.uniqueCode);

  $('#payTotal').textContent =
    money(summary?.totalAmount);

  $('#payExpiry').textContent =
    summary?.expiresAt
      ? 'Kode berlaku sampai ' +
        new Date(summary.expiresAt).toLocaleString('id-ID')
      : '';

  showScreen('payment');
}


/* =========================================================
   LOGIN
   ========================================================= */

$('#profileForm').addEventListener('input', e => {
  if (e.target.name === 'grade') {
    $('#profileForm [name=phase]').value =
      phaseFor(e.target.value);
  }
});

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();

  setMsg('loginMsg', 'Memeriksa...');

  try {
    const d = await api(
      'login',
      Object.fromEntries(
        new FormData(e.target)
      )
    );

    /*
     * Token dari Apps Script berada di:
     * d.user.token
     *
     * Kita pertahankan token tersebut.
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
      JSON.stringify(state.user)
    );

    console.log(
      'Login berhasil. Token tersedia:',
      !!state.user.token
    );

    renderUser();

    if (state.user.role === 'admin') {
      return loadAdmin();
    }

    if (!state.user.premium) {

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

    await loadProfile();

    showScreen('dashboard');

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
});


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

  const d = await api(
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
    JSON.stringify(state.user)
  );

  localStorage.setItem(
    'ma_profile',
    JSON.stringify(
      state.profile || {}
    )
  );

  const f =
    $('#profileForm');

  if (f) {

    Object.entries(
      state.profile || {}
    ).forEach(([k, v]) => {

      const el =
        f.elements[k];

      if (el) {
        el.value =
          v || '';
      }

    });

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

    if (phase && grade) {
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
   * ke form Modul Ajar.
   */

  if ($('#mSchool')) {
    $('#mSchool').value =
      state.profile.school || '';
  }

  if ($('#mTeacher')) {
    $('#mTeacher').value =
      state.profile.teacherName ||
      state.user.name ||
      '';
  }

  if ($('#mTeacherNip')) {
    $('#mTeacherNip').value =
      state.profile.teacherNip || '';
  }

  if ($('#mPrincipal')) {
    $('#mPrincipal').value =
      state.profile.principalName || '';
  }

  if ($('#mPrincipalNip')) {
    $('#mPrincipalNip').value =
      state.profile.principalNip || '';
  }

  if ($('#mSign')) {
    $('#mSign').value =
      state.profile.signPlaceDate || '';
  }

  if ($('#mGrade')) {
    $('#mGrade').value =
      state.profile.grade || '';
  }

  if ($('#moduleCP')) {
    $('#moduleCP').value =
      state.profile.cp || '';
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
  ).forEach(([k, v]) => {

    const el =
      f.elements[k];

    if (el) {
      el.value =
        v || '';
    }

  });

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

  if (phase && grade) {

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
    phaseFor(p.grade);

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

  m.dimensions =
    $$('#dimensions input:checked')
      .map(x => x.value);

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

    showScreen('login');

    return;
  }

  let btn = null;

  if (useModule) {

    btn =
      document
        .querySelector('#moduleCP')
        ?.closest('.compact')
        ?.querySelector('button');

  } else {

    btn =
      document
        .querySelector('#cp')
        ?.closest('.toolbar')
        ?.querySelector('button');
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

      if ($('#moduleCP')) {
        $('#moduleCP').value =
          cp;
      }

      if (
        source &&
        $('#moduleCP')
      ) {
        $('#moduleCP').dataset.source =
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
            ? 'Sumber: ' + source
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

    showScreen('login');

    return;
  }

  const btn =
    document
      .querySelector('#tp')
      ?.closest('.compact')
      ?.querySelector('button');

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

    const d =
      await api(
        'suggestTP',
        {
          token,
          profile:
            state.profile || {},
          module: m
        }
      );

    const tp =
      d.tp ||
      d.result?.tp ||
      d.data?.tp ||
      '';

    if (!tp) {

      throw new Error(
        'Saran TP tidak dikembalikan server.'
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
      'Gagal membuat saran TP.'
    );

  } finally {

    if (btn) {

      btn.disabled = false;

      btn.textContent =
        oldText ||
        '✨ Saran TP dari AI';
    }
  }
}


/* =========================================================
   SIMPAN DATA SATUAN PENDIDIKAN
   ========================================================= */

$('#profileForm').addEventListener(
  'submit',
  async e => {

    e.preventDefault();

    const btn =
      e.target.querySelector(
        'button[type="submit"]'
      );

    const oldText =
      btn?.textContent;

    try {

      if (!state.user?.token) {

        throw new Error(
          'Sesi login tidak ditemukan. Silakan masuk lagi.'
        );
      }

      const p =
        collectProfileForm();

      if (
        !p.school ||
        !p.subject ||
        !p.abbr ||
        !p.grade ||
        !p.hours ||
        !p.year ||
        !p.signPlaceDate ||
        !p.teacherName ||
        !p.principalName
      ) {

        throw new Error(
          'Mohon lengkapi data satuan pendidikan yang wajib diisi.'
        );
      }

      if (btn) {

        btn.disabled = true;

        btn.textContent =
          'Menyimpan data...';
      }

      const d =
        await api(
          'saveProfile',
          {
            token:
              state.user.token,

            profile: p
          }
        );

      state.profile =
        d.profile || p;

      localStorage.setItem(
        'ma_profile',
        JSON.stringify(
          state.profile
        )
      );

      /*
       * Isi identitas yang dikunci
       * pada halaman Modul Ajar.
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

      /*
       * PENTING:
       * Tidak reload halaman.
       * Langsung pindah ke Modul Ajar.
       */

      showScreen('module');

    } catch (err) {

      console.error(
        'saveProfile error:',
        err
      );

      alert(
        err.message ||
        'Gagal menyimpan data satuan pendidikan.'
      );

    } finally {

      if (btn) {

        btn.disabled = false;

        btn.textContent =
          oldText ||
          'Lanjut ke Modul Ajar →';
      }
    }
  }
);


/* =========================================================
   BUAT MODUL AJAR
   ========================================================= */

$('#moduleForm').addEventListener(
  'submit',
  async e => {

    e.preventDefault();

    const f =
      collectModuleForm();

    state.module =
      f;

    const btn =
      e.target.querySelector(
        'button[type=submit]'
      );

    const oldText =
      btn?.textContent;

    if (btn) {

      btn.disabled = true;

      btn.textContent =
        'AI sedang menyusun...';
    }

    try {

      const d =
        await api(
          'generateDocuments',
          {
            token:
              state.user.token,

            profile:
              state.profile,

            module:
              f
          }
        );

      state.result =
        d.result;

      renderResult();

      showScreen(
        'result'
      );

    } catch (err) {

      alert(
        err.message
      );

    } finally {

      if (btn) {

        btn.disabled = false;

        btn.textContent =
          oldText ||
          '🚀 Buat Modul Ajar dengan AI';
      }
    }
  }
);


/* =========================================================
   RENDER HASIL
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

function md(s) {

  return esc(s)
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

function section(
  title,
  body
) {

  return `
    <div class="doc-section">
      <h2>${esc(title)}</h2>
      <div>${md(body)}</div>
    </div>
  `;
}

function renderResult() {

  const r =
    state.result || {};

  const p =
    state.profile;

  $('#resultMeta').textContent =
    `${p.school} • ${p.subject} • Kelas ${p.grade} • Fase ${phaseFor(p.grade)}`;

  $('#preview').innerHTML = `

    <div class="cover">

      <h1>PERANGKAT AJAR</h1>

      <h2>${esc(p.subject)}</h2>

      <h2>${esc(p.school)}</h2>

      <p>
        Kelas ${esc(p.grade)}
        • Fase ${phaseFor(p.grade)}
        • ${esc(p.year)}
      </p>

    </div>

    ${section(
      '1. Analisis CP',
      r.analisisCP || ''
    )}

    ${section(
      '2. Tujuan Pembelajaran',
      r.tujuanPembelajaran || ''
    )}

    ${section(
      '3. Alur Tujuan Pembelajaran (ATP)',
      r.atp || ''
    )}

    ${section(
      '4. Program Tahunan',
      r.prota || ''
    )}

    ${section(
      '5. Program Semester',
      r.promes || ''
    )}

    ${section(
      '6. KKTP',
      r.kktp || ''
    )}

    ${section(
      '7. Modul Ajar',
      r.modulAjar || ''
    )}

    <div class="doc-section">

      <table>

        <tr>

          <td>
            Mengetahui,<br>
            Kepala Sekolah<br><br><br>

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
            <br><br><br>

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


/* =========================================================
   DOWNLOAD WORD
   ========================================================= */

function downloadWord() {

  const html = `

    <html>

      <head>

        <meta charset="utf-8">

        <style>

          body {
            font-family: Arial;
            font-size: 11pt;
            line-height: 1.5;
          }

          h1,
          h2,
          h3 {
            text-align: center;
          }

          table {
            border-collapse: collapse;
            width: 100%;
          }

          td,
          th {
            border: 1px solid #222;
            padding: 6px;
          }

        </style>

      </head>

      <body>

        ${$('#preview').innerHTML}

      </body>

    </html>
  `;

  const blob =
    new Blob(
      ['\ufeff', html],
      {
        type:
          'application/msword'
      }
    );

  const a =
    document.createElement(
      'a'
    );

  a.href =
    URL.createObjectURL(
      blob
    );

  a.download =
    `Perangkat_Ajar_${state.profile.abbr || 'SD'}_Kelas_${state.profile.grade}.doc`;

  a.click();
}


/* =========================================================
   DOWNLOAD PDF
   ========================================================= */

async function downloadPDF() {

  const {
    jsPDF
  } = window.jspdf;

  const pdf =
    new jsPDF({
      unit: 'mm',
      format: 'a4'
    });

  await pdf.html(
    $('#preview'),
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
        scale: 0.7
      },

      callback:
        doc => {

          doc.save(
            `Perangkat_Ajar_${state.profile.abbr || 'SD'}_Kelas_${state.profile.grade}.pdf`
          );

        }
    }
  );
}


/* =========================================================
   ADMIN
   ========================================================= */

async function loadAdmin() {

  showScreen('admin');

  try {

    const [
      u,
      p
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

    const s =
      p.summary || {};

    $('#adminStats').innerHTML = [

      [
        'Menunggu Pemeriksaan',
        s.waiting || 0,
        'waiting'
      ],

      [
        'Sudah ACC',
        s.approved || 0,
        'approved'
      ],

      [
        'Ditolak',
        s.rejected || 0,
        'rejected'
      ],

      [
        'Premium Aktif',
        s.premium || 0,
        'approved'
      ]

    ]
      .map(
        x => `
          <div class="stat">

            <span>
              ${x[0]}
            </span>

            <strong>
              ${x[1]}
            </strong>

          </div>
        `
      )
      .join('');

    $('#adminUsers').innerHTML =
      u.users
        .map(
          x => `
            <div class="admin-row">

              <div>

                <b>
                  ${esc(x.name)}
                </b>

                <br>

                <span class="muted">

                  ${esc(x.email)}
                  •
                  ${esc(x.status)}
                  •
                  ${
                    x.premium
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

    $('#adminPayments').innerHTML =
      p.payments
        .map(x => {

          const waiting =
            x.status ===
            'payment_review';

          return `

            <div class="admin-row">

              <div>

                <b>
                  ${esc(x.name)}
                </b>

                <br>

                <span class="muted">

                  NIP
                  ${esc(x.nip)}
                  •
                  ${esc(x.email)}

                </span>

                <br>

                <span class="muted">

                  Harga
                  ${money(x.basePrice)}

                  +

                  kode
                  ${money(x.uniqueCode)}

                  =

                  <b>
                    ${money(x.totalAmount)}
                  </b>

                </span>

                <br>

                <span class="muted">

                  ${
                    new Date(
                      x.createdAt
                    ).toLocaleString('id-ID')
                  }

                  •

                  <span
                    class="badge ${
                      waiting
                        ? 'waiting'
                        : x.status === 'approved'
                          ? 'approved'
                          : 'rejected'
                    }"
                  >
                    ${esc(x.status)}
                  </span>

                </span>

                ${
                  x.reviewNote
                    ? `
                      <br>
                      <span class="muted">
                        Catatan:
                        ${esc(x.reviewNote)}
                      </span>
                    `
                    : ''
                }

              </div>

              <div class="actions">

                ${
                  x.driveUrl
                    ? `
                      <a
                        class="secondary"
                        href="${esc(x.driveUrl)}"
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
                        onclick="reviewPayment('${x.id}','approved')"
                      >
                        ACC Premium
                      </button>

                      <button
                        class="secondary"
                        onclick="reviewPayment('${x.id}','rejected')"
                      >
                        Tolak
                      </button>
                    `
                    : ''
                }

              </div>

            </div>

          `;
        })
        .join('') ||
      '<p class="muted">Belum ada pembayaran.</p>';

  } catch (e) {

    $('#adminUsers').textContent =
      e.message;

    $('#adminPayments').textContent =
      e.message;
  }
}


async function reviewPayment(
  id,
  status
) {

  const note =
    status === 'rejected'
      ? prompt(
          'Alasan penolakan:'
        ) || ''
      : '';

  try {

    await api(
      'reviewPayment',
      {
        token:
          state.user.token,

        paymentId:
          id,

        status,
        note
      }
    );

    loadAdmin();

  } catch (e) {

    alert(
      e.message
    );
  }
}


/* =========================================================
   LOGOUT
   ========================================================= */

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
    'ma_profile'
  );

  sessionStorage.removeItem(
    'payment_token'
  );

  sessionStorage.removeItem(
    'payment_user'
  );

  $('#userBadge').textContent =
    '';

  showScreen(
    'landing'
  );
}


/* =========================================================
   RESTORE SESSION
   ========================================================= */

(async function () {

  const u =
    localStorage.getItem(
      'ma_user'
    );

  if (!u) {
    return;
  }

  try {

    state.user =
      JSON.parse(u);

    renderUser();

    if (
      state.user.role ===
      'admin'
    ) {

      return loadAdmin();
    }

    if (
      state.user.premium
    ) {

      await loadProfile();

      showScreen(
        'dashboard'
      );

      return;
    }

    const d =
      await api(
        'me',
        {
          token:
            state.user.token
        }
      );

    if (
      d.user.premium
    ) {

      state.user = {
        ...(state.user || {}),
        ...(d.user || {}),
        token:
          state.user.token
      };

      localStorage.setItem(
        'ma_user',
        JSON.stringify(
          state.user
        )
      );

      await loadProfile();

      showScreen(
        'dashboard'
      );

    } else if (
      d.user.status ===
      'payment_review'
    ) {

      setMsg(
        'loginMsg',
        'Pembayaran sedang diperiksa admin.',
        'success'
      );

      showScreen(
        'login'
      );

    } else {

      setupPaymentScreen(
        d.paymentSummary,
        d.user,
        sessionStorage.getItem(
          'payment_token'
        )
      );
    }

  } catch (e) {

    console.error(
      'Restore session error:',
      e
    );

    logout();
  }

})();


/* =========================================================
   EMAIL / PASSWORD LINK
   ========================================================= */

function queryParam_(name) {

  const h =
    location.hash.replace(
      /^#/,
      ''
    );

  return new URLSearchParams(
    h
  ).get(name);
}


async function handleEmailLink_() {

  const verify =
    queryParam_('verify');

  const reset =
    queryParam_('reset');

  const payment =
    queryParam_('payment');

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
          basePrice: 0,
          uniqueCode: 0,
          totalAmount: 0
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

    } catch (e) {

      alert(
        e.message
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

  } else if (reset) {

    $('#resetToken').value =
      reset;

    showScreen(
      'resetPassword'
    );

  } else if (payment) {

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

    } catch (e) {

      alert(
        e.message
      );

      showScreen(
        'login'
      );
    }
  }
}


/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

$('#forgotForm').addEventListener(
  'submit',
  async e => {

    e.preventDefault();

    setMsg(
      'forgotMsg',
      'Mengirim...'
    );

    try {

      const d =
        await api(
          'requestPasswordReset',
          Object.fromEntries(
            new FormData(e.target)
          )
        );

      setMsg(
        'forgotMsg',
        d.message,
        'success'
      );

      e.target.reset();

    } catch (err) {

      setMsg(
        'forgotMsg',
        err.message,
        'error'
      );
    }
  }
);


/* =========================================================
   RESET PASSWORD
   ========================================================= */

$('#resetForm').addEventListener(
  'submit',
  async e => {

    e.preventDefault();

    const data =
      Object.fromEntries(
        new FormData(e.target)
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

      e.target.reset();

      history.replaceState(
        {},
        '',
        location.pathname
      );

      setTimeout(
        () =>
          showScreen('login'),
        900
      );

    } catch (err) {

      setMsg(
        'resetMsg',
        err.message,
        'error'
      );
    }
  }
);


/* =========================================================
   FILE UPLOAD
   ========================================================= */

function fileToDataUrl_(file) {

  return new Promise(
    (resolve, reject) => {

      const r =
        new FileReader();

      r.onload =
        () =>
          resolve(
            r.result
          );

      r.onerror =
        reject;

      r.readAsDataURL(
        file
      );
    }
  );
}


/* =========================================================
   PAYMENT
   ========================================================= */

$('#paymentForm').addEventListener(
  'submit',
  async e => {

    e.preventDefault();

    const f =
      e.target;

    const file =
      f.proof.files[0];

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

      const data =
        await fileToDataUrl_(
          file
        );

      const d =
        await api(
          'submitPayment',
          {
            token:
              sessionStorage.getItem(
                'payment_token'
              ),

            name:
              f.name.value.trim(),

            nip:
              f.nip.value.trim(),

            email:
              f.email.value,

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

      $('#paymentWa')
        .classList
        .remove('hidden');

      $('#paymentWa').onclick =
        () => {

          const msg = `
Konfirmasi Pembayaran Modul Ajar AI

Nama: ${f.name.value.trim()}
NIP: ${f.nip.value.trim()}
Email: ${f.email.value}
Harga: ${money(d.payment.basePrice)}
Kode unik: ${money(d.payment.uniqueCode)}
Total: ${money(d.payment.totalAmount)}

Bukti pembayaran sudah saya upload ke sistem. Saya juga melampirkan bukti pembayaran di WhatsApp ini.
`;

          window.open(
            'https://wa.me/6285722228896?text=' +
              encodeURIComponent(
                msg
              ),
            '_blank'
          );
        };

      sessionStorage.removeItem(
        'payment_token'
      );

    } catch (err) {

      setMsg(
        'paymentMsg',
        err.message,
        'error'
      );
    }
  }
);


/* =========================================================
   HANDLE EMAIL LINK
   ========================================================= */

handleEmailLink_();
