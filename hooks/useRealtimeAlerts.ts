// hooks/useRealtimeAlerts.ts
"use client"

import { useEffect, useState, useRef } from "react"
import { collection, query, onSnapshot, orderBy, DocumentData } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast, Toast } from "react-hot-toast"

export interface RealtimeAlert {
  id: string
  camera_id: number
  confidence: number
  image_url: string
  summary: string
  timestamp: string
  weapon_type: string
  bbox: number[]
}

export const useRealtimeAlerts = () => {
  const [alerts, setAlerts] = useState<RealtimeAlert[]>([])
  const alertsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const alertsCollection = collection(db, "alerts")
    const q = query(alertsCollection, orderBy("timestamp", "desc"))

    const unsubscribe = onSnapshot(q, snapshot => {
      const newAlerts: RealtimeAlert[] = []

      snapshot.docChanges().forEach(change => {
        if (change.type === "added") {
          const data = change.doc.data() as RealtimeAlert
          const id = change.doc.id

          if (!alertsRef.current.has(id)) {
            alertsRef.current.add(id)
            newAlerts.push({ ...data, id })

            // optional toast
          }
        }
      })

      if (newAlerts.length > 0) {
        setAlerts(prev => [...newAlerts, ...prev])
      }
    })

    return () => unsubscribe()
  }, [])

  // ← THIS WAS MISSING
  return { alerts }
}
