import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../store/auth.store';

type Page = 'home' | 'warga' | 'laporan' | 'bantuan' | 'warmindo' | 'ai';

type Evidence = {
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
  note?: string;
};

const pageLabels: Record<Page, { label: string; icon: string }> = {
  home: { label: 'Home', icon: '🏠' },
  warga: { label: 'Warga', icon: '👥' },
  laporan: { label: 'Lapor', icon: '📋' },
  bantuan: { label: 'Bantuan', icon: '🎁' },
  warmindo: { label: 'Warmindo', icon: '🍜' },
  ai: { label: 'AI', icon: '🤖' },
};

export function FieldApp() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [page, setPage] = useState<Page>('home');
  const [overview, setOverview] = useState<any>(null);
  const [warga, setWarga] = useState<any[]>([]);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  const canWarmindo = ['manager_warmindo', 'kasir_warmindo', 'finance_admin', 'admin_pusat'].includes(user?.role ?? '');
  const canBantuan = !['kasir_warmindo'].includes(user?.role ?? '');
  const navPages = useMemo(() => {
    const pages: Page[] = ['home', 'warga', 'laporan'];
    if (canBantuan) pages.push('bantuan');
    if (canWarmindo) pages.push('warmindo');
    pages.push('ai');
    return pages;
  }, [canBantuan, canWarmindo]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [o, w] = await Promise.all([
        api.get('/field/overview'),
        api.get('/warga', { params: { limit: 40 } }),
      ]);
      setOverview(o.data);
      setWarga(w.data.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(''), 2600);
  }

  function handleLogout() {
    logout();
    nav('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-100 max-w-md mx-auto relative pb-20">
      {toast && <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-2xl shadow-lg text-sm font-semibold">{toast}</div>}

      <header className="bg-gradient-to-br from-blue-800 to-blue-600 text-white px-4 pt-8 pb-5 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-100">JAKDATA Field</p>
            <h1 className="font-bold text-lg leading-tight">{user?.nama}</h1>
            <p className="text-xs text-blue-100">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
          <button onClick={handleLogout} className="bg-white/15 active:scale-95 px-3 py-2 rounded-xl text-xs font-bold">Keluar</button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <MiniMetric label="Warga" value={overview?.stats?.totalWarga ?? 0} />
          <MiniMetric label="Open" value={overview?.stats?.openReports ?? 0} tone={(overview?.stats?.criticalReports ?? 0) > 0 ? 'red' : 'blue'} />
          <MiniMetric label="Warmindo" value={overview?.stats?.activeWarmindo ?? 0} />
        </div>
      </header>

      <main className="px-4 py-4">
        {loading && <div className="card p-6 text-center text-gray-400">Memuat data lapangan...</div>}
        {!loading && page === 'home' && <MobileHome overview={overview} warga={warga} setPage={setPage} canWarmindo={canWarmindo} />}
        {!loading && page === 'warga' && <MobileWarga warga={warga} onDone={() => { loadData(); showToast('Warga tersimpan'); }} />}
        {!loading && page === 'laporan' && <MobileLaporan user={user} onDone={() => { loadData(); showToast('Laporan terkirim'); }} />}
        {!loading && page === 'bantuan' && <MobileBantuan overview={overview} onDone={() => { loadData(); showToast('Verifikasi bantuan terkirim'); }} />}
        {!loading && page === 'warmindo' && <MobileWarmindo canWarmindo={canWarmindo} onDone={() => { loadData(); showToast('Operasi Warmindo tersimpan'); }} />}
        {!loading && page === 'ai' && <MobileAI overview={overview} />}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-md bg-white border-t border-gray-200 px-2 py-2 pb-3 shadow-2xl">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${navPages.length}, minmax(0, 1fr))` }}>
          {navPages.map(p => (
            <button key={p} onClick={() => setPage(p)} className={`rounded-2xl py-2 text-xs font-bold active:scale-95 ${page === p ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>
              <div className="text-lg leading-none">{pageLabels[p].icon}</div>
              <div className="mt-1">{pageLabels[p].label}</div>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function MiniMetric({ label, value, tone = 'blue' }: { label: string; value: any; tone?: 'blue' | 'red' }) {
  return <div className={`rounded-2xl p-3 ${tone === 'red' ? 'bg-red-500/25' : 'bg-white/15'}`}><p className="text-xl font-black">{value}</p><p className="text-[11px] text-blue-100">{label}</p></div>;
}

function MobileHome({ overview, warga, setPage, canWarmindo }: any) {
  const critical = overview?.stats?.criticalReports ?? 0;
  return (
    <div className="space-y-4">
      {critical > 0 && <ActionBanner color="red" title={`${critical} laporan critical`} text="Prioritaskan kunjungan dan eskalasi hari ini." />}
      {overview?.fairnessAlerts?.length > 0 && <ActionBanner color="orange" title="Fairness warning" text={`${overview.fairnessAlerts.length} anomali bantuan perlu diverifikasi.`} />}
      <div className="grid grid-cols-2 gap-3">
        <BigAction icon="👤" label="Tambah Warga" sub="Data cepat" onClick={() => setPage('warga')} />
        <BigAction icon="📋" label="Buat Laporan" sub="Foto + GPS" onClick={() => setPage('laporan')} />
        <BigAction icon="🎁" label="Verifikasi Bantuan" sub="Kandidat prioritas" onClick={() => setPage('bantuan')} />
        {canWarmindo ? <BigAction icon="🍜" label="Warmindo" sub="Transaksi/shift" onClick={() => setPage('warmindo')} /> : <BigAction icon="🤖" label="AI Assist" sub="Arahan hari ini" onClick={() => setPage('ai')} />}
      </div>
      <Section title="Aksi AI Lapangan">
        {(overview?.aiRecommendations ?? []).slice(0, 4).map((r: any) => <AlertRow key={r.id} title={r.domain ?? r.title} text={r.recommendation ?? r.summary} severity={r.priority ?? r.severity} />)}
      </Section>
      <Section title="Warga Terbaru">
        {warga.slice(0, 5).map((w: any) => <div key={w.id} className="flex items-center gap-3 py-2"><Avatar name={w.nama} /><div className="flex-1"><p className="font-semibold text-sm">{w.nama}</p><p className="text-xs text-gray-500">{w.kategori?.replace(/_/g, ' ')} · RT {w.rt?.nomor}</p></div>{w.noHp && <a className="text-green-600 font-bold" href={`tel:${w.noHp}`}>Tel</a>}</div>)}
      </Section>
    </div>
  );
}

function MobileWarga({ warga, onDone }: any) {
  const [families, setFamilies] = useState<any[]>([]);
  const [form, setForm] = useState({ nama: '', noHp: '', rtId: '', kategori: 'warga_biasa', statusEkonomi: '', pekerjaan: '', catatan: '' });
  const [familyForm, setFamilyForm] = useState({ keluargaId: '', statusRumah: '', totalPenghasilan: '', skorPrioritasBantuan: '', catatan: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/warga/keluarga/list').then(r => setFamilies(r.data)).catch(console.error); }, []);

  async function saveWarga() {
    setSaving(true);
    try { await api.post('/warga', form); setForm({ ...form, nama: '', noHp: '', pekerjaan: '', catatan: '' }); onDone(); } finally { setSaving(false); }
  }

  async function updateKeluarga() {
    if (!familyForm.keluargaId) return;
    setSaving(true);
    try {
      await api.patch(`/field/keluarga/${familyForm.keluargaId}`, {
        statusRumah: familyForm.statusRumah || undefined,
        totalPenghasilan: familyForm.totalPenghasilan || undefined,
        skorPrioritasBantuan: familyForm.skorPrioritasBantuan || undefined,
        catatan: familyForm.catatan,
      });
      onDone();
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <Section title="Tambah Warga">
        <FieldInput label="Nama" value={form.nama} onChange={v => setForm({ ...form, nama: v })} />
        <FieldInput label="No HP" value={form.noHp} onChange={v => setForm({ ...form, noHp: v })} inputMode="tel" />
        <FieldInput label="RT ID" value={form.rtId} onChange={v => setForm({ ...form, rtId: v })} inputMode="numeric" />
        <FieldSelect label="Status Ekonomi" value={form.statusEkonomi} onChange={v => setForm({ ...form, statusEkonomi: v })} options={['', 'sangat_miskin', 'miskin', 'rentan', 'sedang', 'mampu']} />
        <FieldInput label="Pekerjaan" value={form.pekerjaan} onChange={v => setForm({ ...form, pekerjaan: v })} />
        <TouchButton disabled={saving || !form.nama || !form.rtId} onClick={saveWarga}>Simpan Warga</TouchButton>
      </Section>

      <Section title="Update Keluarga / Kondisi Rumah">
        <select className="input mb-2" value={familyForm.keluargaId} onChange={e => setFamilyForm({ ...familyForm, keluargaId: e.target.value })}>
          <option value="">Pilih keluarga</option>
          {families.map(k => <option key={k.id} value={k.id}>{k.namaKepala} · RT {k.rt?.nomor}</option>)}
        </select>
        <FieldSelect label="Kondisi Rumah" value={familyForm.statusRumah} onChange={v => setFamilyForm({ ...familyForm, statusRumah: v })} options={['', 'milik_sendiri', 'kontrak_layak', 'kontrak_padat', 'semi_permanen', 'tidak_layak']} />
        <FieldInput label="Penghasilan total" value={familyForm.totalPenghasilan} onChange={v => setFamilyForm({ ...familyForm, totalPenghasilan: v })} inputMode="numeric" />
        <FieldInput label="Skor prioritas bantuan" value={familyForm.skorPrioritasBantuan} onChange={v => setFamilyForm({ ...familyForm, skorPrioritasBantuan: v })} inputMode="numeric" />
        <textarea className="input mb-3" rows={2} placeholder="Catatan kondisi rumah" value={familyForm.catatan} onChange={e => setFamilyForm({ ...familyForm, catatan: e.target.value })} />
        <TouchButton disabled={saving || !familyForm.keluargaId} onClick={updateKeluarga}>Update Keluarga</TouchButton>
      </Section>

      <Section title="Daftar Warga">
        {warga.slice(0, 20).map((w: any) => <div key={w.id} className="py-2 border-b border-gray-50 last:border-0"><p className="font-semibold text-sm">{w.nama}</p><p className="text-xs text-gray-500">{w.statusEkonomi ?? '-'} · {w.pekerjaan ?? '-'}</p></div>)}
      </Section>
    </div>
  );
}

function MobileLaporan({ user, onDone }: any) {
  const [form, setForm] = useState({ kategori: 'sosial', urgencyLevel: 'medium', isiLaporan: '', lokasiText: '', rtId: String(user?.rtId ?? '') });
  const [evidence, setEvidence] = useState<Evidence>({});
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const laporan = await api.post('/laporan', { ...form, lampiranUrls: evidence.photoUrl ? [evidence.photoUrl] : [] });
      await api.post('/field/evidence', { ...evidence, actionType: 'laporan_create', entityType: 'laporan_warga', entityId: laporan.data.id });
      onDone();
      setForm({ ...form, isiLaporan: '', lokasiText: '' });
      setEvidence({});
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <EvidenceCapture evidence={evidence} setEvidence={setEvidence} />
      <Section title="Buat Laporan Lapangan">
        <FieldSelect label="Kategori" value={form.kategori} onChange={v => setForm({ ...form, kategori: v })} options={['bencana', 'sosial', 'pendidikan', 'kesehatan', 'ekonomi', 'bantuan', 'infrastruktur']} />
        <FieldSelect label="Urgensi" value={form.urgencyLevel} onChange={v => setForm({ ...form, urgencyLevel: v })} options={['critical', 'high', 'medium', 'low']} />
        <FieldInput label="RT ID" value={form.rtId} onChange={v => setForm({ ...form, rtId: v })} inputMode="numeric" />
        <FieldInput label="Lokasi singkat" value={form.lokasiText} onChange={v => setForm({ ...form, lokasiText: v })} />
        <textarea className="input mb-3" rows={5} placeholder="Tulis masalah dan kebutuhan tindakan..." value={form.isiLaporan} onChange={e => setForm({ ...form, isiLaporan: e.target.value })} />
        <TouchButton disabled={saving || !form.isiLaporan} onClick={submit}>Kirim Laporan + Bukti</TouchButton>
      </Section>
    </div>
  );
}

function MobileBantuan({ overview, onDone }: any) {
  const [fairness, setFairness] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [note, setNote] = useState('');
  const [evidence, setEvidence] = useState<Evidence>({});

  useEffect(() => { api.get('/bantuan/fairness').then(r => setFairness(r.data)).catch(console.error); }, []);

  async function verify(eligible: boolean) {
    if (!selected) return;
    await api.post('/field/bantuan/verify', { keluargaId: selected.id, eligible, note, ...evidence });
    setSelected(null); setNote(''); setEvidence({}); onDone();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <MiniCard label="Score" value={fairness?.snapshot?.fairnessScore ?? 0} />
        <MiniCard label="Berulang" value={fairness?.repeatedRecipients?.length ?? 0} />
        <MiniCard label="Belum" value={fairness?.uncoveredFamilies?.length ?? 0} />
      </div>
      <Section title="Kandidat Bantuan Prioritas">
        {(overview?.bantuanCandidates ?? []).map((k: any) => <button key={k.id} onClick={() => setSelected(k)} className="w-full text-left p-3 rounded-xl bg-gray-50 mb-2 active:scale-[0.99]"><p className="font-semibold">{k.namaKepala}</p><p className="text-xs text-gray-500">Skor {k.skorPrioritasBantuan} · RT {k.rt?.nomor} {k.rt?.rw?.kelurahan?.nama}</p></button>)}
      </Section>
      <Section title="Fairness Alerts">
        {(fairness?.anomalies ?? []).slice(0, 8).map((a: any) => <AlertRow key={a.id} title={a.title} text={a.description} severity={a.severity} />)}
      </Section>
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-3">
          <div className="bg-white rounded-3xl p-4 w-full max-w-md max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">Verifikasi {selected.namaKepala}</h3>
            <EvidenceCapture evidence={evidence} setEvidence={setEvidence} />
            <textarea className="input my-3" rows={3} placeholder="Catatan verifikasi lapangan" value={note} onChange={e => setNote(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <button className="py-4 rounded-2xl bg-red-50 text-red-700 font-bold" onClick={() => verify(false)}>Tidak Layak</button>
              <button className="py-4 rounded-2xl bg-emerald-600 text-white font-bold" onClick={() => verify(true)}>Layak</button>
            </div>
            <button className="w-full mt-2 py-3 text-gray-500 font-semibold" onClick={() => setSelected(null)}>Batal</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileWarmindo({ canWarmindo, onDone }: any) {
  const [outlets, setOutlets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [trx, setTrx] = useState({ totalOmzet: '', totalHpp: '', jumlahItem: '', catatan: '' });
  const [attendance, setAttendance] = useState({ employeeId: '', status: 'present', notes: '' });
  const [closing, setClosing] = useState({ cashExpected: '', cashActual: '', notes: '' });
  const [stock, setStock] = useState({ inventoryId: '', namaBahan: '', movementType: 'in', qty: '', satuan: 'pcs', reason: 'field_update' });
  const [maintenance, setMaintenance] = useState({ issue: '', severity: 'medium', cost: '', notes: '' });

  useEffect(() => {
    Promise.all([api.get('/warmindo'), api.get('/warmindo/summary')]).then(([o, s]) => {
      setOutlets(o.data); setSummary(s.data); if (o.data[0]) setSelectedId(String(o.data[0].id));
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    api.get(`/warmindo/${selectedId}/employees`).then(r => {
      setEmployees(r.data);
      if (r.data[0]) setAttendance(a => ({ ...a, employeeId: String(r.data[0].id) }));
    }).catch(console.error);
  }, [selectedId]);

  if (!canWarmindo) return <ActionBanner color="orange" title="Akses Warmindo terbatas" text="Akun ini tidak memiliki outlet Warmindo." />;
  const selected = outlets.find(o => String(o.id) === selectedId);

  async function saveTransaction() {
    await api.post(`/warmindo/${selectedId}/transaksi`, trx);
    setTrx({ totalOmzet: '', totalHpp: '', jumlahItem: '', catatan: '' });
    onDone();
  }
  async function saveAttendance() {
    await api.post(`/field/warmindo/${selectedId}/attendance`, attendance);
    setAttendance({ employeeId: '', status: 'present', notes: '' });
    onDone();
  }
  async function saveClosing() {
    await api.post(`/field/warmindo/${selectedId}/closing`, closing);
    setClosing({ cashExpected: '', cashActual: '', notes: '' });
    onDone();
  }
  async function saveStock() {
    await api.post(`/warmindo/${selectedId}/stock-movement`, stock);
    setStock({ inventoryId: '', namaBahan: '', movementType: 'in', qty: '', satuan: 'pcs', reason: 'field_update' });
    onDone();
  }
  async function saveMaintenance() {
    await api.post(`/warmindo/${selectedId}/maintenance`, maintenance);
    setMaintenance({ issue: '', severity: 'medium', cost: '', notes: '' });
    onDone();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <MiniCard label="Omzet" value={rupiah(summary?.dailyOmzet ?? 0)} />
        <MiniCard label="Profit" value={rupiah(summary?.profitEstimate ?? 0)} />
        <MiniCard label="Issue" value={(summary?.lowStock?.length ?? 0) + (summary?.staffAttendanceIssues ?? 0)} />
      </div>
      <Section title="Outlet">
        <select className="input" value={selectedId} onChange={e => setSelectedId(e.target.value)}>{outlets.map(o => <option key={o.id} value={o.id}>{o.namaOutlet}</option>)}</select>
        {selected?.operationalSummary && <p className="text-xs text-gray-500 mt-2">Hari ini {rupiah(selected.operationalSummary.omzetHariIni)} · Low stock {selected.operationalSummary.lowStock}</p>}
      </Section>
      <Section title="Input Transaksi Kasir">
        <FieldInput label="Total omzet" value={trx.totalOmzet} onChange={v => setTrx({ ...trx, totalOmzet: v })} inputMode="numeric" />
        <FieldInput label="Total HPP" value={trx.totalHpp} onChange={v => setTrx({ ...trx, totalHpp: v })} inputMode="numeric" />
        <FieldInput label="Jumlah item" value={trx.jumlahItem} onChange={v => setTrx({ ...trx, jumlahItem: v })} inputMode="numeric" />
        <TouchButton disabled={!selectedId || !trx.totalOmzet} onClick={saveTransaction}>Simpan Transaksi</TouchButton>
      </Section>
      <Section title="Attendance / Shift">
        <label className="block mb-3"><span className="label">Pegawai</span><select className="input min-h-[48px]" value={attendance.employeeId} onChange={e => setAttendance({ ...attendance, employeeId: e.target.value })}>{employees.map(e => <option key={e.id} value={e.id}>{e.nama} · {e.role}</option>)}</select></label>
        <FieldSelect label="Status" value={attendance.status} onChange={v => setAttendance({ ...attendance, status: v })} options={['present', 'late', 'absent']} />
        <FieldInput label="Catatan" value={attendance.notes} onChange={v => setAttendance({ ...attendance, notes: v })} />
        <TouchButton disabled={!selectedId || !attendance.employeeId} onClick={saveAttendance}>Simpan Attendance</TouchButton>
      </Section>
      <Section title="Stock Movement">
        <select className="input mb-3" value={stock.inventoryId} onChange={e => {
          const inv = selected?.inventory?.find((i:any) => String(i.id) === e.target.value);
          setStock({ ...stock, inventoryId: e.target.value, namaBahan: inv?.namaBahan ?? '', satuan: inv?.satuan ?? 'pcs' });
        }}>
          <option value="">Pilih stok</option>
          {selected?.inventory?.map((i:any) => <option key={i.id} value={i.id}>{i.namaBahan} ({i.stokSaatIni} {i.satuan})</option>)}
        </select>
        <FieldSelect label="Tipe" value={stock.movementType} onChange={v => setStock({ ...stock, movementType: v })} options={['in', 'out']} />
        <FieldInput label="Jumlah" value={stock.qty} onChange={v => setStock({ ...stock, qty: v })} inputMode="numeric" />
        <TouchButton disabled={!selectedId || !stock.inventoryId || !stock.qty} onClick={saveStock}>Update Stok</TouchButton>
      </Section>
      <Section title="Cash Closing">
        <FieldInput label="Cash expected" value={closing.cashExpected} onChange={v => setClosing({ ...closing, cashExpected: v })} inputMode="numeric" />
        <FieldInput label="Cash actual" value={closing.cashActual} onChange={v => setClosing({ ...closing, cashActual: v })} inputMode="numeric" />
        <FieldInput label="Catatan closing" value={closing.notes} onChange={v => setClosing({ ...closing, notes: v })} />
        <TouchButton disabled={!selectedId || !closing.cashActual} onClick={saveClosing}>Simpan Closing</TouchButton>
      </Section>
      <Section title="Maintenance Issue">
        <FieldInput label="Masalah aset/fasilitas" value={maintenance.issue} onChange={v => setMaintenance({ ...maintenance, issue: v })} />
        <FieldSelect label="Severity" value={maintenance.severity} onChange={v => setMaintenance({ ...maintenance, severity: v })} options={['low', 'medium', 'high', 'critical']} />
        <FieldInput label="Estimasi biaya" value={maintenance.cost} onChange={v => setMaintenance({ ...maintenance, cost: v })} inputMode="numeric" />
        <TouchButton disabled={!selectedId || !maintenance.issue} onClick={saveMaintenance}>Laporkan Maintenance</TouchButton>
      </Section>
    </div>
  );
}

function MobileAI({ overview }: any) {
  const [memory, setMemory] = useState<any>(null);
  useEffect(() => { api.get('/ai/memory').then(r => setMemory(r.data)).catch(console.error); }, []);
  return (
    <div className="space-y-4">
      <Section title="AI Arahan Operasional">
        {(overview?.aiRecommendations ?? []).map((r: any) => <AlertRow key={r.id} title={r.domain ?? r.title} text={r.recommendation ?? r.summary} severity={r.priority ?? r.severity} />)}
      </Section>
      <Section title="Territorial Alerts">
        {(overview?.fairnessAlerts ?? []).slice(0, 6).map((a: any) => <AlertRow key={a.id} title={a.title} text={a.description} severity={a.severity} />)}
      </Section>
      <Section title="Decision / Outcome">
        {(memory?.recommendations ?? []).slice(0, 5).map((r: any) => <div key={r.id} className="p-3 rounded-xl bg-gray-50 mb-2"><p className="font-semibold text-sm">{r.domain}</p><p className="text-xs text-gray-500">{r.recommendation}</p><span className="badge-blue mt-2">{r.status}</span></div>)}
        {(memory?.outcomes ?? []).slice(0, 3).map((o: any) => <p key={o.id} className="text-xs bg-blue-50 text-blue-800 rounded-xl p-2 mb-1">{o.metricName}: {o.baselineValue} → {o.currentValue} target {o.targetValue}</p>)}
      </Section>
    </div>
  );
}

function EvidenceCapture({ evidence, setEvidence }: { evidence: Evidence; setEvidence: (e: Evidence) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);

  async function uploadPhoto() {
    if (!fileRef.current?.files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', fileRef.current.files[0]);
      const { data } = await api.post('/field/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setEvidence({ ...evidence, photoUrl: data.url });
    } finally { setUploading(false); }
  }

  function captureGps() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setEvidence({ ...evidence, latitude: pos.coords.latitude, longitude: pos.coords.longitude }); setLocating(false); },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 6000 },
    );
  }

  return (
    <Section title="Bukti Lapangan">
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={uploadPhoto} />
      <div className="grid grid-cols-2 gap-2">
        <button className="py-4 rounded-2xl bg-blue-50 text-blue-700 font-bold active:scale-95" onClick={() => fileRef.current?.click()}>{uploading ? 'Upload...' : evidence.photoUrl ? 'Foto OK' : 'Foto'}</button>
        <button className="py-4 rounded-2xl bg-emerald-50 text-emerald-700 font-bold active:scale-95" onClick={captureGps}>{locating ? 'GPS...' : evidence.latitude ? 'GPS OK' : 'GPS'}</button>
      </div>
      <textarea className="input mt-3" rows={2} placeholder="Catatan bukti / kondisi lapangan" value={evidence.note ?? ''} onChange={e => setEvidence({ ...evidence, note: e.target.value })} />
    </Section>
  );
}

function BigAction({ icon, label, sub, onClick }: any) {
  return <button onClick={onClick} className="bg-white rounded-3xl p-4 shadow-sm text-left active:scale-95 min-h-[112px]"><div className="text-3xl">{icon}</div><p className="font-black text-gray-900 mt-2">{label}</p><p className="text-xs text-gray-500">{sub}</p></button>;
}

function Section({ title, children }: any) {
  return <section className="bg-white rounded-3xl p-4 shadow-sm"><h2 className="font-black text-gray-900 mb-3">{title}</h2>{children}</section>;
}

function AlertRow({ title, text, severity }: any) {
  const color = severity === 'critical' ? 'bg-red-50 text-red-700' : severity === 'high' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700';
  return <div className={`rounded-2xl p-3 mb-2 ${color}`}><p className="font-bold text-sm">{title}</p><p className="text-xs mt-1 opacity-80">{text}</p></div>;
}

function ActionBanner({ color, title, text }: any) {
  const cls = color === 'red' ? 'bg-red-600' : 'bg-orange-500';
  return <div className={`${cls} text-white rounded-3xl p-4 shadow-sm`}><p className="font-black">{title}</p><p className="text-sm opacity-90">{text}</p></div>;
}

function Avatar({ name }: { name: string }) {
  return <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shrink-0">{name?.[0] ?? '?'}</div>;
}

function FieldInput({ label, value, onChange, inputMode }: any) {
  return <label className="block mb-3"><span className="label">{label}</span><input className="input min-h-[48px]" value={value} inputMode={inputMode} onChange={e => onChange(e.target.value)} /></label>;
}

function FieldSelect({ label, value, onChange, options }: any) {
  return <label className="block mb-3"><span className="label">{label}</span><select className="input min-h-[48px]" value={value} onChange={e => onChange(e.target.value)}>{options.map((o: string) => <option key={o} value={o}>{o ? o.replace(/_/g, ' ') : 'Pilih...'}</option>)}</select></label>;
}

function TouchButton({ children, disabled, onClick }: any) {
  return <button disabled={disabled} onClick={onClick} className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black disabled:opacity-40 active:scale-[0.99]">{children}</button>;
}

function MiniCard({ label, value }: any) {
  return <div className="bg-white rounded-2xl p-3 shadow-sm"><p className="text-lg font-black">{value}</p><p className="text-[11px] text-gray-500">{label}</p></div>;
}

function rupiah(value: number) {
  if (value >= 1000000) return `Rp${(value / 1000000).toFixed(1)}jt`;
  if (value >= 1000) return `Rp${Math.round(value / 1000)}rb`;
  return `Rp${value ?? 0}`;
}
