
import React, { useState, useEffect, useCallback } from 'react';
import { View, Student, AttendanceRecord } from './types';
import { INITIAL_STUDENTS } from './constants';
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import AddStudent from './components/AddStudent';
import ImportStudent from './components/ImportStudent';
import Summary from './components/Summary';
import NavigationMenu from './components/NavigationMenu';
import Header from './components/Header';
import ArchiveSearch from './components/ArchiveSearch';
import LandingPage from './components/LandingPage';

export const getLocalISOString = (date: Date = new Date()) => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; 
};

// URL Deployment yang dikemaskini mengikut arahan pengguna
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyw2S0o9Y8Xp_W4lv3nlhkL5WKd0zwIRNVSEq9JTqdd97vmAJgawQrBHIvi6gGdg82SLQ/exec';
const SPREADSHEET_ID = '1Otr6yM4-Zx2ifK_s7Wd2ofu8pE05hN561zpqDM-RFCA';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('LANDING');
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string>('Data Berjaya Disimpan');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbyw2S0o9Y8Xp_W4lv3nlhkL5WKd0zwIRNVSEq9JTqdd97vmAJgawQrBHIvi6gGdg82SLQ/exec';
  const DEFAULT_SID = '1Otr6yM4-Zx2ifK_s7Wd2ofu8pE05hN561zpqDM-RFCA';

  const [googleScriptUrl, setGoogleScriptUrl] = useState<string>(() => {
    return localStorage.getItem('art_script_url') || DEFAULT_URL;
  });
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('art_spreadsheet_id') || DEFAULT_SID;
  });

  const resetSettings = () => {
    if (confirm('Reset tetapan sambungan ke nilai lalai?')) {
      setGoogleScriptUrl(DEFAULT_URL);
      setSpreadsheetId(DEFAULT_SID);
      notifyMessage('Tetapan telah set semula.', 'success');
    }
  };

  useEffect(() => {
    localStorage.setItem('art_script_url', googleScriptUrl);
  }, [googleScriptUrl]);

  useEffect(() => {
    localStorage.setItem('art_spreadsheet_id', spreadsheetId);
  }, [spreadsheetId]);
  
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('art_students');
    return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
  });
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('art_attendance');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[][]>([]);

  useEffect(() => {
    localStorage.setItem('art_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('art_attendance', JSON.stringify(attendance));
  }, [attendance]);

  const notifyMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  const syncToGoogleSheets = async (coachName: string, date: string, timeSlot: string, roomName: string) => {
    setIsSyncing(true);
    try {
      const filteredAttendance = attendance.filter(a => a.date === date && a.timeSlot === timeSlot);
      if (filteredAttendance.length === 0) {
        notifyMessage('Tiada data kehadiran untuk disimpan bagi sesi ini.', 'error');
        setIsSyncing(false);
        return;
      }
      
      const response = await fetch(googleScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'sync_attendance',
          spreadsheetId: spreadsheetId,
          targetDate: date,
          coachName: coachName,
          roomName: roomName,
          timeSlot: timeSlot,
          students: students,
          attendance: filteredAttendance
        }),
        redirect: 'follow'
      });
      
      const resText = await response.text();
      if (resText.toUpperCase().includes("OK")) {
        notifyMessage('Berjaya Simpan ke Google Sheets!', 'success');
      } else {
        notifyMessage('Data dihantar ke Cloud.', 'success');
      }
    } catch (error: any) {
      console.error('Error syncing:', error);
      if (error.message === 'Failed to fetch') {
        notifyMessage('RALAT SAMBUNGAN: Gagal menghubungi Google Sheets. Sila pastikan internet stabil dan URL betul.', 'error');
      } else {
        notifyMessage('Gagal menyambung ke Google Sheets: ' + error.message, 'error');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchAttendanceByDate = async (date: string) => {
    if (!date) return;
    try {
      const response = await fetch(googleScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'search_attendance', 
          spreadsheetId: spreadsheetId,
          targetDate: date 
        }),
        redirect: 'follow'
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        const newRecords: AttendanceRecord[] = [];
        data.forEach((item: any) => {
          const student = students.find(s => s.name.trim().toUpperCase() === item.name.trim().toUpperCase());
          if (student) {
            newRecords.push({
              studentId: student.id,
              date: item.date || date,
              status: (item.status === 'HADIR' || item.status === 'PRESENT' || item.status === 'Hadir') ? 'PRESENT' : 'ABSENT',
              timeSlot: item.timeSlot || 'N/A'
            });
          }
        });
        if (newRecords.length > 0) {
          setAttendance(prev => {
            const otherDates = prev.filter(a => a.date !== date);
            return [...otherDates, ...newRecords];
          });
          notifyMessage(`Data tarikh ${date.split('-').reverse().join('-')} dikemaskini.`, 'success');
        }
      }
    } catch (error: any) {
      console.error('Refresh error:', error);
      if (error.message === 'Failed to fetch') {
        notifyMessage('Ralat sambungan Cloud. Sila semak internet anda.', 'error');
      }
    }
  };

  const syncStudentsToCloud = async (updatedStudents: Student[]) => {
    try {
      const response = await fetch(googleScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'sync_students',
          spreadsheetId: spreadsheetId,
          students: updatedStudents
        }),
        redirect: 'follow'
      });
      const resText = await response.text();
      if (resText.toUpperCase().includes("OK")) {
        notifyMessage('Senarai Murid Disimpan ke Cloud!', 'success');
      } else {
        notifyMessage('Disimpan secara lokal (Gagal ke Cloud)', 'error');
      }
    } catch (error) {
      console.error('Error syncing students:', error);
      notifyMessage('Disimpan secara lokal (Gagal ke Cloud)', 'error');
    }
  };

  const fetchStudentsFromCloud = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(googleScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'get_students',
          spreadsheetId: spreadsheetId
        }),
        redirect: 'follow'
      });
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        setStudents(data);
        notifyMessage('Senarai Murid Dimuat Turun!', 'success');
      } else {
        notifyMessage('Tiada data murid di Cloud.', 'error');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      notifyMessage('Gagal memuat turun dari Cloud. Sila semak sambungan internet atau tetapan URL.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const addStudent = (newStudent: Omit<Student, 'id'>) => {
    const studentWithId = { ...newStudent, id: Date.now().toString() };
    const updated = [...students, studentWithId];
    setStudents(updated);
    syncStudentsToCloud(updated);
    notifyMessage('Menyimpan...', 'success');
    setCurrentView('DATA_MURID');
  };

  const updateStudent = (updatedStudent: Student) => {
    const updated = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
    setStudents(updated);
    syncStudentsToCloud(updated);
    notifyMessage('Mengemaskini...', 'success');
  };

  const importStudents = (newStudents: Student[]) => {
    const updated = [...students, ...newStudents];
    setStudents(updated);
    syncStudentsToCloud(updated);
    notifyMessage('Mengimport...', 'success');
    setCurrentView('DATA_MURID');
  };

  const updateAttendance = (studentId: string, date: string, status: 'PRESENT' | 'ABSENT', timeSlot: string) => {
    setAttendanceHistory(prev => [...prev.slice(-19), [...attendance]]);
    setAttendance(prev => {
      const filtered = prev.filter(a => !(a.studentId === studentId && a.date === date && a.timeSlot === timeSlot));
      return [...filtered, { studentId, date, status, timeSlot }];
    });
  };

  const bulkUpdateAttendance = (updates: { studentId: string; status: 'PRESENT' | 'ABSENT' }[], date: string, timeSlot: string) => {
    setAttendanceHistory(prev => [...prev.slice(-19), [...attendance]]);
    setAttendance(prev => {
      const studentIdsToUpdate = new Set(updates.map(u => u.studentId));
      const otherRecords = prev.filter(a => !(studentIdsToUpdate.has(a.studentId) && a.date === date && a.timeSlot === timeSlot));
      const newRecords = updates.map(u => ({ studentId: u.studentId, date, status: u.status, timeSlot }));
      return [...otherRecords, ...newRecords];
    });
  };

  const clearAttendance = (studentIds: string[], date: string, timeSlot: string) => {
    setAttendanceHistory(prev => [...prev.slice(-19), [...attendance]]);
    setAttendance(prev => prev.filter(a => !(studentIds.includes(a.studentId) && a.date === date && a.timeSlot === timeSlot)));
  };

  const clearAllAttendance = () => {
    if (confirm('ADAKAH ANDA PASTI? Storan aplikasi ini akan dikosongkan.')) {
      setAttendance([]);
      setAttendanceHistory([]);
      localStorage.removeItem('art_attendance');
      notifyMessage('Rekod kehadiran dikosongkan.', 'success');
    }
  };

  const undoAttendance = () => {
    if (attendanceHistory.length === 0) return;
    setAttendance(attendanceHistory[attendanceHistory.length - 1]);
    setAttendanceHistory(prev => prev.slice(0, -1));
  };

  const deleteStudent = (id: string) => {
    const updated = students.filter(s => s.id !== id);
    setStudents(updated);
    syncStudentsToCloud(updated);
    notifyMessage('Memadam...', 'success');
  };

  const updateStudentNotes = (id: string, notes: string) => {
    const updated = students.map(s => s.id === id ? { ...s, notes } : s);
    setStudents(updated);
    syncStudentsToCloud(updated);
  };

  const renderView = () => {
    switch (currentView) {
      case 'LANDING':
        return <LandingPage setView={setCurrentView} />;
      case 'DASHBOARD':
        return (
          <Dashboard 
            students={students} 
            attendance={attendance} 
            onMark={updateAttendance} 
            onBulkMark={bulkUpdateAttendance}
            onClear={clearAttendance}
            onUndo={undoAttendance}
            canUndo={attendanceHistory.length > 0}
            onUpdateStudent={updateStudent}
            onSave={syncToGoogleSheets}
            isSaving={isSyncing}
            onRefresh={fetchAttendanceByDate}
            notifyMessage={notifyMessage}
          />
        );
      case 'CARIAN_ARKIB':
        return <ArchiveSearch googleScriptUrl={googleScriptUrl} attendance={attendance} spreadsheetId={spreadsheetId} />;
      case 'DATA_MURID':
        return <StudentList students={students} onDelete={deleteStudent} onUpdateNotes={updateStudentNotes} onUpdateStudent={updateStudent} onFetchCloud={fetchStudentsFromCloud} isSyncing={isSyncing} />;
      case 'TAMBAH_MURID':
        return <AddStudent onAdd={addStudent} />;
      case 'IMPORT_MURID':
        return <ImportStudent onImport={importStudents} />;
      case 'RINGKASAN':
        return (
          <Summary 
            students={students} 
            attendance={attendance} 
            googleScriptUrl={googleScriptUrl}
            spreadsheetId={spreadsheetId}
            onImportCloudData={(newRecords) => {
              setAttendance(prev => {
                const existing = new Set(prev.map(p => `${p.studentId}-${p.date}-${p.timeSlot}`));
                const toAdd = newRecords.filter(n => !existing.has(`${n.studentId}-${n.date}-${n.timeSlot}`));
                return [...prev, ...toAdd];
              });
            }}
            onClearAll={clearAllAttendance}
          />
        );
      case 'MANUAL':
        return (
          <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3"><i className="fas fa-cog text-blue-600"></i>Konfigurasi & Manual</h2>
            
            <div className="space-y-8">
              <section className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <h3 className="text-blue-900 font-bold mb-4 flex items-center gap-2"><i className="fas fa-cloud"></i> Tetapan Sambungan Cloud</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Google Script URL (Web App URL)</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl font-bold text-slate-700 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      value={googleScriptUrl}
                      onChange={(e) => setGoogleScriptUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Spreadsheet ID</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl font-bold text-slate-700 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      value={spreadsheetId}
                      onChange={(e) => setSpreadsheetId(e.target.value)}
                      placeholder="Contoh: 1Otr6yM4-Zx2ifK_s7Wd2ofu8pE05hN561zpqDM-RFCA"
                    />
                  </div>
                  <p className="text-[10px] text-blue-600 font-bold italic">
                    * Perubahan akan disimpan secara automatik. Sila pastikan URL berakhir dengan "/exec".
                  </p>
                  <button 
                    onClick={resetSettings}
                    className="mt-2 text-[10px] font-black text-blue-700 hover:text-blue-900 underline uppercase tracking-widest"
                  >
                    Set Semula ke Nilai Lalai
                  </button>
                </div>
              </section>

              <section className="bg-rose-50 p-6 rounded-2xl border border-rose-100">
                <h3 className="text-rose-900 font-bold mb-4 flex items-center gap-2"><i className="fas fa-exclamation-triangle"></i> Masih Mendapat "Failed to fetch"?</h3>
                <div className="space-y-4 text-xs text-rose-800 font-medium">
                  <p>Ralat ini 99% berpunca daripada tetapan di Google Apps Script. Sila ikuti langkah ini dengan teliti:</p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Buka Editor Google Apps Script anda.</li>
                    <li>Klik butang biru <strong>Deploy</strong> di atas kanan.</li>
                    <li>Pilih <strong>New Deployment</strong>.</li>
                    <li>Klik ikon gear (Select type) dan pilih <strong>Web App</strong>.</li>
                    <li><strong>PENTING:</strong> Di bahagian "Who has access", pilih <strong>Anyone</strong>. (Jangan pilih "Only myself" atau "Anyone with Google account").</li>
                    <li>Klik <strong>Deploy</strong>.</li>
                    <li>Salin <strong>Web App URL</strong> yang baru dan tampal di kotak tetapan di atas.</li>
                  </ol>
                  <div className="bg-white/50 p-3 rounded-xl border border-rose-200 mt-4">
                    <p className="font-black uppercase text-[10px] mb-1">Kenapa "Anyone"?</p>
                    <p className="text-[10px] leading-relaxed">Tanpa tetapan "Anyone", Google akan menyekat permintaan daripada aplikasi ini (CORS error). Ini adalah langkah keselamatan standard Google untuk aplikasi web pihak ketiga.</p>
                  </div>
                </div>
              </section>

              <section className="bg-indigo-50 p-4 sm:p-6 rounded-2xl border border-indigo-100">
                <h3 className="text-indigo-900 font-bold mb-4 flex items-center gap-2 text-sm sm:text-base"><i className="fas fa-code"></i> SILA GANTI KOD APPS SCRIPT ANDA DENGAN KOD DI BAWAH (VERSI PEMADAMAN & CARIAN ROBUST):</h3>
                <pre className="bg-slate-900 text-slate-300 p-3 sm:p-4 rounded-xl text-[9px] sm:text-[10px] overflow-x-auto font-mono leading-relaxed">
{`function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.openById(params.spreadsheetId);
    var sheet = ss.getSheets()[0];
    
    // Fungsi utiliti untuk format tarikh yang selamat
    function formatDateSafe(val) {
      if (!val) return "";
      var d = new Date(val);
      if (isNaN(d.getTime())) return val.toString().trim();
      return Utilities.formatDate(d, "GMT+8", "yyyy-MM-dd");
    }
    
    if (params.action == 'sync_attendance') {
      var data = sheet.getDataRange().getValues();
      var targetDate = params.targetDate;
      var timeSlot = params.timeSlot;
      var roomName = params.roomName;

      var daysMalay = ['AHAD', 'ISNIN', 'SELASA', 'RABU', 'KHAMIS', 'JUMAAT', 'SABTU'];
      var dateObj = new Date(targetDate);
      var dayName = daysMalay[dateObj.getDay()];

      for (var i = data.length - 1; i >= 1; i--) {
        var rowDate = formatDateSafe(data[i][0]);
        var rowTime = (data[i][2] || "").toString().trim();
        var rowRoom = (data[i][10] || "").toString().trim();
        
        if (rowDate == targetDate && rowTime == timeSlot.toString().trim() && rowRoom == roomName.toString().trim()) {
          sheet.deleteRow(i + 1);
        }
      }

      params.attendance.forEach(function(rec) {
        var student = params.students.find(s => s.id === rec.studentId);
        if (student) {
          sheet.appendRow([
            targetDate,          
            dayName,             
            timeSlot,            
            params.coachName,    
            student.role || "MURID", 
            student.form,        
            student.group,       
            student.name,        
            rec.status === 'PRESENT' ? 'HADIR' : 'TIDAK HADIR', 
            student.notes || "", 
            roomName             
          ]);
        }
      });
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
    }

    if (params.action == 'search_attendance') {
      var data = sheet.getDataRange().getValues();
      var results = [];
      var searchDate = params.targetDate;
      var searchMonth = params.targetMonth; // e.g. "2026-03"
      
      for (var i = 1; i < data.length; i++) {
        var rowDate = formatDateSafe(data[i][0]);
        var match = false;
        
        if (searchMonth) {
          match = rowDate.indexOf(searchMonth) === 0;
        } else if (searchDate) {
          match = rowDate == searchDate;
        }
        
        if (match) {
          results.push({
            date: rowDate,
            day: (data[i][1] || "").toString().trim(),
            timeSlot: (data[i][2] || "").toString().trim(),
            coachName: (data[i][3] || "").toString().trim(),
            role: (data[i][4] || "").toString().trim(),
            form: (data[i][5] || "").toString().trim(),
            group: (data[i][6] || "").toString().trim(),
            name: (data[i][7] || "").toString().trim(),
            status: (data[i][8] || "").toString().trim(),
            notes: (data[i][9] || "").toString().trim(),
            roomName: (data[i][10] || "").toString().trim()
          });
        }
      }
      return ContentService.createTextOutput(JSON.stringify(results)).setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action == 'delete_attendance') {
      var data = sheet.getDataRange().getValues();
      var deletedCount = 0;
      var targetDate = params.targetDate;
      var targetMonth = params.targetMonth;
      
      for (var i = data.length - 1; i >= 1; i--) {
        var rowDate = formatDateSafe(data[i][0]);
        
        // Normalisasi data dari sheet untuk perbandingan yang tepat
        var rowTime = (data[i][2] || "").toString().trim().toUpperCase();
        var rowCoach = (data[i][3] || "").toString().trim().toUpperCase();
        var rowGroup = (data[i][6] || "").toString().trim().toUpperCase();
        var rowRoom = (data[i][10] || "").toString().trim().toUpperCase();
        
        var matchDate = false;
        if (targetMonth) {
          matchDate = rowDate.indexOf(targetMonth) === 0;
        } else if (targetDate) {
          matchDate = rowDate == targetDate;
        }
        
        var matchTime = (!params.timeSlot || params.timeSlot == "" || rowTime == params.timeSlot.toString().trim().toUpperCase());
        var matchRoom = (!params.roomName || params.roomName == "" || rowRoom == params.roomName.toString().trim().toUpperCase());
        var matchGroup = (!params.group || params.group == "" || rowGroup == params.group.toString().trim().toUpperCase());
        var matchCoach = (!params.coachName || params.coachName == "" || rowCoach == params.coachName.toString().trim().toUpperCase());
        
        if (matchDate && matchTime && matchRoom && matchGroup && matchCoach) {
          sheet.deleteRow(i + 1);
          deletedCount++;
        }
      }
      return ContentService.createTextOutput("OK: " + deletedCount + " rekod dipadam.").setMimeType(ContentService.MimeType.TEXT);
    }

    if (params.action == 'sync_students') {
      var studentSheet = ss.getSheetByName("Murid");
      if (!studentSheet) {
        studentSheet = ss.insertSheet("Murid");
      }
      studentSheet.clear();
      studentSheet.appendRow(["ID", "NAMA", "JANTINA", "KUMPULAN", "TINGKATAN", "BIDANG", "ROLE", "NOTA"]);
      
      if (params.students && params.students.length > 0) {
        var rows = params.students.map(function(s) {
          return [s.id, s.name, s.gender, s.group, s.form, s.field, s.role || "MURID", s.notes || ""];
        });
        studentSheet.getRange(2, 1, rows.length, 8).setValues(rows);
      }
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
    }

    if (params.action == 'get_students') {
      var studentSheet = ss.getSheetByName("Murid");
      if (!studentSheet) return ContentService.createTextOutput("[]").setMimeType(ContentService.MimeType.JSON);
      
      var data = studentSheet.getDataRange().getValues();
      var students = [];
      for (var i = 1; i < data.length; i++) {
        if (data[i][0]) {
          students.push({
            id: data[i][0].toString(),
            name: data[i][1].toString(),
            gender: data[i][2].toString(),
            group: data[i][3].toString(),
            form: data[i][4].toString(),
            field: data[i][5].toString(),
            role: data[i][6] ? data[i][6].toString() : "MURID",
            notes: data[i][7] ? data[i][7].toString() : ""
          });
        }
      }
      return ContentService.createTextOutput(JSON.stringify(students)).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput("ERROR: Action tidak dikenali").setMimeType(ContentService.MimeType.TEXT);
    
  } catch (err) {
    return ContentService.createTextOutput("ERROR: " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}`}
                </pre>
              </section>
            </div>
          </div>
        );
      default:
        return <Dashboard students={students} attendance={attendance} onMark={updateAttendance} onBulkMark={bulkUpdateAttendance} onClear={clearAttendance} onUndo={undoAttendance} canUndo={attendanceHistory.length > 0} onUpdateStudent={updateStudent} onSave={syncToGoogleSheets} isSaving={isSyncing} onRefresh={fetchAttendanceByDate} notifyMessage={notifyMessage} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#020617] font-sans text-slate-200 overflow-x-hidden relative">
      {currentView !== 'LANDING' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#0f172a]/40 via-[#020617] to-[#020617] pointer-events-none fixed"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none fixed"></div>
          <Header currentView={currentView} setView={setCurrentView} />
          <NavigationMenu currentView={currentView} setView={setCurrentView} />
        </>
      )}
      <main className={`flex-1 overflow-y-auto relative ${currentView === 'LANDING' ? '' : 'p-2 sm:p-4 md:p-8'}`}>
        {showToast && (
          <div className={`fixed top-20 right-4 sm:right-8 z-50 px-4 py-2 sm:px-6 sm:py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce ${toastType === 'error' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
            <i className={`fas ${toastType === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}`}></i>
            <span className="font-bold text-xs sm:text-sm">{toastMsg}</span>
          </div>
        )}
        <div className={currentView === 'LANDING' ? 'w-full h-full' : 'max-w-6xl mx-auto w-full'}>{renderView()}</div>
      </main>
    </div>
  );
};

export default App;
