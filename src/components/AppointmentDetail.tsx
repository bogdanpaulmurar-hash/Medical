import { useEffect, useRef } from 'react';
import { fmtDateTime, fmtTime, locale, useApp } from '../state';
import { statusLabels } from '../i18n';
import type { Appointment } from '../types';
import { AuditList } from './History';

interface Props {
  appointment: Appointment;
  onClose: () => void;
  onEdit: () => void;
}

/** Vizualizare doar-citire. Modificarea se face doar apăsând „Editează”. */
export function AppointmentDetail({ appointment: a, onClose, onEdit }: Props) {
  const { t, prefs, procedures, rooms, cabinets, profiles } = useApp();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const proc = procedures.find((p) => p.id === a.procedure_id);
  const room = rooms.find((r) => r.id === a.room_id);
  const cab = room && cabinets.find((c) => c.id === room.cabinet_id);
  const person = (id: string | null) => profiles.find((p) => p.id === id)?.full_name || '—';
  const minutes = Math.round((new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60000);
  const day = new Date(a.starts_at).toLocaleDateString(locale(prefs.lang), {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="kv">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );

  return (
    <dialog ref={ref} className="modal" onClose={onClose} aria-labelledby="detail-title">
      <div className="form">
        <header className="modal-head">
          <div>
            <p className="muted small" style={{ margin: 0 }}>{t('appointmentDetails')}</p>
            <h2 id="detail-title">{proc?.name ?? '?'}</h2>
          </div>
          <button type="button" className="ghost" onClick={onClose} aria-label={t('close')}>
            ✕
          </button>
        </header>

        <div className="detail-top">
          <span className={`badge badge-${a.status}`}>{statusLabels[prefs.lang][a.status]}</span>
          <span className="detail-when">
            <strong style={{ textTransform: 'capitalize' }}>{day}</strong>
            <br />
            {fmtTime(a.starts_at, prefs.lang)}–{fmtTime(a.ends_at, prefs.lang)} · {minutes} {t('minutesShort')}
          </span>
        </div>

        <dl className="kvs">
          <Row label={t('patient')}>
            <strong>{a.patient_code}</strong> · {a.patient_initials}
          </Row>
          {a.patient_name && <Row label={t('patientName').replace(/ \(.*\)/, '')}>{a.patient_name}</Row>}
          {a.diagnosis && <Row label={t('diagnosis').replace(/ \(.*\)/, '')}>{a.diagnosis}</Row>}
          {a.notes && <Row label={t('notes').replace(/ \(.*\)/, '')}><span style={{ whiteSpace: 'pre-wrap' }}>{a.notes}</span></Row>}
          <Row label={t('room')}>
            {cab?.name} / {room?.name}
          </Row>
          <Row label={t('attending')}>{person(a.attending_id)}</Row>
          <Row label={t('receiving')}>{a.receiving_id ? person(a.receiving_id) : '—'}</Row>
          <Row label={t('createdAt')}>
            {fmtDateTime(a.created_at, prefs.lang)} · {person(a.created_by)}
          </Row>
          <Row label={t('updatedAt')}>
            {fmtDateTime(a.updated_at, prefs.lang)} · {person(a.updated_by)}
          </Row>
        </dl>

        <footer className="modal-foot">
          <span className="push-right" />
          <button type="button" className="secondary" onClick={onClose}>
            {t('close')}
          </button>
          <button type="button" className="primary" onClick={onEdit}>
            ✎ {t('edit')}
          </button>
        </footer>

        <section aria-labelledby="hist-title">
          <h3 id="hist-title">{t('historyTitle')}</h3>
          <AuditList recordId={a.id} refreshKey={a.updated_at} />
        </section>
      </div>
    </dialog>
  );
}
