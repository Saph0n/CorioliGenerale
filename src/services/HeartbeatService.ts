import axios from "axios";
import { Doctor } from "../types/Storage";
import { PatientService, VisitService } from "./OfflineServices";

interface HeartbeatResult {
  blocked: boolean | null;
  reason: string | null;
}

const getAppVersion = async (): Promise<string> => {
  const electronApi = (window as unknown as {
    electronAPI?: {
      getAppVersion?: () => Promise<string>;
    };
  }).electronAPI;

  if (electronApi?.getAppVersion) {
    try {
      return await electronApi.getAppVersion();
    } catch {
      // fallback below
    }
  }

  return import.meta.env.VITE_APP_VERSION || "unknown";
};

/**
 * Telemetria di licenza verso la dashboard.
 *
 * `app` identifica l'edizione. Il backend (`utils/apps.js`, `VALID_APPS`)
 * conosce per ora solo "corioli" e "corioli-pediatria": un valore ignoto viene
 * normalizzato a "corioli" (e `tipo` a "ginecologia"), quindi la chiamata
 * risponde comunque 200 e blocco/licenza continuano a funzionare — ma questa
 * edizione risulta indistinguibile da Corioli in dashboard finche' il backend
 * non aggiunge "corioli-cardiologia" a VALID_APPS e a mapAppToTipo.
 */
export const sendHeartbeat = async (
  doctor: Doctor,
  app: "corioli-cardiologia",
): Promise<HeartbeatResult> => {
  try {
    const [patients, visits, version] = await Promise.all([
      PatientService.getAllPatients(),
      VisitService.getAllVisits(),
      getAppVersion(),
    ]);

    const isOnline = navigator.onLine;
    const activeUsers = isOnline ? 1 : 0;
    const offlineUsers = isOnline ? 0 : 1;

    const result = await axios.post(`${import.meta.env.VITE_API_URL}/heartbeat`, {
      id: doctor.id,
      nome: doctor.nome,
      cognome: doctor.cognome,
      email: doctor.email,
      numero_telefono: doctor.telefono,
      specializzazione: doctor.specializzazione,
      tipo: "generale",
      app,
      version,
      activeUsers,
      offlineUsers,
      patients: patients.length,
      visits: visits.length,
    });

    return {
      blocked: Boolean(result.data?.blocked),
      reason: typeof result.data?.reason === "string" ? result.data.reason : null,
    };
  } catch (e) {
    console.error("sendHeartbeat:", e);
    return { blocked: null, reason: null };
  }
};
