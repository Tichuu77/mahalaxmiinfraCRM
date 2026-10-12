/**
 * Generates an array of page numbers and ellipsis tokens
 * e.g. [1, 2, 3, 4, 5, '...', 15, 16, 17]
 */
export function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 8) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // 1. Close to beginning (pages 1 to 4) -> show 1, 2, 3, 4, 5, '...', endPages
  if (currentPage <= 4) {
    const startRange = [1, 2, 3, 4, 5];
    const endRange = [totalPages - 2, totalPages - 1, totalPages].filter((p) => p > 5);
    const firstEnd = endRange[0];
    if (firstEnd - 5 > 2) {
      return [...startRange, '...', ...endRange];
    } else {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
  }

  // 2. Close to end -> show 1, 2, 3, '...', last 5 pages
  if (currentPage >= totalPages - 3) {
    const startRange = [1, 2, 3];
    const firstEnd = totalPages - 4;
    if (firstEnd - 3 > 2) {
      const endRange = [];
      for (let i = totalPages - 4; i <= totalPages; i++) {
        if (i > 0) endRange.push(i);
      }
      return [...startRange, '...', ...endRange];
    } else {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
  }

  // 3. In the middle -> 1, '...', curr-1, curr, curr+1, '...', totalPages
  const middle = [currentPage - 1, currentPage, currentPage + 1];
  const items = [1];

  if (middle[0] - 1 > 2) {
    items.push('...');
  } else if (middle[0] - 1 === 2) {
    items.push(2);
  }

  items.push(...middle);

  if (totalPages - middle[middle.length - 1] > 2) {
    items.push('...');
  } else if (totalPages - middle[middle.length - 1] === 2) {
    items.push(totalPages - 1);
  }

  items.push(totalPages);
  return items;
}
