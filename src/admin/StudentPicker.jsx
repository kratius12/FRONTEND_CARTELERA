// src/admin/StudentPicker.jsx
// Campo con autocompletado de Estudiantes: se escribe parte del nombre (sin importar tildes
// ni mayúsculas) y se elige de la lista. Un texto que no es un estudiante queda marcado.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import Icon from "./AdminIcons";
import { allowedFor, findStudent, normalizeName, pickerProblem } from "./studentPickerUtils";

const MAX_OPTIONS = 60;

function detail(student) {
    if (student.privilege) return student.privilege;
    if (student.gender === 1) return "Hermano";
    if (student.gender === 0) return "Hermana";
    return "Sin género en su ficha";
}

export default function StudentPicker({
    value,
    onChange,
    students,
    menOnly = false,
    placeholder,
    id,
    label,
    disabled = false,
    validate = true,
}) {
    const autoId = useId();
    const inputId = id || `sp${autoId.replace(/:/g, "")}`;
    const listId = `${inputId}-list`;
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [typing, setTyping] = useState(false); // escribió desde que entró al campo
    const [cursor, setCursor] = useState(0);

    const selected = findStudent(students, value);
    const problem = validate ? pickerProblem(students, value, menOnly) : "";

    const options = useMemo(() => {
        const pool = students.filter((s) => s.active && allowedFor(s, menOnly));
        const query = typing ? normalizeName(value) : "";
        if (!query) return pool;
        const terms = query.split(" ");
        const matches = pool.filter((s) => {
            const name = normalizeName(s.name);
            return terms.every((t) => name.includes(t));
        });
        // Primero los que empiezan por lo escrito (nombre o apellido)
        const starts = (s) => normalizeName(s.name).split(" ").some((w) => w.startsWith(terms[0]));
        return [...matches.filter(starts), ...matches.filter((s) => !starts(s))];
    }, [students, menOnly, typing, value]);
    const shown = options.slice(0, MAX_OPTIONS);

    useEffect(() => {
        if (!open || !listRef.current) return;
        listRef.current.querySelector(`[data-index="${cursor}"]`)?.scrollIntoView({ block: "nearest" });
    }, [cursor, open]);

    const openList = () => {
        const current = shown.findIndex((s) => selected && s.id === selected.id);
        setCursor(current >= 0 ? current : 0);
        setOpen(true);
    };

    const choose = (student) => {
        onChange(student.name);
        setTyping(false);
        setOpen(false);
    };

    const onInput = (e) => {
        onChange(e.target.value);
        setTyping(true);
        setCursor(0);
        setOpen(true);
    };

    const onBlur = () => {
        setOpen(false);
        setTyping(false);
        // Nombre escrito completo pero sin tildes o con otras mayúsculas → el de Estudiantes
        if (selected && value !== selected.name && allowedFor(selected, menOnly)) onChange(selected.name);
        else if (value && value !== value.trim()) onChange(value.trim());
    };

    const onKeyDown = (e) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!open) openList();
            else setCursor((c) => Math.min(c + 1, shown.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((c) => Math.max(c - 1, 0));
        } else if (e.key === "Enter" && open) {
            e.preventDefault();
            if (shown[cursor]) choose(shown[cursor]);
        } else if (e.key === "Escape" && open) {
            e.preventDefault();
            setOpen(false);
        }
    };

    const showProblem = problem && !open;
    const noun = menOnly ? "hermano" : "estudiante";

    return (
        <div className={`adm-picker ${open ? "is-open" : ""} ${showProblem ? "is-invalid" : ""}`}>
            <div className="adm-picker-field">
                <input
                    ref={inputRef}
                    id={inputId}
                    className="adm-picker-input"
                    type="text"
                    value={value || ""}
                    onChange={onInput}
                    onClick={() => { if (!open) openList(); }}
                    onBlur={onBlur}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder || `Escribe y elige un ${noun}`}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={disabled}
                    role="combobox"
                    aria-label={label}
                    aria-autocomplete="list"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-activedescendant={open && shown[cursor] ? `${listId}-${shown[cursor].id}` : undefined}
                    aria-invalid={showProblem ? true : undefined}
                    aria-describedby={showProblem ? `${inputId}-problem` : undefined}
                />
                {value && !disabled && (
                    <button
                        type="button"
                        className="adm-picker-clear"
                        tabIndex={-1}
                        aria-label="Quitar nombre"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { onChange(""); setTyping(true); inputRef.current?.focus(); }}
                    >
                        <Icon name="x" size={14} />
                    </button>
                )}
            </div>
            {open && (
                <ul
                    ref={listRef}
                    id={listId}
                    role="listbox"
                    className="adm-dropdown adm-picker-list"
                    onMouseDown={(e) => e.preventDefault()}
                >
                    {shown.length === 0 && (
                        <li className="adm-dropdown-empty">
                            {students.length === 0
                                ? "No hay estudiantes registrados."
                                : `Ningún ${noun} activo con «${(value || "").trim()}».`}
                        </li>
                    )}
                    {shown.map((s, i) => (
                        <li
                            key={s.id}
                            id={`${listId}-${s.id}`}
                            role="option"
                            aria-selected={i === cursor}
                            data-index={i}
                            className={`adm-picker-option ${i === cursor ? "is-active" : ""} ${selected?.id === s.id ? "is-current" : ""}`}
                            onMouseEnter={() => setCursor(i)}
                            onClick={() => choose(s)}
                        >
                            <span className="adm-picker-name">{s.name}</span>
                            <small>{detail(s)}</small>
                            {selected?.id === s.id && <Icon name="check" size={15} className="adm-picker-check" />}
                        </li>
                    ))}
                    {options.length > MAX_OPTIONS && (
                        <li className="adm-dropdown-empty">Sigue escribiendo para ver más nombres.</li>
                    )}
                </ul>
            )}
            {showProblem && (
                <span className="adm-picker-problem" id={`${inputId}-problem`} role="alert">
                    <Icon name="alert" size={13} /> {problem}
                </span>
            )}
        </div>
    );
}
