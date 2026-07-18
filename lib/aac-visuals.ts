export type CuratedPhoto = {
  position: string;
  sheet: "core" | "action" | "concrete";
};

export const curatedAacPhotos: Record<string, CuratedPhoto> = {
  i: { position: "0% 0%", sheet: "core" },
  want: { position: "33.333% 0%", sheet: "core" },
  more: { position: "66.667% 0%", sheet: "core" },
  different: { position: "100% 0%", sheet: "core" },
  like: { position: "0% 50%", sheet: "core" },
  go: { position: "33.333% 50%", sheet: "core" },
  help: { position: "66.667% 50%", sheet: "core" },
  stop: { position: "100% 50%", sheet: "core" },
  break: { position: "0% 100%", sheet: "core" },
  yes: { position: "33.333% 100%", sheet: "core" },
  no: { position: "66.667% 100%", sheet: "core" },
  finished: { position: "100% 100%", sheet: "core" },
  cut: { position: "0% 0%", sheet: "action" },
  mix: { position: "33.333% 0%", sheet: "action" },
  "my-turn": { position: "66.667% 0%", sheet: "action" },
  wait: { position: "100% 0%", sheet: "action" },
  play: { position: "0% 50%", sheet: "action" },
  choose: { position: "33.333% 50%", sheet: "action" },
  put: { position: "66.667% 50%", sheet: "action" },
  wake: { position: "100% 50%", sheet: "action" },
  read: { position: "0% 100%", sheet: "action" },
  eat: { position: "33.333% 100%", sheet: "action" },
  drink: { position: "66.667% 100%", sheet: "action" },
  hello: { position: "100% 100%", sheet: "action" },
  banana: { position: "0% 0%", sheet: "concrete" },
  apple: { position: "33.333% 0%", sheet: "concrete" },
  bowl: { position: "66.667% 0%", sheet: "concrete" },
  teacher: { position: "100% 0%", sheet: "concrete" },
  friend: { position: "0% 33.333%", sheet: "concrete" },
  happy: { position: "33.333% 33.333%", sheet: "concrete" },
  sad: { position: "66.667% 33.333%", sheet: "concrete" },
  school: { position: "100% 33.333%", sheet: "concrete" },
  toilet: { position: "0% 66.667%", sheet: "concrete" },
  pain: { position: "33.333% 66.667%", sheet: "concrete" },
  fruit: { position: "66.667% 66.667%", sheet: "concrete" },
  book: { position: "100% 66.667%", sheet: "concrete" },
  music: { position: "0% 100%", sheet: "concrete" },
};

export const arasaacPictogramUrl = (id: number) =>
  `https://static.arasaac.org/pictograms/${id}/${id}_500.png`;
