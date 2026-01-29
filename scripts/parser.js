/*
    ImpositionFix - PDF Imposition Tool
    Copyright (C) 2026 Olegas Spausdinimas

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * Parses the page range string and returns an array of absolute page numbers.
 * 
 * Syntax:
 * _:_:_:_ where:
 * shN:fN:pN:N where fN = file number or file range, pN = page number or page range, N = page range expression, shN = sheet number where to place.
 * fN, pN and shN are optional.
 * 
 * File range expressions are supported via "N:" prefix.
 * - "f1:": File specific range (1-based file index)
 * - "f1-3:": Range of files (all pages from file 1 to file 3)
 * 
 * Page range expressions are supported via "pN:" prefix.
 * - "p1-6:N": 1 to 6 page from provided file(s) 
 * 
 * Page range expression:
 * - "1-5": Standard range (Left to Right until row filled then next row again Left to Right. Starts on empty slot)
 * - "1-": Standard range, 1st to last page
 * - "-1-4": Flipped direction (starts on right side empty slot, Right to Left)
 * - "3-1": Reverse range
 * - "2sided": LR RL 2-sided printing (handled via flips. Fill odd pages on odd sheets LR, even pages on even sheets RL). Ex.: "2sided(1-8)" or "2sided" for all pages. 
 * - "last-1": Reverse range
 * - "repeat": Repeat pages to fill sheets (e.g., "repeat(1-3)" fills current sheet with p1, next sheet with p2, next with p3).
 * - "fill": Fill empty slots in sheet with same pages added in this sheet
 * - "1,3-5": Comma separated ONE mixed expression
 * - "1,-3-5": Comma separated ONE mixed expression
 * - "1 3-5": Space separated TWO separate expressions
 * - "odd", "even": Filters for odd/even pages (e.g., "odd(1-10)" odd page range 1 to 10, "even" all even pages). Syntax: "odd(expression or mixed expression)", e.g. "even(1-5,7,11-9)"
 * - "booklet": Standard 2-up saddle stitch imposition
 * - "snake": LR RL snaking (handled via flips)
 * - "0": Blank page
 * - "b(1-4)": Bottom-up fill (starts from bottom row left to right, then next row above left to right). Ex.: b(1-4,0,5-8).
 * - "b(-1-4)": Bottom-up fill flipped (starts from bottom row right to left, then next row above right to left)
 * 
 * @param {string} input - The range string (e.g., "1-6 -1-4")
 * @param {any} _ignored - Ignored argument (compatibility)
 * @param {number} explicitCols - Optional override for columns
 * @returns {Array} Array of page numbers (integers)
 */
