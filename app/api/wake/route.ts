import { NextResponse } from "next/server"
import { createSocket } from "node:dgram"
import { z } from "zod"

const macRegex = /^([0-9A-Fa-f]{2}([:-]?)){5}[0-9A-Fa-f]{2}$/
const ipv4Regex = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/

const wakeSchema = z.object({
  mac: z.string().trim().regex(macRegex, "Invalid MAC address"),
  ip: z.string().trim().regex(ipv4Regex, "Invalid IPv4 address"),
  port: z
    .number({ coerce: true })
    .int()
    .min(1)
    .max(65535)
    .optional()
    .default(9),
})

function normalizeMac(mac: string): string {
  const cleaned = mac.replace(/[^0-9A-Fa-f]/g, "").toUpperCase()
  const segments = cleaned.match(/.{1,2}/g)
  if (!segments || segments.length !== 6) {
    throw new Error("Invalid MAC address")
  }
  return segments.join(":")
}

function createMagicPacket(mac: string): Buffer {
  const buffer = Buffer.alloc(102)
  buffer.fill(0xff, 0, 6)

  const macBytes = Buffer.from(mac.replace(/:/g, ""), "hex")
  for (let i = 6; i < buffer.length; i += macBytes.length) {
    macBytes.copy(buffer, i)
  }

  return buffer
}

async function sendMagicPacket(mac: string, ip: string, port: number): Promise<void> {
  const socket = createSocket("udp4")
  const packet = createMagicPacket(mac)

  await new Promise<void>((resolve, reject) => {
    socket.once("error", (error) => {
      socket.close()
      reject(error)
    })

    socket.bind(0, () => {
      try {
        socket.setBroadcast(true)
      } catch (error) {
        socket.close()
        reject(error)
        return
      }

      socket.send(packet, port, ip, (error) => {
        socket.close()
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  })
}

export async function POST(request: Request) {
  const json = await request.json()
  const parsed = wakeSchema.safeParse(json)

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 })
  }

  const data = parsed.data

  try {
    const normalizedMac = normalizeMac(data.mac)
    await sendMagicPacket(normalizedMac, data.ip, data.port ?? 9)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to send magic packet", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to send magic packet",
      },
      { status: 500 },
    )
  }
}
