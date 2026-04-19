import { SimpleEventDispatcherMixin } from '../util.mjs';
import tableUpdaterStylesheet from './table-updater.css' with { type: 'css' };

/**
 * @interface RowIndexer
 */

/**
 * @function
 * @name RowIndexer#nextIndex
 * @param {HTMLTableSectionElement} Current data section.
 * @param {HTMLTableRowElement} Row to be indexed.
 * @returns Next available row index.
 */
 
/**
 * @interface CellValueRetriever
 */

/**
 * @function
 * @name CellValueRetriever#getValue
 * @param {number} rowIndex - Current row index (internal; within data section). If external index
 *    is needed, use `row.getAttribute({@link ROW_INDEX_ATTRIBUTE})`.
 * @param {HTMLRowElement} row - Current row.
 * @param {number} columnIndex - Current column index. If column name is needed, use `columnHeader.textContent`.
 * @param {HTMLTableCellElement} columnHeader - Current column.
 * @returns {string} - Cell value.
 */

/**
 */
document.adoptedStyleSheets.push(tableUpdaterStylesheet);

export const ROW_INDEX_ATTRIBUTE = 'data-external-index';

/*
function getTableInfo(insertEl) {
  let updaterCell = insertEl;
  while (updaterCell && !updaterCell.classList.contains('updater-cell')) updaterCell = updaterCell.parentNode;
  if (!updaterCell) {
    return [null, null, null, null];
  }
  
  const currentCell = updaterCell.parentNode;
  const currentRow = currentCell.parentNode;
  
  let cellIndex = -1;
  for (let i = 0; i < currentRow.cells.length; ++i) {
    if (currentRow.cells[i] === currentCell) {
      cellIndex = i;
      break;
    }
  }
  return cellIndex === -1 ? [null, null, null, null] : [currentRow, cellIndex, currentCell, updaterCell];
}
*/

export class DefaultRowIndexer {
  n = 0;
  
  nextIndex() {
    return this.n++;
  }
}

