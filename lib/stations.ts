import fs from "fs";
import path from "path";

// Cache file data in memory to avoid re-reading on every call
let cachedStations: ReturnType<typeof parseStationFromFile>[] | null = null;
let cachedRawData: unknown[] | null = null;

function loadRawData(): unknown[] {
  if (cachedRawData) return cachedRawData;
  const filePath = path.join(process.cwd(), "data", "stations.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  cachedRawData = JSON.parse(raw);
  return cachedRawData!;
}

function parseStationFromFile(s: any, index: number) {
  const ports = (s.plugs || []).map(
    (plug: { plug: string; power: string; type: string }, pIndex: number) => ({
      _id: `file-${index}-${pIndex}`,
      portNumber: `P${index + 1}-${pIndex + 1}`,
      connectorType: plug.plug,
      powerOutput: plug.power || "N/A",
      chargerType: plug.type || "N/A",
      status: "available" as const,
    })
  );

  if (ports.length === 0) {
    ports.push({
      _id: `file-${index}-0`,
      portNumber: `P${index + 1}-1`,
      connectorType: "type2",
      powerOutput: "7.2Kw",
      chargerType: "AC",
      status: "available" as const,
    });
  }

  return {
    _id: `station-${index}`,
    name: s.name?.replace(" (Coming Soon)", "") || "Unknown Station",
    location: {
      address: s.address || "",
      coordinates: {
        lat: parseFloat(s.latitude) || 0,
        lng: parseFloat(s.longitude) || 0,
      },
      city: s.city || "",
      province: s.province || "",
    },
    telephone: s.telephone || "",
    vehicleTypes: s.type || ["car"],
    operatingHours: { open: "06:00", close: "22:00" },
    chargingPorts: ports,
    pricing: { perHour: 150, depositAmount: 500 },
    amenities: s.amenities || [],
    photos: [] as string[],
    rating: 0,
    totalReviews: 0,
    isActive: !s.name?.includes("Coming Soon"),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function loadStationFromFile(id: string) {
  const data = loadRawData();

  const match = id.match(/^station-(\d+)$/);
  if (!match) return null;

  const index = parseInt(match[1], 10);
  if (index < 0 || index >= data.length) return null;

  return parseStationFromFile(data[index], index);
}

export function loadAllStationsFromFile() {
  const data = loadRawData();
  return data.map((s, index) => parseStationFromFile(s, index));
}
