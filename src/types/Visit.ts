export type Visit = {
  id: string;
  patientId: string;
  clinicId: string;
  providerId: string;
  checkInTimestamp: number;
  isDeleted: boolean;
};

export type VisitUI = Visit & {
  providerName: string;
};
