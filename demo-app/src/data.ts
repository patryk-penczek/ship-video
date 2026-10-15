// Static forecast data: the demo app has no API, so every render is the same.
export type Condition = "sun" | "partly" | "cloud" | "rain" | "storm";

export type Hour = { time: string; temp: number; condition: Condition; rain: number };
export type Day = { day: string; condition: Condition; low: number; high: number; rain: number };
export type City = {
  id: string;
  name: string;
  country: string;
  localTime: string;
  temp: number;
  feelsLike: number;
  condition: Condition;
  summary: string;
  high: number;
  low: number;
  wind: number;
  humidity: number;
  uv: number;
  sunrise: string;
  sunset: string;
  hours: Hour[];
  days: Day[];
  alert?: { title: string; body: string };
};

const hours = (start: number, temps: number[], conds: Condition[], rain: number[]): Hour[] =>
  temps.map((temp, i) => ({ time: `${String((start + i) % 24).padStart(2, "0")}:00`, temp, condition: conds[i % conds.length], rain: rain[i % rain.length] }));

export const CITIES: City[] = [
  {
    id: "lisbon", name: "Lisbon", country: "Portugal", localTime: "Tue 10:24",
    temp: 21, feelsLike: 22, condition: "partly", summary: "Partly cloudy",
    high: 24, low: 16, wind: 14, humidity: 58, uv: 6, sunrise: "07:31", sunset: "19:02",
    alert: { title: "Thunderstorms on Sunday", body: "Heavy rain and gusts up to 70 km/h expected from 14:00. Thursday looks clear for outdoor plans." },
    hours: hours(10, [21, 22, 23, 24, 24, 23, 22, 21, 19, 18, 17, 17], ["partly", "sun", "sun", "sun", "partly", "partly", "cloud", "cloud"], [0, 0, 0, 5, 10, 10, 20, 15]),
    days: [
      { day: "Today", condition: "partly", low: 16, high: 24, rain: 10 },
      { day: "Wed", condition: "sun", low: 17, high: 26, rain: 0 },
      { day: "Thu", condition: "sun", low: 18, high: 27, rain: 0 },
      { day: "Fri", condition: "cloud", low: 16, high: 22, rain: 30 },
      { day: "Sat", condition: "rain", low: 14, high: 19, rain: 80 },
      { day: "Sun", condition: "storm", low: 13, high: 18, rain: 90 },
      { day: "Mon", condition: "partly", low: 15, high: 21, rain: 20 },
    ],
  },
  {
    id: "oslo", name: "Oslo", country: "Norway", localTime: "Tue 11:24",
    temp: 7, feelsLike: 4, condition: "rain", summary: "Light rain",
    high: 9, low: 3, wind: 22, humidity: 86, uv: 1, sunrise: "08:12", sunset: "17:48",
    alert: { title: "Slippery roads tonight", body: "Temperatures drop to 3° after midnight. Wet surfaces may freeze." },
    hours: hours(11, [7, 7, 8, 8, 9, 8, 7, 6, 5, 4, 4, 3], ["rain", "rain", "cloud", "cloud", "rain"], [60, 70, 40, 30, 50]),
    days: [
      { day: "Today", condition: "rain", low: 3, high: 9, rain: 70 },
      { day: "Wed", condition: "cloud", low: 2, high: 8, rain: 30 },
      { day: "Thu", condition: "partly", low: 1, high: 9, rain: 10 },
      { day: "Fri", condition: "sun", low: 0, high: 10, rain: 0 },
      { day: "Sat", condition: "partly", low: 2, high: 9, rain: 20 },
      { day: "Sun", condition: "rain", low: 4, high: 8, rain: 80 },
      { day: "Mon", condition: "rain", low: 4, high: 7, rain: 70 },
    ],
  },
  {
    id: "tokyo", name: "Tokyo", country: "Japan", localTime: "Tue 18:24",
    temp: 18, feelsLike: 18, condition: "cloud", summary: "Overcast",
    high: 20, low: 14, wind: 9, humidity: 72, uv: 0, sunrise: "05:49", sunset: "17:07",
    hours: hours(18, [18, 17, 17, 16, 16, 15, 15, 14, 14, 14, 15, 16], ["cloud", "cloud", "partly"], [10, 10, 0]),
    days: [
      { day: "Today", condition: "cloud", low: 14, high: 20, rain: 10 },
      { day: "Wed", condition: "partly", low: 15, high: 22, rain: 0 },
      { day: "Thu", condition: "sun", low: 16, high: 23, rain: 0 },
      { day: "Fri", condition: "sun", low: 16, high: 24, rain: 0 },
      { day: "Sat", condition: "partly", low: 15, high: 22, rain: 10 },
      { day: "Sun", condition: "cloud", low: 14, high: 20, rain: 20 },
      { day: "Mon", condition: "rain", low: 13, high: 17, rain: 70 },
    ],
  },
  {
    id: "nyc", name: "New York", country: "United States", localTime: "Tue 05:24",
    temp: 14, feelsLike: 12, condition: "sun", summary: "Clear",
    high: 19, low: 11, wind: 12, humidity: 51, uv: 4, sunrise: "07:09", sunset: "18:21",
    hours: hours(5, [14, 13, 13, 14, 15, 16, 17, 18, 19, 19, 18, 17], ["sun"], [0]),
    days: [
      { day: "Today", condition: "sun", low: 11, high: 19, rain: 0 },
      { day: "Wed", condition: "sun", low: 12, high: 21, rain: 0 },
      { day: "Thu", condition: "partly", low: 13, high: 20, rain: 10 },
      { day: "Fri", condition: "storm", low: 12, high: 17, rain: 90 },
      { day: "Sat", condition: "rain", low: 10, high: 15, rain: 60 },
      { day: "Sun", condition: "partly", low: 9, high: 16, rain: 10 },
      { day: "Mon", condition: "sun", low: 10, high: 18, rain: 0 },
    ],
  },
];

