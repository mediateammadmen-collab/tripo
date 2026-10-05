// The Tripo mark (yellow tile, black circle, yellow spark) for generated PNG icons.
export function LogoMark({ size }) {
  const circle = Math.round(size * 0.7);
  const spark = Math.round(size * 0.46);
  return (
    <div
      style={{
        width: size,
        height: size,
        background: "#FFFC00",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: circle,
          height: circle,
          borderRadius: circle,
          background: "#0A0A0A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width={spark} height={spark} viewBox="0 0 24 24">
          <path fill="#FFFC00" d="M12 2l1.8 5.6L19 9l-5.2 1.4L12 16l-1.8-5.6L5 9l5.2-1.4z" />
        </svg>
      </div>
    </div>
  );
}
