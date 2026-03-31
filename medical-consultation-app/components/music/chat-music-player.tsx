"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { 
  Play, 
  Pause, 
  ExternalLink, 
  Volume2, 
  VolumeX, 
  Minimize2, 
  Maximize2,
  Music2,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatMusicPlayerProps {
  videoId: string
  title: string
  artist?: string
  autoplay?: boolean
  onClose?: () => void
  className?: string
}

export function ChatMusicPlayer({
  videoId,
  title,
  artist,
  autoplay = false,
  onClose,
  className,
}: ChatMusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoplay)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(70)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // YouTube embed URL with API controls
  const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=${autoplay ? 1 : 0}&controls=0&modestbranding=1&rel=0&showinfo=0`

  const handlePlayPause = () => {
    const iframe = iframeRef.current
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: isPlaying ? "pauseVideo" : "playVideo",
        }),
        "*"
      )
      setIsPlaying(!isPlaying)
    }
  }

  const handleMuteToggle = () => {
    const iframe = iframeRef.current
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: isMuted ? "unMute" : "mute",
        }),
        "*"
      )
      setIsMuted(!isMuted)
    }
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    const iframe = iframeRef.current
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "setVolume",
          args: [newVolume],
        }),
        "*"
      )
    }
  }

  const handleOpenYouTube = () => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank")
  }

  // Minimized view
  if (!isExpanded) {
    return (
      <Card className={cn(
        "w-full max-w-xs border-primary/20 overflow-hidden",
        className
      )}>
        <CardContent className="p-2">
          <div className="flex items-center gap-2">
            {/* Mini visualizer */}
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
              {isPlaying ? (
                <div className="flex items-end gap-0.5 h-4">
                  <div className="w-1 bg-primary animate-pulse" style={{ height: "60%" }} />
                  <div className="w-1 bg-primary animate-pulse" style={{ height: "100%", animationDelay: "0.2s" }} />
                  <div className="w-1 bg-primary animate-pulse" style={{ height: "40%", animationDelay: "0.4s" }} />
                </div>
              ) : (
                <Music2 className="h-4 w-4 text-primary" />
              )}
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{title}</p>
              {artist && <p className="text-xs text-muted-foreground truncate">{artist}</p>}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handlePlayPause}
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsExpanded(true)}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Expanded view
  return (
    <Card className={cn(
      "w-full max-w-sm border-primary/20 overflow-hidden",
      className
    )}>
      {/* Hidden YouTube iframe for audio */}
      <div className="relative aspect-video bg-slate-900">
        <iframe
          ref={iframeRef}
          src={embedUrl}
          className="w-full h-full"
          allow="autoplay; encrypted-media"
          allowFullScreen
          title={title}
        />
        
        {/* Overlay controls - only show when not interacting with video */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
      </div>

      <CardContent className="p-3 space-y-3">
        {/* Title & Artist */}
        <div>
          <h4 className="font-medium text-sm line-clamp-1">{title}</h4>
          {artist && <p className="text-xs text-muted-foreground">{artist}</p>}
        </div>

        {/* Main controls */}
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <Button
            size="icon"
            onClick={handlePlayPause}
            className="h-10 w-10 rounded-full"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>

          {/* Volume */}
          <div className="flex items-center gap-2 flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleMuteToggle}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="flex-1"
            />
          </div>

          {/* Actions */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsExpanded(false)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleOpenYouTube}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
