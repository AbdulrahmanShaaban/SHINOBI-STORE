import Image from "next/image";

export default function ShinobiLogo() {
  return (
    <div className="flex flex-col items-center justify-center">
      <Image
              src={"/logo.png"}
              alt="Shinobi Logo"
              width={500}
              height={500}
              className="object-cover"
            />
    </div>
  );
}
