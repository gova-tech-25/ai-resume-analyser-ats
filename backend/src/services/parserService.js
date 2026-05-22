const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Parses a PDF file and returns its text content
 */
async function parsePDF(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(fileBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF: ' + error.message);
  }
}

/**
 * Parses a DOCX file and returns its text content
 */
async function parseDOCX(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error('Failed to parse DOCX: ' + error.message);
  }
}

/**
 * Route files to respective parser
 */
async function parseFile(filePath, fileType) {
  if (fileType === 'pdf') {
    return await parsePDF(filePath);
  } else if (fileType === 'docx') {
    return await parseDOCX(filePath);
  } else {
    throw new Error('Unsupported file format. Please upload a PDF or DOCX file.');
  }
}

module.exports = {
  parseFile
};
