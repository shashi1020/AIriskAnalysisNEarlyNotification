// components/RealtimeAlertPopup.tsx
"use client"

import { useEffect, useRef } from "react"
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

export default function RealtimeAlertPopup() {
  const alertsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const alertsCollection = collection(db, "alerts")
    const q = query(alertsCollection, orderBy("timestamp", "desc"))

    const unsubscribe = onSnapshot(q, snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === "added") {
          const docData = change.doc.data() as DocumentData
          const id = change.doc.id

          if (!alertsRef.current.has(id)) {
            alertsRef.current.add(id)

            const timestamp =
              typeof docData.timestamp === "string"
                ? docData.timestamp
                : docData.timestamp?.toDate?.().toISOString() || new Date().toISOString()

            const alert: RealtimeAlert = {
              id,
              camera_id: docData.camera_id,
              confidence: docData.confidence,
              image_url: docData.image_url,
              summary: docData.summary,
              timestamp,
              weapon_type: docData.weapon_type,
              bbox: docData.bbox
            }

            // Show toast popup
            toast.custom((t: Toast) => (
              <div className="bg-red-600 text-white p-3 rounded-lg shadow-md flex items-center gap-3">
                <img src={alert.image_url} alt="alert" className="w-12 h-12 object-cover rounded"/>
                <div>
                  <p className="font-semibold">{alert.summary}</p>
                  <p className="text-xs">{alert.weapon_type.toUpperCase()} detected</p>
                  <p className="text-xs text-gray-200">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ), { duration: 5000 })
          }
        }
      })
    })

    return () => unsubscribe()
  }, [])

  return null
}
