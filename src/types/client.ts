export interface ClientRecord {
  id: string;
  name: string;
  notes: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  birthData: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    latitude: number;
    longitude: number;
    locationName: string;
  };
  houseSystem: string;
  analysisNotes: string;
}
