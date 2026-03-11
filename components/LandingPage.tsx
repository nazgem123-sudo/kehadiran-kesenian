import React, { useState, useEffect } from 'react';
import { View } from '../types';

interface LandingPageProps {
  setView: (view: View) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ setView }) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans relative overflow-hidden flex flex-col">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#0f172a]/40 via-[#020617] to-[#020617] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>

      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#020617]/50 backdrop-blur-md z-10">
        <div className="text-lg font-light tracking-wide text-slate-300">
          e-Portal Pengurusan <span className="font-bold text-white">Kesenian</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button className="text-white hover:text-blue-400 transition-colors">Utama</button>
          <button onClick={() => setView('DASHBOARD')} className="hover:text-blue-400 transition-colors">e-Kehadiran</button>
          <button onClick={() => setView('DATA_MURID')} className="hover:text-blue-400 transition-colors">Data Murid</button>
          <button onClick={() => setView('RINGKASAN')} className="hover:text-blue-400 transition-colors">Laporan</button>
          <button className="hover:text-blue-400 transition-colors"><i className="fas fa-search"></i></button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 lg:p-20 gap-12 z-10">
        
        {/* Left Section */}
        <div className="flex-1 flex flex-col items-start gap-6 max-w-3xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 overflow-hidden">
              <img 
                src="https://lh3.googleusercontent.com/d/13jrdaHv762fE0FbfyiyZ3UIrbLWOAsAT" 
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
            <div>
              <h2 className="text-sm font-bold tracking-widest text-slate-300">PROGRAM KESENIAN</h2>
              <p className="text-[10px] tracking-widest text-blue-400">DIGITAL HUB</p>
            </div>
            <div className="ml-auto lg:hidden flex items-center gap-2 text-xs font-mono text-blue-400 bg-blue-950/50 px-3 py-1 rounded-full border border-blue-900/50">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
              {time}
            </div>
          </div>

          <div className="inline-block px-3 py-1 rounded-full bg-blue-900/30 border border-blue-700/30 text-blue-300 text-xs font-bold tracking-widest mt-4">
            UNIT KESENIAN
          </div>

          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
            HAB DIGITAL <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
              PENGURUSAN KESENIAN
            </span>
          </h1>

          <p className="text-slate-400 text-lg max-w-xl leading-relaxed">
            Pusat sehenti pengurusan data, kehadiran, dan rekod murid berteraskan data raya untuk pembuat keputusan.
          </p>

          <button 
            onClick={() => setView('DASHBOARD')}
            className="mt-4 group relative px-8 py-4 bg-transparent border border-blue-500/50 rounded-xl overflow-hidden transition-all hover:border-blue-400 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)]"
          >
            <div className="absolute inset-0 bg-blue-600/10 group-hover:bg-blue-600/20 transition-colors"></div>
            <span className="relative flex items-center gap-3 text-sm font-bold tracking-widest text-blue-100">
              BUKA DASHBOARD UTAMA
              <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
            </span>
          </button>
        </div>

        {/* Right Section */}
        <div className="flex-1 w-full max-w-md relative mt-12 lg:mt-0">
          <div className="absolute top-0 right-0 hidden lg:flex items-center gap-2 text-sm font-mono text-blue-400 bg-blue-950/50 px-4 py-2 rounded-full border border-blue-900/50 -mt-20">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            {time}
          </div>

          <div className="relative bg-[#0f172a]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent rounded-3xl pointer-events-none"></div>
            
            <div className="relative w-32 h-32 rounded-full p-1 bg-gradient-to-b from-blue-400 to-indigo-600 mb-6 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-[#0f172a] bg-slate-800">
                <img src="https://lh3.googleusercontent.com/d/1hgJIiXWTxzG4HEhGMfXHdnxNAwott4ij" alt="Admin" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#0f172a] rounded-full flex items-center justify-center">
                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs">
                  <i className="fas fa-check"></i>
                </div>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-1">Ahmad Nazri bin Nordin</h3>
            <p className="text-slate-400 text-sm mb-8">Penyelaras Program</p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              SYSTEM AUTHORIZED
            </div>
          </div>
        </div>

      </main>

      {/* Bottom Bar */}
      <footer className="flex flex-wrap items-center justify-center lg:justify-start gap-4 p-6 border-t border-white/5 bg-[#020617]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-xs font-medium text-slate-300">
          <i className="fas fa-users text-blue-400"></i>
          Kapasiti <span className="text-white font-bold ml-2">Aktif</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-xs font-medium text-slate-300">
          <i className="fas fa-shield-alt text-purple-400"></i>
          Integriti Data <span className="text-white font-bold ml-2">100%</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-xs font-medium text-slate-300">
          <i className="fas fa-server text-emerald-400"></i>
          Sistem <span className="text-emerald-400 font-bold ml-2 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>Aktif</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
