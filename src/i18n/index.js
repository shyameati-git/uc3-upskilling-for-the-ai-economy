import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const resources = {
  en: {
    translation: {
      dashboard_title: "Buddywork Dashboard",
      table_header_id: "Buddy ID",
      table_header_name: "Buddy Name",
      table_header_status: "Status",
      active: 'Active',
      inactive: 'Inactive',
      status_distribution: 'Status Distribution',
      monthly_performance: 'Monthly Buddy Performance',
      active_employees: 'Active Employees',
      inactive_employees: 'Inactive Employees',
      monthly_employee_overview: 'Monthly Employee Overview',
      january: 'January',
      february: 'February',
      march: 'March',
      april: 'April',
      may: 'May',
      search_placeholder: 'Search by Buddy ID or name',
      home: 'home',
      dashboard: 'dashboard',
      Overview_Section: "Overview Section",
      task_insight: "Task Insights",
      error_metrics: "Error/Alert Metrics",
      "Total_Tasks_Completed": "Total Tasks Completed",
      "Books_Scanned": "Books Scanned",
      "Shelves_Organized": "Shelves Organized",
      "Task_Success_Rate": "Task Success Rate",
      "Average_Time_Per_Task": "Average Time per Task",
      "Most_Used_Feature": "Most Used Feature",
      "Peak_Usage_Time": "Peak Usage Time",
      "Number_of_Users": "Number of Users"
    }
  },
  es: {
    translation: {
      dashboard_title: "Panel de control de Buddywork",
      table_header_id: "ID de compañero",
      table_header_name: "Nombre del amigo",
      table_header_status: "Estado",
      active: 'Activo',
      inactive: 'Inactivo',
      status_distribution: 'Distribución de Estado',
      monthly_performance: 'Rendimiento compañero Mensual',
      active_employees: 'Empleados Activos',
      inactive_employees: 'Empleados Inactivos',
      monthly_employee_overview: 'Resumen Mensual de Empleados',
      january: 'Enero',
      february: 'Febrero',
      march: 'Marzo',
      april: 'Abril',
      may: 'Mayo',
      search_placeholder: 'Buscar por ID de Buddy o nombre',
      home: 'hogar',
      dashboard: 'dashboard',
      Overview_Section: "Sección de descripción general",
      task_insight: "Perspectivas de la tarea",
      error_metrics: "Error/Alert Metrics",
      "Total_Tasks_Completed": "Tareas Totales Completadas",
    "Books_Scanned": "Libros Escaneados",
    "Shelves_Organized": "Estantes Organizados",
    "Task_Success_Rate": "Tasa de Éxito de Tareas",
    "Average_Time_Per_Task": "Tiempo Promedio por Tarea",
    "Most_Used_Feature": "Función Más Utilizada",
    "Peak_Usage_Time": "Hora de Mayor Uso",
    "Number_of_Users": "Número de Usuarios"
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en', // Default language
  fallbackLng: 'en', // Use English as a fallback language
  interpolation: {
    escapeValue: false, // Disable HTML escapes
  },
  debug: true, // Debug i18n keys
});

export default i18n;