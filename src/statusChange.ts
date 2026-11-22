import { api } from './state';
import type { Appointment, AppointmentInput, Status } from './types';

/** Schimbă doar statusul unei programări (fără formularul de editare). Rămâne în istoric ca orice modificare. */
export function changeStatus(a: Appointment, status: Status): Promise<Appointment> {
  const { id, created_by: _c, updated_by: _u, created_at: _ca, updated_at: _ua, ...rest } = a;
  void _c; void _u; void _ca; void _ua;
  const input: AppointmentInput = { ...rest, status };
  return api.saveAppointment(id, input);
}
