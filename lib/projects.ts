import { project as realProject } from "./seed";

// Project metadata for the switcher. Only the real project (633 Third Ave)
// carries full data (documents, timecards, progress); the others are stubs
// that render a "no data yet" state — enough to show the app is multi-project
// without generating whole extra synthetic datasets.
export interface ProjectMeta {
  id: string;
  name: string;
  gc: string;
  owner: string;
  jobNumber: string;
  location: string;
  asOfWeek: number;
  durationWeeks: number;
  hasData: boolean;
}

export const projects: ProjectMeta[] = [
  {
    id: realProject.id,
    name: realProject.name,
    gc: realProject.gc,
    owner: realProject.owner,
    jobNumber: realProject.jobNumber,
    location: realProject.location,
    asOfWeek: realProject.asOfWeek,
    durationWeeks: realProject.durationWeeks,
    hasData: true,
  },
  {
    id: "navillus-215water",
    name: "215 Water Street — Lobby Renovation",
    gc: "Navillus Contracting",
    owner: "Waterline Property Partners",
    jobNumber: "2388",
    location: "New York, NY",
    asOfWeek: 5,
    durationWeeks: 10,
    hasData: false,
  },
  {
    id: "navillus-88greenwich",
    name: "88 Greenwich — Cafeteria Build-Out",
    gc: "Navillus Contracting",
    owner: "Harbor Point Holdings",
    jobNumber: "2439",
    location: "New York, NY",
    asOfWeek: 2,
    durationWeeks: 6,
    hasData: false,
  },
];

export const DEFAULT_PROJECT_ID = realProject.id;

export const projectById = (id: string): ProjectMeta =>
  projects.find((p) => p.id === id) ?? projects[0];