export const toF = (c: number) => Math.round((c * 9) / 5 + 32);

// Places you can add from "Add a place". Generated from a few numbers so the list stays short.
const CONDS: Condition[] = ["sun", "partly", "cloud", "rain", "storm"];
const SUMMARY: Record<Condition, string> = { sun: "Clear", partly: "Partly cloudy", cloud: "Overcast", rain: "Light rain", storm: "Thunderstorms" };
const DAY_NAMES = ["Today", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"];

function makeCity(id: string, name: string, country: string, localTime: string, temp: number, condition: Condition, seed: number): City {
  const wave = (i: number) => Math.round(Math.sin((i + seed) * 0.6) * 3);
  const cond = (i: number) => CONDS[(CONDS.indexOf(condition) + ((i + seed) % 3) - 1 + CONDS.length) % CONDS.length];
  const rain = (c: Condition) => ({ sun: 0, partly: 10, cloud: 20, rain: 70, storm: 90 })[c];
  const hour = Number(localTime.slice(4, 6));
  return {
    id, name, country, localTime, temp, condition, summary: SUMMARY[condition],
    feelsLike: temp - 1, high: temp + 4, low: temp - 5,
    wind: 8 + ((seed * 7) % 20), humidity: 40 + ((seed * 13) % 50), uv: Math.max(0, 7 - (seed % 8)),
    sunrise: `0${6 + (seed % 3)}:${String((seed * 11) % 60).padStart(2, "0")}`, sunset: `${17 + (seed % 3)}:${String((seed * 17) % 60).padStart(2, "0")}`,
    hours: Array.from({ length: 12 }, (_, i) => {
      const c = i % 4 ? condition : cond(i);
      return { time: `${String((hour + i) % 24).padStart(2, "0")}:00`, temp: temp + wave(i), condition: c, rain: rain(c) };
    }),
    days: DAY_NAMES.map((day, i) => {
      const c = i ? cond(i) : condition;
      return { day, condition: c, low: temp - 5 + wave(i), high: temp + 4 + wave(i), rain: rain(c) };
    }),
  };
}

export const MORE_CITIES: City[] = [
  makeCity("berlin", "Berlin", "Germany", "Tue 11:24", 12, "cloud", 1),
  makeCity("paris", "Paris", "France", "Tue 11:24", 15, "partly", 2),
  makeCity("barcelona", "Barcelona", "Spain", "Tue 11:24", 22, "sun", 3),
  makeCity("reykjavik", "Reykjavík", "Iceland", "Tue 09:24", 4, "storm", 4),
  makeCity("cape-town", "Cape Town", "South Africa", "Tue 11:24", 19, "sun", 5),
  makeCity("sydney", "Sydney", "Australia", "Tue 20:24", 17, "rain", 6),
  makeCity("singapore", "Singapore", "Singapore", "Tue 17:24", 31, "storm", 7),
  makeCity("mexico-city", "Mexico City", "Mexico", "Tue 03:24", 13, "partly", 8),
  makeCity("vancouver", "Vancouver", "Canada", "Tue 02:24", 9, "rain", 9),
  makeCity("warsaw", "Warsaw", "Poland", "Tue 11:24", 10, "cloud", 10),
];
