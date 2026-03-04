
import React, { useState, useMemo, useEffect } from 'react';
import CustomCalendar from './CustomCalendar';
import { AttendanceRecord, Group } from '../types';
import { GROUPS, COACHES, TIME_SLOTS } from '../constants';
import { getLocalISOString } from '../App';

interface ArchiveResult {
  date: string;
  day: string;
  timeSlot: string;
  coachName: string;
  roomName?: string;
  role?: string;
  form: string;
  group: string;
  name: string;
  status: string;
  notes: string;
}

interface ArchiveSearchProps {
  googleScriptUrl: string;
  attendance: AttendanceRecord[];
  spreadsheetId: string;
}

const TINGKATAN_MAP: Record<string, string> = {
  '1': 'SATU',
  '2': 'DUA',
  '3': 'TIGA',
  '4': 'EMPAT',
  '5': 'LIMA'
};

const ArchiveSearch: React.FC<ArchiveSearchProps> = ({ googleScriptUrl, attendance, spreadsheetId }) => {
  // Gunakan getLocalISOString() untuk memastikan tarikh awal adalah tarikh tempatan yang tepat
  const [searchDate, setSearchDate] = useState(getLocalISOString());
  const [filterGroup, setFilterGroup] = useState<Group | 'ALL'>('ALL');
  const [filterCoach, setFilterCoach] = useState<string | 'ALL'>('ALL');
  const [filterTime, setFilterTime] = useState<string | 'ALL'>('ALL');
  const [results, setResults] = useState<ArchiveResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'SUCCESS' | 'WARNING' | 'ERROR' }>({
    show: false,
    msg: '',
    type: 'SUCCESS'
  });

  const recordedDates = useMemo(() => {
    return new Set(attendance.map(a => a.date));
  }, [attendance]);

  const filteredResults = useMemo(() => {
    return results.filter(r => {
      const rGroup = (r.group || '').toString().trim().toUpperCase();
      const rCoach = (r.coachName || '').toString().trim().toUpperCase();
      const rTime = (r.timeSlot || '').toString().trim().toUpperCase();

      const matchesGroup = filterGroup === 'ALL' || rGroup === filterGroup.toUpperCase().trim();
      const matchesCoach = filterCoach === 'ALL' || rCoach === filterCoach.toUpperCase().trim();
      const matchesTime = filterTime === 'ALL' || rTime === filterTime.toUpperCase().trim();
      
      return matchesGroup && matchesCoach && matchesTime;
    });
  }, [results, filterGroup, filterCoach, filterTime]);

  const groupedResults = useMemo(() => {
    return filteredResults.reduce((acc, item) => {
      const groupName = item.group || 'TIADA KUMPULAN';
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(item);
      return acc;
    }, {} as Record<string, ArchiveResult[]>);
  }, [filteredResults]);

  const showNotification = (msg: string, type: 'SUCCESS' | 'WARNING' | 'ERROR') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  const handleSearch = async () => {
    if (!googleScriptUrl) {
      setErrorMsg("URL Skrip Google tidak dijumpai.");
      return;
    }
    setIsSearching(true);
    setHasSearched(false);
    setErrorMsg(null);
    setResults([]);
    
    try {
      const response = await fetch(googleScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'search_attendance', 
          spreadsheetId: spreadsheetId,
          targetDate: searchDate 
        }),
        redirect: 'follow'
      });
      
      if (!response.ok) throw new Error(`Ralat Pelayan: ${response.status}`);
      
      const responseText = await response.text();
      const trimmedText = responseText.trim();
      
      try {
        const data = JSON.parse(trimmedText);
        if (Array.isArray(data)) {
          if (data.length === 0) {
            showNotification("Tiada rekod ditemui di Google Sheets bagi tarikh ini.", 'WARNING');
          }
          setResults(data.map(item => ({
            ...item,
            group: item.group ? item.group.toString().trim() : "TIADA KUMPULAN",
            timeSlot: item.timeSlot ? item.timeSlot.toString().trim() : "TIADA MASA",
            coachName: (item.coachName && item.coachName !== "TIADA DATA") ? item.coachName.toString().trim() : "TIADA NAMA JURULATIH",
            roomName: (item.roomName && item.roomName !== "TIADA DATA") ? item.roomName.toString().trim() : "TIADA DATA BILIK"
          })));
        } else {
          setResults([]);
          setErrorMsg("Format data dari Cloud tidak sah.");
        }
      } catch (e) {
        console.error("JSON Parse Error:", trimmedText);
        setErrorMsg("Gagal memproses jawapan dari Cloud. Sila pastikan Apps Script telah dikemaskini.");
      }
    } catch (error: any) {
      if (error.message === 'Failed to fetch') {
        setErrorMsg("RALAT SAMBUNGAN: Gagal menghubungi Google Cloud. Sila pastikan Google Script anda telah 'Deployed' sebagai Web App dengan akses 'Anyone'.");
      } else {
        setErrorMsg(error.message || "Gagal menghubungi pelayan Google.");
      }
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  const handleDeleteArchive = async () => {
    window.alert("DEBUG: Butang DELETE diklik!");
    console.log("handleDeleteArchive triggered");
    
    if (isDeleting) {
      console.log("Already deleting, skipping...");
      return;
    }

    if (filteredResults.length === 0 || !googleScriptUrl) {
      showNotification("Tiada rekod untuk dipadam atau URL tidak sah.", "WARNING");
      return;
    }
    
    const timeSlotStr = filterTime === 'ALL' ? '' : filterTime;
    const groupStr = filterGroup === 'ALL' ? '' : filterGroup;
    const coachStr = filterCoach === 'ALL' ? '' : filterCoach;

    setIsDeleting(true);
    setErrorMsg(null);
    showNotification("Sedang memadam rekod daripada Cloud...", "SUCCESS");

    try {
      const payload = { 
        action: 'delete_attendance', 
        spreadsheetId: spreadsheetId,
        targetDate: searchDate,
        timeSlot: timeSlotStr,
        group: groupStr,
        coachName: coachStr,
        roomName: "" 
      };
      
      console.log("Sending delete payload:", payload);
      
      const response = await fetch(googleScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });

      if (!response.ok) throw new Error(`Ralat Pelayan: ${response.status}`);

      const responseText = await response.text();
      console.log("Delete response from Cloud:", responseText);
      const resUpper = responseText.toUpperCase();

      if (resUpper.includes("OK")) {
        showNotification("Berjaya memadam rekod daripada Cloud.", "SUCCESS");
        // Tunggu sekejap sebelum refresh untuk memberi masa Google Sheet memproses
        setTimeout(() => {
          handleSearch();
        }, 1000);
      } else if (resUpper.includes("ERROR")) {
        showNotification("Ralat Cloud: " + responseText, "ERROR");
        setErrorMsg(responseText);
      } else {
        showNotification("Respon tidak dijangka: " + responseText, "WARNING");
      }
    } catch (error: any) {
      console.error('Delete error details:', error);
      showNotification("Gagal memadam: " + error.message, "ERROR");
      if (error.message === 'Failed to fetch') {
        setErrorMsg("RALAT SAMBUNGAN: Sila pastikan Google Script dideploy sebagai 'Anyone'.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrintPDF = () => {
    if (filteredResults.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formattedDate = searchDate.split('-').reverse().join('-');
    const groupKeys = Object.keys(groupedResults).sort();
    let pagesHtml = '';

    groupKeys.forEach((groupName, pageIdx) => {
      const groupData = groupedResults[groupName];
      const firstRes = groupData[0];
      const numPart = firstRes?.form?.split(' ')[0] || '';
      const tingMain = TINGKATAN_MAP[numPart] || numPart || '-';
      const groupDisplayName = groupName.replace(/^\d+\s*/, '');
      
      const maleCount = groupData.filter(r => r.name.includes(' BIN ') || r.name.startsWith('MOHD ')).length;
      const femaleCount = groupData.length - maleCount;

      let rows = groupData.map((res, idx) => {
        const isMale = res.name.includes(' BIN ') || res.name.startsWith('MOHD ');
        const statusMark = (res.status === 'HADIR' || res.status === 'PRESENT' || res.status === 'Hadir') ? '/' : '';
        return `
          <tr>
            <td class="data-cell" style="text-align: center;">${idx + 1}</td>
            <td class="data-cell">${res.name}</td>
            <td class="data-cell" style="text-align: center;">${res.form}</td>
            <td class="data-cell" style="text-align: center;">${isMale ? 'L' : 'P'}</td>
            <td class="data-cell" style="text-align: center;">${statusMark}</td>
            <td class="data-cell">${res.notes || ''}</td>
          </tr>
        `;
      }).join('');

      for (let i = groupData.length; i < 22; i++) {
        rows += `<tr><td style="height: 25px;"></td><td></td><td></td><td></td><td></td><td></td></tr>`;
      }

      pagesHtml += `
        <div class="page-container">
          <div class="main-header grey-box">REKOD KEHADIRAN KELAS KESENIAN</div>
          <table class="info-table">
            <tr>
              <td class="grey-box" style="width: 15%;">KUMPULAN</td>
              <td style="width: 25%; font-weight: bold; text-align: center;">${groupDisplayName.toUpperCase()}</td>
              <td class="grey-box" style="width: 15%;">TINGKATAN</td>
              <td style="width: 15%; font-weight: bold; text-align: center;">${tingMain.toUpperCase()}</td>
              <td class="grey-box" style="width: 15%;">BILIK</td>
              <td style="width: 15%; font-weight: bold; text-align: center;">${(firstRes?.roomName || '-').toUpperCase()}</td>
            </tr>
          </table>
          <table class="data-table">
            <thead>
              <tr>
                <th rowspan="2" class="grey-box" style="width: 5%;">Bil</th>
                <th rowspan="2" class="grey-box" style="width: 45%;">Nama Murid</th>
                <th rowspan="2" class="grey-box" style="width: 15%;">Ting</th>
                <th colspan="2" class="grey-box" style="width: 15%;">Tarikh / Masa<br><span style="font-size: 8pt;">${formattedDate} / ${firstRes?.timeSlot || '-'}</span></th>
                <th rowspan="2" class="grey-box" style="width: 20%;">Laporan Disiplin / Catatan</th>
              </tr>
              <tr>
                <th class="grey-box" style="font-size: 8pt;">Jantina</th>
                <th class="grey-box" style="font-size: 8pt;">Kehadiran</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <table class="footer-table">
            <tr>
              <td class="grey-box" style="width: 20%;">Nama Jurulatih</td>
              <td style="width: 40%; font-weight: bold;">${firstRes?.coachName || '-'}</td>
              <td class="grey-box" style="width: 20%;">Tandatangan Jurulatih</td>
              <td style="width: 20%;"></td>
            </tr>
            <tr>
              <td class="grey-box dark-grey">Disemak Oleh: Ketua Bidang</td>
              <td class="dark-grey"></td>
              <td class="grey-box dark-grey">Tarikh</td>
              <td class="dark-grey"></td>
            </tr>
            <tr>
              <td class="grey-box" style="text-align: left; padding-left: 10px;">MURID LELAKI: ${maleCount} | MURID PEREMPUAN: ${femaleCount}</td>
              <td colspan="3" style="font-weight: bold;">JUMLAH: ${groupData.length} ORANG</td>
            </tr>
          </table>
        </div>
        ${pageIdx < groupKeys.length - 1 ? '<div class="page-break"></div>' : ''}
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>ARKIB - ${formattedDate}</title>
          <style>
            @media print { .page-break { page-break-after: always; } .grey-box { background-color: #d1d5db !important; -webkit-print-color-adjust: exact; } .dark-grey { background-color: #000 !important; color: #fff !important; } }
            body { font-family: 'Arial Narrow', sans-serif; font-size: 10pt; }
            .page-container { padding: 10mm; height: 270mm; }
            table { width: 100%; border-collapse: collapse; margin-bottom: -1px; }
            th, td { border: 1.5px solid black; padding: 4px; }
            .grey-box { background-color: #d1d5db; font-weight: bold; text-align: center; }
            .main-header { font-size: 12pt; font-weight: bold; padding: 10px; border: 1.5px solid black; text-align: center; }
            .data-cell { font-size: 9pt; font-weight: bold; text-transform: uppercase; }
          </style>
        </head>
        <body>${pagesHtml}<script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };</script></body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 relative">
      {/* Notifikasi Toast Dinamik */}
      {toast.show && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-bounce w-full max-w-md px-4">
          <div className={`
            px-8 py-5 rounded-2xl shadow-2xl flex items-center gap-4 border-2 
            ${toast.type === 'SUCCESS' ? 'bg-emerald-600 border-emerald-400 text-white' : 
              toast.type === 'WARNING' ? 'bg-amber-500 border-amber-300 text-slate-900' : 
              'bg-rose-600 border-rose-400 text-white'}
          `}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${toast.type === 'WARNING' ? 'bg-black/10' : 'bg-white/20'}`}>
              <i className={`fas ${toast.type === 'SUCCESS' ? 'fa-check-circle' : toast.type === 'WARNING' ? 'fa-exclamation-triangle' : 'fa-times-circle'} text-lg`}></i>
            </div>
            <span className="font-black text-xs uppercase tracking-wider leading-tight">{toast.msg}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
               <i className="fas fa-filter text-lg"></i>
             </div>
             <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Kriteria Carian Arkib</h3>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">1. Pilih Tarikh</label>
              <div className="flex justify-center mb-2">
                <CustomCalendar selectedDate={searchDate} onDateChange={(d) => setSearchDate(d)} recordedDates={recordedDates} />
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase text-center mb-4 px-4 leading-relaxed">
                <i className="fas fa-info-circle mr-1"></i> Titik biru menunjukkan data tempatan. Anda boleh mencari sebarang tarikh yang telah disimpan ke Cloud.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">2. Kumpulan Murid</label>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 text-xs appearance-none outline-none focus:ring-2 focus:ring-indigo-500" value={filterGroup} onChange={(e) => setFilterGroup(e.target.value as Group | 'ALL')}>
                  <option value="ALL">SEMUA KUMPULAN</option>
                  {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">3. Nama Jurulatih</label>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 text-xs appearance-none outline-none focus:ring-2 focus:ring-indigo-500" value={filterCoach} onChange={(e) => setFilterCoach(e.target.value)}>
                  <option value="ALL">SEMUA JURULATIH</option>
                  {COACHES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">4. Sesi / Masa</label>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 text-xs appearance-none outline-none focus:ring-2 focus:ring-indigo-500" value={filterTime} onChange={(e) => setFilterTime(e.target.value)}>
                  <option value="ALL">SEMUA MASA</option>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            
            <button onClick={handleSearch} disabled={isSearching} className={`w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3 ${isSearching ? 'opacity-70 active:scale-100' : 'active:scale-95'}`}>
              {isSearching ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
              {isSearching ? 'MENCARI DATA...' : 'CARIAN ARKIB'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-3 text-rose-700 animate-pulse">
              <i className="fas fa-exclamation-circle text-lg"></i>
              <p className="text-xs font-bold uppercase tracking-tight">{errorMsg}</p>
            </div>
          )}

          {!hasSearched ? (
            <div className="bg-white p-20 rounded-3xl shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center min-h-[500px]">
              <i className="fas fa-search-location text-5xl text-slate-200 mb-6 block"></i>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Sila buat carian arkib mengikut kriteria.</h3>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredResults.length > 0 && (
                <div className="bg-indigo-600 p-6 rounded-3xl shadow-xl flex justify-between items-center text-white">
                  <div className="flex items-center gap-5">
                    <i className="fas fa-database text-2xl"></i>
                    <div>
                       <h2 className="text-lg font-black uppercase">DATA DITEMUI</h2>
                       <p className="text-[10px] font-bold text-indigo-200 uppercase">{filteredResults.length} Rekod</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handlePrintPDF} className="bg-white text-indigo-600 px-5 py-3 rounded-2xl font-black text-[10px] uppercase">CETAK PDF</button>
                    <button 
                      onClick={() => { console.log("Button DELETE clicked"); handleDeleteArchive(); }} 
                      disabled={isDeleting} 
                      className={`bg-rose-600 hover:bg-rose-700 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 shadow-lg transition-all active:scale-95 ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isDeleting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash"></i>}
                      DELETE
                    </button>
                  </div>
                </div>
              )}

              {Object.keys(groupedResults).sort().map(groupName => {
                const groupData = groupedResults[groupName];
                const info = groupData[0];
                return (
                  <div key={groupName} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 bg-slate-50 border-b border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <h3 className="text-xs font-black text-indigo-600 uppercase tracking-tight">KUMPULAN: {groupName}</h3>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">JURULATIH: {info.coachName}</p>
                        </div>
                        <div className="space-y-1 md:text-right">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">BILIK: {info.roomName}</p>
                          <span className="text-[9px] bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-black uppercase">MASA: {info.timeSlot}</span>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-yellow-400 text-black text-[10px] font-bold uppercase">
                          <tr>
                            <th className="px-5 py-3 w-16 text-left">Bil</th>
                            <th className="px-5 py-3 text-left">Nama Murid</th>
                            <th className="px-5 py-3 text-center">Tingkatan</th>
                            <th className="px-5 py-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {groupData.map((res, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-5 py-3 text-[10px] font-bold text-slate-900">{idx + 1}</td>
                              <td className="px-5 py-3 text-[11px] font-bold text-slate-800 uppercase">{res.name}</td>
                              <td className="px-5 py-3 text-center text-[10px] font-bold text-slate-600 uppercase">{res.form}</td>
                              <td className="px-5 py-3 text-center">
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${res.status === 'HADIR' || res.status === 'PRESENT' || res.status === 'Hadir' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                  {res.status === 'PRESENT' || res.status === 'Hadir' || res.status === 'HADIR' ? 'HADIR' : 'TIDAK HADIR'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
              
              {hasSearched && results.length > 0 && filteredResults.length === 0 && !errorMsg && (
                <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center">
                  <i className="fas fa-filter text-4xl text-amber-400 mb-4 block"></i>
                  <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest mb-2">Tiada rekod sepadan dengan penapis anda.</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">Terdapat {results.length} rekod dalam pangkalan data bagi tarikh ini, tetapi tiada yang sepadan dengan kriteria Kumpulan/Jurulatih/Masa yang anda pilih.</p>
                  <button 
                    onClick={() => { setFilterGroup('ALL'); setFilterCoach('ALL'); setFilterTime('ALL'); }}
                    className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase transition-all"
                  >
                    Set Semula Penapis
                  </button>
                </div>
              )}

              {hasSearched && results.length === 0 && !errorMsg && (
                <div className="bg-white p-20 rounded-3xl shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center min-h-[300px]">
                  <i className="fas fa-info-circle text-4xl text-slate-200 mb-4 block"></i>
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Tiada rekod ditemui di Cloud bagi tarikh ini.</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Sila pastikan data telah disimpan (Sync) ke Google Sheets terlebih dahulu.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArchiveSearch;
