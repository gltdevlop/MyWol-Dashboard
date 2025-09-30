import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { readDevices, upsertDevice } from "@/lib/device-storage"
import type { Device } from "@/types/device"
import { z } from "zod"

const macRegex = /^([0-9A-Fa-f]{2}([:-]?)){5}[0-9A-Fa-f]{2}$/
const ipv4Regex = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/

const createDeviceSchema = z.object({
  name: z.string().trim().min(1, "Device name is required").max(100, "Device name is too long"),
  mac: z.string().trim().regex(macRegex, "Invalid MAC address"),
  ip: z.string().trim().regex(ipv4Regex, "Invalid IPv4 address"),
})

function normalizeMac(mac: string): string {
  const cleaned = mac.replace(/[^0-9A-Fa-f]/g, "").toUpperCase()
  const segments = cleaned.match(/.{1,2}/g)
  if (!segments || segments.length !== 6) {
    throw new Error("Invalid MAC address")
  }
  return segments.join(":")
}

export async function GET() {
  const devices = await readDevices()
  return NextResponse.json(devices)
}

export async function POST(request: Request) {
  const json = await request.json()
  const parsed = createDeviceSchema.safeParse(json)

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 })
  }

  const { name, mac, ip } = parsed.data
  const normalizedMac = normalizeMac(mac)
  const trimmedName = name.trim()
  const trimmedIp = ip.trim()

  const devices = await readDevices()
  if (devices.some((device) => device.mac === normalizedMac)) {
    return NextResponse.json({ error: "A device with that MAC address already exists" }, { status: 409 })
  }

  const newDevice: Device = {
    id: randomUUID(),
    name: trimmedName,
    mac: normalizedMac,
    ip: trimmedIp,
    status: "unknown",
  }

  await upsertDevice(newDevice)

  return NextResponse.json(newDevice, { status: 201 })
}
