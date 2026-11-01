"use client";
import { useRouter } from "next/navigation";
import Capture from "@/components/Capture";
import { useApp } from "@/components/AppState";
import { Stepper } from "@/components/Shell";

export default function ScanPage() {
  const router = useRouter();
  const { photos, setPhoto, startAnalysis, measured } = useApp();
  return (
    <>
      <Stepper current={0} canVisit={(i) => i === 0 || (i === 2 && !!measured)} />
      <Capture
        photos={photos}
        setPhoto={setPhoto}
        onBack={() => router.push("/")}
        onDone={() => {
          startAnalysis();
          router.push("/scan/details");
        }}
      />
    </>
  );
}
