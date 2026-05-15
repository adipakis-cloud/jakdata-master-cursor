import { Navigate, Route, Routes } from 'react-router-dom';
import { WarmindoLayout } from './WarmindoLayout';
import { WarmindoDashboard } from './WarmindoDashboard';
import { WarmindoTransaksi } from './WarmindoTransaksi';
import { WarmindoInventory } from './WarmindoInventory';
import { WarmindoKeuangan } from './WarmindoKeuangan';
import { WarmindoProfil } from './WarmindoProfil';

export function WarmindoApp() {
  return (
    <Routes>
      <Route element={<WarmindoLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<WarmindoDashboard />} />
        <Route path="transaksi" element={<WarmindoTransaksi />} />
        <Route path="transaksi/baru" element={<WarmindoTransaksi />} />
        <Route path="inventory" element={<WarmindoInventory />} />
        <Route path="keuangan" element={<WarmindoKeuangan />} />
        <Route path="profil" element={<WarmindoProfil />} />
      </Route>
    </Routes>
  );
}
