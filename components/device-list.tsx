"use client"

import type { Device } from "@/types/device"
import { DeviceCard } from "@/components/device-card"

interface DeviceListProps {
  devices: Device[]
  onDelete: (id: string) => Promise<void> | void
  onStatusUpdate: (id: string, status: Device["status"], lastWoken?: string) => Promise<void> | void
  onEdit: (device: Device) => void
}

export function DeviceList({ devices, onDelete, onStatusUpdate, onEdit }: DeviceListProps) {
  if (devices.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-border bg-card">
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">No devices added yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add your first device to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {devices.map((device) => (
        <DeviceCard key={device.id} device={device} onDelete={onDelete} onStatusUpdate={onStatusUpdate} onEdit={onEdit} />
      ))}
    </div>
  )
}
