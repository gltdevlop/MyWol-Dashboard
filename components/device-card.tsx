"use client"

import { useState } from "react"
import type { Device } from "@/types/device"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Power, MoreVertical, Trash2, Loader2, Pencil } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface DeviceCardProps {
  device: Device
  onDelete: (id: string) => Promise<void> | void
  onStatusUpdate: (id: string, status: Device["status"], lastWoken?: string) => Promise<void> | void
  onEdit: (device: Device) => void
}

export function DeviceCard({ device, onDelete, onStatusUpdate, onEdit }: DeviceCardProps) {
  const [isWaking, setIsWaking] = useState(false)
  const { toast } = useToast()

  const handleWake = async () => {
    setIsWaking(true)
    try {
      const response = await fetch("/api/wake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mac: device.mac, ip: device.ip }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Magic packet sent",
          description: `Wake signal sent to ${device.name}`,
        })
        await onStatusUpdate(device.id, "online", new Date().toISOString())
      } else {
        toast({
          title: "Failed to wake device",
          description: data.error || "An error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Network error",
        description: "Failed to send wake signal",
        variant: "destructive",
      })
    } finally {
      setIsWaking(false)
    }
  }

  const getStatusColor = () => {
    switch (device.status) {
      case "online":
        return "bg-green-500"
      case "offline":
        return "bg-red-500"
      default:
        return "bg-muted-foreground"
    }
  }

  return (
    <Card className="group relative overflow-hidden transition-all hover:border-primary/50">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
          <h3 className="font-semibold text-card-foreground">{device.name}</h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                onEdit(device)
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Device
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                void onDelete(device.id)
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove Device
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">MAC Address</span>
            <span className="font-mono text-card-foreground">{device.mac}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">IP Address</span>
            <span className="font-mono text-card-foreground">{device.ip}</span>
          </div>
          {device.lastWoken && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Woken</span>
              <span className="text-card-foreground">{new Date(device.lastWoken).toLocaleString()}</span>
            </div>
          )}
        </div>
        <Button onClick={handleWake} disabled={isWaking} className="w-full gap-2" size="lg">
          {isWaking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Waking...
            </>
          ) : (
            <>
              <Power className="h-4 w-4" />
              Wake Device
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
