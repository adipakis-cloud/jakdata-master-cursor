// ================================================================
// JAKDATA — Official Profile Config
// Ubah di sini untuk update profil pejabat — tidak perlu edit banyak file
// ================================================================

export const officialProfile = {
  fullName: 'Sigit Purnomo Said, S.A.P.',
  displayName: 'Sigit Purnomo Said',
  shortName: 'H. Sigit Purnomo Said',
  position: 'Anggota DPR RI',
  faction: 'Fraksi Partai Amanat Nasional (PAN)',
  factionShort: 'F-PAN',
  party: 'Partai Amanat Nasional',
  electoralDistrict: 'Dapil DKI Jakarta III',
  electoralArea: 'Jakarta Barat, Jakarta Utara, Kepulauan Seribu',
  period: '2024–2029',
  commissionLabel: 'Komisi VIII DPR RI',
  commissionFocus: [
    'Agama',
    'Sosial',
    'Haji',
    'Bantuan Sosial',
    'Kebencanaan',
    'Perlindungan Anak',
    'Lansia',
    'Penyandang Disabilitas',
    'Kelompok Rentan',
    'Pemberdayaan Sosial Masyarakat',
  ],
  // Foto resmi — taruh file di frontend/public/official/sigit-purnomo-said.jpg
  // Jika foto belum ada, sistem akan tampilkan inisial otomatis
  photoUrl: '/official/sigit-purnomo-said.jpg',
  whatsapp: '6281234567890',
  instagram: '@sigitpurnomosaid',
  website: '',
  visi: 'Jakarta yang adil, sejahtera, dan berkeadilan sosial untuk seluruh warga tanpa terkecuali.',
  misi: [
    'Memperkuat program bantuan sosial tepat sasaran berbasis data wilayah',
    'Mendorong pemberdayaan ekonomi warga melalui UMKM dan Warmindo',
    'Memastikan perlindungan anak, lansia, dan penyandang disabilitas',
    'Mengawal pengelolaan dana haji yang transparan dan akuntabel',
    'Memperjuangkan infrastruktur sosial dan kebencanaan di DKI Jakarta',
  ],
};

export type OfficialProfile = typeof officialProfile;
