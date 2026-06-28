import { useState, useCallback, useEffect, useRef } from 'react'
import { Room, RoomEvent, Track } from 'livekit-client'
import type { RemoteTrack, RemoteTrackPublication, RemoteParticipant, TranscriptionSegment } from 'livekit-client'
import { TokenApi } from '@/api/token/token.api'

export type TranscriptLine = { role: 'user' | 'agent'; text: string }

export type RagSource = {
  id: string
  document: string
  snippet: string
}

export type RagMeta = {
  sources: RagSource[]
  retrieved: number
  total: number
}

export type CallSession = {
  id: string
  startedAt: number
  endedAt: number
  transcript: TranscriptLine[]
}

type DataMessage = {
  type: string
  sources?: RagSource[]
  retrieved?: number
  total?: number
}

export function getSessions(): CallSession[] {
  try {
    return JSON.parse(sessionStorage.getItem('voiceai_sessions') || '[]')
  } catch {
    return []
  }
}

export function useAgent() {
  const [room] = useState(() => new Room())
  const [connected, setConnected] = useState(false)
  const [muted, setMuted] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [error, setError] = useState('')
  const [userSpeaking, setUserSpeaking] = useState(false)
  const [agentSpeaking, setAgentSpeaking] = useState(false)
  const [agentThinking, setAgentThinking] = useState(false)
  const [ragMeta, setRagMeta] = useState<RagMeta | null>(null)
  const [currentAgentText, setCurrentAgentText] = useState<string>('')

  const audioElementsRef = useRef<HTMLAudioElement[]>([])
  const sessionIdRef = useRef<string>('')
  const sessionStartRef = useRef<number>(0)
  const transcriptRef = useRef<TranscriptLine[]>([])

  useEffect(() => { transcriptRef.current = transcript }, [transcript])

  useEffect(() => {
    if (agentSpeaking) setAgentThinking(false)
  }, [agentSpeaking])

  useEffect(() => {
    function attachAudio(track: RemoteTrack, _pub: RemoteTrackPublication, _participant: RemoteParticipant) {
      if (track.kind !== Track.Kind.Audio) return
      const el = track.attach() as HTMLAudioElement
      el.autoplay = true
      document.body.appendChild(el)
      audioElementsRef.current.push(el)
    }

    function onTranscription(segments: TranscriptionSegment[], participant: unknown) {
      const p = participant as { isLocal?: boolean } | null
      const isAgent = p != null && p.isLocal === false
      const isUser = p != null && p.isLocal === true
      segments.forEach(seg => {
        if (isAgent && !seg.final && seg.text.trim()) {
          setCurrentAgentText(seg.text)
        }
        if (seg.final && seg.text.trim()) {
          setTranscript(prev => [...prev, { role: isAgent ? 'agent' : 'user', text: seg.text }])
          if (isAgent) {
            setAgentThinking(false)
            setCurrentAgentText('')
          }
          if (isUser) {
            setAgentThinking(true)
            setRagMeta(null)
            setCurrentAgentText('')
          }
        }
      })
    }

    function onActiveSpeakersChanged(speakers: { isLocal: boolean }[]) {
      setUserSpeaking(speakers.some(s => s.isLocal))
      setAgentSpeaking(speakers.some(s => !s.isLocal))
    }

    function onDataReceived(data: Uint8Array) {
      try {
        const msg = JSON.parse(new TextDecoder().decode(data)) as DataMessage
        if (msg.type === 'rag_sources' && msg.sources) {
          setRagMeta({ sources: msg.sources, retrieved: msg.retrieved ?? msg.sources.length, total: msg.total ?? msg.sources.length })
        }
      } catch { /* ignore malformed messages */ }
    }

    room.on(RoomEvent.TrackSubscribed, attachAudio)
    room.on(RoomEvent.TranscriptionReceived, onTranscription)
    room.on(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged)
    room.on(RoomEvent.DataReceived, onDataReceived)

    return () => {
      room.off(RoomEvent.TrackSubscribed, attachAudio)
      room.off(RoomEvent.TranscriptionReceived, onTranscription)
      room.off(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged)
      room.off(RoomEvent.DataReceived, onDataReceived)
    }
  }, [room])

  const connect = useCallback(async () => {
    setError('')
    try {
      const roomName = `room-${crypto.randomUUID().slice(0, 8)}`
      const { token, url } = await TokenApi.get.fn(roomName)
      await room.connect(url, token)
      await room.startAudio()
      await room.localParticipant.setMicrophoneEnabled(true)
      sessionIdRef.current = crypto.randomUUID()
      sessionStartRef.current = Date.now()
      setConnected(true)
    } catch (e) {
      console.error('LiveKit connect error:', e)
      setError('Failed to connect. Check your LiveKit credentials.')
    }
  }, [room])

  const disconnect = useCallback(async () => {
    if (transcriptRef.current.length > 0) {
      const session: CallSession = {
        id: sessionIdRef.current,
        startedAt: sessionStartRef.current,
        endedAt: Date.now(),
        transcript: transcriptRef.current,
      }
      const sessions = getSessions()
      sessions.unshift(session)
      sessionStorage.setItem('voiceai_sessions', JSON.stringify(sessions.slice(0, 20)))
    }

    audioElementsRef.current.forEach(el => { el.pause(); el.remove() })
    audioElementsRef.current = []
    await room.disconnect()
    setConnected(false)
    setTranscript([])
    setRagMeta(null)
    setCurrentAgentText('')
    setUserSpeaking(false)
    setAgentSpeaking(false)
    setAgentThinking(false)
  }, [room])

  const toggleMute = useCallback(async () => {
    const next = !muted
    await room.localParticipant.setMicrophoneEnabled(!next)
    setMuted(next)
  }, [room, muted])

  return { connected, muted, transcript, error, connect, disconnect, toggleMute, userSpeaking, agentSpeaking, agentThinking, ragMeta, currentAgentText }
}
