const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  '';

export async function extractDocumentText(file) {
  if (!file) return '';

  const name = file.name.toLowerCase();

  // TXT can be read directly in the browser.
  if (name.endsWith('.txt')) {
    return await file.text();
  }

  // PDF and DOCX are parsed by the backend.
  if (name.endsWith('.pdf') || name.endsWith('.docx')) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${API_BASE_URL}/api/resume/extract`,
        {
          method: 'POST',
          body: formData,
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            'Resume parsing failed. Please try again.'
        );
      }

      if (!data.text) {
        throw new Error(
          'No readable text was found in the resume.'
        );
      }

      return data.text;
    } catch (error) {
      console.error('Resume parsing error:', error);

      throw new Error(
        error.message ||
          'Resume parsing failed. Please try again or paste the resume text.'
      );
    }
  }

  throw new Error(
    'Unsupported file type. Please upload PDF, DOCX, or TXT.'
  );
}
