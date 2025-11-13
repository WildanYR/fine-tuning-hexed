import {
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FileContext, type IFileContext } from "@/contexts/file/file-context";
import { cn } from "@/lib/utils";
import { validateBinValue } from "@/lib/validate-bin-value";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

export default function HexViewer() {
  const {
    fileSize,
    displayMode,
    bitMode,
    cellPerRow,
    renderByteRow,
    updateByte,
    resetBytes,
    goToAddress,
    setGoToAddress,
    updatePercent,
  } = useContext(FileContext) as IFileContext;
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setForceRender] = useState(0);

  const selectedIndex = useRef<Set<number>>(new Set());
  const editedCell = useRef<number>(-1);
  const editedValue = useRef<string>("");

  const [dialogValue, setDialogValue] = useState(false);
  const [dialogPercent, setDialogPercent] = useState(false);

  const [valueUpdate, setValueUpdate] = useState("");
  const [valueUpdateMode, setValueUpdateMode] = useState("hex");

  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(fileSize / (cellPerRow * (bitMode / 8))),
    getScrollElement: () => containerRef.current,
    estimateSize: () => 24,
    overscan: 10,
  });

  const handleValueChange = (index: number, value: string) => {
    editedCell.current = -1;
    editedValue.current = "";
    updateByte(displayMode, index, value);
    setForceRender((v) => v + 1);
  };

  const handleManyValueChange = () => {
    if (selectedIndex.current.size < 1) {
      setDialogValue(false);
      setValueUpdate("");
      return;
    }

    for (const index of Array.from(selectedIndex.current)) {
      updateByte(valueUpdateMode, index, valueUpdate);
    }
    setDialogValue(false);
    setValueUpdate("");
  };

  const handleManyPercentChange = () => {
    if (selectedIndex.current.size < 1) {
      setDialogPercent(false);
      setValueUpdate("");
      return;
    }
    const num = parseInt(valueUpdate);
    if (Number.isNaN(num)) {
      toast.error("Persentase bukan angka valid");
      return;
    }

    if (num < 0) {
      toast.error("Persentase minimal 0%");
      return;
    }

    for (const index of Array.from(selectedIndex.current)) {
      updatePercent(index, num);
    }
    setDialogPercent(false);
    setValueUpdate("");
  };

  const handleSelectCell = (
    e: ReactMouseEvent<HTMLDivElement, MouseEvent>,
    index: number
  ) => {
    if (editedCell.current !== index && !!editedValue.current) {
      handleValueChange(editedCell.current, editedValue.current);
    }

    let selectionChanged = false;

    if (e.shiftKey && selectedIndex.current.size > 0) {
      const lastIndex = Array.from(selectedIndex.current).at(-1)!;
      const start = Math.min(lastIndex, index);
      const end = Math.max(lastIndex, index);
      const add = bitMode / 8;

      selectedIndex.current.clear();
      for (let i = start; i <= end; i += add) {
        selectedIndex.current.add(i);
      }
      selectionChanged = true;
    } else if (e.ctrlKey || e.metaKey) {
      if (selectedIndex.current.has(index)) {
        selectedIndex.current.delete(index);
      } else {
        selectedIndex.current.add(index);
      }
      selectionChanged = true;
    } else {
      if (!selectedIndex.current.has(index) || selectedIndex.current.size > 1) {
        selectedIndex.current.clear();
        selectedIndex.current.add(index);
        selectionChanged = true;
      }
    }

    if (selectionChanged) {
      setForceRender((v) => v + 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (selectedIndex.current.size !== 1) return;

    e.preventDefault();

    let stateChanged = false;

    const currentCell = selectedIndex.current.values().next().value;
    if (currentCell === undefined) return; // Pengaman

    const multiplier = bitMode / 8;
    const totalCell = fileSize / multiplier;

    let nextCell = -1;

    switch (e.key) {
      case "ArrowRight":
        if (currentCell < totalCell - 1) {
          nextCell = currentCell + multiplier;
        }
        break;
      case "ArrowLeft":
        if (currentCell > 0) {
          nextCell = currentCell - multiplier;
        }
        break;
      case "ArrowUp": {
        const upCell = currentCell - cellPerRow * multiplier;
        if (upCell >= 0) {
          nextCell = upCell;
        }
        break;
      }
      case "ArrowDown": {
        const downCell = currentCell + cellPerRow * multiplier;
        if (downCell < totalCell) {
          nextCell = downCell;
        }
        break;
      }
    }

    if (nextCell !== -1) {
      if (currentCell === editedCell.current && !!editedValue.current) {
        handleValueChange(editedCell.current, editedValue.current);
      }

      selectedIndex.current.clear();
      selectedIndex.current.add(nextCell);
      stateChanged = true;
    } else {
      switch (e.key) {
        case "Backspace":
          if (currentCell === editedCell.current && !!editedValue.current) {
            editedValue.current = editedValue.current.slice(0, -1);
            stateChanged = true;
          }
          break;
        case "Enter":
          if (currentCell === editedCell.current && !!editedValue.current) {
            handleValueChange(editedCell.current, editedValue.current);
            stateChanged = true;
          }
          break;
        default:
          if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
            if (currentCell !== editedCell.current) {
              editedCell.current = currentCell;
              editedValue.current = "";
              stateChanged = true;
            }

            const isHexKey =
              displayMode === "hex" && /^[0-9a-fA-F]$/.test(e.key);
            const isDecKey = displayMode === "dec" && /^[0-9]$/.test(e.key);

            if (isHexKey || isDecKey) {
              const validate = validateBinValue(
                editedValue.current + e.key.toUpperCase(),
                bitMode,
                displayMode
              );
              if (validate.error) {
                toast.error(validate.error);
              }
              if (editedValue.current !== validate.value) {
                editedValue.current = validate.value;
                stateChanged = true;
              }
            }
          }
          break;
      }
    }

    if (stateChanged) {
      setForceRender((v) => v + 1);
    }
  };

  const handleResetSelectedBytes = () => {
    resetBytes(Array.from(selectedIndex.current));
    setForceRender((v) => v + 1);
  };

  const closeDialogValue = () => {
    setDialogValue(false);
    setValueUpdate("");
  };

  const closeDialogPercent = () => {
    setDialogPercent(false);
    setValueUpdate("");
  };

  useEffect(() => {
    if (goToAddress === -1) return;

    if (selectedIndex.current.size > 0) {
      selectedIndex.current.clear();
    }

    if (bitMode === 8) {
      selectedIndex.current.add(goToAddress);
    } else {
      if (goToAddress % 2 === 0) {
        selectedIndex.current.add(goToAddress);
      } else {
        selectedIndex.current.add(goToAddress - 1);
      }
    }
    const row = Math.floor(goToAddress / (cellPerRow * (bitMode / 8)));
    rowVirtualizer.scrollToIndex(row, { align: "start" });
    setGoToAddress(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goToAddress, setGoToAddress]);

  return (
    <>
      <div className="p-4 font-mono flex-1 min-h-0 flex flex-col">
        <div
          ref={containerRef}
          className="flex-1 min-h-0 overflow-auto border bg-gray-50"
        >
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                }}
                className="relative"
                tabIndex={0}
                onKeyDown={handleKeyDown}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const multiplier = bitMode / 8;
                  const startRowIndex =
                    virtualRow.index * (cellPerRow * multiplier);
                  const byteRow = renderByteRow(virtualRow.index);

                  return (
                    <div
                      key={virtualRow.index}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className="text-sm text-gray-800 whitespace-pre flex gap-6 items-center"
                    >
                      <div className="text-gray-800 bg-gray-200 px-2 py-1">
                        {startRowIndex
                          .toString(16)
                          .padStart(8, "0")
                          .toUpperCase()}
                      </div>
                      <div
                        className={cn(
                          "flex select-none",
                          displayMode === "dec" ? "gap-4" : "gap-2"
                        )}
                      >
                        {byteRow.map((row) => {
                          let value = "";
                          if (editedCell.current === row.index) {
                            value = editedValue.current;
                          } else if (displayMode === "hex") {
                            const padStartLength = bitMode === 8 ? 2 : 4;
                            value = row.value
                              .toString(16)
                              .padStart(padStartLength, "0")
                              .toUpperCase();
                          } else {
                            value = row.value.toString();
                          }

                          const selected = selectedIndex.current.has(row.index);

                          return (
                            <div
                              key={`cell-${row.index}`}
                              onClick={(e) => {
                                handleSelectCell(e, row.index);
                              }}
                              className={cn(
                                "relative text-center py-1",
                                displayMode === "dec"
                                  ? bitMode === 8
                                    ? "w-8bitdec"
                                    : "w-16bitdec"
                                  : bitMode === 8
                                  ? "w-8bithex"
                                  : "w-16bithex",
                                selected
                                  ? row.isEdited
                                    ? "bg-amber-100 text-amber-800 font-bold"
                                    : "bg-blue-200 text-blue-800"
                                  : row.isEdited
                                  ? "bg-amber-200 text-amber-800 font-bold"
                                  : ""
                              )}
                            >
                              {value}
                              {selected && selectedIndex.current.size === 1 ? (
                                <span
                                  className={cn(
                                    "absolute left-0 bottom-0 w-full h-0.5 animate-blink",
                                    row.isEdited
                                      ? "bg-amber-800"
                                      : "bg-blue-800"
                                  )}
                                ></span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem
                onSelect={() => {
                  setDialogValue(true);
                }}
              >
                Change Value
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={() => {
                  setDialogPercent(true);
                }}
              >
                Change Percent
              </ContextMenuItem>
              <ContextMenuItem onSelect={handleResetSelectedBytes}>
                Reset
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </div>
      <Dialog open={dialogValue} onOpenChange={setDialogValue}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit value by number</DialogTitle>
            <DialogDescription>
              ubah semua value cell yang terseleksi dengan angka real
            </DialogDescription>
          </DialogHeader>
          <div className="grid w-full items-center gap-3">
            <Label htmlFor="update-value-mode-toggle">Format Value</Label>
            <ToggleGroup
              id="update-value-mode-toggle"
              type="single"
              variant="outline"
              spacing={2}
              size="sm"
              value={valueUpdateMode}
              onValueChange={setValueUpdateMode}
            >
              <ToggleGroupItem value="hex">FF</ToggleGroupItem>
              <ToggleGroupItem value="dec">255</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="grid w-full items-center gap-3">
            <Label htmlFor="real-change-value">Value</Label>
            <Input
              id="real-change-value"
              value={valueUpdate}
              placeholder={`masukkan nilai (${
                valueUpdateMode === "hex" ? "FF" : "255"
              })...`}
              onChange={(e) => {
                setValueUpdate(e.target.value);
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogValue}>
              Cancel
            </Button>
            <Button onClick={handleManyValueChange}>Change</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={dialogPercent} onOpenChange={setDialogPercent}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit value by percentage</DialogTitle>
            <DialogDescription>
              ubah semua value cell yang terseleksi dengan persentase. 100% =
              value asli sebelum edit
            </DialogDescription>
          </DialogHeader>
          <div className="grid w-full items-center gap-3">
            <Label htmlFor="percent-change-value">Percent</Label>
            <Input
              id="percent-change-value"
              type="number"
              value={valueUpdate}
              placeholder="masukkan persentase 0 - infinite"
              onChange={(e) => {
                setValueUpdate(e.target.value);
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogPercent}>
              Cancel
            </Button>
            <Button onClick={handleManyPercentChange}>Change</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
