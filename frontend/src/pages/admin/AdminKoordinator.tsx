import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export function AdminKoordinator() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [kosong, setKosong] = useState<any[]>([]);
  const [kecamatanList, setKecamatanList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('aktif');
  const [levelFilter, setLevelFilter] = useState('');
  const [kecamatanFilter, setKecamatanFilter] = useState('');
  const [kosongLevel, setKosongLevel] = useState('kecamatan');
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastLevel, setBroadcastLevel] = useState('semua');
  const [broadcastPesan, setBroadcastPesan] = useState('');
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<any>(null);

  async function loadAssignments(kecamatanId = kecamatanFilter) {
    const params = kecamatanId ? { kecamatanId } : {};
    const r = await api.get('/koordinator', { params });
    setAssignments(r.data);
  }

  useEffect(() => {
    Promise.all([
      api.get('/koordinator'),
      api.get('/koordinator/kosong?level=kecamatan'),
      api.get('/wilayah/kecamatan'),
    ])
      .then(([a, k, kec]) => {
        setAssignments(a.data);
        setKosong(k.data);
        setKecamatanList(kec.data ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleKecamatanFilter(value: string) {
    setKecamatanFilter(value);
    try {
      await loadAssignments(value);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleBroadcast() {
    if (!broadcastPesan.trim()) return;
    setBroadcastLoading(true);
    setBroadcastResult(null);
    try {
      const payload: Record<string, unknown> = { pesan: broadcastPesan, level: broadcastLevel };
      if (kecamatanFilter) payload.kecamatanId = Number(kecamatanFilter);
      const r = await api.post('/koordinator/broadcast', payload);
      setBroadcastResult(r.data);
    } catch (e: any) {
      setBroadcastResult({ error: e.response?.data?.error ?? 'Gagal mengirim broadcast' });
    } finally {
      setBroadcastLoading(false);
    }
  }

  async function loadKosong(lv: string) {
    setKosongLevel(lv);
    const params: Record<string, string> = { level: lv };
    if (kecamatanFilter) params.kecamatanId = kecamatanFilter;
    const r = await api.get('/koordinator/kosong', { params });
    setKosong(r.data);
  }

  const filtered = assignments.filter((a) => !levelFilter || a.level === levelFilter);

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#9CA3AF'}}>Memuat data koordinator...</div>;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:700,color:'#111827',margin:0}}>Koordinator Wilayah</h1>
          <p style={{fontSize:14,color:'#6B7280',marginTop:4}}>{assignments.length} koordinator aktif</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowBroadcast(true); setBroadcastResult(null); }}
          style={{background:'#2563eb',color:'#fff',padding:'8px 16px',borderRadius:8,fontSize:13,fontWeight:600,border:'none',cursor:'pointer'}}
        >
          📢 Kirim Pesan ke Koordinator
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[
          ['Kord. Kecamatan', assignments.filter(a=>a.level==='kecamatan').length, '#1D4ED8'],
          ['Kord. Kelurahan', assignments.filter(a=>a.level==='kelurahan').length, '#7C3AED'],
          ['Kord. RW', assignments.filter(a=>a.level==='rw').length, '#059669'],
          ['Petugas RT', assignments.filter(a=>a.level==='rt').length, '#D97706'],
        ].map(([l,v,c])=>(
          <div key={String(l)} className="card" style={{padding:16,textAlign:'center'}}>
            <p style={{fontSize:11,fontWeight:600,color:'#6B7280',textTransform:'uppercase'}}>{l}</p>
            <p style={{fontSize:24,fontWeight:700,color:String(c),marginTop:4}}>{v}</p>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>setActiveTab('aktif')} className={activeTab==='aktif'?'btn-primary':'btn-secondary'} style={{padding:'6px 16px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>Koordinator Aktif</button>
        <button onClick={()=>setActiveTab('kosong')} className={activeTab==='kosong'?'btn-primary':'btn-secondary'} style={{padding:'6px 16px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>Wilayah Kosong</button>
      </div>

      {activeTab === 'aktif' ? (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <select className="input" style={{width:'auto'}} value={kecamatanFilter} onChange={e=>handleKecamatanFilter(e.target.value)}>
              <option value="">Semua Kecamatan</option>
              {kecamatanList.map((k:any) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
            <select className="input" style={{width:'auto'}} value={levelFilter} onChange={e=>setLevelFilter(e.target.value)}>
              <option value="">Semua Level</option>
              <option value="kecamatan">Kecamatan</option>
              <option value="kelurahan">Kelurahan</option>
              <option value="rw">RW</option>
              <option value="rt">RT</option>
            </select>
          </div>
          <div className="card" style={{overflow:'hidden'}}>
            <table style={{width:'100%',fontSize:14,borderCollapse:'collapse'}}>
              <thead style={{background:'#F9FAFB',borderBottom:'1px solid #E5E7EB'}}>
                <tr>{['Nama','Role','Level','Wilayah','Status'].map(h=>(
                  <th key={h} style={{textAlign:'left',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B7280',textTransform:'uppercase'}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.length===0 && <tr><td colSpan={5} style={{padding:32,textAlign:'center',color:'#9CA3AF'}}>Tidak ada data</td></tr>}
                {filtered.map((a:any)=>(
                  <tr key={a.id} style={{borderBottom:'1px solid #F3F4F6'}}>
                    <td style={{padding:'12px 16px',fontWeight:500,color:'#111827'}}>{a.user?.nama||'—'}</td>
                    <td style={{padding:'12px 16px',fontSize:12,color:'#6B7280'}}>{(a.user?.role||'').replace(/_/g,' ')}</td>
                    <td style={{padding:'12px 16px'}}><span className={a.level==='kecamatan'?'badge-blue':a.level==='kelurahan'?'badge-purple':a.level==='rw'?'badge-green':'badge-orange'}>{a.level}</span></td>
                    <td style={{padding:'12px 16px',fontSize:12,color:'#4B5563',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.wilayahNama||'—'}</td>
                    <td style={{padding:'12px 16px'}}><span className={a.status==='aktif'?'badge-green':'badge-gray'}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',gap:8}}>
            {['kecamatan','kelurahan'].map(l=>(
              <button key={l} onClick={()=>loadKosong(l)} className={kosongLevel===l?'btn-primary':'btn-secondary'} style={{padding:'6px 16px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
                {l.charAt(0).toUpperCase()+l.slice(1)}
              </button>
            ))}
          </div>
          <div style={{background:'#FFFBEB',border:'1px solid #FCD34D',borderRadius:12,padding:16}}>
            <p style={{fontSize:14,fontWeight:600,color:'#92400E',margin:0}}>{kosong.length} {kosongLevel} belum ada koordinator</p>
          </div>
          <div className="card" style={{overflow:'hidden'}}>
            <table style={{width:'100%',fontSize:14,borderCollapse:'collapse'}}>
              <thead style={{background:'#F9FAFB',borderBottom:'1px solid #E5E7EB'}}>
                <tr>{['Nama','Kota/Kecamatan','Status'].map(h=>(
                  <th key={h} style={{textAlign:'left',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B7280',textTransform:'uppercase'}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {kosong.length===0 && <tr><td colSpan={3} style={{padding:32,textAlign:'center',color:'#059669',fontWeight:600}}>Semua {kosongLevel} sudah punya koordinator!</td></tr>}
                {kosong.map((k:any)=>(
                  <tr key={k.id} style={{borderBottom:'1px solid #F3F4F6'}}>
                    <td style={{padding:'12px 16px',fontWeight:500,color:'#111827'}}>{k.nama}</td>
                    <td style={{padding:'12px 16px',fontSize:12,color:'#6B7280'}}>{k.kota||k.kecamatan}</td>
                    <td style={{padding:'12px 16px'}}><span className="badge-red">Belum Ada Koordinator</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {showBroadcast && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}}>
          <div style={{background:'#fff',borderRadius:12,padding:24,width:'100%',maxWidth:420}}>
            <h3 style={{fontWeight:600,fontSize:18,marginBottom:16}}>Broadcast ke Koordinator</h3>
            <select
              className="input"
              style={{width:'100%',marginBottom:12}}
              value={broadcastLevel}
              onChange={(e) => setBroadcastLevel(e.target.value)}
            >
              <option value="semua">Semua Koordinator</option>
              <option value="kecamatan">Koordinator Kecamatan</option>
              <option value="kelurahan">Koordinator Kelurahan</option>
              <option value="rw">Koordinator RW</option>
              <option value="rt">Koordinator RT</option>
            </select>
            <textarea
              className="input"
              style={{width:'100%',height:128,marginBottom:12}}
              placeholder="Tulis pesan untuk dikirim via WhatsApp..."
              value={broadcastPesan}
              onChange={(e) => setBroadcastPesan(e.target.value)}
            />
            {broadcastResult && !broadcastResult.error && (
              <p style={{fontSize:13,color:'#059669',marginBottom:12}}>
                ✓ Terkirim: {broadcastResult.terkirim} / {broadcastResult.totalTarget} (gagal: {broadcastResult.gagal})
              </p>
            )}
            {broadcastResult?.error && (
              <p style={{fontSize:13,color:'#dc2626',marginBottom:12}}>{broadcastResult.error}</p>
            )}
            <div style={{display:'flex',gap:8}}>
              <button
                type="button"
                onClick={handleBroadcast}
                disabled={broadcastLoading || !broadcastPesan.trim()}
                style={{flex:1,background:'#2563eb',color:'#fff',padding:'8px 0',borderRadius:8,border:'none',cursor:'pointer'}}
              >
                {broadcastLoading ? 'Mengirim…' : 'Kirim via WA'}
              </button>
              <button
                type="button"
                onClick={() => setShowBroadcast(false)}
                style={{flex:1,border:'1px solid #e5e7eb',padding:'8px 0',borderRadius:8,cursor:'pointer',background:'#fff'}}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
