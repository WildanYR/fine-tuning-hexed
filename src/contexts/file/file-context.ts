import type { ByteRow } from "@/types/byte-row.type";
import { createContext } from "react";

export interface IFileContext {
  buffer: React.RefObject<Uint8Array<ArrayBufferLike> | null>;
  fileSize: number;
  displayMode: string;
  setDisplayMode: React.Dispatch<React.SetStateAction<string>>;
  bitMode: number;
  setBitMode: React.Dispatch<React.SetStateAction<number>>;
  cellPerRow: number;
  setCellPerRow: React.Dispatch<React.SetStateAction<number>>;
  loadFile: (file: File) => Promise<void>;
  renderByteRow: (index: number) => ByteRow[];
  updateByte: (mode: string, index: number, value: string) => void;
  resetBytes: (indexes: number[]) => void;
  goToAddress: number;
  setGoToAddress: React.Dispatch<React.SetStateAction<number>>;
  updatePercent: (index: number, percent: number) => void;
  downloadBuffer: () => void;
}

export const FileContext = createContext<IFileContext | null>(null);
