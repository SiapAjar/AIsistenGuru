/* Modul Ajar AI • GitHub Pages frontend. Set API_URL to your Apps Script Web App URL. */
const API_URL = 'https://script.google.com/macros/s/AKfycbwyd66NfVG5_TvbNTt88ixZrDH2kP5wfjXcVyyna9JdEV-bSzOXHQsTEtOCxEvrKYCP/exec';
let state={user:null,profile:null,module:null,result:null,payment:null};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function showScreen(id){$$('.screen').forEach(x=>x.classList.remove('active'));$('#'+id)?.classList.add('active');window.scrollTo({top:0,behavior:'smooth'});}
function setMsg(id,text,type=''){const el=$('#'+id);if(!el)return;el.textContent=text;el.className='msg '+type}
async function api(action,payload={}) {
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
      throw new Error(d.error || 'Terjadi kesalahan pada server.');
    }

    return d;

  } catch (err) {
    throw new Error(err.message || 'Gagal terhubung ke server.');
  }
}
function phaseFor(g){return ['1','2'].includes(String(g))?'A':['3','4'].includes(String(g))?'B':'C'}
function money(n){return 'Rp '+Number(n||0).toLocaleString('id-ID')}
function renderUser(){if(state.user)$('#userBadge').textContent=state.user.name+' • '+(state.user.premium?'PREMIUM':'BELUM PREMIUM')}
function setupPaymentScreen(summary,user,paymentToken){state.payment=summary||null;if(paymentToken)sessionStorage.setItem('payment_token',paymentToken);sessionStorage.setItem('payment_user',JSON.stringify(user||{}));$('#payName').value=user?.name||'';$('#payEmail').value=user?.email||'';$('#payNip').value=state.profile?.teacherNip||'';$('#payBase').textContent=money(summary?.basePrice);$('#payCode').textContent=money(summary?.uniqueCode);$('#payTotal').textContent=money(summary?.totalAmount);$('#payExpiry').textContent=summary?.expiresAt?'Kode berlaku sampai '+new Date(summary.expiresAt).toLocaleString('id-ID'):'';showScreen('payment')}
$('#profileForm').addEventListener('input',e=>{if(e.target.name==='grade')$('#profileForm [name=phase]').value=phaseFor(e.target.value)});
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();

  setMsg('loginMsg', 'Memeriksa...');

  try {
    const d = await api(
      'login',
      Object.fromEntries(new FormData(e.target))
    );

    // Simpan user + token sesi
    state.user = {
      ...(d.user || {}),
      token: d.token || d.user?.token || ''
    };

    // Simpan ke localStorage
    localStorage.setItem('ma_user', JSON.stringify(state.user));

    console.log('Login berhasil. Token tersedia:', !!state.user.token);

    renderUser();

    if (state.user.role === 'admin') {
      return loadAdmin();
    }

    if (!state.user.premium) {
      if (state.user.status === 'payment_review') {
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
    console.error('Login error:', err);
    setMsg('loginMsg', err.message, 'error');
  }
});
async function loadProfile(){const d=await api('me',{token:state.user.token});state.user=d.user;state.profile=d.profile||{};localStorage.setItem('ma_user',JSON.stringify(state.user));fillProfile()}
function fillProfile(){const f=$('#profileForm');Object.entries(state.profile||{}).forEach(([k,v])=>{const el=f.elements[k];if(el)el.value=v||''});$('#teacherName').value=state.user.name||state.profile.teacherName||'';$('#profileForm [name=phase]').value=phaseFor(f.elements.grade.value)}
$('#profileForm').addEventListener('submit',async e=>{e.preventDefault();try{const p=Object.fromEntries(new FormData(e.target));p.teacherName=state.user.name;state.profile=p;await api('saveProfile',{token:state.user.token,profile:p});fillModule();showScreen('module')}catch(err){alert(err.message)}});
function fillModule(){const p=state.profile;[['mSchool','school'],['mTeacher','teacherName'],['mTeacherNip','teacherNip'],['mPrincipal','principalName'],['mPrincipalNip','principalNip'],['mSign','signPlaceDate'],['mGrade','grade']].forEach(([id,k])=>$('#'+id).value=p[k]||'');$('#moduleCP').value=p.cp||''}
async function getCP(fromModule = false) {
  try {
    // Selalu ambil data terbaru dari form
    const formData = Object.fromEntries(
      new FormData($('#profileForm'))
    );

    // Gabungkan dengan state.profile jika ada
    const p = {
      ...(state.profile || {}),
      ...formData
    };

    // Bersihkan nilai
    const subject = String(p.subject || '').trim();
    const grade = String(p.grade || '').trim();
    const abbr = String(p.abbr || '').trim();

    // Validasi
    if (!subject || !grade) {
      alert('Isi mata pelajaran dan kelas dahulu.');
      return;
    }

    // Tentukan fase berdasarkan kelas
    const phase = phaseFor(grade);

    console.log('Data CP yang dikirim:', {
      subject: subject,
      grade: grade,
      phase: phase,
      abbr: abbr
    });

    // Panggil backend
    const d = await api('getCP', {
      token: state.user?.token,
      subject: subject,
      grade: grade,
      phase: phase,
      abbr: abbr
    });

    // Pastikan CP ada
    if (!d.cp) {
      throw new Error('CP tidak ditemukan dari server.');
    }

    // Jika dipanggil dari Modul Ajar
    if (fromModule) {
      $('#moduleCP').value = d.cp;
    } else {
      // Jika dari form utama
      $('#cp').value = d.cp;

      if ($('#cpSource')) {
        $('#cpSource').textContent = d.source || '';
      }

      // Simpan data terbaru
      state.profile = {
        ...(state.profile || {}),
        ...formData,
        subject: subject,
        grade: grade,
        abbr: abbr,
        phase: phase,
        cp: d.cp
      };
    }

  } catch (e) {
    console.error('getCP error:', e);
    alert(e.message || 'Gagal mengambil CP.');
  }
}
$('#moduleForm').addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));f.dimensions=$$('#dimensions input:checked').map(x=>x.value);if(f.pedagogy==='Lainnya')f.pedagogy=f.otherPedagogy||'Pendekatan lain';state.module=f;const btn=e.target.querySelector('button[type=submit]');btn.disabled=true;btn.textContent='AI sedang menyusun...';try{const d=await api('generateDocuments',{token:state.user.token,profile:state.profile,module:f});state.result=d.result;renderResult();showScreen('result')}catch(err){alert(err.message)}finally{btn.disabled=false;btn.textContent='🚀 Buat Modul Ajar dengan AI'}});
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function md(s){return esc(s).replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>').replace(/\n/g,'<br>')}
function section(title,body){return `<div class="doc-section"><h2>${esc(title)}</h2><div>${md(body)}</div></div>`}
function renderResult(){const r=state.result||{},p=state.profile;$('#resultMeta').textContent=`${p.school} • ${p.subject} • Kelas ${p.grade} • Fase ${phaseFor(p.grade)}`;$('#preview').innerHTML=`<div class="cover"><h1>PERANGKAT AJAR</h1><h2>${esc(p.subject)}</h2><h2>${esc(p.school)}</h2><p>Kelas ${esc(p.grade)} • Fase ${phaseFor(p.grade)} • ${esc(p.year)}</p></div>${section('1. Analisis CP',r.analisisCP||'')}${section('2. Tujuan Pembelajaran',r.tujuanPembelajaran||'')}${section('3. Alur Tujuan Pembelajaran (ATP)',r.atp||'')}${section('4. Program Tahunan',r.prota||'')}${section('5. Program Semester',r.promes||'')}${section('6. KKTP',r.kktp||'')}${section('7. Modul Ajar',r.modulAjar||'')}<div class="doc-section"><table><tr><td>Mengetahui,<br>Kepala Sekolah<br><br><br><strong>${esc(p.principalName)}</strong><br>NIP. ${esc(p.principalNip)}</td><td>${esc(p.signPlaceDate)}<br>Guru Mata Pelajaran<br><br><br><strong>${esc(p.teacherName)}</strong><br>NIP. ${esc(p.teacherNip)}</td></tr></table></div>`}
function downloadWord(){const html=`<html><head><meta charset="utf-8"><style>body{font-family:Arial;font-size:11pt;line-height:1.5}h1,h2,h3{text-align:center}table{border-collapse:collapse;width:100%}td,th{border:1px solid #222;padding:6px}</style></head><body>${$('#preview').innerHTML}</body></html>`;const blob=new Blob(['\ufeff',html],{type:'application/msword'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Perangkat_Ajar_${state.profile.abbr||'SD'}_Kelas_${state.profile.grade}.doc`;a.click()}
async function downloadPDF(){const {jsPDF}=window.jspdf;const pdf=new jsPDF({unit:'mm',format:'a4'});await pdf.html($('#preview'),{margin:[12,12,12,12],autoPaging:'text',html2canvas:{scale:0.7},callback:(doc)=>doc.save(`Perangkat_Ajar_${state.profile.abbr||'SD'}_Kelas_${state.profile.grade}.pdf`)})}
async function loadAdmin(){showScreen('admin');try{const [u,p]=await Promise.all([api('adminUsers',{token:state.user.token}),api('adminPayments',{token:state.user.token})]);const s=p.summary||{};$('#adminStats').innerHTML=[['Menunggu Pemeriksaan',s.waiting||0,'waiting'],['Sudah ACC',s.approved||0,'approved'],['Ditolak',s.rejected||0,'rejected'],['Premium Aktif',s.premium||0,'approved']].map(x=>`<div class="stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');$('#adminUsers').innerHTML=u.users.map(x=>`<div class="admin-row"><div><b>${esc(x.name)}</b><br><span class="muted">${esc(x.email)} • ${esc(x.status)} • ${x.premium?'PREMIUM':'Belum premium'}</span></div></div>`).join('')||'<p class="muted">Belum ada pendaftar.</p>';$('#adminPayments').innerHTML=p.payments.map(x=>{const waiting=x.status==='payment_review';return `<div class="admin-row"><div><b>${esc(x.name)}</b><br><span class="muted">NIP ${esc(x.nip)} • ${esc(x.email)}</span><br><span class="muted">Harga ${money(x.basePrice)} + kode ${money(x.uniqueCode)} = <b>${money(x.totalAmount)}</b></span><br><span class="muted">${new Date(x.createdAt).toLocaleString('id-ID')} • <span class="badge ${waiting?'waiting':x.status==='approved'?'approved':'rejected'}">${esc(x.status)}</span></span>${x.reviewNote?`<br><span class="muted">Catatan: ${esc(x.reviewNote)}</span>`:''}</div><div class="actions">${x.driveUrl?`<a class="secondary" href="${esc(x.driveUrl)}" target="_blank" rel="noopener">Lihat Bukti</a>`:''}${waiting?`<button class="primary" onclick="reviewPayment('${x.id}','approved')">ACC Premium</button><button class="secondary" onclick="reviewPayment('${x.id}','rejected')">Tolak</button>`:''}</div></div>`}).join('')||'<p class="muted">Belum ada pembayaran.</p>'}catch(e){$('#adminUsers').textContent=e.message;$('#adminPayments').textContent=e.message}}
async function reviewPayment(id,status){const note=status==='rejected'?prompt('Alasan penolakan:')||'':'';try{await api('reviewPayment',{token:state.user.token,paymentId:id,status,note});loadAdmin()}catch(e){alert(e.message)}}
function logout(){state={user:null,profile:null,module:null,result:null,payment:null};localStorage.removeItem('ma_user');sessionStorage.removeItem('payment_token');sessionStorage.removeItem('payment_user');$('#userBadge').textContent='';showScreen('landing')}
(async function(){const u=localStorage.getItem('ma_user');if(u){try{state.user=JSON.parse(u);renderUser();if(state.user.role==='admin')loadAdmin();else if(state.user.premium){await loadProfile();showScreen('dashboard')}else{const d=await api('me',{token:state.user.token});if(d.user.premium){state.user=d.user;localStorage.setItem('ma_user',JSON.stringify(state.user));await loadProfile();showScreen('dashboard')}else if(d.user.status==='payment_review'){setMsg('loginMsg','Pembayaran sedang diperiksa admin.','success');showScreen('login')}else setupPaymentScreen(d.paymentSummary,d.user,sessionStorage.getItem('payment_token'))} }catch(e){logout()}}})();
function queryParam_(name){const h=location.hash.replace(/^#/,'');return new URLSearchParams(h).get(name)}
async function handleEmailLink_(){const verify=queryParam_('verify'),reset=queryParam_('reset'),payment=queryParam_('payment');if(verify){try{const d=await api('verifyEmail',{token:verify});setupPaymentScreen(d.paymentSummary||{basePrice:0,uniqueCode:0,totalAmount:0},d.user,d.paymentToken);alert(d.message||'Email berhasil diverifikasi.');history.replaceState({},'',location.pathname)}catch(e){alert(e.message);history.replaceState({},'',location.pathname);showScreen('login')}}else if(reset){$('#resetToken').value=reset;showScreen('resetPassword')}else if(payment){try{const d=await api('paymentInfo',{token:payment});setupPaymentScreen(d.paymentSummary,d.user,payment)}catch(e){alert(e.message);showScreen('login')}}}
$('#forgotForm').addEventListener('submit',async e=>{e.preventDefault();setMsg('forgotMsg','Mengirim...');try{const d=await api('requestPasswordReset',Object.fromEntries(new FormData(e.target)));setMsg('forgotMsg',d.message,'success');e.target.reset()}catch(err){setMsg('forgotMsg',err.message,'error')}});
$('#resetForm').addEventListener('submit',async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));if(data.password!==data.password2){setMsg('resetMsg','Password tidak sama.','error');return}setMsg('resetMsg','Menyimpan...');try{const d=await api('resetPassword',{token:data.token,password:data.password});setMsg('resetMsg',d.message,'success');e.target.reset();history.replaceState({},'',location.pathname);setTimeout(()=>showScreen('login'),900)}catch(err){setMsg('resetMsg',err.message,'error')}});
function fileToDataUrl_(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
$('#paymentForm').addEventListener('submit',async e=>{e.preventDefault();const f=e.target,file=f.proof.files[0];if(!file){setMsg('paymentMsg','Pilih bukti pembayaran.','error');return}if(file.size>5*1024*1024){setMsg('paymentMsg','Ukuran file maksimal 5 MB.','error');return}setMsg('paymentMsg','Mengunggah bukti pembayaran...');try{const data=await fileToDataUrl_(file);const d=await api('submitPayment',{token:sessionStorage.getItem('payment_token'),name:f.name.value.trim(),nip:f.nip.value.trim(),email:f.email.value,fileName:file.name,mimeType:file.type,fileData:data});setMsg('paymentMsg',d.message+' Total: '+money(d.payment.totalAmount),'success');$('#paymentWa').classList.remove('hidden');$('#paymentWa').onclick=()=>{const msg=`Konfirmasi Pembayaran Modul Ajar AI\n\nNama: ${f.name.value.trim()}\nNIP: ${f.nip.value.trim()}\nEmail: ${f.email.value}\nHarga: ${money(d.payment.basePrice)}\nKode unik: ${money(d.payment.uniqueCode)}\nTotal: ${money(d.payment.totalAmount)}\n\nBukti pembayaran sudah saya upload ke sistem. Saya juga melampirkan bukti pembayaran di WhatsApp ini.`;window.open('https://wa.me/6285722228896?text='+encodeURIComponent(msg),'_blank')};sessionStorage.removeItem('payment_token')}catch(err){setMsg('paymentMsg',err.message,'error')}});
handleEmailLink_();
