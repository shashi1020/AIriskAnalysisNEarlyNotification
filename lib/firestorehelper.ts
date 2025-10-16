// /lib/firestoreHelpers.ts
import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

export async function insertDummyWeatherData(data: any) {
  try {
    const docRef = await addDoc(collection(db, "weather_predictions"), data);
    console.log("Dummy data inserted with ID:", docRef.id);
  } catch (err) {
    console.error("Error adding document:", err);
  }
}
