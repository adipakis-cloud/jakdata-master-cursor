import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { officialProfile } from '../../config/officialProfile';

const urgencyColor: Record<string, string> = { critical:'badge-red', high:'badge-orange', medium:'badge-yellow', low:'badge-green' };
const statusColor: Record<string, string> = { baru:'badge-blue', diproses:'badge-orange', selesai:'badge-green', ditolak:'badge-gray', eskalasi:'badge-red' };

function StatCard({ label, value, sub, icon, color='blue' }: any) {
  const colors: Record<string,string> = { blue:'bg-blue-50 text-blue-700', green:'bg-green-50 text-green-700', red:'bg-red-50 text-red-700', orange:'bg-orange-50 text-orange-700', purple:'bg-purple-50 text-purple-700', yellow:'bg-yellow-50 text-yellow-700' };
  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ml-2 ${colors[color]}`}>{icon}</div>
      </div>
    </div>
  );
}

function OfficialHeader() {
  const [photoError, setPhotoError] = useState(false);
  const initials = officialProfile.displayName.split(' ').slice(0,2).map(w=>w[0]).join('');
  return (
    <div className="rounded-2xl overflow-hidden mb-6" style={{background:'linear-gradient(135deg,#0D2D5E 0%,#1A4FA0 60%,#2563EB 100%)'}}>
      <div className="px-6 py-6">
        <div className="flex items-start gap-5">
          <div className="shrink-0">
            {!photoError ? (
              <img src={officialProfile.photoUrl} alt={officialProfile.displayName} onError={()=>setPhotoError(true)}
                className="w-20 h-20 rounded-2xl object-cover border-2 shadow-xl" style={{borderColor:'rgba(200,150,12,0.6)'}} />
            ) : (
              <div className="w-20 h-20 rounded-2xl border-2 flex items-center justify-center shadow-xl" style={{background:'rgba(200,150,12,0.15)',borderColor:'rgba(200,150,12,0.5)'}}>
                <span className="text-2xl font-bold" style={{color:'#F0C040'}}>{initials}</span>
              </div>
            )}
            <p className="text-center mt-2 text-xs font-bold px-2 py-0.5 rounded-full" style={{background:'rgba(200,150,12,0.15)',color:'#F0C040',border:'1px solid rgba(200,150,12,0.3)'}}>{officialProfile.factionShort}</p>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{color:'#C8960C'}}>{officialProfile.position}</p>
            <h1 className="text-white text-xl font-bold leading-tight">{officialProfile.fullName}</h1>
            <div className="flex flex-wrap gap-2 mt-3">
              {[officialProfile.commissionLabel, officialProfile.electoralDistrict, officialProfile.period].map(b=>(
                <span key={b} className="text-white text-xs font-semibold px-3 py-1 rounded-full" style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)'}}>{b}</span>
              ))}
            </div>
            <p className="text-xs mt-2" style={{color:'#93C5FD'}}>{officialProfile.electoralArea}</p>
          </div>
          <div className="shrink-0 hidden lg:block text-right">
            <div className="flex items-center gap-2 justify-end mb-2">
              <div className="w-2 h-2 rounded-full bg-green-400" style={{animation:'pulse 2s infinite'}} />
              <span className="text-xs font-semibold text-green-300">Sistem Aktif</span>
            </div>
            <p className="text-xs" style={{color:'#93C5FD'}}>JAKDATA v3.0</p>
            <p className="text-xs mt-1" style={{color:'#BFDBFE'}}>{new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'})}</p>
          </div>
        </div>
        <div className="mt-4 pt-4" style={{borderTop:'1px solid rgba(255,255,255,0.1)'}}>
          <p className="text-xs font-semibold mb-2" style={{color:'#93C5FD'}}>Fokus {officialProfile.commissionLabel}:</p>
          <div className="flex flex-wrap gap-1.5">
            {officialProfile.commissionFocus.map(f=>(
              <span key={f} className="text-xs px-2.5 py-1 rounded-full" style={{background:'rgba(255,255,255,0.05)',color:'#BFDBFE',border:'1px solid rgba(255,255,255,0.1)'}}>{f}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    api.get('/dashboard/summary').then(r=>setData(r.data)).catch(console.error).finally(()=>setLoading(false));
  },[]);

  const fmt = (n:number) => (n??0).toLocaleString('id-ID');
  const fmtRp = (n:number) => n>=1000000?`Rp${(n/1000000).toFixed(1)}Jt`:n>=1000?`Rp${(n/1000).toFixed(0)}rb`:`Rp${fmt(n)}`;

  if (loading) return <div className="space-y-6"><OfficialHeader /><div className="flex items-center justify-center h-32 text-gray-400">Memuat data wilayah Jakarta...</div></div>;

  const s = data?.stats ?? {};

  const komisiCards = [
    {label:'Bantuan Sosial Tepat Sasaran',icon:'🎁',desc:`${fmt(s.totalBantuan??0)} program aktif`},
    {label:'Emergency & Kebencanaan',icon:'🚨',desc:`${s.laporanCritical??0} laporan critical`},
    {label:'Anak Putus Sekolah',icon:'📚',desc:'Monitoring aktif'},
    {label:'Lansia & Kelompok Rentan',icon:'🤝',desc:'Pendataan berjalan'},
    {label:'Haji & Keagamaan',icon:'🕌',desc:'Aspirasi warga'},
    {label:'Warmindo & UMKM Warga',icon:'🍜',desc:`${s.warmindoAktif??0} outlet aktif`},
  ];

  return (
    <div className="space-y-6">
      <OfficialHeader />

      <div>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Statistik Wilayah DKI Jakarta</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Warga" value={fmt(s.totalWarga)} sub={`${fmt(s.totalKK??0)} KK terdaftar`} icon="👥" color="blue" />
          <StatCard label="RT Belum Lengkap" value={s.rtBelumLengkap} sub={`dari ${fmt(s.totalRT)} RT · target 10 warga`} icon="⚠️" color={s.rtBelumLengkap>0?'orange':'green'} />
          <StatCard label="Laporan Critical" value={s.laporanCritical} sub={`${s.laporanBelumSelesai??0} belum selesai`} icon="🚨" color={s.laporanCritical>0?'red':'green'} />
          <StatCard label="Warmindo Aktif" value={s.warmindoAktif} sub={`Omzet: ${fmtRp(s.omzetHariIni??0)}/hari`} icon="🍜" color="purple" />
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">{officialProfile.commissionLabel} — Program Prioritas</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {komisiCards.map(k=>(
            <div key={k.label} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{k.icon}</span>
                <div className="min-w-0"><p className="text-sm font-semibold text-gray-800 leading-tight">{k.label}</p><p className="text-xs text-gray-400 mt-0.5">{k.desc}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Laporan Warga Terbaru</h2>
            <a href="/admin/laporan" className="text-xs font-semibold hover:underline" style={{color:'#2563EB'}}>Lihat semua →</a>
          </div>
          <div className="divide-y divide-gray-50">
            {(!data?.recentLaporan||data.recentLaporan.length===0)&&<p className="p-8 text-center text-gray-400 text-sm">Belum ada laporan masuk</p>}
            {data?.recentLaporan?.map((l:any)=>(
              <div key={l.id} className={`p-4 ${l.isEmergency?'bg-red-50/50':''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {l.isEmergency&&<span className="badge-red text-xs">🚨 DARURAT</span>}
                      <span className={urgencyColor[l.urgencyLevel]??'badge-gray'}>{l.urgencyLevel?.toUpperCase()}</span>
                      <span className="text-xs text-gray-400 font-mono">{l.kodeLaporan}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 mt-1 truncate">{l.aiSummary??l.namaPelapor??'Laporan masuk'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{l.lokasiText??'—'} · {new Date(l.createdAt).toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                  </div>
                  <span className={`${statusColor[l.status]??'badge-gray'} shrink-0`}>{l.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">⚠️ RT Perlu Perhatian</h2>
            <p className="text-xs text-gray-400 mt-0.5">Target minimal 10 warga per RT</p>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {(!data?.rtKurang||data.rtKurang.length===0)&&<p className="p-6 text-center text-green-600 text-sm font-semibold">✅ Semua RT sudah memenuhi target!</p>}
            {data?.rtKurang?.map((rt:any)=>(
              <div key={rt.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div><p className="text-sm font-medium text-gray-800">RT {rt.nomor} / RW {rt.rw}</p><p className="text-xs text-gray-400">{rt.kelurahan}, {rt.kecamatan}</p></div>
                  <div className="text-right"><span className={`font-bold text-sm ${rt.jumlahWarga===0?'text-red-600':'text-orange-500'}`}>{rt.jumlahWarga}</span><span className="text-xs text-gray-400">/10</span></div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${rt.jumlahWarga>=10?'bg-green-500':rt.jumlahWarga>0?'bg-orange-400':'bg-red-400'}`} style={{width:`${Math.min(100,rt.jumlahWarga*10)}%`}} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
