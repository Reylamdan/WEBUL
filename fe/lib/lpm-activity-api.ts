import { apiGet } from "./api";

export interface LpmActivity {
  id: string;
  title: string;
  description: string;
  /** YYYY-MM-DD atau null. Di FE ditampilkan huruf besar, mis. "8 MEI 2024". */
  activityDate: string | null;
  /** Path internal atau URL https; null jika kartu tidak bisa diklik. */
  linkUrl: string | null;
}

export const lpmActivityApi = {
  list: () => apiGet<{ items: LpmActivity[] }>("/lpm-activities"),
};
