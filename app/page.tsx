"use client"

import { useEffect, useState } from "react"
import { DeviceList } from "@/components/device-list"
import { AddDeviceDialog } from "@/components/add-device-dialog"
import { Button } from "@/components/ui/button"
import { Plus, Wifi } from "lucide-react"
import type { Device } from "@/types/device"
import { useToast } from "@/hooks/use-toast"

export default function Home() {
  const [devices, setDevices] = useState<Device[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add")
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const controller = new AbortController()

    const loadDevices = async () => {
      try {
        const response = await fetch("/api/devices", { signal: controller.signal })
        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          const message = payload && typeof payload === "object" && "error" in payload ? payload.error : undefined
          throw new Error(message || "Failed to load devices")
        }

        setDevices(Array.isArray(payload) ? (payload as Device[]) : [])
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return
        }

        console.error(error)
        toast({
          title: "Failed to load devices",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    void loadDevices()

    return () => {
      controller.abort()
    }
  }, [toast])

  const addDevice = async (device: { name: string; mac: string; ip: string }) => {
    try {
      const response = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(device),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload || typeof payload !== "object") {
        const message = payload && typeof payload === "object" && "error" in payload ? payload.error : undefined
        throw new Error(message || "Failed to save device")
      }

      const created = payload as Device
      setDevices((prev) => [...prev, created])
      setIsDialogOpen(false)
      toast({ title: "Device added", description: `${created.name} saved.` })
    } catch (error) {
      console.error(error)
      toast({
        title: "Unable to add device",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
      throw error
    }
  }

  const deleteDevice = async (id: string) => {
    const previous = devices
    setDevices((current) => current.filter((device) => device.id !== id))

    try {
      const response = await fetch(`/api/devices/${id}`, { method: "DELETE" })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        const message = payload && typeof payload === "object" && "error" in payload ? payload.error : undefined
        throw new Error(message || "Failed to delete device")
      }

      toast({ title: "Device removed" })
    } catch (error) {
      console.error(error)
      setDevices(previous)
      toast({
        title: "Unable to delete device",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  const handleDeviceSubmit = async ({ id, name, mac, ip }: { id?: string; name: string; mac: string; ip: string }) => {
    if (dialogMode === "edit") {
      if (!id) {
        toast({ title: "Unable to update device", description: "Device identifier missing", variant: "destructive" })
        throw new Error("Device identifier missing")
      }

      try {
        const response = await fetch(`/api/devices/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, mac, ip }),
        })

        const payload = await response.json().catch(() => null)

        if (!response.ok || !payload || typeof payload !== "object") {
          const message = payload && typeof payload === "object" && "error" in payload ? payload.error : undefined
          throw new Error(message || "Failed to update device")
        }

        const updated = payload as Device
        setDevices((current) => current.map((device) => (device.id === updated.id ? updated : device)))
        setIsDialogOpen(false)
        setEditingDevice(null)
        toast({ title: "Device updated", description: `${updated.name} saved.` })
      } catch (error) {
        console.error(error)
        toast({
          title: "Unable to update device",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        })
        throw error instanceof Error ? error : new Error("Failed to update device")
      }
      return
    }

    await addDevice({ name, mac, ip })
  }

  const updateDeviceStatus = async (id: string, status: Device["status"], lastWoken?: string) => {
    try {
      const response = await fetch(`/api/devices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(lastWoken ? { lastWoken } : {}) }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload || typeof payload !== "object") {
        const message = payload && typeof payload === "object" && "error" in payload ? payload.error : undefined
        throw new Error(message || "Failed to update device status")
      }

      const updated = payload as Device
      setDevices((current) => current.map((device) => (device.id === id ? updated : device)))
    } catch (error) {
      console.error(error)
      setDevices((current) =>
        current.map((device) =>
          device.id === id ? { ...device, status, ...(lastWoken ? { lastWoken } : {}) } : device,
        ),
      )
      toast({
        title: "Device status may be outdated",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Wifi className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Wake-on-LAN</h1>
              <p className="text-sm text-muted-foreground">Remotely wake your devices from anywhere</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setDialogMode("add")
              setEditingDevice(null)
              setIsDialogOpen(true)
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Device
          </Button>
        </div>

        {isLoading ? (
          <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-border bg-card">
            <p className="text-muted-foreground">Loading devices...</p>
          </div>
        ) : (
          <DeviceList
            devices={devices}
            onDelete={deleteDevice}
            onStatusUpdate={updateDeviceStatus}
            onEdit={(device) => {
              setDialogMode("edit")
              setEditingDevice(device)
              setIsDialogOpen(true)
            }}
          />
        )}

        <AddDeviceDialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingDevice(null)
            }
          }}
          onAdd={handleDeviceSubmit}
          mode={dialogMode}
          initialDevice={editingDevice ? { id: editingDevice.id, name: editingDevice.name, mac: editingDevice.mac, ip: editingDevice.ip } : undefined}
        />
      </div>
    </div>
  )
}