window.parsePageOrder = function(input, _ignored, explicitCols) {
	if (!input || typeof input !== 'string') return [];

	// 1. Context Setup
	const globalPageCount = window.__pdfDoc ? window.__pdfDoc.numPages : 0;
	const fileCounts = window.__filePageCounts || (globalPageCount ? [globalPageCount] : []);
	
	// Calculate absolute start index for each file
	const fileOffsets = [0];
	for(let i=0; i<fileCounts.length; i++){
		fileOffsets.push(fileOffsets[i] + fileCounts[i]);
	}
	
	// Grid Context
	const rows = parseInt(document.getElementById('rowsInput')?.value || 1);
	const cols = explicitCols || parseInt(document.getElementById('colsInput')?.value || 1);
	const slotsPerSheet = Math.max(1, rows * cols);

	// --- Helpers ---

	// Expand a range string "1-5, 8" into [1,2,3,4,5,8]
	const expandSimpleRange = (str, max) => {
		const res = [];
		// Replace 'last' with max
		const s = str.replace(/last/gi, max);
		const parts = s.split(/[\s,]+/);
		parts.forEach(p => {
			p = p.trim();
			if(!p) return;
			
			// Check for reverse marker "-" at start (e.g. -1-4)
			if(p.startsWith('-') && p.length > 1 && /^\-\d/.test(p) && !/^-\d+$/.test(p)){
				p = p.substring(1);
			}

			if(p.includes('-') && !/^-\d+$/.test(p)){
				const rangeParts = p.split('-');
				let start = parseInt(rangeParts[0]);
				let end = rangeParts[1] === '' ? max : parseInt(rangeParts[1]); // "1-" -> 1 to max
				
				if(isNaN(start)) start = 1;
				if(isNaN(end)) end = max;
				
				if(start > end) { // Implicit reverse "3-1"
					for(let i=start; i>=end; i--) res.push(i);
				} else {
					const seq = [];
					for(let i=start; i<=end; i++) seq.push(i);
					res.push(...seq);
				}
			} else {
				const n = parseInt(p);
				if(!isNaN(n)) res.push(n);
			}
		});
		return res;
	};

	// Helper to get local page number (1-based relative to file) from absolute page number
	const getLocalPageNumber = (absPage) => {
		if(absPage <= 0) return 0;
		for(let i=0; i<fileCounts.length; i++){
			const start = fileOffsets[i];
			const end = start + fileCounts[i];
			if(absPage > start && absPage <= end) return absPage - start;
		}
		return absPage;
	};

	// Parse prefixes sh:f:p:
	const parsePrefixes = (token) => {
		let expr = token;
		let fileRange = null;
		let pageRange = null;
		let sheetRange = null;

		// Consume sh:
		const shMatch = expr.match(/^sh([\d\-,]+|last):/i);
		if(shMatch){
			sheetRange = shMatch[1];
			expr = expr.substring(shMatch[0].length);
		}

		// Consume f:
		const fMatch = expr.match(/^f([\d\-,]+|last):/i);
		if(fMatch){
			fileRange = fMatch[1];
			expr = expr.substring(fMatch[0].length);
		}

		// Consume p:
		const pMatch = expr.match(/^p([\d\-,]+|last):/i);
		if(pMatch){
			pageRange = pMatch[1];
			expr = expr.substring(pMatch[0].length);
		}

		// Resolve Files
		let targetFiles = []; // Indices 0-based
		if(fileRange){
			const fIndices = expandSimpleRange(fileRange.replace(/last/gi, fileCounts.length), fileCounts.length);
			fIndices.forEach(i => {
				if(i > 0 && i <= fileCounts.length) targetFiles.push(i-1);
			});
		} else {
			for(let i=0; i<fileCounts.length; i++) targetFiles.push(i);
		}

		// Resolve Pages from those files
		let sourcePages = [];
		targetFiles.forEach(fIdx => {
			const count = fileCounts[fIdx];
			const offset = fileOffsets[fIdx];
			
			if(pageRange){
				const pIndices = expandSimpleRange(pageRange.replace(/last/gi, count), count);
				pIndices.forEach(p => {
					if(p > 0 && p <= count) sourcePages.push(offset + p);
				});
			} else {
				for(let p=1; p<=count; p++) sourcePages.push(offset + p);
			}
		});

		return { sourcePages, expression: expr, isExplicit: !!(fileRange || pageRange), sheetRange };
	};

	// Helper to layout 2sided pages
	const layout2Sided = (odds, evens, slotsPerSheet, rows, cols) => {
		const res = [];
		const maxLen = Math.max(odds.length, evens.length);
		for(let i=0; i<maxLen; i+=slotsPerSheet){
			const chunkOdds = odds.slice(i, i+slotsPerSheet);
			while(chunkOdds.length < slotsPerSheet) chunkOdds.push(null);
			res.push(...chunkOdds);
			
			const chunkEvens = evens.slice(i, i+slotsPerSheet);
			for(let r=0; r<rows; r++){
				const rowStart = r * cols;
				let rowItems = chunkEvens.slice(rowStart, rowStart + cols);
				while(rowItems.length < cols) rowItems.push(null);
				rowItems.reverse();
				res.push(...rowItems);
			}
		}
		return res;
	};

	// Recursive Evaluator
	const evaluate = (expr, pool, isExplicit) => {
		if(!expr) return [];
		
		// Implicit Grouping for RTL starting lists: -1-5,3,8-4 -> -(1-5,3,8-4)
		if(expr.startsWith('-') && /^\-\d/.test(expr) && expr.indexOf(',') !== -1){
			return evaluate(`-(${expr.substring(1)})`, pool, isExplicit);
		}

		// Handle comma-separated lists (e.g. "1, 0, 5") to ensure keywords like '0' are respected
		if(/[\s,]/.test(expr)){
			const subExprs = [];
			let depth = 0;
			let current = '';
			let hasSplit = false;
			for(let char of expr){
				if(char === '(') depth++;
				if(char === ')') depth--;
				if(depth === 0 && (char === ',' || /\s/.test(char))){
					if(current.trim()) subExprs.push(current.trim());
					current = '';
					hasSplit = true;
				} else {
					current += char;
				}
			}
			if(hasSplit){
				if(current.trim()) subExprs.push(current.trim());
				const res = [];
				subExprs.forEach(sub => res.push(...evaluate(sub, pool, isExplicit)));
				return res;
			}
		}

		// Grouping (...)
		if(expr.startsWith('(') && expr.endsWith(')')){
			const inner = expr.slice(1, -1).trim();
			// Special Case: (-1-6, ...) -> Treat as -(1-6, ...)
			if(inner.startsWith('-') && /^\-\d/.test(inner)){
				return evaluate(`-(${inner.substring(1)})`, pool, isExplicit);
			}
			return evaluate(inner, pool, isExplicit);
		}

		// Keywords
		if(expr === '0') return [-1];
		if(expr === '-1') return [-1];
		if(expr === 'empty') return [0];
		if(expr === 'fill') return ['FILL'];
		
		// Bare keywords (aliases for keyword(1-last))
		if(['odd','even','snake','2sided','booklet','repeat'].includes(expr)){
			return evaluate(`${expr}(1-last)`, pool, isExplicit);
		}
		
		// N-up bare keyword (e.g. 4-up, 8up)
		if(/^(\d+)-?up$/i.test(expr)){
			return evaluate(`${expr}(1-last)`, pool, isExplicit);
		}

		// Wrappers: name(inner)
		const match = expr.match(/^(-|[a-z0-9-]+)\((.*)\)$/i);
		if(match){
			const func = match[1].toLowerCase();
			const inner = match[2];
			const innerPages = evaluate(inner, pool, isExplicit);

			if (func === 'repeat') {
				return innerPages.map(p => ({ type: 'REPEAT', page: p }));
			}

			// N-up Logic (4-up, 8-up, etc.)
			const nUpMatch = func.match(/^(\d+)-?up$/);
			if(nUpMatch){
				const n = parseInt(nUpMatch[1], 10);
				const res = [];
				// Process in chunks of N
				for(let i=0; i<innerPages.length; i+=n){
					const chunk = innerPages.slice(i, i+n);
					while(chunk.length < n) chunk.push(null);
					
					for(let k=0; k<n/2; k+=2){
						const end = n - 1 - k;
						const start = k;
						res.push(chunk[end]);
						res.push(chunk[start]);
						res.push(chunk[start+1]);
						res.push(chunk[end-1]);
					}
				}
				return res;
			}

			if (func === '-') { // Right-to-Left layout
				const res = [];
				for(let i=0; i<innerPages.length; i+=slotsPerSheet){
					const chunk = innerPages.slice(i, i+slotsPerSheet);
					for(let r=0; r<rows; r++){
						const rowStart = r * cols;
						let rowItems = chunk.slice(rowStart, rowStart + cols);
						while(rowItems.length < cols) rowItems.push(null);
						rowItems.reverse();
						res.push(...rowItems);
					}
				}
				return res;
			}

			if(func === 'odd') return innerPages.filter(p => getLocalPageNumber(p) % 2 !== 0);
			if(func === 'even') return innerPages.filter(p => getLocalPageNumber(p) % 2 === 0);
			
			if(func === 'snake') {
				const res = [];
				for(let i=0; i<innerPages.length; i+=slotsPerSheet){
					const chunk = innerPages.slice(i, i+slotsPerSheet);
					for(let r=0; r<rows; r++){
						const rowStart = r * cols;
						let rowItems = chunk.slice(rowStart, rowStart + cols);
						if(r % 2 === 1) rowItems.reverse();
						res.push(...rowItems);
					}
				}
				return res;
			}

			if(func === 'b') { // Bottom-up
				const res = [];
				for(let i=0; i<innerPages.length; i+=slotsPerSheet){
					const chunk = innerPages.slice(i, i+slotsPerSheet);
					const sheet = new Array(slotsPerSheet).fill(null);
					let chunkIdx = 0;
					for(let r=rows-1; r>=0; r--){
						for(let c=0; c<cols; c++){
							if(chunkIdx < chunk.length){
								sheet[r * cols + c] = chunk[chunkIdx++];
							}
						}
					}
					res.push(...sheet);
				}
				return res;
			}
			
			if(func === '2sided') {
				// Pre-process to align file starts to Front (Even index)
				const aligned = [];
				let lastFileIdx = -1;
				
				const getFileIdx = (p) => {
					if(p <= 0) return -1;
					for(let k=0; k<fileCounts.length; k++){
						if(p <= fileOffsets[k+1]) return k;
					}
					return -1;
				};

				for(let k=0; k<innerPages.length; k++){
					const p = innerPages[k];
					const fIdx = getFileIdx(p);
					
					if(fIdx !== -1 && lastFileIdx !== -1 && fIdx !== lastFileIdx){
						if(aligned.length % 2 !== 0) aligned.push(-1);
					}
					
					aligned.push(p);
					if(fIdx !== -1) lastFileIdx = fIdx;
				}

				// Ensure even number of pages by adding blank if needed
				if(aligned.length % 2 !== 0) aligned.push(-1);

				const odds = [];
				const evens = [];
				aligned.forEach((p, i) => {
					if(i % 2 === 0) odds.push(p);
					else evens.push(p);
				});
				
				return [{ type: '2SIDED_SET', odds: odds, evens: evens }];
			}
			
			if(func === 'booklet'){
				const p = [...innerPages];
				while(p.length % 4 !== 0) p.push(null);
				const res = [];
				const total = p.length;
				for(let i=0; i<total/2; i+=2){
					const end = total - 1 - i;
					const start = i;
					res.push(p[end]);
					res.push(p[start]);
					res.push(p[start+1]);
					res.push(p[end-1]);
				}
				return res;
			}
			
			// Fallback: return inner
			return innerPages;
		}

		// Standard Range with RL prefix, e.g. -1-4
		if (expr.startsWith('-') && expr.length > 1 && /^\-\d/.test(expr) && !/^-\d+$/.test(expr)) {
			// Normalize to wrapper form and re-evaluate to apply layout
			return evaluate(`-(${expr.substring(1)})`, pool, isExplicit);
		}

		// Standard Range (indices into pool)
		const indices = expandSimpleRange(expr, pool.length);
		return indices.map(i => pool[i-1] || 0);
	};

	// --- Main Loop ---
	let finalPages = [];
	const tokens = input.match(/([^\s()]+(?:\([^)]*\))?)/g) || [];

	tokens.forEach(token => {
		const { sourcePages, expression, isExplicit, sheetRange } = parsePrefixes(token);
		
		let insertionIndex = finalPages.length;
		
		if(sheetRange){
			const currentSheets = Math.max(1, Math.ceil(finalPages.length / slotsPerSheet));
			const shIndices = expandSimpleRange(sheetRange.replace(/last/gi, currentSheets), currentSheets);
			if(shIndices.length > 0){
				const targetSheetIdx = shIndices[0] - 1;
				if(targetSheetIdx >= 0){
					const targetSlotIdx = targetSheetIdx * slotsPerSheet;
					while(finalPages.length < targetSlotIdx){
						finalPages.push(null);
					}
					insertionIndex = targetSlotIdx;
					while(insertionIndex < finalPages.length && finalPages[insertionIndex] !== null){
						insertionIndex++;
					}
				}
			}
		}
		
		let pagesToAdd = [];
		if(!expression || expression === ':') {
			pagesToAdd.push(...sourcePages);
		} else {
			// Split by comma, respecting parens
			const subExprs = [];
			let depth = 0;
			let current = '';
			for(let char of expression){
				if(char === '(') depth++;
				if(char === ')') depth--;
				if(char === ',' && depth === 0){
					subExprs.push(current);
					current = '';
				} else {
					current += char;
				}
			}
			if(current) subExprs.push(current);

			subExprs.forEach(sub => {
				pagesToAdd.push(...evaluate(sub, sourcePages, isExplicit));
			});
		}
		
		pagesToAdd.forEach(p => {
			if(insertionIndex < finalPages.length){
				finalPages[insertionIndex] = p;
			} else {
				finalPages.push(p);
			}
			insertionIndex++;
		});
	});

	// Post-processing (Fill/Same)
	const resolvedPages = [];
	for(let i=0; i<finalPages.length; i++){
		const p = finalPages[i];
		if(p === 'FILL'){
			const currentCount = resolvedPages.length;
			const remainder = currentCount % slotsPerSheet;
			if(remainder > 0){
				const needed = slotsPerSheet - remainder;
				const startOfSheet = currentCount - remainder;
				const pagesOnSheet = resolvedPages.slice(startOfSheet);
				if(pagesOnSheet.length > 0){
					for(let k=0; k<needed; k++){
						resolvedPages.push(pagesOnSheet[k % pagesOnSheet.length]);
					}
				} else {
					for(let k=0; k<needed; k++) resolvedPages.push(null);
				}
			}
		} else if (p && typeof p === 'object' && p.type === 'REPEAT') {
			const currentCount = resolvedPages.length;
			const remainder = currentCount % slotsPerSheet;
			const needed = (remainder === 0) ? slotsPerSheet : (slotsPerSheet - remainder);
			for(let k=0; k<needed; k++){
				resolvedPages.push(p.page);
			}
		} else if (p && typeof p === 'object' && p.type === '2SIDED_SET') {
			const currentSheets = Math.ceil(resolvedPages.length / slotsPerSheet);
			let odds = p.odds;
			let evens = p.evens;
			
			// Try to merge with previous sheets if they exist
			if(currentSheets > 0){
				// Determine if we are merging into a pair (Even sheets) or a single Front (Odd sheets)
				// If Even: We look at last 2 sheets. If Odd: We look at last 1 sheet.
				const isPair = (currentSheets % 2 === 0);
				const sheetsToPop = isPair ? 2 : 1;
				
				const sheetSize = slotsPerSheet;
				const startIdx = (currentSheets - sheetsToPop) * sheetSize;
				
				// Extract existing pages
				const existingPages = resolvedPages.slice(startIdx);
				const frontSheet = existingPages.slice(0, sheetSize);
				const backSheet = isPair ? existingPages.slice(sheetSize, sheetSize * 2) : [];
				
				// Decode Front (remove trailing zeros)
				let fLen = frontSheet.length;
				while(fLen > 0 && frontSheet[fLen-1] === null) fLen--;
				const existingOdds = frontSheet.slice(0, fLen);
				
				// Decode Back (reverse rows, remove trailing zeros)
				const existingEvens = [];
				for(let r=0; r<rows; r++){
					const rowStart = r * cols;
					const row = backSheet.slice(rowStart, rowStart + cols);
					row.reverse();
					existingEvens.push(...row);
				}
				let eLen = existingEvens.length;
				while(eLen > 0 && existingEvens[eLen-1] === null) eLen--;
				existingEvens.length = eLen;

				// Replace in resolvedPages
				resolvedPages.splice(startIdx, existingPages.length);
				const newPages = layout2Sided(existingOdds.concat(odds), existingEvens.concat(evens), slotsPerSheet, rows, cols);
				resolvedPages.push(...newPages);
			} else {
				const newPages = layout2Sided(odds, evens, slotsPerSheet, rows, cols);
				resolvedPages.push(...newPages);
			}
		} else {
			resolvedPages.push(p);
		}
	}

	return resolvedPages.map(p => (p === null) ? 0 : p);
};

// Alias for compatibility with pdf-render.js
window.mapPagesToSlots = window.parsePageOrder;