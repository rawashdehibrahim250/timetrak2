import React from 'react';
import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export default function DateRangePicker({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange 
}: DateRangePickerProps) {
  return (
    <div className="flex items-center space-x-2">
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Calendar className="w-4 h-4 text-gray-500" />
        </div>
        <input
          type="date"
          className="glass-input text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
          placeholder="Start date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
        />
      </div>
      <span className="text-gray-500">to</span>
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Calendar className="w-4 h-4 text-gray-500" />
        </div>
        <input
          type="date"
          className="glass-input text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
          placeholder="End date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
        />
      </div>
    </div>
  );
} 