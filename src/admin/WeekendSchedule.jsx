// src/admin/WeekendSchedule.jsx
// /admin/fin-de-semana: presidente y lector del estudio de La Atalaya, cada sábado.
import RoleSchedule from "./RoleSchedule";
import WeekendSheet from "../components/WeekendSheet";

const config = {
  key: "weekend",
  apiBase: "/api/admin/weekend",
  title: "Fin de semana",
  icon: "bookOpen",
  subtitle: "Presidente y lector del estudio de La Atalaya, cada sábado. Nadie queda asignado la semana en que tiene aseo, micrófonos, acomodador o sonido.",
  unit: { one: "sábado", many: "sábados", feminine: false },
  roles: [
    { key: "president", label: "Presidente", noun: "presidencia", flag: "fds_presidente", short: "P", past: "Presidió" },
    { key: "reader", label: "Lector", noun: "lectura", flag: "fds_lector", short: "L", past: "Leyó" },
  ],
  hasMidweek: false,
  generatorText:
    "Elige primero a quien hace más tiempo no tiene la parte, nunca la misma persona para presidir y leer, y salta a quien tenga aseo, micrófonos, acomodador o sonido esa semana. Los sábados ya programados no se tocan.",
  peopleTitle: "Quién puede presidir y leer",
  Sheet: WeekendSheet,
  sheetWeeks: 14,
  pdfName: "fin_de_semana_oriente.pdf",
  printUrl: (start, weeks) => `/imprimir?vista=fin-de-semana&desde=${start}&semanas=${weeks}`,
};

export default function WeekendSchedule() {
  return <RoleSchedule config={config} />;
}
