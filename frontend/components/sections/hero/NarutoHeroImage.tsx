import Image from "next/image";

export default function Naruto() {
  return (
    <div className="naruto-character w-full pointer-events-auto">
      <Image
        src="/characters/naruto.png"
        alt=""
        width={725}
        height={762}
        priority
        className="w-full h-auto object-contain"
      />
    </div>
  );
}
