// src/CurrentProgramRedirect.jsx
// Al montarse, consulta qué programa está activo hoy y redirige a él.
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function CurrentProgramRedirect() {
    const [id, setId] = useState(null);

    useEffect(() => {
        fetch(`${API}/api/programs/current`)
            .then((r) => r.json())
            .then((data) => setId(data.id ?? 1))
            .catch(() => setId(1));
    }, []);

    if (id === null) {
        return <div className="center-screen">Cargando cartelera…</div>;
    }

    return <Navigate to={`/programs/${id}`} replace />;
}
