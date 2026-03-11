import React from 'react';
import { View } from '../types';

interface NavigationMenuProps {
  currentView: View;
  setView: (view: View) => void;
}

const NavigationMenu: React.FC<NavigationMenuProps> = ({ currentView, setView }) => {
  const menuItems: { id: View; label: string; icon: string }[] = [
    { id: 'DASHBOARD', label: 'Isi Kehadiran', icon: 'fa-chart-line' },
    { id: 'CARIAN_ARKIB', label: 'Cetak Kehadiran', icon: 'fa-search-location' },
    { id: 'DATA_MURID', label: 'Maklumat Murid', icon: 'fa-users' },
    { id: 'TAMBAH_MURID', label: 'Tambah Murid', icon: 'fa-user-plus' },
    { id: 'IMPORT_MURID', label: 'Import Murid', icon: 'fa-file-import' },
    { id: 'RINGKASAN', label: 'Ringkasan', icon: 'fa-file-contract' },
    { id: 'MANUAL', label: 'Manual Pengguna', icon: 'fa-book' },
  ];

  return (
    <nav className="bg-[#020617]/80 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3 flex overflow-x-auto scrollbar-hide gap-2 sm:gap-4 shadow-sm z-20 sticky top-[73px] sm:top-[81px]">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setView(item.id)}
          className={`whitespace-nowrap flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 text-sm font-bold ${
            currentView === item.id 
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
              : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
          }`}
        >
          <i className={`fas ${item.icon} ${currentView === item.id ? 'text-white' : 'text-slate-400'}`}></i>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default NavigationMenu;
