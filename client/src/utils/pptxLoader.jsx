import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
} catch (e) {
  console.warn('PDF worker setup:', e);
}

/**
 * Loads a PDF file and converts each page into a crisp high-res 1080p slide image
 */
export async function loadPdfFile(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const slides = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for crisp 1080p presentation

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

      slides.push({
        id: `pdf-${Date.now()}-${pageNum}`,
        slideIndex: pageNum - 1,
        title: `${file.name} • Слайд ${pageNum}`,
        subtitle: `Саҳифа ${pageNum} / ${pdf.numPages}`,
        mediaType: 'image',
        mediaSrc: dataUrl,
        bg: 'from-black to-gray-950',
      });
    }

    return slides;
  } catch (err) {
    console.error('[PDF Loader] Failed to parse PDF:', err);
    throw new Error('PDF файлини очишда хатолик: ' + (err.message || ''));
  }
}

/**
 * Parses a .pptx file and returns clean, JSON-serializable slide objects
 */
export async function loadPptxFile(file) {
  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);

    // 1. Find all slide XML files
    const slideFiles = Object.keys(contents.files)
      .filter((name) => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
      .sort((a, b) => {
        const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
        return numA - numB;
      });

    // 2. Extract media images inside ppt/media/
    const mediaFiles = Object.keys(contents.files).filter(
      (name) => name.startsWith('ppt/media/') && /\.(png|jpe?g|webp|gif)$/i.test(name)
    );

    const mediaDataUrls = {};
    for (const mediaPath of mediaFiles) {
      const base64 = await contents.files[mediaPath].async('base64');
      const ext = mediaPath.split('.').pop().toLowerCase();
      const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
      mediaDataUrls[mediaPath] = `data:${mime};base64,${base64}`;
    }

    const slides = [];

    for (let i = 0; i < slideFiles.length; i++) {
      const slideXmlPath = slideFiles[i];
      const xmlText = await contents.files[slideXmlPath].async('text');

      // Check for relationship file to map exact images for this slide
      const relsPath = slideXmlPath.replace('ppt/slides/slide', 'ppt/slides/_rels/slide') + '.rels';
      const slideImages = [];

      if (contents.files[relsPath]) {
        try {
          const relsXml = await contents.files[relsPath].async('text');
          const parser = new DOMParser();
          const relsDoc = parser.parseFromString(relsXml, 'application/xml');
          const relNodes = relsDoc.getElementsByTagName('Relationship');

          for (let r = 0; r < relNodes.length; r++) {
            const target = relNodes[r].getAttribute('Target') || '';
            const normalizedTarget = target.replace('../media/', 'ppt/media/');
            if (mediaDataUrls[normalizedTarget]) {
              slideImages.push(mediaDataUrls[normalizedTarget]);
            }
          }
        } catch {
          // ignore rels error
        }
      }

      // If no rels matched, fallback to index-based media if available
      if (slideImages.length === 0 && Object.values(mediaDataUrls)[i]) {
        slideImages.push(Object.values(mediaDataUrls)[i]);
      }

      // Extract all text content
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
      const textNodes = xmlDoc.getElementsByTagName('a:t');

      const lines = [];
      for (let j = 0; j < textNodes.length; j++) {
        const text = textNodes[j].textContent?.trim();
        if (text && !lines.includes(text)) {
          lines.push(text);
        }
      }

      const title = lines[0] || `${file.name} — Слайд ${i + 1}`;
      const bodyLines = lines.slice(1);

      // If slide contains only a full image and minimal text, present as full image
      const isFullImageSlide = slideImages.length > 0 && bodyLines.length === 0;

      slides.push({
        id: `pptx-slide-${Date.now()}-${i + 1}`,
        slideIndex: i,
        title: title,
        subtitle: `${file.name} • Слайд ${i + 1} / ${slideFiles.length}`,
        mediaType: isFullImageSlide ? 'image' : 'pptx-slide',
        mediaSrc: slideImages[0] || null,
        images: slideImages,
        lines: bodyLines,
        bg: 'from-gray-950 to-black',
      });
    }

    // Fallback: If no slides detected via XML, but media files exist
    if (slides.length === 0 && Object.keys(mediaDataUrls).length > 0) {
      const urls = Object.values(mediaDataUrls);
      urls.forEach((url, idx) => {
        slides.push({
          id: `pptx-media-${Date.now()}-${idx + 1}`,
          slideIndex: idx,
          title: `${file.name} — Слайд ${idx + 1}`,
          subtitle: `Слайд ${idx + 1} / ${urls.length}`,
          mediaType: 'image',
          mediaSrc: url,
          bg: 'from-gray-950 to-black',
        });
      });
    }

    return slides;
  } catch (err) {
    console.error('[PPTX Loader] Error:', err);
    throw new Error('PowerPoint файлини очишда хатолик: ' + (err.message || ''));
  }
}
