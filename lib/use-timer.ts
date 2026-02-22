'use client'

import { useEffect, useState, useRef } from 'react'
import { TimerState } from '@/types'

const STORAGE_KEY = 'project_tracker_timer'

const DEFAULT_STATE: TimerState = {
  status: 'idle',
  category_id: null,
  started_at: null,
  resumed_at: null,
  paused_at: null,
  elapsed_seconds: 0,
}

/** 現在の経過秒数を計算 */
function computeElapsed(state: TimerState): number {
  if (state.status === 'running' && state.resumed_at) {
    return (
      state.elapsed_seconds +
      Math.floor((Date.now() - new Date(state.resumed_at).getTime()) / 1000)
    )
  }
  return state.elapsed_seconds
}

export function useTimer() {
  const [state, setState] = useState<TimerState>(DEFAULT_STATE)
  const [displaySeconds, setDisplaySeconds] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // マウント時に localStorage から復元
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed: TimerState = JSON.parse(saved)
        setState(parsed)
      }
    } catch {
      // ignore
    }
  }, [])

  // state 変化時に localStorage へ保存
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore
    }
  }, [state])

  // 表示カウンターの更新
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (state.status === 'running') {
      const tick = () => setDisplaySeconds(computeElapsed(state))
      tick()
      intervalRef.current = setInterval(tick, 1000)
    } else {
      setDisplaySeconds(state.elapsed_seconds)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [state])

  function start(categoryId: string | null = null) {
    const now = new Date().toISOString()
    setState({
      status: 'running',
      category_id: categoryId,
      started_at: now,
      resumed_at: now,
      paused_at: null,
      elapsed_seconds: 0,
    })
  }

  function pause() {
    setState((prev) => {
      if (prev.status !== 'running' || !prev.resumed_at) return prev
      const elapsed =
        prev.elapsed_seconds +
        Math.floor((Date.now() - new Date(prev.resumed_at).getTime()) / 1000)
      return {
        ...prev,
        status: 'paused',
        resumed_at: null,
        paused_at: new Date().toISOString(),
        elapsed_seconds: elapsed,
      }
    })
  }

  function resume() {
    setState((prev) => ({
      ...prev,
      status: 'running',
      resumed_at: new Date().toISOString(),
      paused_at: null,
    }))
  }

  function setCategoryId(categoryId: string | null) {
    setState((prev) => ({ ...prev, category_id: categoryId }))
  }

  function reset() {
    setState(DEFAULT_STATE)
  }

  return { state, displaySeconds, start, pause, resume, setCategoryId, reset, computeElapsed }
}

/** 秒数を HH:MM:SS 形式にフォーマット */
export function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
