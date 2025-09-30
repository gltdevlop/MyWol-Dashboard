import { promises as fs } from "fs"
import path from "path"
import type { Device } from "@/types/device"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_FILE = path.join(DATA_DIR, "devices.data")

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2), "utf8")
  }
}

export async function readDevices(): Promise<Device[]> {
  await ensureDataFile()
  const raw = await fs.readFile(DATA_FILE, "utf8")
  if (!raw.trim()) {
    return []
  }

  try {
    const devices = JSON.parse(raw) as Device[]
    if (Array.isArray(devices)) {
      return devices
    }
  } catch (error) {
    console.error("Failed to parse devices.data", error)
  }

  return []
}

export async function writeDevices(devices: Device[]): Promise<void> {
  await ensureDataFile()
  await fs.writeFile(DATA_FILE, JSON.stringify(devices, null, 2), "utf8")
}

export async function upsertDevice(device: Device): Promise<Device> {
  const devices = await readDevices()
  const idx = devices.findIndex((d) => d.id === device.id)

  if (idx >= 0) {
    devices[idx] = device
  } else {
    devices.push(device)
  }

  await writeDevices(devices)
  return device
}

export async function deleteDevice(id: string): Promise<boolean> {
  const devices = await readDevices()
  const filtered = devices.filter((device) => device.id !== id)

  if (filtered.length === devices.length) {
    return false
  }

  await writeDevices(filtered)
  return true
}
