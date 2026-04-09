import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const papersBaseDir = path.join(process.cwd(), 'public', 'papers');
const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'mock-data.ts');

const subjectMapping = {
  '0478': 'cs-0478',
  '0417': 'ict-0417',
  '9626': 'it-9626',
  '9618': 'cs-9618'
};

function parseItemName(itemName) {
  // It handles files like 0417_s24_qp_12.pdf and directories like 0417_s24_sf_21
  const cleanName = itemName.replace(/\.(zip|pdf)$/i, '');
  
  const standardRegex = /^([0-9]{4})_([a-z])([0-9]{2})_([a-z]{2})_([0-9]{2})/i;
  
  const stdMatch = cleanName.match(standardRegex);
  if (stdMatch) {
    return {
      subject: stdMatch[1],
      seasonCode: stdMatch[2].toLowerCase(),
      yearFormat: stdMatch[3],
      type: stdMatch[4].toLowerCase(),
      variant: stdMatch[5]
    };
  }

  // Backup long string parser
  const l = cleanName.toLowerCase();
  const subjectMatch = l.match(/^([0-9]{4})/);
  if (!subjectMatch) return null;

  const subject = subjectMatch[1];
  let season = '';
  if (l.includes('march')) season = 'm';
  else if (l.includes('june')) season = 's';
  else if (l.includes('november')) season = 'w';
  
  let type = '';
  if (l.includes('mark scheme') || l.includes('_ms_')) type = 'ms';
  else if (l.includes('question paper') || l.includes('_qp_')) type = 'qp';
  else if (l.includes('source files') || l.includes('_sf_')) type = 'sf';
  
  const yearMatch = l.match(/(20[0-9]{2})/);
  const year = yearMatch ? yearMatch[1].slice(-2) : '25';
  
  const variantMatch = cleanName.match(/([0-9]{2})(?:\s*\(\d+\))?$/i);
  const variant = variantMatch ? variantMatch[1] : '';

  if (season && type && year && variant) {
    return { subject, seasonCode: season, yearFormat: year, type, variant };
  }

  return null;
}

// Recursively get all raw items
function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
       // Check if this directory is actually an extracted SF folder
       const parsed = parseItemName(file);
       if (parsed && parsed.type === 'sf') {
         fileList.push(fullPath);
       } else {
         walkDir(fullPath, fileList);
       }
    } else {
       if (file.endsWith('.pdf') || file.endsWith('.zip')) {
         fileList.push(fullPath);
       }
    }
  }
  return fileList;
}

function processFiles() {
  if (!fs.existsSync(papersBaseDir)) {
    console.error("Directory not found:", papersBaseDir);
    return;
  }
  
  let allItems = walkDir(papersBaseDir);
  
  // Phase 1: Auto-Zip any parsed sf folders
  const directoriesToZip = allItems.filter(p => fs.statSync(p).isDirectory());
  for (const dirPath of directoriesToZip) {
    const parentDir = path.dirname(dirPath);
    const dirName = path.basename(dirPath);
    const zipName = `${dirName}.zip`;
    const zipPath = path.join(parentDir, zipName);
    
    // Only zip if it doesn't already exist
    if (!fs.existsSync(zipPath)) {
      console.log(`Zipping extracted source files directory: ${dirName}`);
      try {
        execSync(`zip -rm "${zipName}" "${dirName}"`, { cwd: parentDir });
      } catch(e) {
        console.error("Failed to zip:", dirName, e.message);
      }
    } else {
      // It exists, so we just remove the dangling directory
      try {
        fs.rmSync(dirPath, { recursive: true, force: true });
      } catch (e) {}
    }
  }

  // Refresh items list after zipping
  allItems = walkDir(papersBaseDir).filter(p => !fs.statSync(p).isDirectory());
  
  const papersMap = new Map();

  allItems.forEach(fullPath => {
    const file = path.basename(fullPath);
    const parsed = parseItemName(file);
    if (!parsed) return;

    const { subject, seasonCode, yearFormat, type, variant } = parsed;
    
    const year = 2000 + parseInt(yearFormat, 10);
    const seasonMapping = {
      'm': 'Feb/March',
      's': 'May/June',
      'w': 'Oct/Nov'
    };
    const mappedSeason = seasonMapping[seasonCode] || 'Unknown';
    
    const paperId = `${subject}_${seasonCode}${yearFormat}_${variant}`;
    
    // Calculate URL from the base directory
    const relativePath = path.relative(path.join(process.cwd(), 'public'), fullPath);
    
    // Safety encode path parts for web serving (spaces in folders like 'MAY JUNE 2O24' need %20)
    const encodeUrlPath = (relPath) => '/' + relPath.split(path.sep).map(encodeURIComponent).join('/');
    const cleanUrl = encodeUrlPath(relativePath);

    if (!papersMap.has(paperId)) {
      papersMap.set(paperId, {
        id: `local_${paperId}`,
        boardId: "cambridge",
        levelId: "igcse",
        subjectId: subjectMapping[subject] || `unknown-${subject}`,
        year: year,
        season: mappedSeason,
        paperNumber: variant.length === 2 ? variant.charAt(0) : variant,
        variant: variant.length === 2 ? variant.charAt(1) : "",
        qpUrl: "",
        msUrl: "",
        title: `${subject} / ${variant}`
      });
    }
    
    const paperObj = papersMap.get(paperId);
    if (type === 'qp') paperObj.qpUrl = cleanUrl;
    if (type === 'ms') paperObj.msUrl = cleanUrl;
    if (type === 'sf') paperObj.sfUrl = cleanUrl;
  });

  const finalPapers = Array.from(papersMap.values());
  
  // Clean up any empty variants or malformed elements and sort them
  const validPapers = finalPapers
    .filter(p => p.qpUrl || p.msUrl || p.sfUrl)
    .sort((a, b) => b.year - a.year || a.season.localeCompare(b.season));
  
  console.log(`Successfully mapped ${validPapers.length} complete papers.`);
  
  let currentFile = fs.readFileSync(dataFilePath, 'utf8');
  const arrRegex = /export const mockedPapers = \[[\s\S]*?\];/m;
  const newArray = `export const mockedPapers = ${JSON.stringify(validPapers, null, 2)};`;
  
  if (arrRegex.test(currentFile)) {
    currentFile = currentFile.replace(arrRegex, newArray);
    fs.writeFileSync(dataFilePath, currentFile);
    console.log("Updated src/lib/mock-data.ts successfully.");
  } else {
    console.log("Could not find mockedPapers array in src/lib/mock-data.ts");
  }
}

processFiles();
