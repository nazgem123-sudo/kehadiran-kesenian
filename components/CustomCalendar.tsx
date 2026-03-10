
import React, { useState, useMemo, useEffect } from 'react';
import { getLocalISOString } from '../App';

interface CustomCalendarProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  recordedDates: Set<string>;
  searchMode?: 'DAY' | 'MONTH';
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({ selectedDate, onDateChange, recordedDates, searchMode = 'DAY' }) => {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));

  useEffect(() => {
    const currentViewMonth = viewDate.getMonth();
    const currentViewYear = viewDate.getFullYear();
    const selected = new Date(selectedDate);
    
    if (selected.getMonth() !== currentViewMonth || selected.getFullYear() !== currentViewYear) {
      setViewDate(new Date(selected.getFullYear(), selected.getMonth(), 1));
    }
  }, [selectedDate]);

  const daysInMonth = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [viewDate]);

  const monthName = viewDate.toLocaleString('ms-MY', { month: 'long' });
  const year = viewDate.getFullYear();

  const handlePrevMonth = () => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    setViewDate(newDate);
    if (searchMode === 'MONTH') {
      onDateChange(getLocalISOString(newDate));
    }
  };

  const handleNextMonth = () => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    setViewDate(newDate);
    if (searchMode === 'MONTH') {
      onDateChange(getLocalISOString(newDate));
    }
  };

  const isToday = (date: Date) => {
    const todayStr = getLocalISOString();
    const dateStr = getLocalISOString(date);
    return todayStr === dateStr;
  };

  const isSelected = (date: Date) => {
    const dStr = getLocalISOString(date);
    if (searchMode === 'MONTH') {
      const selected = new Date(selectedDate);
      return date.getMonth() === selected.getMonth() && date.getFullYear() === selected.getFullYear();
    }
    return dStr === selectedDate;
  };

  const hasData = (date: Date) => {
    const dStr = getLocalISOString(date);
    return recordedDates.has(dStr);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-[32px] shadow-sm p-4 sm:p-6 w-full max-w-full sm:max-w-[340px] select-none mx-auto">
      <div className="flex justify-between items-center mb-6 px-1">
        <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
          {monthName} {year}
        </h4>
        <div className="flex gap-2">
          <button onClick={handlePrevMonth} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
            <i className="fas fa-chevron-left text-[10px] sm:text-xs"></i>
          </button>
          <button onClick={handleNextMonth} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
            <i className="fas fa-chevron-right text-[10px] sm:text-xs"></i>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {['A', 'I', 'S', 'R', 'K', 'J', 'S'].map((d, idx) => (
          <div key={`${d}-${idx}`} className="text-[10px] font-black text-slate-300 text-center py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1 sm:gap-y-2 gap-x-1">
        {daysInMonth.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} />;
          const selected = isSelected(date);
          const active = hasData(date);
          const today = isToday(date);
          return (
            <button
              key={idx}
              onClick={() => onDateChange(getLocalISOString(date))}
              className={`relative h-9 sm:h-11 flex flex-col items-center justify-center rounded-xl sm:rounded-2xl text-[12px] sm:text-[13px] transition-all 
                ${selected && searchMode === 'DAY' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 font-bold z-10' : ''} 
                ${selected && searchMode === 'MONTH' ? 'bg-indigo-100 text-indigo-700 font-bold' : ''} 
                ${!selected ? 'hover:bg-slate-50 text-slate-500' : ''} 
                ${today && !selected ? 'border border-indigo-100 bg-indigo-50/30' : ''}`}
            >
              <span className={`${active ? 'font-black text-slate-950' : 'font-medium'} ${selected && searchMode === 'DAY' ? 'text-white font-black' : ''} ${selected && searchMode === 'MONTH' ? 'text-indigo-700 font-black' : ''}`}>
                {date.getDate()}
              </span>
              {active && (
                <span className={`absolute bottom-1 w-1 h-1 rounded-full ${selected && searchMode === 'DAY' ? 'bg-white' : 'bg-indigo-600'}`}></span>
              )}
            </button>
          );
        })}
      </div>
      
      <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ada Rekod</span>
        </div>
        <button onClick={() => onDateChange(getLocalISOString())} className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Hari Ini</button>
      </div>
    </div>
  );
};

export default CustomCalendar;
