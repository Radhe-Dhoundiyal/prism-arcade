export function getNotebookPage(notebook, requestedIndex = 0) {
  if (notebook?.status !== 'available' || !notebook.pages?.length) return null;
  const index = Number.isInteger(requestedIndex) && requestedIndex >= 0 && requestedIndex < notebook.pages.length ? requestedIndex : 0;
  return notebook.pages[index];
}
