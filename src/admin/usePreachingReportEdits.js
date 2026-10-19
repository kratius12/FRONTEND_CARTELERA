// src/admin/usePreachingReportEdits.js
// Estado de edición de la planilla de informes (compartido por el módulo y la página de cada grupo).
import { useState, useEffect, useMemo } from "react";
import { typeFromStatus } from "./preachingReportsUtils";

export function usePreachingReportEdits(groups) {
    const [edits, setEdits] = useState({}); // student_id -> fila editada
    const pendingCount = Object.keys(edits).length;

    const rowsById = useMemo(() => {
        const map = {};
        (groups || []).forEach((g) => g.rows.forEach((r) => { map[r.student_id] = r; }));
        return map;
    }, [groups]);

    // Avisar si se intenta cerrar la página con cambios sin guardar
    useEffect(() => {
        if (!pendingCount) return;
        const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [pendingCount]);

    const getRow = (row) => edits[row.student_id] || row;

    const updateRow = (studentId, changes) => {
        setEdits((prev) => {
            const base = prev[studentId] || rowsById[studentId];
            return { ...prev, [studentId]: { ...base, ...changes } };
        });
    };

    // Cambia el precursorado de la persona (solo en la planilla del admin)
    const changeType = (row, status) => {
        const publisherType = typeFromStatus(status);
        const changes = { publisher_type: publisherType, pioneer_status: status || null, _statusChanged: true };
        // Al pasar a publicador las horas no aplican; al pasar a precursor, SP/NP no aplica
        if (publisherType === "publicador") changes.hours = null;
        else if (row.publisher_type === "publicador") changes.participated = null;
        updateRow(row.student_id, changes);
    };

    const clearEdits = () => setEdits({});

    return { edits, pendingCount, getRow, updateRow, changeType, clearEdits };
}
