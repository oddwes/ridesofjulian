import { useState, useRef, useEffect, ReactNode } from "react";
import dayjs from "dayjs";
import EditableLabel from 'react-inline-editing';
import { DatePicker } from "../workouts/DatePicker";

interface ModalProps {
  title: string;
  date?: string;
  onTitleChange?: (title: string) => void;
  onDateChange?: (date: string) => void;
  onClose: () => void;
  onSave?: () => void;
  onDelete?: () => Promise<void>;
  isSaving?: boolean;
  editableTitle?: boolean;
  showFooter?: boolean;
  showHeader?: boolean;
  children: ReactNode;
}

export const Modal = ({
  title,
  date,
  onTitleChange,
  onDateChange,
  onClose,
  onSave,
  onDelete,
  isSaving = false,
  editableTitle = false,
  showFooter = true,
  showHeader = true,
  children,
}: ModalProps) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [workoutTitle, setWorkoutTitle] = useState(title);
  const [selectedDate, setSelectedDate] = useState(date || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateContainerRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWorkoutTitle(title);
    if (date) {
      setSelectedDate(date);
    }
    setEditingTitle(false);
    setShowDatePicker(false);
  }, [title, date]);

  const handleDateClick = () => {
    setShowDatePicker(true);
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    onDateChange?.(newDate);
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalContentRef.current && !modalContentRef.current.contains(e.target as Node)) {
      if (!isSaving) {
        onClose();
      }
    }
  };

  const handleDelete = async () => {
    if (!onDelete || isSaving) return;
    try {
      await onDelete();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setWorkoutTitle(newTitle || 'Untitled Workout');
    onTitleChange?.(newTitle || 'Untitled Workout');
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-0 bg-black/50"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalContentRef}
        className="bg-slate-900 rounded-none md:rounded-lg w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] h-full md:h-auto flex flex-col text-gray-50"
        onClick={(e) => e.stopPropagation()}
      >
        {showHeader && (
          <div className="sticky top-0 px-6 py-4 z-10 flex justify-between items-start">
            <div className="flex-1">
              {editableTitle ? (
                <div onClick={() => !editingTitle && setEditingTitle(true)}>
                  <EditableLabel
                    key={title}
                    text={workoutTitle || title || 'Untitled Workout'}
                    labelClassName="text-xl font-semibold text-gray-50 cursor-pointer"
                    inputClassName="px-1 rounded text-xl font-semibold bg-slate-800 text-gray-50"
                    onFocus={() => setEditingTitle(true)}
                    onFocusOut={handleTitleChange}
                    isEditing={editingTitle}
                    labelPlaceHolder="Untitled Workout"
                  />
                </div>
              ) : (
                <h2 className="text-xl font-semibold">{workoutTitle || title || 'Untitled Workout'}</h2>
              )}
              {onDateChange && (
                <div className="mt-1 relative" ref={dateContainerRef}>
                  <p
                    onClick={handleDateClick}
                    className="text-sm cursor-pointer hover:text-blue-400 transition-colors"
                  >
                    {dayjs(selectedDate).format('dddd, MMMM D, YYYY')}
                  </p>
                  {showDatePicker && (
                    <DatePicker
                      value={selectedDate}
                      onChange={handleDateChange}
                      onClose={() => setShowDatePicker(false)}
                    />
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!showFooter && (
                <button
                  onClick={handleClose}
                  className="px-4 py-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-300"
                >
                  Close
                </button>
              )}
              {onDelete && (
                <button
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-4">
          {children}
        </div>
        {showFooter && (
          <div className="sticky bottom-0 px-6 py-4 flex justify-end items-center gap-3 z-10">
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            {onSave && (
              <button
                onClick={onSave}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

Modal.displayName = 'Modal';

