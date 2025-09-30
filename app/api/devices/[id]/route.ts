import { NextResponse } from "next/server"
import { deleteDevice, readDevices, writeDevices } from "@/lib/device-storage"
import type { Device } from "@/types/device"
import { z } from "zod"

const macRegex = /^([0-9A-Fa-f]{2}([:-]?)){5}[0-9A-Fa-f]{2}$/
const ipv4Regex = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/

const updateDeviceSchema = z
  .object({
    name: z.string().trim().min(1, "Device name is required").max(100, "Device name is too long").optional(),
    mac: z.string().trim().regex(macRegex, "Invalid MAC address").optional(),
    ip: z.string().trim().regex(ipv4Regex, "Invalid IPv4 address").optional(),
    status: z.enum(["online", "offline", "unknown"]).optional(),
    lastWoken: z
      .string()
      .optional()
      .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Invalid date format for lastWoken"),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  })

function normalizeMac(mac: string): string {
  const cleaned = mac.replace(/[^0-9A-Fa-f]/g, "").toUpperCase()
  const segments = cleaned.match(/.{1,2}/g)
  if (!segments || segments.length !== 6) {
    throw new Error("Invalid MAC address")
  }
  return segments.join(":")
}

interface RouteContext {
  params: { id: string }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = context.params
  const deleted = await deleteDevice(id)

  if (!deleted) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = context.params
  const json = await request.json()
  const parsed = updateDeviceSchema.safeParse(json)

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 })
  }

  const devices = await readDevices()
  const index = devices.findIndex((device) => device.id === id)

  if (index === -1) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 })
  }

  const update = parsed.data
  const current = devices[index]
  let normalizedMac: string | undefined

  if (update.mac !== undefined) {
    normalizedMac = normalizeMac(update.mac)
    const duplicate = devices.some((device) => device.id !== id && device.mac === normalizedMac)
    if (duplicate) {
      return NextResponse.json({ error: "A device with that MAC address already exists" }, { status: 409 })
    }
  }

  const updatedDevice: Device = {
    ...current,
    ...(update.name !== undefined ? { name: update.name.trim() } : {}),
    ...(normalizedMac !== undefined ? { mac: normalizedMac } : {}),
    ...(update.ip !== undefined ? { ip: update.ip.trim() } : {}),
    ...(update.status !== undefined ? { status: update.status } : {}),
    ...(update.lastWoken !== undefined ? { lastWoken: update.lastWoken } : {}),
  }

  devices[index] = updatedDevice
  await writeDevices(devices)

  return NextResponse.json(updatedDevice)
}
