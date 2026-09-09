export type EquipmentStatus = "ACTIVE" | "RETIRED";
export type CleaningStatus = "PENDING" | "VERIFIED";

export type Equipment = {
  id: string;
  name: string;
  code: string;
  status: EquipmentStatus;
  createdAt: string;
  updatedAt: string;
};

export type CleaningRecord = {
  id: string;
  equipmentId: string;
  cleanedBy: string;
  cleanedAt: string;
  method: string;
  notes: string | null;
  status: CleaningStatus;
  createdAt: string;
  updatedAt: string;
};

export type Change = {
  field: string;
  oldValue: string | null;
  newValue: string | null;
};

export type AuditEntry = {
  id: string;
  cleaningRecordId: string;
  changedBy: string;
  changedAt: string;
  changes: Change[];
};

export type Paginated<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
