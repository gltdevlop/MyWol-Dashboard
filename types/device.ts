export type DeviceStatus = "online" | "offline" | "unknown"

export interface Device {
  id: string
  name: string
  mac: string
  ip: string
  status: DeviceStatus
  lastWoken?: string
}
