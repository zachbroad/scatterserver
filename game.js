import fs from "fs";
import shuffle from "lodash/shuffle.js";

const GameOptions = {
  roundDuration: 120,
  difficulty: "NORMAL", // EASY, NORMAL, HARD, ANY
  count: 20,
};

class Game {

  constructor(letter = "A") {
    this.rounds = Game.NUMBER_OF_ROUNDS;

    this.currentRound = 1;
    this.cards = Game.generateCards();
    this.results = {};
    this.hasBeenScored = false;

    this.setOfLetters = Game.DICE_LETTERS;
    this.letter = letter;

    this.lobbyDuration = Game.LOBBY_DURATION; // just for showing countdown on client
    this.resultsDuration = Game.RESULTS_DURATION;
    this.roundDuration = Game.ROUND_DURATION;

    this.setPromptsToThisRound();
  }


  // Timer
  static LOBBY_DURATION = 3;
  static NUMBER_OF_ROUNDS = 3;
  static RESULTS_DURATION = 60;
  static ROUND_DURATION = 90;
  static WAIT_FOR_ANSWERS_DURATION = 3.5;

  // Scattergories letters
  static DICE_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "R", "S", "T", "W"];
  static EASY_LETTERS = ["A", "E", "I", "O", "U", "B", "C", "D", "G", "L", "M", "N", "P", "R", "S", "T"];
  static ANY_LETTER = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
  static HARD_LETTERS = ["Q", "U", "V", "X", "Y", "Z", "J", "K", "W"];

  /**
   * Generate a list of random prompts from prompts.txt by reading the file and shuffling the lines
   * @param count - number of prompts to generate
   * @returns {string[][keyof string[]][]} - list of prompts
   */
  static generateRandomPrompts(count = 20) {
    let data = [];
    const fileData = fs.readFileSync("prompts.txt", "utf8");
    data = shuffle(fileData.split(/\n/)).slice(0, count);
    return data;
  }

  /**
   * Generate a single card
   * @returns {*[]} - a single card
   */
  static generateCard() {
    return this.generateRandomPrompts();
  }

  /**
   * Generate 3 cards for a game
   * @returns {*[][]} - 3 cards
   */
  static generateCards() {
    return [this.generateCard(), this.generateCard(), this.generateCard()];
  }

  /**
   * Generate a new game with a random letter and prompts
   * @returns {Game} - new game object
   */
  static generateNewGame() {
    const g = new Game();
    g.setOfLetters = Game.DICE_LETTERS; // TODO get config
    g.letter = g.getLetterFromList();
    return g;
  }

  /**
   * Set the prompts to the current round card prompts
   */
  setPromptsToThisRound() {
    this.currentPrompts = this.cards[this.currentRound];
  }

  /**
   * Get a random letter from the list of letters specified
   * @returns {string} - random letter
   */
  getLetterFromList() {
    return this.setOfLetters[Math.floor(Math.random() * this.setOfLetters.length)];
  }
}

export default Game;
