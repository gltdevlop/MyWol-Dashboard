"use client"

import type React from "react"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Device } from "@/types/device"

interface AddDeviceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (device: { id?: string; name: string; mac: string; ip: string }) => Promise<void>
  mode: "add" | "edit"
  initialDevice?: Pick<Device, "id" | "name" | "mac" | "ip">
}

export function AddDeviceDialog({ open, onOpenChange, onAdd, mode, initialDevice }: AddDeviceDialogProps) {
  const [name, setName] = useState("")
  const [mac, setMac] = useState("")
  const [ip, setIp] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEdit = mode === "edit"

  useEffect(() => {
    if (!open) {
      return
    }

    if (initialDevice) {
      setName(initialDevice.name)
      setMac(initialDevice.mac)
      setIp(initialDevice.ip)
    } else {
      setName("")
      setMac("")
      setIp("")
    }
  }, [open, initialDevice])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !mac || !ip) {
      return
    }

    setIsSubmitting(true)
    try {
      await onAdd({ id: initialDevice?.id, name, mac, ip })
      if (!isEdit) {
        setName("")
        setMac("")
        setIp("")
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatMacAddress = (value: string) => {
    // Remove all non-hex characters
    const cleaned = value.replace(/[^0-9A-Fa-f]/g, "").toUpperCase()
    // Add colons every 2 characters
    const formatted = cleaned.match(/.{1,2}/g)?.join(":") || cleaned
    return formatted.slice(0, 17) // Limit to XX:XX:XX:XX:XX:XX
  }

  const handleMacChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMac(formatMacAddress(e.target.value))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Device" : "Add New Device"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Update the details for this device." : "Enter the details of the device you want to wake remotely."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Device Name</Label>
              <Input
                id="name"
                placeholder="My Desktop PC"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mac">MAC Address</Label>
              <Input
                id="mac"
                placeholder="00:11:22:33:44:55"
                value={mac}
                onChange={handleMacChange}
                className="font-mono"
                required
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">Format: XX:XX:XX:XX:XX:XX</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ip">IP Address</Label>
              <Input
                id="ip"
                placeholder="192.168.1.100"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                className="font-mono"
                required
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">Local network IP address or broadcast address</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add Device"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
