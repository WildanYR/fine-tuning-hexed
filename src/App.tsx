import HexViewer from "./components/HexViewer";
import Toolbar from "./components/Toolbar";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <div className="px-6 space-y-8 h-screen flex flex-col">
      <Toolbar />
      <HexViewer />
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;
