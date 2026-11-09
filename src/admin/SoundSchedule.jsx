// src/admin/SoundSchedule.jsx
// /admin/sonido: audio y video, micrófonos y Zoom. Una fila por semana, del sábado a la
// reunión de entre semana siguiente.
import RoleSchedule from "./RoleSchedule";
import SoundSheet from "../components/SoundSheet";

const config = {
  key: "sound",
  apiBase: "/api/admin/sound",
  title: "Sonido",
  icon: "headphones",
  subtitle: "Audio y video, micrófonos y Zoom, del sábado a la reunión de entre semana. Nadie queda asignado si en alguna de esas dos semanas tiene aseo, micrófonos o acomodador, ni si preside o lee ese sábado.",
  unit: { one: "semana", many: "semanas", feminine: true },
  roles: [
    { key: "audio", label: "Audio y video", noun: "audio y video", flag: "sonido_audio_video", short: "A", past: "Audio" },
    { key: "micro", label: "Micrófonos", noun: "micrófonos", flag: "sonido_microfonos", short: "M", past: "Micrófonos" },
    { key: "zoom", label: "Zoom", noun: "Zoom", flag: "sonido_zoom", short: "Z", past: "Zoom" },
  ],
  hasMidweek: true,
  crossCheck: "Fin de semana",
  generatorText:
    "Elige primero a quien hace más tiempo no tiene la parte, nunca la misma persona en dos columnas, y salta a quien tenga aseo, micrófonos o acomodador en la semana del sábado o en la de la reunión de entre semana, o a quien presida o lea ese sábado. Las semanas ya programadas no se tocan.",
  peopleTitle: "Quién puede estar en sonido",
  Sheet: SoundSheet,
  sheetWeeks: 9,
  pdfName: "sonido_oriente.pdf",
  printUrl: (start, weeks) => `/imprimir?vista=sonido&desde=${start}&semanas=${weeks}`,
};

export default function SoundSchedule() {
  return <RoleSchedule config={config} />;
}
