import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export function AdminWilayah() {
  const [readiness, setReadiness] = useState<any[]>([]);
  const [kota, setKota] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [view, setView] = useState<'kota'|'rt'>('kota');

  useEffect(()=>{
    Promise.all([api.get('/wilayah/kota'), api.get('/wilayah/rt-readiness')]).then(([k,r])=>{
      setKota(k.data); setReadiness(r.data);
    }).catch(console.error).finally(()=>setLoading(false));
  },[]);

  const filtered = readiness.filter(rt=>{
    const q = search.toLowerCase();
    const matchS = !search||rt.kelurahan?.toLowerCase().includes(q)||rt.kecamatan?.toLowerCase().includes(q)||`rt${rt.nomor}`.includes(q.replace(/\s/g,''));
    const matchF = !filterStatus||(filterStatus==='kosong'&&rt.jumlahWarga===0)||(filterStatus==='kurang'&&rt.jumlahWarga>0&&rt.jumlahWarga<10)||(filterStatus==='lengkap'&&rt.jumlahWarga>=10);
    return matchS&&matchF;
  });

  const kosong=readiness.filter(r=>r.jumlahWarga===0).length;
  const kurang=readiness.filter(r=>r.jumlahWarga>0&&r.jumlahWarga<10).length;
  const lengkap=readiness.filter(r=>r.jumlahWarga>=10).length;
  const persen=readiness.length?Math.round(lengkap/readiness.length*100):0;

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Memuat data wilayah Jakarta...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Wilayah DKI Jakarta</h1>
          <p className="text-sm text-gray-500">{kota.length} kota/kabupaten · {readiness.length.toLocaleString('id-ID')} RT</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setView('kota')} className={`btn btn-sm ${view==='kota'?'btn-primary':'btn-secondary'}`}>🗺️ Kota</button>
          <button onClick={()=>setView('rt')} className={`btn btn-sm ${view==='rt'?'btn-primary':'btn-secondary'}`}>📊 Status RT</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[['Total RT',readiness.length,'blue'],['Lengkap',lengkap,'green'],['Kurang',kurang,'orange'],['Kosong',kosong,'red'],['Coverage',`${persen}%`,persen>=70?'green':persen>=40?'orange':'red']].map(([l,v,c])=>(
          <div key={l as string} className={`card p-3 text-center border-t-2 ${c==='green'?'border-green-400':c==='orange'?'border-orange-400':c==='red'?'border-red-400':'border-blue-400'}`}>
            <p className="text-xs text-gray-500 font-semibold uppercase">{l}</p>
            <p className={`text-xl font-bold mt-1 ${c==='green'?'text-green-600':c==='orange'?'text-orange-500':c==='red'?'text-red-600':'text-blue-600'}`}>{typeof v==='number'?v.toLocaleString('id-ID'):v}</p>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-semibold text-gray-700">Coverage Wilayah Jakarta</p>
          <p className="text-sm font-bold">{persen}% RT Lengkap</p>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
          <div className="h-full bg-green-500" style={{width:`${(lengkap/readiness.length)*100}%`}} />
          <div className="h-full bg-orange-400" style={{width:`${(kurang/readiness.length)*100}%`}} />
          <div className="h-full bg-red-400" style={{width:`${(kosong/readiness.length)*100}%`}} />
        </div>
        <div className="flex gap-4 mt-2 text-xs text-gray-500">
          {[['bg-green-500','Lengkap'],['bg-orange-400','Kurang'],['bg-red-400','Kosong']].map(([c,l])=>(
            <span key={l}><span className={`inline-block w-2 h-2 rounded-full ${c} mr-1`} />{l}</span>
          ))}
        </div>
      </div>

      {view==='kota' ? (
        <div>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Kota / Kabupaten DKI Jakarta</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kota.map((k:any)=>(
              <div key={k.id} className="card p-4 hover:shadow-md transition-shadow border-l-4 cursor-pointer" style={{borderLeftColor:'#1A4FA0'}} onClick={()=>setView('rt')}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{k.nama}</p>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{k.tipe??'kota'} administrasi</p>
                  </div>
                  <span className="text-2xl">🏙️</span>
                </div>
                <button className="mt-3 text-xs font-semibold text-blue-600 hover:underline">Lihat status RT →</button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            <input className="input flex-1 min-w-48" placeholder="Cari kelurahan, kecamatan, RT..." value={search} onChange={e=>setSearch(e.target.value)} />
            <select className="input w-auto" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="kosong">Kosong (0 warga)</option>
              <option value="kurang">Kurang (1-9 warga)</option>
              <option value="lengkap">Lengkap (10+ warga)</option>
            </select>
          </div>
          <p className="text-xs text-gray-400">{filtered.length.toLocaleString('id-ID')} RT</p>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>{['RT','RW','Kelurahan','Kecamatan','Warga','Progress','Status'].map(h=>(
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.slice(0,200).map((rt:any)=>(
                  <tr key={rt.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2 font-medium text-gray-800">RT {rt.nomor}</td>
                    <td className="px-4 py-2 text-gray-500">RW {rt.rw}</td>
                    <td className="px-4 py-2 text-gray-600 text-xs">{rt.kelurahan}</td>
                    <td className="px-4 py-2 text-gray-400 text-xs">{rt.kecamatan}</td>
                    <td className="px-4 py-2 font-semibold">{rt.jumlahWarga}/10</td>
                    <td className="px-4 py-2 w-24">
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${rt.jumlahWarga>=10?'bg-green-500':rt.jumlahWarga>0?'bg-orange-400':'bg-red-400'}`} style={{width:`${Math.min(100,rt.jumlahWarga*10)}%`}} />
                      </div>
                    </td>
                    <td className="px-4 py-2"><span className={rt.jumlahWarga>=10?'badge-green':rt.jumlahWarga>0?'badge-orange':'badge-red'}>{rt.jumlahWarga>=10?'Lengkap':rt.jumlahWarga>0?'Kurang':'Kosong'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length>200&&<p className="p-3 text-center text-xs text-gray-400">Menampilkan 200 dari {filtered.length.toLocaleString('id-ID')} RT. Gunakan filter.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
