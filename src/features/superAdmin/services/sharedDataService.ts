import { deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, collection } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { firestore, storage } from "@/lib/firebase";
import type { SharedDataDoc } from "../types";

export async function uploadAndShareFile(input: {
  file: File;
  uploadedBy: string;
  uploadedByName?: string;
  sharedWith: string[];
}): Promise<string> {
  const newRef = doc(collection(firestore, "sharedData"));
  const path = `sharedData/${newRef.id}/${input.file.name}`;

  const sRef = storageRef(storage, path);
  await uploadBytes(sRef, input.file);
  const url = await getDownloadURL(sRef);

  const docData: Omit<SharedDataDoc, "createdAt"> & { createdAt: any } = {
    fileName: input.file.name,
    uploadedBy: input.uploadedBy,
    uploadedByName: input.uploadedByName,
    sharedWith: input.sharedWith,
    createdAt: serverTimestamp(),
    fileURL: url,
    storagePath: path,
    size: input.file.size,
    contentType: input.file.type,
  };

  await setDoc(newRef, docData);
  return newRef.id;
}

export async function deleteSharedFile(input: { id: string; storagePath: string }): Promise<void> {
  await deleteObject(storageRef(storage, input.storagePath));
  await deleteDoc(doc(firestore, "sharedData", input.id));
}

export async function listSharedFiles(max = 100): Promise<Array<SharedDataDoc & { id: string }>> {
  const q = query(collection(firestore, "sharedData"), orderBy("createdAt", "desc"), limit(max));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}
