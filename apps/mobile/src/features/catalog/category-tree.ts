import type { CategoryDto } from "@amiyo/contracts";

export type CategoryNode = CategoryDto & { children: CategoryNode[]; depth: number };

export function buildCategoryTree(categories: CategoryDto[]) {
  const children = new Map<string | null, CategoryDto[]>();
  categories.forEach((category) => children.set(category.parentId, [...(children.get(category.parentId) || []), category]));
  children.forEach((items) => items.sort((left, right) => left.displayOrder - right.displayOrder || left.name.localeCompare(right.name)));
  const visit = (category: CategoryDto, depth: number, visited: Set<string>): CategoryNode => ({ ...category, depth, children: visited.has(category.id) ? [] : (children.get(category.id) || []).map((child) => visit(child, depth + 1, new Set([...visited, category.id]))) });
  return (children.get(null) || []).map((category) => visit(category, 0, new Set()));
}

export function flattenCategoryTree(nodes: CategoryNode[]): CategoryNode[] { return nodes.flatMap((node) => [node, ...flattenCategoryTree(node.children)]); }

export function filterCategoryTree(nodes: CategoryNode[], query: string): CategoryNode[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return nodes;
  return nodes.flatMap((node) => {
    const matches = `${node.name} ${node.slug} ${node.description || ""}`.toLowerCase().includes(normalizedQuery);
    const children = filterCategoryTree(node.children, normalizedQuery);
    if (matches) return [node];
    return children.length ? [{ ...node, children }] : [];
  });
}
