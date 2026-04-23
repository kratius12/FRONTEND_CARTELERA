import { useState, useEffect } from "react";
import "./CleaningSlide.css";

const API = import.meta.env.VITE_API_URL || "";

export default function CleaningSlide() {
    const [cleaningData, setCleaningData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchTodayCleaning = async () => {
            try {
                const res = await fetch(`${API}/api/programs/cleaning/today`);
                if (!res.ok) throw new Error("No se pudo cargar el aseo de hoy");
                const data = await res.json();
                setCleaningData(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTodayCleaning();
        // Recargar cada 1 hora para mantenerse actualizado
        const interval = setInterval(fetchTodayCleaning, 3600000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="cleaning-slide-container">
                <h1 className="cleaning-slide-title blink">CARGANDO...</h1>
            </div>
        );
    }

    if (error || !cleaningData || !cleaningData.grupo1) {
        return (
            <div className="cleaning-slide-container">
                <h1 className="cleaning-slide-title" style={{ fontSize: "5vw" }}>
                    NO HAY ASEO PROGRAMADO PARA ESTA SEMANA
                </h1>
            </div>
        );
    }

    return (
        <div className="cleaning-slide-container">
            <h1 className="cleaning-slide-title">
                ASEO PARA ESTA SEMANA<br/>
                <span className="highlight">GRUPO {cleaningData.grupo1}</span> Y <span className="highlight">GRUPO {cleaningData.grupo2}</span>
            </h1>
        </div>
    );
}
