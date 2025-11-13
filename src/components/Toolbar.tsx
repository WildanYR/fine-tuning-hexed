import { useContext, useState, type ChangeEvent } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { FileContext, type IFileContext } from "@/contexts/file/file-context";
import { Button } from "./ui/button";
import { toast } from "sonner";

export default function Toolbar() {
  const {
    buffer,
    loadFile,
    displayMode,
    setDisplayMode,
    bitMode,
    setBitMode,
    setGoToAddress,
    downloadBuffer,
  } = useContext(FileContext) as IFileContext;
  const [goToAddressStr, setGoToAddressStr] = useState("");

  const handleFileSelect = (ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      alert("Maksimal ukuran file 50 MB ");
      return;
    }
    loadFile(file);
  };

  const handleDisplayModeChange = (value: string) => {
    setDisplayMode(value);
  };

  const handleBitModeChange = (value: string) => {
    setBitMode(parseInt(value));
  };

  const handleGoClick = () => {
    if (!buffer.current?.length) {
      toast.error("Load the file first");
      return;
    }

    if (!/^(?:0[xX])?[0-9A-Fa-f]+$/.test(goToAddressStr)) {
      toast.error("Invalid hex value");
      return;
    }

    const index = parseInt(goToAddressStr, 16);
    if (Number.isNaN(index)) {
      toast.error("Invalid hex number");
      return;
    }

    if (index >= buffer.current.length) {
      toast.error("Address is larger than the maximum file size");
      return;
    }

    setGoToAddress(index);
  };

  const handleDownloadFile = () => {
    if (!buffer.current?.length) {
      toast.error("Load the file first");
      return;
    }

    downloadBuffer();
  };

  return (
    <div className="w-full bg-blue-900 text-blue-100 rounded-md p-6 flex gap-4 items-center">
      <div className="grid w-full max-w-sm items-center gap-3">
        <Label htmlFor="bin-file">Bin File</Label>
        <Input
          id="bin-file"
          type="file"
          accept=".bin,.hex"
          onChange={handleFileSelect}
          className="bg-white text-blue-400 file:text-blue-800 file:bg-blue-100 file:px-2 file:rounded-md"
        />
      </div>
      <div className="grid w-full max-w-sm items-center gap-3">
        <Label htmlFor="display-mode-toggle">Display Mode</Label>
        <ToggleGroup
          id="display-mode-toggle"
          type="single"
          variant="outline"
          spacing={2}
          size="sm"
          value={displayMode}
          onValueChange={handleDisplayModeChange}
        >
          <ToggleGroupItem value="hex">FF</ToggleGroupItem>
          <ToggleGroupItem value="dec">255</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="grid w-full max-w-sm items-center gap-3">
        <Label htmlFor="bit-mode-toggle">Bit Mode</Label>
        <ToggleGroup
          id="bit-mode-toggle"
          type="single"
          variant="outline"
          spacing={2}
          size="sm"
          value={bitMode.toString()}
          onValueChange={handleBitModeChange}
        >
          <ToggleGroupItem value="8">8 bit</ToggleGroupItem>
          <ToggleGroupItem value="16">16 bit</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="grid w-full max-w-sm items-center gap-3">
        <Label htmlFor="go-to-address">Go To Address</Label>
        <div className="flex gap-2">
          <Input
            id="go-to-address"
            value={goToAddressStr}
            placeholder="Hex address 0x..."
            onChange={(e) => {
              setGoToAddressStr(e.target.value);
            }}
            className="bg-white text-black"
          />
          <Button onClick={handleGoClick}>Go</Button>
        </div>
      </div>
      <div className="grid w-full max-w-sm items-center gap-3">
        <Label>Download Edited File</Label>
        <Button disabled={!buffer.current?.length} onClick={handleDownloadFile}>
          Download
        </Button>
      </div>
    </div>
  );
}
