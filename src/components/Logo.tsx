import logoSrc from "@/assets/stellaster-logo.png";

export function Logo({ size = 96 }: { size?: number }) {
  return (
    <img
      src={logoSrc}
      alt="Stellaster Kitchen logo"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
