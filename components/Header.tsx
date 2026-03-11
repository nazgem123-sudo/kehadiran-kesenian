
import React from 'react';
import { View } from '../types';

interface HeaderProps {
  currentView: View;
  setView: (view: View) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, setView }) => {
  const titles: Record<View, string> = {
    LANDING: '',
    DASHBOARD: 'SELAMAT DATANG',
    DATA_MURID: 'Senarai Maklumat Murid',
    TAMBAH_MURID: 'Daftar Murid Baru',
    IMPORT_MURID: 'Import Data Pukal (Excel)',
    RINGKASAN: 'Rumusan & Laporan',
    MANUAL: 'Manual Penggunaan',
    CARIAN_ARKIB: 'Cetak Kehadiran',
  };

  return (
    <header className="bg-[#020617]/80 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 overflow-hidden">
          <img 
            src="https://lh3.googleusercontent.com/d/1OztMsIrH9poyCdyv32GCvZOkzk8_ECe1" 
            alt="Logo" 
            className="w-full h-full object-contain p-1"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const parent = (e.target as HTMLImageElement).parentElement;
              if (parent) {
                parent.innerHTML = '<i class="fas fa-palette text-blue-900 text-xl"></i>';
              }
            }}
          />
        </div>
        <div className="h-8 w-px bg-white/20 hidden xs:block"></div>
        <div className="overflow-hidden">
          <h1 className="text-sm sm:text-xl font-bold text-white tracking-tight leading-none mb-1 truncate">
            {titles[currentView]}
          </h1>
          <p className="text-[7px] sm:text-[10px] text-blue-200 font-bold uppercase tracking-widest leading-none">
            Sistem Maklumat Kehadiran
          </p>
        </div>
      </div>

      <button
        onClick={() => setView('LANDING')}
        className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all text-white text-xs sm:text-sm font-bold tracking-wide"
      >
        <i className="fas fa-arrow-left"></i>
        <span className="hidden sm:inline">Kembali ke Utama</span>
        <span className="sm:hidden">Kembali</span>
      </button>
    </header>
  );
};

export default Header;