export class TableUpdater extends SimpleEventDispatcherMixin(Object,
    ['columninserted', 'columndeleted', 'rowinserted', 'rowdeleted', 'columnupdated', 'cellsupdated']) {
  
  table;
  indexer;
  
  /**
   * @param {HTMLTableElement} table Data table.
   * @param {RowIndexer|RowIndexer#nextIndex} indexer Row indexer. 
   */
  constructor(table, indexer) {
    super();
    this.table = table;
    this.indexer = indexer || new DefaultRowIndexer();
  }
  
  init() {
    this.table.classList.add('table-updater-managed');
    
    const indexer = this.indexer;
    const dataSection = this.dataSection;
    for (const row of dataSection.rows) {
      if (!row.hasAttribute(ROW_INDEX_ATTRIBUTE)) {
        row.setAttribute(ROW_INDEX_ATTRIBUTE, indexer.nextIndex(dataSection, row));
      }
    }
  }
  
  /*  
  init() {
    const table = this.table;
    
    table.classList.add('table-updater-managed');
    
    for (const header of table.tHead.rows[0].cells) {
      header.addEventListener('dblclick', this);
    }
  
    for (const cell of table.querySelectorAll('tbody td, tbody th')) {
      this.adaptCell(cell);
    }
  }
  
  adaptCell(cell) {
    const updaterCell = document.createElement('div');
    updaterCell.className = 'updater-cell';
    
    const insertColBefore = document.createElement('div');
    insertColBefore.className = 'insert-col-before';
    insertColBefore.addEventListener('mouseenter', this);
    insertColBefore.addEventListener('mouseleave', this);
    insertColBefore.addEventListener('click', this);
    const insertRowBefore = document.createElement('div');
    insertRowBefore.className = 'insert-row-before';
    insertRowBefore.addEventListener('click', this);
    const insertColAfter = document.createElement('div');
    insertColAfter.className = 'insert-col-after';
    insertColAfter.addEventListener('mouseenter', this);
    insertColAfter.addEventListener('mouseleave', this);
    insertColAfter.addEventListener('click', this);
    const insertRowAfter = document.createElement('div');
    insertRowAfter.className = 'insert-row-after';
    insertRowAfter.addEventListener('click', this);
    const cellContent = document.createElement('div');
    cellContent.className = 'cell-content';
    cellContent.addEventListener('dblclick', this);
    while (cell.childNodes.length) cellContent.appendChild(cell.childNodes[0]);
    
    for (const el of [insertColBefore, insertRowBefore, insertColAfter, insertRowAfter, cellContent]) {
      updaterCell.appendChild(el);
    }
    
    cell.appendChild(updaterCell);
  }
  
  handleEvent(event) {
    const type = event.type;
    const target = event.target;
    if (type === 'mouseenter' || type === 'mouseleave') {
      if (target === event.currentTarget) {
        this.#onInsertHover(target, type);
      }
    } else if (type === 'click') {
      
    }
  }
  
  #onInsertHover(target, type) {
    const [currentRow, cellIndex, currentCell, updaterCell] = getTableInfo(target);
    if (!currentRow) {
      return;
    }
    
    const tableSection = currentRow.parentNode;
    const selector = target.classList.contains('insert-col-after') ? '.insert-col-after' : '.insert-col-before';
    const action = type === 'mouseenter' ? 'add' : 'remove';
    for (const row of tableSection.rows) {
      const targetCell = row.cells[cellIndex];
      targetCell.querySelector(selector).classList[action]('hovered');
    }
  }
  */
  
  get headerRow() {
    return this.table.tHead.rows[0]
  }
  
  get dataSection() {
    return this.table.tBodies[0];
  }
  
  /**
   * Resolve column info by:
   * - `number`: column index
   * - `string`: column name
   * - `HTMLTableCellElement`: reference
   *
   * @param {number|string|HTMLTableCellElement} target - Target column index, name or header `HTMLTableCellElement`
   * @return {[number, HTMLTableCellElement]} - `[cellIndex, cell]` of resolved header.
   */
  resolveHeaderInfo(target) {
    if ((target ?? null) === null) {
      return [-1, null];
    }
    
    const cells = this.headerRow.cells;
    if (typeof target === 'number') {
      return target >= cells.length || target < 0 ? [-1, null] : [target, cells[target]];
    }
    
    for (let i = 0; i < cells.length; ++i) {
      const cell = cells[i];
      if (cell === target || cell.textContent === target) {
        return [i, cell];
      }
    }
    
    return [-1, null];
  }
  
  /**
   * Resolve row info by:
   * - `number`: internal index (within `dataSection`)
   * - `string`: external index
   * - `HTMLTableRowElement`: reference
   *
   * @param target {number|string|HTMLTableRowElement}
   * @return {[number, HTMLTableRowElement]}
   */
  resolveRowInfo(target) {
    if ((target ?? null) === null) {
      return [-1, null]
    }
    
    const rows = this.dataSection.rows;
    if (typeof target === 'number') {
      return target >= rows.length || target < 0 ? [-1, null] : [target, rows[target]];
    }
    
    for (let i = 0; i < rows.length; ++i) {
      const row = rows[i];
      if (row === target || row.getAttribute(ROW_INDEX_ATTRIBUTE) === target) {
        return [i, row];
      }
    }
    
    return [-1, null];
  }
  
  
  
  updateCell(rowReference, columnReference, data) {
    const [rowIndex, row] = this.resolveRowInfo(rowReference);
    if (rowIndex === -1) {
      return;
    }
    
    const [headerIndex, header] = this.resolveHeaderIndex(columnReference);
    if (headerIndex === -1) {
      return;
    }
    
    
  }
  
  updateColumnName(reference, columnName) {
    const [headerIndex, header] = this.resolveHeaderIndex(reference);
    if (headerIndex === -1) {
      return;
    }
    
    const oldName = header.textContent;
    header.textContent = columnName;
    
    this.emitEvent('columnupdated', {
      headerIndex,
      columnName,
      header,
      oldColumnName: oldName
    });
  }
  
  deleteColumn(reference) {
    const [headerIndex, header] = this.resolveHeaderIndex(reference);
    if (headerIndex === -1) {
      return;
    }
    
    this.headerRow.removeChild(header);
    for (const row of this.dataSection.rows) {
      row.removeChild(row.cells[headerIndex]);
    }
    
    this.emitEvent('columndeleted', {
      headerIndex,
      columnName: header.textContent
    });
  }
  
  insertColumn(reference, columnName, data) {
    // Inspect data
    const valueRetriever = resolveRetriever(data, false);
    
    // Build/insert header
    const newHeader = document.createElement('th');
    if (columnName) {
      newHeader.textContent = columnName;
    }
    
    const headerRow = this.headerRow;
    const [headerIndex, header] = this.resolveHeaderIndex(reference);
    if (headerIndex === -1) {
      headerRow.appendChild(newHeader);
    } else {
      headerRow.insertBefore(newHeader, header);
    }
    
    // Insert cells
    const dataSection = this.dataSection;
    let rowIndex = 0;
    
    for (const row of dataSection.rows) {
      const newCell = document.createElement('td');
      
      newCell.textContent = valueRetriever.getValue(rowIndex++, row, headerIndex, header) ?? '';
      
      if (headerIndex === -1) {
        row.appendChild(newCell);
      } else {
        row.insertBefore(newCell, row.cells[headerIndex]);
      }
    }
    
    // Emit
    this.emitEvent('columninserted', {
      headerIndex: headerIndex === -1 ? headerRow.cells.length - 1 : headerIndex,
      header: newHeader
    });
  }
  
  deleteRow(reference) {
    const [rowIndex, row] = this.resolveRowInfo(reference);
    if (rowIndex === -1) {
      return;
    }
    
    this.dataSection.removeChild(row);
    
    this.emitEvent('rowdeleted', { rowIndex, row });
  }
  
  insertRow(reference, data) {
    const dataSection = this.dataSection;
    
    // Inspect data
    const valueRetriever = resolveRetriever(data, true);
    
    // Build/insert row
    const newRow = document.createElement('tr');
    newRow.setAttribute(ROW_INDEX_ATTRIBUTE, (data.index ?? null) ? data.index : this.indexer.nextIndex(dataSection, newRow));
    
    const [rowIndex, referenceRow] = this.resolveRowInfo(reference);
    if (rowIndex === -1) {
      dataSection.appendChild(newRow);
    } else {
      dataSection.insertBefore(newRow, referenceRow);
    }
    
    // Insert cells
    const headers = this.headerRow.cells;
    for (let columnIndex = 0; columnIndex < headers.length; ++columnIndex) {
      newRow.insertCell().textContent = valueRetriever.getValue(rowIndex, newRow, columnIndex, headers[columnIndex]);
    }
    
    // Emit
    this.emitEvent('rowinserted', {
      rowIndex,
      row: newRow
    });
  }
  
}

