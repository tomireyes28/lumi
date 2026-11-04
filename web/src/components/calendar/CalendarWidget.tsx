import { useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format } from 'date-fns';
import { motion, Variants } from 'framer-motion';
import { CalendarTransaction, CalendarReminder } from '@/types/calendar';

interface CalendarWidgetProps {
  date: Date;
  setDate: (date: Date) => void;
  onActiveMonthChange?: (date: Date) => void;
  transactions: CalendarTransaction[];
  reminders: CalendarReminder[];
  itemVariants: Variants;
}

const toCalendarDateKey = (isoDateString: string): string => {
  const datePart = String(isoDateString).split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }
  return format(new Date(isoDateString), 'yyyy-MM-dd');
};

export function CalendarWidget({
  date,
  setDate,
  onActiveMonthChange,
  transactions,
  reminders,
  itemVariants,
}: CalendarWidgetProps) {
  const transactionDates = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      if (t.date) {
        try {
          set.add(toCalendarDateKey(t.date));
        } catch {
          // Ignorar fechas con formato inválido
        }
      }
    }
    return set;
  }, [transactions]);

  const { pendingReminderDates, paidReminderDates } = useMemo(() => {
    const pending = new Set<string>();
    const paid = new Set<string>();
    for (const r of reminders) {
      if (r.dueDate) {
        try {
          const key = toCalendarDateKey(r.dueDate);
          if (r.isPaid) {
            paid.add(key);
          } else {
            pending.add(key);
          }
        } catch {
          // Ignorar fechas con formato inválido
        }
      }
    }
    return { pendingReminderDates: pending, paidReminderDates: paid };
  }, [reminders]);

  const renderTileContent = ({
    date: tileDate,
    view,
  }: {
    date: Date;
    view: string;
  }) => {
    if (view !== 'month') return null;

    const tileKey = format(tileDate, 'yyyy-MM-dd');
    const hasTransaction = transactionDates.has(tileKey);
    const hasPendingReminder = pendingReminderDates.has(tileKey);
    const hasPaidReminder = paidReminderDates.has(tileKey);

    if (!hasTransaction && !hasPendingReminder && !hasPaidReminder) return null;

    return (
      <div className="flex justify-center gap-1 mt-1 h-2">
        {hasTransaction && (
          <div className="w-1.5 h-1.5 rounded-full bg-sky-300" title="Movimiento" />
        )}
        {hasPendingReminder && (
          <div
            className="w-1.5 h-1.5 rounded-full bg-pink-400"
            title="Vencimiento pendiente"
          />
        )}
        {!hasPendingReminder && hasPaidReminder && (
          <div
            className="w-1.5 h-1.5 rounded-full bg-emerald-300"
            title="Vencimiento pagado"
          />
        )}
      </div>
    );
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .react-calendar {
          width: 100%;
          border: none;
          font-family: inherit;
          background: transparent;
        }
        .react-calendar__navigation button {
          color: #0F172A;
          font-weight: bold;
          font-size: 1.125rem;
          border-radius: 0.5rem;
        }
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          background-color: #f3f4f6;
        }
        abbr[title] {
          text-decoration: none;
          font-weight: 700;
          color: #9ca3af;
          font-size: 0.75rem;
          text-transform: uppercase;
        }
        .react-calendar__tile {
          padding: 0.75rem 0.5rem;
          border-radius: 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
          background-color: #f9fafb;
        }
        .react-calendar__tile--now {
          background: #fff1f2 !important;
          color: #F9A8D4;
          font-weight: bold;
        }
        .react-calendar__tile--active {
          background: #0F172A !important;
          color: white !important;
        }
      `,
        }}
      />

      <motion.div
        variants={itemVariants}
        className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100"
      >
        <Calendar
          onChange={(value) => setDate(value as Date)}
          onActiveStartDateChange={({ activeStartDate }) => {
            if (activeStartDate && onActiveMonthChange) {
              onActiveMonthChange(activeStartDate);
            }
          }}
          value={date}
          tileContent={renderTileContent}
          minDetail="year"
          next2Label={null}
          prev2Label={null}
        />
      </motion.div>
    </>
  );
}
