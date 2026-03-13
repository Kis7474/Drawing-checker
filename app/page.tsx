import DrawingViewer from "@/components/DrawingViewer";
import { machineParts } from "@/data/parts";

export default function Home() {
  return (
    <main className="h-screen bg-slate-100 p-6 text-slate-900">
      <DrawingViewer imageSrc="/drawings/machine-layout.png" parts={machineParts} />
    </main>
  );
}
