
import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord, Field, Form, Group, Gender, Coach } from '../types';
import { FIELDS, FORMS, GROUPS, GENDERS, COACHES, ROOMS, TIME_SLOTS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import CustomCalendar from './CustomCalendar';
import { getLocalISOString } from '../App';

interface DashboardProps {
  students: Student[];
  attendance: AttendanceRecord[];
  onMark: (studentId: string, date: string, status: 'PRESENT' | 'ABSENT', timeSlot: string) => void;
  onBulkMark: (updates: { studentId: string; status: 'PRESENT' | 'ABSENT' }[], date: string, timeSlot: string) => void;
  onClear: (studentIds: string[], date: string, timeSlot: string) => void;
  onUndo: () => void;
  canUndo: boolean;
  onUpdateStudent: (student: Student) => void;
  onSave: (coachName: string, date: string, timeSlot: string, roomName: string) => void;
  isSaving: boolean;
  onRefresh?: (date: string) => Promise<void>;
  notifyMessage?: (msg: string, type: 'success' | 'error') => void;
}

const FIELD_COLORS: Record<string, string> = {
  'MUZIK': '#ef4444',
  'VISUAL': '#facc15',
  'TARI': '#22c55e',
  'TEATER': '#3b82f6'
};

const TINGKATAN_MAP: Record<string, string> = {
  '1': 'SATU',
  '2': 'DUA',
  '3': 'TIGA',
  '4': 'EMPAT',
  '5': 'LIMA'
};

const Dashboard: React.FC<DashboardProps> = ({ 
  students, 
  attendance, 
  onMark, 
  onBulkMark, 
  onClear,
  onUndo, 
  canUndo, 
  onUpdateStudent,
  onSave,
  isSaving,
  onRefresh,
  notifyMessage
}) => {
  const [selectedDate, setSelectedDate] = useState(getLocalISOString());
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[0]);
  const [selectedCoach, setSelectedCoach] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [filterField, setFilterField] = useState<Field | 'ALL'>('ALL');
  const [filterForm, setFilterForm] = useState<Form | 'ALL'>('ALL');
  const [filterGroup, setFilterGroup] = useState<Group | 'ALL'>('ALL');
  const [searchName, setSearchName] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const recordedDates = useMemo(() => {
    const dates = new Set<string>();
    attendance.forEach(record => { if (record.date) dates.add(record.date); });
    return dates;
  }, [attendance]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesField = filterField === 'ALL' || s.field === filterField;
      const matchesForm = filterForm === 'ALL' || s.form === filterForm;
      const matchesGroup = filterGroup === 'ALL' || s.group === filterGroup;
      const matchesName = s.name.toLowerCase().includes(searchName.toLowerCase());
      return matchesField && matchesForm && matchesGroup && matchesName;
    }).sort((a, b) => {
      if (a.gender !== b.gender) return a.gender.localeCompare(b.gender);
      return a.name.localeCompare(b.name);
    });
  }, [students, filterField, filterForm, filterGroup, searchName]);

  const stats = useMemo(() => {
    const filteredIds = new Set(filteredStudents.map(s => s.id));
    const todayAttendance = attendance.filter(a => a.date === selectedDate && a.timeSlot === selectedTime && filteredIds.has(a.studentId));
    const presentCount = todayAttendance.filter(a => a.status === 'PRESENT').length;
    const totalInView = filteredStudents.length;
    const rate = totalInView > 0 ? (presentCount / totalInView) * 100 : 0;
    const fieldStats = FIELDS.map(field => {
      const fieldStudents = filteredStudents.filter(s => s.field === field);
      return { 
        name: field, 
        Lelaki: fieldStudents.filter(s => s.gender === 'LELAKI').length,
        Perempuan: fieldStudents.filter(s => s.gender === 'PEREMPUAN').length
      };
    });
    return { presentCount, rate, fieldStats, totalInView };
  }, [attendance, filteredStudents, selectedDate, selectedTime]);

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const groupLabel = filterGroup === 'ALL' ? 'SEMUA' : filterGroup.replace(/^\d+\s*/, '');
    let tingkatLabel = 'SEMUA';
    if (filterForm !== 'ALL') {
      const num = filterForm.split(' ')[0];
      tingkatLabel = TINGKATAN_MAP[num] || num;
    } else if (filteredStudents.length > 0) {
      const forms = new Set<string>(filteredStudents.map(s => s.form.split(' ')[0]));
      if (forms.size === 1) {
        const num = Array.from(forms)[0] as string;
        tingkatLabel = TINGKATAN_MAP[num] || num;
      }
    }
    const formattedDate = selectedDate.split('-').reverse().join('-');
    const maleCount = filteredStudents.filter(s => s.gender === 'LELAKI').length;
    const femaleCount = filteredStudents.filter(s => s.gender === 'PEREMPUAN').length;
    let tableRows = filteredStudents.map((s, idx) => {
      const record = attendance.find(a => a.studentId === s.id && a.date === selectedDate && a.timeSlot === selectedTime);
      return `<tr><td class="data-cell" style="text-align: center;">${idx + 1}</td><td class="data-cell">${s.name}</td><td class="data-cell" style="text-align: center;">${s.form}</td><td class="data-cell" style="text-align: center;">${s.gender === 'LELAKI' ? 'L' : 'P'}</td><td class="data-cell" style="text-align: center;">${record?.status === 'PRESENT' ? '/' : ''}</td><td class="data-cell">${s.notes || ''}</td></tr>`;
    }).join('');
    const minRows = 25;
    if (filteredStudents.length < minRows) {
      for (let i = filteredStudents.length; i < minRows; i++) {
        tableRows += `<tr><td style="height: 24px;"></td><td></td><td></td><td></td><td></td><td></td></tr>`;
      }
    }
    printWindow.document.write(`<html><head><title>REKOD KEHADIRAN - ${formattedDate}</title><style>@media print { body { margin: 0; padding: 10mm; } @page { size: A4; margin: 0mm; } .grey-box { background-color: #d1d5db !important; -webkit-print-color-adjust: exact; } .dark-grey { background-color: #000 !important; color: #fff !important; } } body { font-family: 'Arial Narrow', Arial, sans-serif; color: #000; line-height: 1.2; font-size: 10pt; } table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: -1.5px; } th, td { border: 1.5px solid black; padding: 4px; } .grey-box { background-color: #d1d5db; font-weight: bold; text-align: center; } .data-cell { font-size: 9pt; font-weight: bold; text-transform: uppercase; } .header-title { text-align: center; font-size: 12pt; font-weight: bold; padding: 10px; border: 1.5px solid black; }</style></head><body><div class="header-title grey-box">REKOD KEHADIRAN KELAS KESENIAN</div><table><tr><td class="grey-box" style="width: 15%;">KUMPULAN</td><td style="width: 25%; text-align: center; font-weight: bold;">${groupLabel.toUpperCase()}</td><td class="grey-box" style="width: 15%;">TINGKATAN</td><td style="width: 15%; text-align: center; font-weight: bold;">${tingkatLabel.toUpperCase()}</td><td class="grey-box" style="width: 10%;">BILIK</td><td style="width: 20%; text-align: center; font-weight: bold;">${(selectedRoom || '-').toUpperCase()}</td></tr></table><table><thead><tr><th rowspan="2" class="grey-box" style="width: 5%;">Bil</th><th rowspan="2" class="grey-box" style="width: 45%;">Nama Murid</th><th rowspan="2" class="grey-box" style="width: 15%;">Ting</th><th colspan="2" class="grey-box" style="width: 15%;">Tarikh / Masa<br>${formattedDate} / ${selectedTime}</th><th rowspan="2" class="grey-box" style="width: 20%;">Laporan Disiplin / Catatan</th></tr><tr><th class="grey-box" style="font-size: 7pt;">Jantina</th><th class="grey-box" style="font-size: 7pt;">Kehadiran</th></tr></thead><tbody>${tableRows}</tbody></table><table><tr><td class="grey-box" style="width: 20%;">Nama Jurulatih</td><td style="width: 40%; font-weight: bold;">${selectedCoach || '-'}</td><td class="grey-box" style="width: 20%;">Tandatangan Jurulatih</td><td style="width: 20%;"></td></tr><tr><td class="grey-box">Kelas lewat di keluarkan</td><td colspan="3"></td></tr><tr><td class="grey-box dark-grey">Disemak Oleh: Ketua Bidang</td><td class="dark-grey"></td><td class="grey-box dark-grey">Tarikh</td><td class="dark-grey"></td></tr><tr><td class="grey-box" style="text-align: left; padding-left: 10px;">MURID LELAKI</td><td colspan="3" style="font-weight: bold;">${maleCount} ORANG</td></tr><tr><td class="grey-box" style="text-align: left; padding-left: 10px;">MURID PEREMPUAN</td><td colspan="3" style="font-weight: bold;">${femaleCount} ORANG</td></tr></table><script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };</script></body></html>`);
    printWindow.document.close();
  };

  const handleSaveClick = () => {
    if (!selectedCoach) {
      if (notifyMessage) {
        notifyMessage("SILA PILIH NAMA JURULATIH TERLEBIH DAHULU SEBELUM SIMPAN.", "error");
      } else {
        alert("SILA PILIH NAMA JURULATIH TERLEBIH DAHULU SEBELUM SIMPAN.");
      }
      return;
    }
    if (!selectedRoom) {
      if (notifyMessage) {
        notifyMessage("SILA PILIH NAMA BILIK TERLEBIH DAHULU SEBELUM SIMPAN.", "error");
      } else {
        alert("SILA PILIH NAMA BILIK TERLEBIH DAHULU SEBELUM SIMPAN.");
      }
      return;
    }
    onSave(selectedCoach, selectedDate, selectedTime, selectedRoom);
  };

  const handleRefreshClick = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh(selectedDate);
      setIsRefreshing(false);
    }
  };

  const handleMarkAllPresent = () => {
    if (filteredStudents.length === 0) return;
    const updates = filteredStudents.map(s => ({ studentId: s.id, status: 'PRESENT' as const }));
    onBulkMark(updates, selectedDate, selectedTime);
  };

  const handleResetSelection = () => {
    if (filteredStudents.length === 0) return;
    const ids = filteredStudents.map(s => s.id);
    onClear(ids, selectedDate, selectedTime);
  };

  const handleDeleteRecord = () => {
    if (filteredStudents.length === 0) return;
    const dateFormatted = selectedDate.split('-').reverse().join('-');
    if (confirm(`PADAM REKOD SESI?\n\nRekod kehadiran bagi tarikh ${dateFormatted} dan sesi ${selectedTime} untuk murid-murid dalam senarai ini akan dikosongkan.`)) {
      const ids = filteredStudents.map(s => s.id);
      onClear(ids, selectedDate, selectedTime);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      onUpdateStudent(editingStudent);
      setEditingStudent(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="order-2 lg:order-1 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <StatCard icon="fa-users" label="Murid (Tapis)" value={stats.totalInView} bgColor="bg-blue-100" textColor="text-blue-600" />
        <StatCard icon="fa-calendar-check" label="Hadir (Sesi Ini)" value={stats.presentCount} bgColor="bg-emerald-100" textColor="text-emerald-600" />
        <StatCard icon="fa-percentage" label="Kadar Sesi" value={`${stats.rate.toFixed(1)}%`} bgColor="bg-blue-600" textColor="text-white" />
      </div>

      <div className="order-1 lg:order-2 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-6 flex items-center gap-2">
              <i className="fas fa-calendar-alt text-indigo-600"></i>
              Pemilihan Tarikh
            </h3>
            <div className="flex justify-center w-full">
              <CustomCalendar selectedDate={selectedDate} onDateChange={(d) => setSelectedDate(d)} recordedDates={recordedDates} />
            </div>
          </div>
          <div className="hidden lg:block bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <i className="fas fa-chart-bar text-blue-600"></i>
              Statistik Bidang (Jantina)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.fieldStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 9, fontWeight: 'bold', fill: '#64748b'}} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 9, fill: '#94a3b8'}}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }} 
                    cursor={{ fill: '#f8fafc' }} 
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle" 
                    wrapperStyle={{ fontSize: '10px', paddingBottom: '15px', fontWeight: 'bold' }} 
                  />
                  <Bar dataKey="Lelaki" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="Perempuan" fill="#db2777" radius={[4, 4, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-bold text-slate-800">Tanda Kehadiran</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-black uppercase">Masa:</span>
                <select className="px-2 py-1.5 border rounded-lg text-[10px] bg-emerald-50 border-emerald-100 font-bold text-emerald-800 outline-none" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)}>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleDeleteRecord} className="flex-1 sm:flex-none px-3 py-2 bg-rose-600 text-white text-[9px] font-black rounded-lg flex items-center justify-center gap-1.5"><i className="fas fa-trash-alt"></i>DELETE</button>
              <button onClick={handleResetSelection} className="flex-1 sm:flex-none px-3 py-2 bg-amber-500 text-white text-[9px] font-black rounded-lg flex items-center justify-center gap-1.5"><i className="fas fa-undo"></i>RESET</button>
              <button onClick={handleMarkAllPresent} className="flex-1 sm:flex-none px-3 py-2 bg-emerald-600 text-white text-[9px] font-black rounded-lg flex items-center justify-center gap-1.5"><i className="fas fa-check-double"></i>HADIR SEMUA</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input type="text" placeholder="Cari nama..." className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-blue-500 font-semibold outline-none" value={searchName} onChange={(e) => setSearchName(e.target.value)} />
            </div>
            <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 appearance-none outline-none" value={filterField} onChange={(e) => setFilterField(e.target.value as Field | 'ALL')}>
              <option value="ALL">SEMUA BIDANG</option>
              {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 appearance-none outline-none" value={filterForm} onChange={(e) => setFilterForm(e.target.value as Form | 'ALL')}>
              <option value="ALL">SEMUA KELAS</option>
              {FORMS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 appearance-none outline-none" value={filterGroup} onChange={(e) => setFilterGroup(e.target.value as Group | 'ALL')}>
              <option value="ALL">SEMUA KUMPULAN</option>
              {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <select className={`px-3 py-2 border rounded-xl text-[11px] font-bold appearance-none outline-none transition-all ${!selectedCoach ? 'bg-amber-50 border-amber-200 text-amber-700 ring-2 ring-amber-500 animate-pulse' : 'bg-blue-50 border-blue-100 text-blue-800'}`} value={selectedCoach} onChange={(e) => setSelectedCoach(e.target.value)}>
              <option value="">Wajib Pilih Jurulatih</option>
              {COACHES.map(coach => <option key={coach.name} value={coach.name}>{coach.name}</option>)}
            </select>
            <select className={`px-3 py-2 border rounded-xl text-[11px] font-bold appearance-none outline-none transition-all ${!selectedRoom ? 'bg-amber-50 border-amber-200 text-amber-700 ring-2 ring-amber-500 animate-pulse' : 'bg-indigo-50 border-indigo-100 text-indigo-800'}`} value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}>
              <option value="">Wajib Pilih Nama Bilik</option>
              {ROOMS.map(room => <option key={room} value={room}>{room}</option>)}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[450px] sm:max-h-[500px] border border-slate-100 rounded-xl divide-y scrollbar-hide">
            {filteredStudents.length > 0 ? filteredStudents.map(student => {
              const record = attendance.find(a => a.studentId === student.id && a.date === selectedDate && a.timeSlot === selectedTime);
              return (
                <div key={student.id} className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-slate-50 transition-colors gap-2 sm:gap-3">
                  <div className="flex-1">
                    <button onClick={() => setEditingStudent(student)} className="text-[13px] font-bold text-slate-800 text-left hover:text-blue-600">{student.name}</button>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${student.gender === 'LELAKI' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>{student.gender}</span>
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">{student.group}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => onMark(student.id, selectedDate, 'PRESENT', selectedTime)} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black transition-all border-2 ${record?.status === 'PRESENT' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-emerald-600 border-emerald-100'}`}>HADIR</button>
                    <button onClick={() => onMark(student.id, selectedDate, 'ABSENT', selectedTime)} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black transition-all border-2 ${record?.status === 'ABSENT' ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-rose-600 border-rose-100'}`}>T. HADIR</button>
                  </div>
                </div>
              );
            }) : <div className="p-12 text-center text-slate-400 text-[11px] italic">Tiada murid ditemui.</div>}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-4">
            <div className="flex justify-between items-center px-1">
              <span className="text-[9px] text-slate-400 font-black uppercase">Sesi: {selectedTime} | Bilik: {selectedRoom || '-'}</span>
              <span className="text-[9px] text-slate-400 font-black uppercase">{filteredStudents.length} Murid</span>
            </div>
            <div className="grid grid-cols-1 sm:flex sm:justify-end gap-2">
              <button onClick={handlePrintPDF} className="w-full sm:w-auto px-5 py-3 bg-slate-800 text-white font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-2"><i className="fas fa-print"></i>CETAK PDF</button>
              <button onClick={handleRefreshClick} disabled={isRefreshing} className="w-full sm:w-auto px-5 py-3 bg-slate-600 text-white font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-2">{isRefreshing ? <i className="fas fa-sync-alt fa-spin"></i> : <i className="fas fa-sync-alt"></i>}REFRESH</button>
              <button onClick={handleSaveClick} disabled={isSaving} className={`w-full sm:w-auto px-8 py-3 font-black rounded-xl shadow-lg transition-all uppercase tracking-wider text-[10px] flex items-center justify-center gap-2 ${isSaving ? 'bg-slate-400 text-slate-200' : 'bg-indigo-600 text-white'}`}>{isSaving ? <><i className="fas fa-spinner fa-spin"></i>SIMPAN...</> : <><i className="fas fa-save"></i>SIMPAN</>}</button>
            </div>
          </div>
        </div>
      </div>
      {editingStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Edit Murid</h3>
              <button onClick={() => setEditingStudent(null)} className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400"><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 sm:p-8 space-y-4 sm:space-y-6">
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-2">Nama Penuh</label>
                <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800" value={editingStudent.name} onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value.toUpperCase() })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-2">Jantina</label>
                  <select className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-700 bg-slate-50 text-xs sm:text-sm" value={editingStudent.gender} onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value as Gender })}>{GENDERS.map(g => <option key={g} value={g}>{g}</option>)}</select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-2">Kumpulan</label>
                  <select className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-700 bg-slate-50 text-xs sm:text-sm" value={editingStudent.group} onChange={(e) => setEditingStudent({ ...editingStudent, group: e.target.value })}>{GROUPS.map(g => <option key={g} value={g}>{g}</option>)}</select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-2">Tingkatan</label>
                  <select className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-700 bg-slate-50 text-xs sm:text-sm" value={editingStudent.form} onChange={(e) => setEditingStudent({ ...editingStudent, form: e.target.value as Form })}>{FORMS.map(f => <option key={f} value={f}>{f}</option>)}</select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-2">Bidang</label>
                  <select className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-700 bg-slate-50 text-xs sm:text-sm" value={editingStudent.field} onChange={(e) => setEditingStudent({ ...editingStudent, field: e.target.value as Field })}>{FIELDS.map(f => <option key={f} value={f}>{f}</option>)}</select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingStudent(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-black rounded-xl text-[10px] uppercase tracking-widest">Batal</button>
                <button type="submit" className="flex-[2] py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg text-[10px] uppercase tracking-widest">Kemaskini</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, bgColor, textColor }: any) => (
  <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 ${bgColor} rounded-xl flex items-center justify-center ${textColor}`}>
        <i className={`fas ${icon} text-lg sm:text-xl`}></i>
      </div>
      <div>
        <p className="text-[10px] sm:text-sm font-medium text-slate-500">{label}</p>
        <h3 className="text-xl sm:text-2xl font-bold text-slate-800 leading-tight">{value}</h3>
      </div>
    </div>
  </div>
);

export default Dashboard;
