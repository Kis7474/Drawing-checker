import DrawingViewer from "@/components/DrawingViewer";
import { machineParts } from "@/data/parts";

export default function Home() {
  return (
    <DrawingViewer imageSrc="/drawings/machine-layout.png" parts={machineParts} />
  );
}
