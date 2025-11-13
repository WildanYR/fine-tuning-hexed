import { useRef, useState, type ReactNode } from "react";
import { FileContext } from "./file-context";
import { toast } from "sonner";
import type { ByteRow } from "@/types/byte-row.type";

export const FileContextProvider = ({ children }: { children: ReactNode }) => {
  const buffer = useRef<Uint8Array | null>(null);
  const fileName = useRef("");
  const [fileSize, setFileSize] = useState(0);

  const [displayMode, setDisplayMode] = useState("hex");
  const [bitMode, setBitMode] = useState(8);
  const [cellPerRow, setCellPerRow] = useState(16);

  const [goToAddress, setGoToAddress] = useState(-1);

  const editedBytes = useRef<
    Map<number, { originalValue: number; editedValue: number }>
  >(new Map());

  const loadFile = async (file: File) => {
    toast.promise(
      async () => {
        try {
          fileName.current = file.name;
          const arrayBuffer = await file.arrayBuffer();
          buffer.current = new Uint8Array(arrayBuffer);
          setFileSize(buffer.current.length);
          editedBytes.current.clear();
        } catch (error) {
          console.error("Load file failed", error);
          throw error;
        }
      },
      {
        loading: "Loading File...",
        success: "Load File Success",
        error: "Load file failed",
      }
    );
  };

  const downloadBuffer = () => {
    if (!buffer.current) {
      return;
    }
    const blob = new Blob([buffer.current.buffer as ArrayBuffer], {
      type: "application/octet-stream",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `ftedit-${fileName.current}`;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderByteRow = (index: number): ByteRow[] => {
    if (!buffer.current) return [];
    const multiplier = bitMode / 8;
    const startRowIndex = index * (cellPerRow * multiplier);
    const offset = startRowIndex + cellPerRow * multiplier;
    const rowBytes = buffer.current.slice(startRowIndex, offset);

    if (bitMode === 8) {
      return Array.from(rowBytes).map((byte, ix) => {
        const cellIx = startRowIndex + ix;
        if (editedBytes.current.has(cellIx)) {
          return {
            index: cellIx,
            value: byte,
            isEdited: true,
            originalValue: editedBytes.current.get(cellIx)!.originalValue,
          };
        }

        return {
          index: cellIx,
          value: byte,
          isEdited: false,
        };
      });
    }

    const values: ByteRow[] = [];
    for (let i = 0; i < rowBytes.length; i += 2) {
      const lo = rowBytes[i] ?? 0;
      const hi = rowBytes[i + 1] ?? 0;
      const value = (hi << 8) | lo;

      const index = startRowIndex + i;
      const loEdit = editedBytes.current.get(index);
      const hiEdit = editedBytes.current.get(index + 1);
      if (loEdit !== undefined || hiEdit !== undefined) {
        const oriLo = loEdit?.originalValue ?? lo;
        const oriHi = hiEdit?.originalValue ?? hi;
        const oriValue = (oriHi << 8) | oriLo;
        values.push({ index, value, isEdited: true, originalValue: oriValue });
      } else {
        values.push({ index, value, isEdited: false });
      }
    }
    return values;
  };

  const updateByte = (mode: string, index: number, value: string) => {
    if (!buffer.current) {
      return;
    }

    let num: number;
    if (mode === "hex") {
      num = parseInt(value, 16);
    } else {
      num = parseInt(value);
    }

    if (isNaN(num)) {
      return;
    }

    const updates: [number, number][] = [];

    if (bitMode === 8) {
      updates.push([index, num]);
    } else {
      const lo = num & 0xff;
      const hi = (num >> 8) & 0xff;
      updates.push([index, lo]);
      updates.push([index + 1, hi]);
    }

    for (const [idx, newValue] of updates) {
      let originalValue: number;
      if (editedBytes.current.has(idx)) {
        originalValue = editedBytes.current.get(idx)!.originalValue;
      } else {
        originalValue = buffer.current[idx];
      }

      if (newValue === originalValue) {
        editedBytes.current.delete(idx);
      } else {
        editedBytes.current.set(idx, {
          editedValue: newValue,
          originalValue: originalValue,
        });
      }

      buffer.current[idx] = newValue;
    }
  };

  const updatePercent = (index: number, percent: number) => {
    if (!buffer.current) {
      return;
    }

    const indexesToUpdate = bitMode === 8 ? [index] : [index, index + 1];

    for (const idx of indexesToUpdate) {
      if (percent === 100) {
        if (editedBytes.current.has(idx)) {
          const existing = editedBytes.current.get(idx)!;
          buffer.current[idx] = existing.originalValue;
          editedBytes.current.delete(idx);
        }
        continue;
      }

      let originalValue: number;
      if (editedBytes.current.has(idx)) {
        originalValue = editedBytes.current.get(idx)!.originalValue;
      } else {
        originalValue = buffer.current[idx];
      }

      let newValue = Math.round((originalValue * percent) / 100);

      if (newValue > 255) {
        newValue = 255;
      }

      if (originalValue === newValue) {
        editedBytes.current.delete(idx);
      } else {
        editedBytes.current.set(idx, {
          editedValue: newValue,
          originalValue: originalValue,
        });
      }

      buffer.current[idx] = newValue;
    }
  };

  const resetBytes = (indexes: number[]) => {
    if (!buffer.current?.length) return;

    const resetSingleByte = (byteIndex: number) => {
      if (editedBytes.current.has(byteIndex)) {
        const existing = editedBytes.current.get(byteIndex)!;
        buffer.current![byteIndex] = existing.originalValue;
        editedBytes.current.delete(byteIndex);
      }
    };

    for (const index of indexes) {
      resetSingleByte(index);

      if (bitMode === 16) {
        resetSingleByte(index + 1);
      }
    }
  };

  const value = {
    buffer,
    fileSize,
    downloadBuffer,
    displayMode,
    setDisplayMode,
    bitMode,
    setBitMode,
    cellPerRow,
    setCellPerRow,
    loadFile,
    renderByteRow,
    updateByte,
    resetBytes,
    goToAddress,
    setGoToAddress,
    updatePercent,
  };

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
};
