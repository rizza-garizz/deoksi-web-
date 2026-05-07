import { getPageContent, updatePageContent } from './api/_lib/local-db.js';

try {
  console.log("Testing getPageContent...");
  console.log(getPageContent('layanan'));
  console.log("Success getPageContent");
} catch (e) {
  console.error("Error in getPageContent:", e.message);
  console.error(e.stack);
}
