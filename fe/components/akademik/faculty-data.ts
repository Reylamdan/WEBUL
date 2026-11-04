export interface FacultyCardData {
  name: string;
  description: string;
  image: string;
}

export interface FacultyProgramData {
  level: string;
  name: string;
}

export const facultyCards: FacultyCardData[] = [
  {
    name: "Humaniora dan Desain",
    description: "Bahasa, budaya, dan kreativitas visual.",
    image: "faculty-humaniora",
  },
  {
    name: "Sains dan Bisnis",
    description: "Teknologi, informasi, dan bisnis digital.",
    image: "faculty-sains",
  },
];

export const facultyPrograms: FacultyProgramData[] = [
  { level: "D3 · DIPLOMA", name: "Bahasa Inggris" },
  { level: "S1 · SARJANA", name: "Bahasa Inggris" },
  { level: "S1 · SARJANA", name: "Bisnis Digital" },
  { level: "S1 · SARJANA", name: "Informatika" },
];
