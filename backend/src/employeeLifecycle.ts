import { db } from "./db.js";

export function deleteEmployeeAndHandleFutureSlots(input: {
  companyId: string;
  employeeId: string;
  deleteFutureSlots: boolean;
  nowIso?: string;
}) {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const deleteEmployeeTx = db.transaction(() => {
    if (input.deleteFutureSlots) {
      db.prepare(
        `DELETE FROM bookings
         WHERE slot_id IN (
           SELECT id FROM slots
           WHERE company_id = ? AND employee_id = ? AND end_at >= ?
         )`
      ).run(input.companyId, input.employeeId, nowIso);
      db.prepare("DELETE FROM slots WHERE company_id = ? AND employee_id = ? AND end_at >= ?").run(
        input.companyId,
        input.employeeId,
        nowIso
      );
    }
    db.prepare("UPDATE slots SET employee_id = NULL WHERE company_id = ? AND employee_id = ? AND end_at >= ?").run(
      input.companyId,
      input.employeeId,
      nowIso
    );
    db.prepare("DELETE FROM employee_directions WHERE employee_id = ?").run(input.employeeId);
    db.prepare("UPDATE employees SET deleted_at = ? WHERE id = ?").run(nowIso, input.employeeId);
  });
  deleteEmployeeTx();
}
