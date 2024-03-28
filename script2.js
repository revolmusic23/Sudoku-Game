new Vue({
  el: '#app',
  data: {
    currentDifficulty: 'hard',
    difficulties: ['easy', 'medium', 'hard'],
    originalBoard: [],
    board: [], // current board
    solution: [],
    selectedCell: { rowIndex: -1, cellIndex: -1 },
    selectedNumber: null,
    selectedBlank: null,
    notes: {}, // object
    // notes = {
    //   "0-0": [5, 8], 0-0 cell has notes [5, 8]
    //   "0-1": [3, 7], 0-1 cell has notes [3, 7]
    // }
    history: [],
    // history: object in array
    // [{rowIndex: 0, cellIndex: 2, prevValue: 0: newValue: 3;},
    //  {rowIndex: 0, cellIndex: 2, prevValue: 3: newValue: 4;}]
    undoStack: [],
    redoStack: [],
    // forwardRow: '', // 用字串，就可以有空字串，如果是整數，就沒辦法是空
    // forwardColumn: '',
    forwardRow: null,
    forwardColumn: null,
    inputNum: true,
    inputNote: false,
    gameSuccess: false,
  },
  methods: {
    // splitKeys: function(keyString) {
    //   return keyString.split(" ");
    // },
    getSudoku() {
      this.initializeGame();
      axios.get(`https://sudoku-api.vercel.app/api/dosuku?difficulty=${this.currentDifficulty}`)
        .then(response => {
          this.board = response.data.newboard.grids[0].value;
          this.originalBoard = JSON.parse(JSON.stringify(this.board));
          this.solution = response.data.newboard.grids[0].solution;
        })
        .catch(error => {
          console.error('Error fetching data:', error);
        });
    },
    restartGame() {
      this.initializeGame();
    },
    startNewGame() {
      this.getSudoku();
    },
    initializeGame() {
      this.board = JSON.parse(JSON.stringify(this.originalBoard));
      this.selectedCell = { rowIndex: -1, cellIndex: -1 };
      this.selectedNumber = null;
      this.selectedBlank = null;
      this.gameSuccess = false;
      this.inputNum = true;
      this.inputNote = false;
      this.notes = {};
    },
    changeDifficulty(difficulty) {
      this.currentDifficulty = difficulty;
      this.getSudoku();
    },
    // END OF GAME LAYOUT

    cellColor(rowIndex, cellIndex) {
      // Check if the number is not in original board
      if ( this.board[rowIndex][cellIndex] !== this.solution[rowIndex][cellIndex] ) {
        return 'wrong-answer';
      }
      
      if ( this.board[rowIndex][cellIndex] !== 0 && this.originalBoard[rowIndex][cellIndex] === 0 ) {
        return 'user-entered';
      }
      return;
    },

    // Detect this selected cell is number or blank
    cellClicked(cell, rowIndex, cellIndex) {
      this.selectedCell = { rowIndex, cellIndex };

      if (this.originalBoard[rowIndex][cellIndex] !== 0) {
        // If select original number
        this.selectedNumber = cell;
        this.selectedBlank = null;
      } 
      else if (cell !== 0) {
        // If select the number which can edit 
        this.selectedNumber = cell;
        this.selectedBlank = null;
      } 
      else {
        // If select blank
        this.selectedNumber = null;
        this.selectedBlank = { rowIndex, cellIndex };
      }
    },
    
    isCellHighlighted(cell, rowIndex, cellIndex) {
      // If there isn't a cell selected
      if (this.selectedCell.rowIndex === -1 || this.selectedCell.cellIndex === -1) {
        return;
      }
      // If this cell is selected cell
      if (rowIndex === this.selectedCell.rowIndex && cellIndex === this.selectedCell.cellIndex) {
        return 'current-cell';
      }
      // If this cell number is same as selected cell number
      if (cell === this.board[this.selectedCell.rowIndex][this.selectedCell.cellIndex] && cell > 0) {
        return 'highlighted';
      }
      return;
    },

    isNoteHighlighted(n) {
      if (this.selectedCell.rowIndex === -1 || this.selectedCell.cellIndex === -1) {
        return false;
      }
      return this.board[this.selectedCell.rowIndex][this.selectedCell.cellIndex] === n;
    },

    numberClicked(number) {
      const { rowIndex, cellIndex } = this.selectedCell;
      if (this.originalBoard[rowIndex][cellIndex] === 0) {
        this.history.push({
          rowIndex, cellIndex, 
          prevValue: this.board[rowIndex][cellIndex],
          newValue: number
        });

        // history:
        // [{rowIndex: 0, cellIndex: 2, prevValue: 0: newValue: 3;},
        //  {rowIndex: 0, cellIndex: 2, prevValue: 3: newValue: 4;}]

        let key = `${rowIndex}-${cellIndex}`; // key = "1-6"
        this.$set(this.notes, key, []);
        // Delete all the notes in this cell (set to [])

        // 消去這個 column 裡面同樣數字的 note
        for (let row = 0; row < this.board.length; row++) {
          key = `${row}-${cellIndex}`;
          if (!this.notes[key]) { continue; }

          const index = this.notes[key].indexOf(number);
          if (index > -1) {
            this.notes[key].splice(index, 1);
          }
        }

        // 消去這個 row 裡面同樣數字的 note
        for (let col = 0; col < this.board.length; col++) {
          key = `${rowIndex}-${col}`;
          if (!this.notes[key]) { continue; }

          const index = this.notes[key].indexOf(number);
          if (index > -1) {
            this.notes[key].splice(index, 1);
          }
        }

        let startRow = Math.floor(rowIndex / 3) * 3;
        let startCol = Math.floor(cellIndex / 3) * 3;
        
        // 填數字之後，消去這個九宮格裡面同樣數字的 note
        for (let row = startRow; row < (startRow+3); row++) {
          for (let col = startCol; col < (startCol+3); col++) {
            key = `${row}-${col}`;
            if (!this.notes[key]) { continue; }

            const index = this.notes[key].indexOf(number);
            if (index > -1) {
              this.notes[key].splice(index, 1);
            }
          }
        }

        if (this.board[rowIndex][cellIndex] === number) {
          // 如果格子裡面的數字正好跟輸入的數字一樣，則把此格子變成空格
          this.board[rowIndex][cellIndex] = 0;
          this.selectedNumber = null;
          this.selectedBlank = { rowIndex, cellIndex };
        } 
        else {
          // 如果格子裡面的數字跟輸入的數字不一樣，不管原本是空格還是有數字
          this.board[rowIndex][cellIndex] = number;
          this.selectedNumber = number;
          this.selectedBlank = null;
        }
    

        // 如果點選的是 originalBoard 裡面沒有的數字
        // const newBoard = JSON.parse(JSON.stringify(this.board)); // 創建 board 的深拷貝
    
        // if (newBoard[rowIndex][cellIndex] === number) {
        //   // 如果格子裡面的數字正好跟輸入的數字一樣，則把此格子變成空格
        //   newBoard[rowIndex][cellIndex] = 0;
        //   this.selectedNumber = null;
        //   this.selectedBlank = { rowIndex, cellIndex };
        // } 
        // else {
        //   // 如果格子裡面的數字跟輸入的數字不一樣，不管原本是空格還是有數字
        //   newBoard[rowIndex][cellIndex] = number;
        //   this.selectedNumber = number;
        //   this.selectedBlank = null;
        // }
    
        // this.board = newBoard;
      }
      this.checkBoard();
    },

    noteClicked(number) {
      const { rowIndex, cellIndex } = this.selectedCell;
      if ( this.board[rowIndex][cellIndex] !== 0 ) {
        // If there is number on this cell, note can't be clicked.
        return;
      }
      else {
        this.toggleNote(rowIndex, cellIndex, number);
      }
    },

    toggleNote(rowIndex, cellIndex, number) {
      const key = `${rowIndex}-${cellIndex}`;
      if (!this.notes[key]) {
        // 如果 notes 裡面還沒有這個 key，創建一個空陣列。
        this.$set(this.notes, key, []);
      }
      const index = this.notes[key].indexOf(number);
      if (index === -1) { 
        // 代表這一行這一格（key）沒有這個數字的 note
        this.notes[key].push(number);
      } 
      else {
        this.notes[key].splice(index, 1);
      }
      // key: "0-0", "0-1", ... , "8-8"
      // notes = {
      //   "0-0": [5, 8], 0-0 cell has notes [5, 8]
      //   "0-1": [3, 7], 0-1 cell has notes [3, 7]
      // }
    },
  
    isNoteActive(rowIndex, cellIndex, number) {
      const key = `${rowIndex}-${cellIndex}`;
      return this.notes[key] && this.notes[key].includes(number);
    },

    checkBoard() {
      if ( this.gameSuccess === false ) {
        for (let row = 0; row < this.board.length; row++) {
          for (let col = 0; col < this.board[row].length; col++) {
            if (this.board[row][col] === 0) return;
            if (this.board[row][col] !== this.solution[row][col]) return;
          }
        }
      }
      this.gameSuccess = true;
      this.inputNum = false;
      this.inputNote = false;
      this.selectedCell = { rowIndex: -1, cellIndex: -1 };
    },

    getHint() {
      const { rowIndex, cellIndex } = this.selectedCell;
      if ( rowIndex === -1 || cellIndex === -1 ) { return; }
      this.numberClicked(this.solution[rowIndex][cellIndex]);
    },

    showSolution() {
      for (let row = 0; row < this.board.length; row++) {
        for (let col = 0; col < this.board[row].length; col++) {
          const newBoard = JSON.parse(JSON.stringify(this.board));
          // let newBoard = current board

          console.log(JSON.stringify(this.board));
          console.log(JSON.parse(JSON.stringify(this.board)));
          if (newBoard[row][col] !== this.solution[row][col]) {
            newBoard[row][col] = this.solution[row][col];
            this.board = newBoard;
          }
        }
      }
      this.gameSuccess = true;
      this.checkBoard();
    },

    countNumber(num) {
      let count = 0;
      for (let row of this.board) {
        for (let cell of row) {
          if (cell === num) {
            count++;
          }
        }
      }
      return count;
    },

    undo() {
      if (this.history.length > 0) {
        const lastAction = this.history.pop();
        this.board[lastAction.rowIndex][lastAction.cellIndex] = lastAction.prevValue;
        this.selectedCell = { rowIndex: lastAction.rowIndex, cellIndex: lastAction.cellIndex };
      }
    },

    forwardToCell() {
      if (this.forwardRow && this.forwardColumn) {
        // const rowIndex = parseInt(this.forwardRow, 10) - 1;
        // const cellIndex = parseInt(this.forwardColumn, 10) - 1;
        const rowIndex = this.forwardRow - 1;
        const cellIndex = this.forwardColumn - 1;
        if (rowIndex >= 0 && rowIndex < 9 && cellIndex >= 0 && cellIndex < 9) {
          this.selectedCell = { rowIndex, cellIndex };
        }
        // this.forwardRow = '';
        // this.forwardColumn = '';
        this.forwardRow = null;
        this.forwardColumn = null;
        if (this.$refs.forwardColumnInput) {
          // use $refs to detect forwardColumnInput in HTML
          this.$refs.forwardColumnInput.blur();
          // after input, cancel focusing
        }
      }
    },

    getDots(num) {
      let dotsCount = 9 - this.countNumber(num);
      if (dotsCount === 9) dotsCount = 8;

      let dots = '';
      for (let i = 0; i < dotsCount; i++) {
        dots += `<span class="dot">•</span>`;
        if ((i + 1) % 4 === 0 && (i + 1) < dotsCount) {
          dots += '<span class="new-line"></span>';
        }
      }
      return dots;
    },

    handleKeydown(event) {

      if (event.key === 'f') {
        if (!this.forwardRow) {
          this.$refs.forwardRowInput.focus();
        } else if (!this.forwardColumn) {
          this.$refs.forwardColumnInput.focus();
        }
      }

      const activeElement = document.activeElement;
      const isForwardInputFocused = activeElement === this.$refs.forwardRowInput || activeElement === this.$refs.forwardColumnInput;

      // If input forward blank, other function are not allowed
      if (isForwardInputFocused) return;

      if (event.key === 'n') {
        this.inputNote = !this.inputNote;
        this.inputNum = !this.inputNum;
      }

      if (this.selectedCell.rowIndex === -1 && this.selectedCell.cellIndex === -1) {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || 
            event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          this.selectedCell = { rowIndex: 0, cellIndex: 0 };

          if (this.board[0][0] === 0) { // If row 0 column 0 is blank
            this.selectedBlank = this.selectedCell;
          }
          else {
            selectedNumber = this.board[0][0];
          }
        }
      } 
      else {
        const isCommandOrCtrlPressed = event.metaKey || event.ctrlKey;
        // const isShiftPressed = event.shiftKey;

        if (event.key === 'ArrowUp') {
          if (isCommandOrCtrlPressed) {this.selectedCell.rowIndex = 0;}
          else {this.selectedCell.rowIndex = Math.max(0, this.selectedCell.rowIndex - 1);}
        }
        else if (event.key === 'ArrowDown') {
          if (isCommandOrCtrlPressed) {this.selectedCell.rowIndex = this.board.length - 1;}
          else {this.selectedCell.rowIndex = Math.min(this.board.length - 1, this.selectedCell.rowIndex + 1);}
        }
        else if (event.key === 'ArrowLeft') {
          if (isCommandOrCtrlPressed) {this.selectedCell.cellIndex = 0;} 
          else {this.selectedCell.cellIndex = Math.max(0, this.selectedCell.cellIndex - 1);}
        }
        else if (event.key === 'ArrowRight') {
          if (isCommandOrCtrlPressed) {this.selectedCell.cellIndex = this.board[0].length - 1;}
          else {this.selectedCell.cellIndex = Math.min(this.board[0].length - 1, this.selectedCell.cellIndex + 1);}
        }
        else if (event.key === 'Escape') {
          this.selectedCell = { rowIndex: -1, cellIndex: -1 };
        }

        else if (event.key >= '1' && event.key <= '9' && this.inputNum === true) {
          this.numberClicked(parseInt(event.key));
        }

        else if (event.key >= '1' && event.key <= '9' && this.inputNote === true) {
          this.noteClicked(parseInt(event.key));
        }
        
        if (isCommandOrCtrlPressed && event.key === 'z') {
          this.undo();
        }

      }
    },

  },
  mounted() {
    this.getSudoku();
    window.addEventListener('keydown', this.handleKeydown);
    // window.addEventListener('keydown', this.handleKeydown.bind(this));
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.handleKeydown);
  }
});

