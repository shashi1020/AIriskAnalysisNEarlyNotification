// hooks/useCrimeDetections.ts
import { useEffect, useState } from "react"
import { collection, onSnapshot, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { CrimeDetection, CrimeClass, AlertPriority } from "@/lib/types"


export const useCrimeDetections = () => {
  const [crimeDetections, setCrimeDetections] = useState<CrimeDetection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, "crime_detections"), orderBy("timestamp", "desc"))

    const unsubscribe = onSnapshot(q, snapshot => {
      const detections: CrimeDetection[] = snapshot.docs.map(doc => doc.data() as CrimeDetection)
      setCrimeDetections(detections)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return { crimeDetections, loading }
}
