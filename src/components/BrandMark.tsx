// Знак Domora: дом с золотой окантовкой крыши и вписанной жирной «D».
// Чистый вектор (не растр с фото). Зелёный корпус и золотая крыша фиксированы,
// «D» — прозрачная (просвечивает фон). Используется в шапке, подвале и меню.
export default function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="var(--brand, #2F6A45)"
        d="M50 8 L91 46 L91 91 L9 91 L9 46 Z M36 49 L53 49 Q70 49 70 68 Q70 83 53 83 L36 83 Z"
      />
      <path
        stroke="var(--gold, #C6A24C)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M26 44 L50 21 L74 44"
      />
    </svg>
  );
}
