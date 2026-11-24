import type { SVGProps } from 'react'
export function AcademyIcon({
  name = 'compass',
  size = 22,
  ...props
}: SVGProps<SVGSVGElement> & { name?: string; size?: number }) {
  const paths: Record<string, string> = {
    compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm4 5-2.5 5.5L8 16l2.5-5.5L16 8Z',
    shield: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-6',
    crown: 'm3 7 4 3 5-6 5 6 4-3-2 12H5L3 7Zm3 9h12',
    spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z',
    book: 'M12 6C9 3 5 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-2-1-6-1-9 2Zm0 0v14',
    flag: 'M5 21V4h14l-3 5 3 5H5',
    check: 'm5 12 4 4L19 6',
    grid: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2',
    repeat: 'M20 7H8a5 5 0 0 0-5 5m17-5-3-3m3 3-3 3M4 17h12a5 5 0 0 0 5-5M4 17l3-3m-3 3 3 3',
    chart: 'M4 4v16h16M8 15l4-5 4 2 4-7',
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] ?? paths.compass} />
    </svg>
  )
}
