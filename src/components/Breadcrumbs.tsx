import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="text-sm text-gray-500 mb-4">
      {items.map((item, index) => (
        <span key={item.href}>
          <Link href={item.href} className="hover:underline">
            {item.label}
          </Link>
          {index < items.length - 1 && <span className="mx-1">/</span>}
        </span>
      ))}
    </nav>
  );
}
