export async function extractDocumentText(file) {
  if (!file) return '';

  const name = file.name.toLowerCase();

  if (name.endsWith('.txt')) {
    return await file.text();
  }

  if (name.endsWith('.docx')) {
    try {
      const mammoth = await import('mammoth/mammoth.browser');

      const buffer = await file.arrayBuffer();

      const result = await mammoth.extractRawText({
        arrayBuffer: buffer,
      });

      return result.value || '';
    } catch (error) {
      console.error('DOCX parsing error:', error);

      throw new Error(
        'DOCX parsing failed. Please try again or paste the resume text.'
      );
    }
  }

  if (name.endsWith('.pdf')) {
    try {
      const pdfjs = await import('pdfjs-dist');

      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs',
        import.meta.url,
      ).toString();

      const buffer = await file.arrayBuffer();

      const pdf = await pdfjs.getDocument({
        data: buffer,
      }).promise;

      const pages = [];

      for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber += 1
      ) {
        const page = await pdf.getPage(pageNumber);

        const content = await page.getTextContent();

        const items = content.items
          .filter((item) => {
            return (
              item &&
              typeof item.str === 'string' &&
              item.str.trim()
            );
          })
          .map((item) => {
            const transform = item.transform || [];

            return {
              text: item.str.trim(),
              x: Number(transform[4] || 0),
              y: Number(transform[5] || 0),
            };
          });

        // PDF text objects are not returned in normal reading order.
        // Sort from top -> bottom and left -> right.
        items.sort((a, b) => {
          const yDifference = b.y - a.y;

          if (Math.abs(yDifference) > 3) {
            return yDifference;
          }

          return a.x - b.x;
        });

        const lines = [];

        for (const item of items) {
          if (!lines.length) {
            lines.push({
              y: item.y,
              items: [item],
            });

            continue;
          }

          const currentLine = lines[lines.length - 1];

          // Items with very similar Y coordinates belong to
          // the same visual line.
          if (Math.abs(currentLine.y - item.y) <= 3) {
            currentLine.items.push(item);
          } else {
            lines.push({
              y: item.y,
              items: [item],
            });
          }
        }

        const pageLines = lines
          .map((line) => {
            line.items.sort((a, b) => a.x - b.x);

            return line.items
              .map((item) => item.text)
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
          })
          .filter(Boolean);

        pages.push(pageLines.join('\n'));
      }

      return pages.join('\n\n');
    } catch (error) {
      console.error('PDF parsing error:', error);

      throw new Error(
        'PDF parsing failed. Please try again or paste the resume text.'
      );
    }
  }

  throw new Error(
    'Unsupported file type. Please upload PDF, DOCX, or TXT.'
  );
}
