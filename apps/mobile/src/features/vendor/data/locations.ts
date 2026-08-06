import locationData from "./bangladesh-locations.json";

export type LocationOption = {
  id: string;
  name: string;
  parentId?: string;
};

export const divisions = locationData.divisions as LocationOption[];
export const districts = locationData.districts as LocationOption[];
export const upazilas = locationData.upazilas as LocationOption[];
export const unions = locationData.unions as LocationOption[];

export function locationName(options: LocationOption[], id: string) {
  return options.find((option) => option.id === id)?.name ?? "";
}
