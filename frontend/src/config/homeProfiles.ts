import { officialProfile } from './officialProfile';
import type { ProfileCardData } from '../components/admin/OfficialProfileCard';

export const sigitProfileCard: ProfileCardData = {
  title: officialProfile.title,
  name: officialProfile.name,
  photo: officialProfile.photo,
  initials: 'SP',
  wilayah: officialProfile.wilayah,
  accentColor: '#f59e0b',
  accentTextOnAccent: '#1e3a8a',
  focusLabel: 'Fokus Komisi VIII DPR RI',
  focus: officialProfile.focus,
  badges: [
    { label: officialProfile.party, highlight: true },
    { label: officialProfile.commission },
    { label: officialProfile.dapil },
    { label: officialProfile.period },
  ],
};