function resolveRetriever(data, isInsertRow) {
  if (!data) {
    return new BlankValueRetriever();
  } else if (typeof data.getValue === 'function') {
    return data;
  } else if (typeof data === 'function') {
    return new FunctionValueRetriever(data);
  } else if (Array.isArray(data)) {
    return new (isInsertRow ? ArrayRowValueRetriever : ArrayColumnValueRetriever)(data);
  } else if (data instanceof Map) {
    return new (isInsertRow ? MapRowValueRetriever : MapColumnValueRetriever)(data);
  } else {
    return new (isInsertRow ? new HashRowValueRetriever : HashColumnValueRetriever)(data);
  }
}

class BlankValueRetriever {
  getValue() {
    return '';
  }
}

class FunctionValueRetriever {
  
  fn;
  
  constructor(fn) {
    this.fn = fn;
  }
  
  getValue(rowIndex, row, columnIndex, columnHeader) {
    return this.fn(rowIndex, row, columnIndex, columnHeader);
  }
}

class BaseDataValueRetriever {
  data;
  
  constructor(data) {
    this.data = data;
  }
  
}

/**
 * @implements CellValueRetriever
 */
export class ArrayColumnValueRetriever extends DataValueRetriever {
  
  getValue(rowIndex) {
    return this.data[rowIndex];
  }
}

/**
 * @implements CellValueRetriever
 */
export class HashColumnValueRetriever extends DataValueRetriever {
  
  getValue(rowIndex, row) {
    return this.data[row.getAttribute(ROW_INDEX_ATTRIBUTE)];
  }
}

/**
 * @implements CellValueRetriever
 */
export class MapColumnValueRetriever extends DataValueRetriever {
  
  getValue(rowIndex, row) {
    return this.data.get(row.getAttribute(ROW_INDEX_ATTRIBUTE));
  }
}

/**
 * @implements CellValueRetriever
 */
export class ArrayRowValueRetriever extends DataValueRetriever {
  
  getValue(rowIndex, row, columnIndex) {
    return this.data[columnIndex];
  }
  
}

/**
 * @implements CellValueRetriever
 */
export class HashRowValueRetriever extends DataValueRetriever {
  
  getValue(rowIndex, row, columnIndex, columnHeader) {
    return this.data[columnHeader.textContent];
  }
  
}

/**
 * @implements CellValueRetriever
 */
export class MapRowValueRetriever extends DataValueRetriever {
  
  getValue(rowIndex, row, columnIndex, columnHeader) {
    return this.data.get(columnHeader.textContent);
  }
  
}